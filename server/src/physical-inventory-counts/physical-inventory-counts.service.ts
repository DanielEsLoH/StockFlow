import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/services/tenant-context.service';
import { PhysicalCountStatus, MovementType } from '@prisma/client';
import { CreatePhysicalCountDto } from './dto/create-count.dto';
import { AddCountItemDto, UpdateCountItemDto } from './dto/add-count-item.dto';
import { AccountingBridgeService } from '../accounting/accounting-bridge.service';

@Injectable()
export class PhysicalInventoryCountsService {
  private readonly logger = new Logger(PhysicalInventoryCountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly accountingBridge: AccountingBridgeService,
  ) {}

  async create(dto: CreatePhysicalCountDto, userId: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId },
    });

    if (!warehouse) {
      throw new NotFoundException('Bodega no encontrada');
    }

    // Check no active count exists for this warehouse
    const activeCount = await this.prisma.physicalInventoryCount.findFirst({
      where: {
        tenantId,
        warehouseId: dto.warehouseId,
        status: { in: [PhysicalCountStatus.DRAFT, PhysicalCountStatus.IN_PROGRESS] },
      },
    });

    if (activeCount) {
      throw new BadRequestException(
        'Ya existe un conteo activo para esta bodega. Complételo o cancélelo primero.',
      );
    }

    const count = await this.prisma.physicalInventoryCount.create({
      data: {
        tenantId,
        warehouseId: dto.warehouseId,
        notes: dto.notes,
        startedById: userId,
      },
      include: {
        warehouse: { select: { name: true, code: true } },
        items: { select: { id: true } },
      },
    });

    this.logger.log(`Conteo físico creado: ${count.id} (bodega: ${warehouse.name})`);

    return this.mapToResponse(count);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: PhysicalCountStatus;
    warehouseId?: string;
  }) {
    const tenantId = this.tenantContext.requireTenantId();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.warehouseId) where.warehouseId = query.warehouseId;

    const [counts, total] = await Promise.all([
      this.prisma.physicalInventoryCount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { name: true, code: true } },
          startedBy: { select: { firstName: true, lastName: true } },
          completedBy: { select: { firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.physicalInventoryCount.count({ where }),
    ]);

    return {
      data: counts.map((c) => ({
        id: c.id,
        warehouseId: c.warehouseId,
        warehouseName: c.warehouse.name,
        warehouseCode: c.warehouse.code,
        status: c.status,
        countDate: c.countDate,
        startedAt: c.startedAt,
        completedAt: c.completedAt,
        startedBy: c.startedBy
          ? `${c.startedBy.firstName} ${c.startedBy.lastName}`
          : null,
        completedBy: c.completedBy
          ? `${c.completedBy.firstName} ${c.completedBy.lastName}`
          : null,
        itemsCount: c._count.items,
        notes: c.notes,
        createdAt: c.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const count = await this.prisma.physicalInventoryCount.findFirst({
      where: { id, tenantId },
      include: {
        warehouse: { select: { name: true, code: true } },
        startedBy: { select: { firstName: true, lastName: true } },
        completedBy: { select: { firstName: true, lastName: true } },
        items: {
          include: {
            product: { select: { sku: true, name: true, stock: true } },
            countedBy: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!count) {
      throw new NotFoundException('Conteo físico no encontrado');
    }

    return {
      id: count.id,
      warehouseId: count.warehouseId,
      warehouseName: count.warehouse.name,
      warehouseCode: count.warehouse.code,
      status: count.status,
      countDate: count.countDate,
      startedAt: count.startedAt,
      completedAt: count.completedAt,
      startedBy: count.startedBy
        ? `${count.startedBy.firstName} ${count.startedBy.lastName}`
        : null,
      completedBy: count.completedBy
        ? `${count.completedBy.firstName} ${count.completedBy.lastName}`
        : null,
      notes: count.notes,
      items: count.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productSku: item.product.sku,
        productName: item.product.name,
        systemQuantity: item.systemQuantity,
        physicalQuantity: item.physicalQuantity,
        variance: item.variance,
        countedBy: item.countedBy
          ? `${item.countedBy.firstName} ${item.countedBy.lastName}`
          : null,
        countedAt: item.countedAt,
        notes: item.notes,
      })),
      summary: {
        totalItems: count.items.length,
        itemsWithVariance: count.items.filter((i) => i.variance !== 0).length,
        totalPositiveVariance: count.items
          .filter((i) => i.variance > 0)
          .reduce((sum, i) => sum + i.variance, 0),
        totalNegativeVariance: count.items
          .filter((i) => i.variance < 0)
          .reduce((sum, i) => sum + i.variance, 0),
      },
      createdAt: count.createdAt,
      updatedAt: count.updatedAt,
    };
  }

  async addItem(countId: string, dto: AddCountItemDto, userId: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const count = await this.prisma.physicalInventoryCount.findFirst({
      where: { id: countId, tenantId },
    });

    if (!count) {
      throw new NotFoundException('Conteo físico no encontrado');
    }

    if (
      count.status !== PhysicalCountStatus.DRAFT &&
      count.status !== PhysicalCountStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        `No se pueden agregar ítems a un conteo en estado ${count.status}`,
      );
    }

    // Get system quantity from WarehouseStock
    const warehouseStock = await this.prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: count.warehouseId,
          productId: dto.productId,
        },
      },
    });

    const systemQuantity = warehouseStock?.quantity ?? 0;
    const variance = dto.physicalQuantity - systemQuantity;

    const item = await this.prisma.physicalCountItem.upsert({
      where: {
        countId_productId: {
          countId,
          productId: dto.productId,
        },
      },
      create: {
        countId,
        tenantId,
        productId: dto.productId,
        systemQuantity,
        physicalQuantity: dto.physicalQuantity,
        variance,
        countedById: userId,
        countedAt: new Date(),
        notes: dto.notes,
      },
      update: {
        systemQuantity,
        physicalQuantity: dto.physicalQuantity,
        variance,
        countedById: userId,
        countedAt: new Date(),
        notes: dto.notes,
      },
      include: {
        product: { select: { sku: true, name: true } },
      },
    });

    return {
      id: item.id,
      productId: item.productId,
      productSku: item.product.sku,
      productName: item.product.name,
      systemQuantity: item.systemQuantity,
      physicalQuantity: item.physicalQuantity,
      variance: item.variance,
      notes: item.notes,
    };
  }

  async updateItem(
    countId: string,
    itemId: string,
    dto: UpdateCountItemDto,
    userId: string,
  ) {
    const tenantId = this.tenantContext.requireTenantId();

    const item = await this.prisma.physicalCountItem.findFirst({
      where: { id: itemId, countId, tenantId },
      include: { count: true },
    });

    if (!item) {
      throw new NotFoundException('Ítem de conteo no encontrado');
    }

    if (
      item.count.status !== PhysicalCountStatus.DRAFT &&
      item.count.status !== PhysicalCountStatus.IN_PROGRESS
    ) {
      throw new BadRequestException('No se puede modificar un conteo finalizado');
    }

    const variance = dto.physicalQuantity - item.systemQuantity;

    return this.prisma.physicalCountItem.update({
      where: { id: itemId },
      data: {
        physicalQuantity: dto.physicalQuantity,
        variance,
        countedById: userId,
        countedAt: new Date(),
        notes: dto.notes ?? item.notes,
      },
    });
  }

  async removeItem(countId: string, itemId: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const item = await this.prisma.physicalCountItem.findFirst({
      where: { id: itemId, countId, tenantId },
      include: { count: true },
    });

    if (!item) {
      throw new NotFoundException('Ítem de conteo no encontrado');
    }

    if (
      item.count.status !== PhysicalCountStatus.DRAFT &&
      item.count.status !== PhysicalCountStatus.IN_PROGRESS
    ) {
      throw new BadRequestException('No se puede modificar un conteo finalizado');
    }

    await this.prisma.physicalCountItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  async startCount(id: string, userId: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const count = await this.prisma.physicalInventoryCount.findFirst({
      where: { id, tenantId },
    });

    if (!count) {
      throw new NotFoundException('Conteo físico no encontrado');
    }

    if (count.status !== PhysicalCountStatus.DRAFT) {
      throw new BadRequestException('Solo se puede iniciar un conteo en estado BORRADOR');
    }

    const updated = await this.prisma.physicalInventoryCount.update({
      where: { id },
      data: {
        status: PhysicalCountStatus.IN_PROGRESS,
        startedAt: new Date(),
        startedById: userId,
      },
      include: {
        warehouse: { select: { name: true, code: true } },
        items: { select: { id: true } },
      },
    });

    this.logger.log(`Conteo físico iniciado: ${id}`);
    return this.mapToResponse(updated);
  }

  async completeCount(id: string, userId: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const count = await this.prisma.physicalInventoryCount.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            product: { select: { sku: true, costPrice: true } },
          },
        },
      },
    });

    if (!count) {
      throw new NotFoundException('Conteo físico no encontrado');
    }

    if (count.status !== PhysicalCountStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Solo se puede completar un conteo EN PROGRESO',
      );
    }

    if (count.items.length === 0) {
      throw new BadRequestException(
        'El conteo debe tener al menos un ítem antes de completarse',
      );
    }

    // Generate ADJUSTMENT stock movements for all variances
    await this.prisma.$transaction(async (tx) => {
      for (const item of count.items) {
        if (item.variance === 0) continue;

        // Create ADJUSTMENT stock movement
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: count.warehouseId,
            userId,
            type: MovementType.ADJUSTMENT,
            quantity: item.variance,
            reason: 'Conteo físico',
            notes: `Conteo #${count.id.substring(0, 8)} - Sistema: ${item.systemQuantity}, Físico: ${item.physicalQuantity}`,
          },
        });

        // Update WarehouseStock
        await tx.warehouseStock.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: count.warehouseId,
              productId: item.productId,
            },
          },
          create: {
            tenantId,
            warehouseId: count.warehouseId,
            productId: item.productId,
            quantity: item.physicalQuantity,
          },
          update: {
            quantity: { increment: item.variance },
          },
        });

        // Update global Product stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.variance } },
        });

        // Fire accounting entry (non-blocking)
        this.accountingBridge
          .onStockAdjustment({
            tenantId,
            movementId: item.id,
            productSku: item.product.sku,
            quantity: item.variance,
            costPrice: Number(item.product.costPrice),
          })
          .catch(() => {});
      }

      // Mark count as completed
      await tx.physicalInventoryCount.update({
        where: { id },
        data: {
          status: PhysicalCountStatus.COMPLETED,
          completedAt: new Date(),
          completedById: userId,
        },
      });
    });

    this.logger.log(
      `Conteo físico completado: ${id} (${count.items.filter((i) => i.variance !== 0).length} ajustes generados)`,
    );

    return this.findOne(id);
  }

  async cancelCount(id: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const count = await this.prisma.physicalInventoryCount.findFirst({
      where: { id, tenantId },
    });

    if (!count) {
      throw new NotFoundException('Conteo físico no encontrado');
    }

    if (count.status === PhysicalCountStatus.COMPLETED) {
      throw new BadRequestException('No se puede cancelar un conteo completado');
    }

    if (count.status === PhysicalCountStatus.CANCELLED) {
      throw new BadRequestException('El conteo ya está cancelado');
    }

    const updated = await this.prisma.physicalInventoryCount.update({
      where: { id },
      data: { status: PhysicalCountStatus.CANCELLED },
      include: {
        warehouse: { select: { name: true, code: true } },
        items: { select: { id: true } },
      },
    });

    this.logger.log(`Conteo físico cancelado: ${id}`);
    return this.mapToResponse(updated);
  }

  private mapToResponse(count: any) {
    return {
      id: count.id,
      warehouseId: count.warehouseId,
      warehouseName: count.warehouse?.name,
      warehouseCode: count.warehouse?.code,
      status: count.status,
      countDate: count.countDate,
      startedAt: count.startedAt,
      completedAt: count.completedAt,
      itemsCount: count.items?.length ?? count._count?.items ?? 0,
      notes: count.notes,
      createdAt: count.createdAt,
    };
  }
}
