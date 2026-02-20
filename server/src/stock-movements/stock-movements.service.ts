import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  StockMovement,
  MovementType,
  Prisma,
  Product,
  Warehouse,
  User,
  WarehouseStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountingBridgeService } from '../accounting';
import { CreateMovementDto, CreateTransferDto, FilterMovementsDto } from './dto';

/**
 * Stock movement data returned in responses
 */
export interface StockMovementResponse {
  id: string;
  tenantId: string;
  productId: string;
  warehouseId: string | null;
  userId: string | null;
  type: MovementType;
  quantity: number;
  reason: string | null;
  notes: string | null;
  invoiceId: string | null;
  createdAt: Date;
  product?: {
    id: string;
    sku: string;
    name: string;
  };
  warehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

/**
 * Paginated response for stock movement list endpoints
 */
export interface PaginatedMovementsResponse {
  data: StockMovementResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Transfer response containing both movements
 */
export interface TransferResponse {
  outMovement: StockMovementResponse;
  inMovement: StockMovementResponse;
}

/**
 * Stock movement with relations for internal use
 */
type MovementWithRelations = StockMovement & {
  product?: Pick<Product, 'id' | 'sku' | 'name'>;
  warehouse?: Pick<Warehouse, 'id' | 'code' | 'name'> | null;
  user?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
};

/**
 * StockMovementsService handles all stock movement operations including
 * listing movements with filtering, viewing individual movements,
 * and creating manual adjustments with multi-tenant isolation.
 *
 * Stock movement business rules:
 * 1. Manual movements can only be of type ADJUSTMENT
 * 2. Product must exist and belong to the current tenant
 * 3. Warehouse (if specified) must exist and belong to the current tenant
 * 4. Creating a movement updates the product stock
 * 5. Positive quantity adds to stock, negative subtracts from stock
 * 6. All operations are performed within transactions
 */
@Injectable()
export class StockMovementsService {
  private readonly logger = new Logger(StockMovementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly accountingBridge: AccountingBridgeService,
  ) {}

  /**
   * Lists all stock movements within the current tenant with filtering and pagination.
   *
   * @param filters - Filter and pagination options
   * @returns Paginated list of stock movements
   */
  async findAll(
    filters: FilterMovementsDto = {},
  ): Promise<PaginatedMovementsResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const {
      page = 1,
      limit = 10,
      productId,
      warehouseId,
      type,
      fromDate,
      toDate,
    } = filters;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing stock movements for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    // Build where clause
    const where: Prisma.StockMovementWhereInput = { tenantId };

    if (productId) {
      where.productId = productId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (type) {
      where.type = type;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = fromDate;
      }
      if (toDate) {
        where.createdAt.lte = toDate;
      }
    }

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return this.buildPaginatedResponse(movements, total, page, limit);
  }

  /**
   * Finds a single stock movement by ID within the current tenant.
   * Includes product, warehouse, and user relations.
   *
   * @param id - Stock movement ID
   * @returns Stock movement data with relations
   * @throws NotFoundException if movement not found
   */
  async findOne(id: string): Promise<StockMovementResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding stock movement ${id} in tenant ${tenantId}`);

    const movement = await this.prisma.stockMovement.findFirst({
      where: { id, tenantId },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!movement) {
      this.logger.warn(`Stock movement not found: ${id}`);
      throw new NotFoundException('Movimiento de stock no encontrado');
    }

    return this.mapToMovementResponse(movement);
  }

  /**
   * Finds all stock movements for a specific product within the current tenant.
   *
   * @param productId - Product ID to get movements for
   * @param filters - Filter and pagination options
   * @returns Paginated list of movements for the product
   * @throws NotFoundException if product not found
   */
  async findByProduct(
    productId: string,
    filters: FilterMovementsDto = {},
  ): Promise<PaginatedMovementsResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Finding stock movements for product ${productId} in tenant ${tenantId}`,
    );

    // Verify product exists and belongs to tenant
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      this.logger.warn(`Product not found: ${productId}`);
      throw new NotFoundException('Producto no encontrado');
    }

    // Use findAll with productId filter
    return this.findAll({ ...filters, productId });
  }

  /**
   * Finds all stock movements for a specific warehouse within the current tenant.
   *
   * @param warehouseId - Warehouse ID to get movements for
   * @param filters - Filter and pagination options
   * @returns Paginated list of movements for the warehouse
   * @throws NotFoundException if warehouse not found
   */
  async findByWarehouse(
    warehouseId: string,
    filters: FilterMovementsDto = {},
  ): Promise<PaginatedMovementsResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Finding stock movements for warehouse ${warehouseId} in tenant ${tenantId}`,
    );

    // Verify warehouse exists and belongs to tenant
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, tenantId },
    });

    if (!warehouse) {
      this.logger.warn(`Warehouse not found: ${warehouseId}`);
      throw new NotFoundException('Almacen no encontrado');
    }

    // Use findAll with warehouseId filter
    return this.findAll({ ...filters, warehouseId });
  }

  /**
   * Creates a manual stock adjustment movement.
   *
   * Business logic:
   * 1. Only allows ADJUSTMENT type for manual creation
   * 2. Verify product exists and belongs to tenant
   * 3. Verify warehouse (if provided) exists and belongs to tenant
   * 4. Update product stock AND warehouse stock based on quantity
   * 5. Create StockMovement record with warehouseId
   * All operations are performed within a transaction.
   *
   * @param dto - Movement creation data
   * @param userId - ID of the user creating the movement (optional)
   * @returns Created stock movement data
   * @throws NotFoundException if product or warehouse not found
   * @throws BadRequestException if resulting stock would be negative
   */
  async create(
    dto: CreateMovementDto,
    userId?: string,
  ): Promise<StockMovementResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Creating stock adjustment for product ${dto.productId} in tenant ${tenantId}`,
    );

    // Verify product exists and belongs to tenant
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });

    if (!product) {
      this.logger.warn(`Product not found: ${dto.productId}`);
      throw new NotFoundException('Producto no encontrado');
    }

    // Calculate new stock
    const newStock = product.stock + dto.quantity;

    // Verify stock won't go negative
    if (newStock < 0) {
      this.logger.warn(
        `Stock adjustment would result in negative stock: current ${product.stock}, adjustment ${dto.quantity}`,
      );
      throw new BadRequestException(
        `El ajuste resultaria en stock negativo. Stock actual: ${product.stock}, ajuste: ${dto.quantity}`,
      );
    }

    // Create movement and update stock within a transaction
    const movement = await this.prisma.$transaction(async (tx) => {
      // Get warehouse ID (provided or default)
      const warehouseId =
        dto.warehouseId ?? (await this.getDefaultWarehouseId(tx, tenantId));

      // Verify warehouse exists if provided explicitly
      if (dto.warehouseId) {
        const warehouse = await tx.warehouse.findFirst({
          where: { id: dto.warehouseId, tenantId },
        });

        if (!warehouse) {
          this.logger.warn(`Warehouse not found: ${dto.warehouseId}`);
          throw new NotFoundException('Almacen no encontrado');
        }
      }

      // Get current warehouse stock to validate
      const currentWarehouseStock = await tx.warehouseStock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId,
            productId: dto.productId,
          },
        },
      });

      const currentQty = currentWarehouseStock?.quantity ?? 0;
      const newWarehouseQty = currentQty + dto.quantity;

      // Verify warehouse stock won't go negative
      if (newWarehouseQty < 0) {
        this.logger.warn(
          `Stock adjustment would result in negative warehouse stock: current ${currentQty}, adjustment ${dto.quantity}`,
        );
        throw new BadRequestException(
          `El ajuste resultaria en stock negativo en la bodega. Stock actual: ${currentQty}, ajuste: ${dto.quantity}`,
        );
      }

      await Promise.all([
        // Update Product.stock (global)
        tx.product.update({
          where: { id: dto.productId },
          data: { stock: newStock },
        }),

        // Update WarehouseStock (per-warehouse)
        tx.warehouseStock.upsert({
          where: {
            warehouseId_productId: {
              warehouseId,
              productId: dto.productId,
            },
          },
          update: { quantity: { increment: dto.quantity } },
          create: {
            tenantId,
            warehouseId,
            productId: dto.productId,
            quantity: dto.quantity,
          },
        }),
      ]);

      // Create the movement record
      const newMovement = await tx.stockMovement.create({
        data: {
          tenantId,
          productId: dto.productId,
          warehouseId,
          userId: userId ?? null,
          type: MovementType.ADJUSTMENT,
          quantity: dto.quantity,
          reason: dto.reason,
          notes: dto.notes ?? null,
        },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return newMovement;
    });

    this.logger.log(
      `Stock adjustment created: ${movement.id} for product ${product.sku}, quantity: ${dto.quantity}, new stock: ${newStock}`,
    );

    // Non-blocking: generate accounting entry for inventory adjustment
    this.accountingBridge.onStockAdjustment({
      tenantId,
      movementId: movement.id,
      productSku: product.sku,
      quantity: dto.quantity,
      costPrice: Number(product.costPrice),
    }).catch(() => {});

    return this.mapToMovementResponse(movement);
  }

  /**
   * Creates a stock transfer between two warehouses.
   *
   * Business logic:
   * 1. Verify product exists and belongs to tenant
   * 2. Verify both warehouses exist and belong to tenant
   * 3. Verify source warehouse has sufficient stock
   * 4. Decrement source warehouse stock
   * 5. Increment destination warehouse stock
   * 6. Create two movement records (out and in)
   * Product.stock remains unchanged (net zero).
   *
   * @param dto - Transfer data
   * @param userId - ID of the user creating the transfer
   * @returns Both movement records
   * @throws NotFoundException if product or warehouses not found
   * @throws BadRequestException if insufficient stock or same warehouse
   */
  async createTransfer(
    dto: CreateTransferDto,
    userId?: string,
  ): Promise<TransferResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Creating transfer for product ${dto.productId} from ${dto.sourceWarehouseId} to ${dto.destinationWarehouseId}`,
    );

    // Validate source and destination are different
    if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
      throw new BadRequestException(
        'La bodega origen y destino no pueden ser la misma',
      );
    }

    // Verify product exists and belongs to tenant
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Verify both warehouses exist
    const [sourceWarehouse, destinationWarehouse] = await Promise.all([
      this.prisma.warehouse.findFirst({
        where: { id: dto.sourceWarehouseId, tenantId },
      }),
      this.prisma.warehouse.findFirst({
        where: { id: dto.destinationWarehouseId, tenantId },
      }),
    ]);

    if (!sourceWarehouse) {
      throw new NotFoundException('Bodega origen no encontrada');
    }

    if (!destinationWarehouse) {
      throw new NotFoundException('Bodega destino no encontrada');
    }

    // Execute transfer within transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Check source warehouse stock
      const sourceStock = await tx.warehouseStock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: dto.sourceWarehouseId,
            productId: dto.productId,
          },
        },
      });

      if (!sourceStock || sourceStock.quantity < dto.quantity) {
        const available = sourceStock?.quantity ?? 0;
        throw new BadRequestException(
          `Stock insuficiente en bodega origen. Disponible: ${available}, solicitado: ${dto.quantity}`,
        );
      }

      await Promise.all([
        // Decrement source warehouse stock
        tx.warehouseStock.update({
          where: {
            warehouseId_productId: {
              warehouseId: dto.sourceWarehouseId,
              productId: dto.productId,
            },
          },
          data: { quantity: { decrement: dto.quantity } },
        }),

        // Increment destination warehouse stock (upsert)
        tx.warehouseStock.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: dto.destinationWarehouseId,
              productId: dto.productId,
            },
          },
          update: { quantity: { increment: dto.quantity } },
          create: {
            tenantId,
            warehouseId: dto.destinationWarehouseId,
            productId: dto.productId,
            quantity: dto.quantity,
          },
        }),
      ]);

      // Create movement records
      const reason =
        dto.reason ?? `Transferencia de ${sourceWarehouse.name} a ${destinationWarehouse.name}`;

      const [outMovement, inMovement] = await Promise.all([
        tx.stockMovement.create({
          data: {
            tenantId,
            productId: dto.productId,
            warehouseId: dto.sourceWarehouseId,
            userId: userId ?? null,
            type: MovementType.TRANSFER,
            quantity: -dto.quantity,
            reason: `Salida: ${reason}`,
            notes: dto.notes ?? null,
          },
          include: {
            product: { select: { id: true, sku: true, name: true } },
            warehouse: { select: { id: true, code: true, name: true } },
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        tx.stockMovement.create({
          data: {
            tenantId,
            productId: dto.productId,
            warehouseId: dto.destinationWarehouseId,
            userId: userId ?? null,
            type: MovementType.TRANSFER,
            quantity: dto.quantity,
            reason: `Entrada: ${reason}`,
            notes: dto.notes ?? null,
          },
          include: {
            product: { select: { id: true, sku: true, name: true } },
            warehouse: { select: { id: true, code: true, name: true } },
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
      ]);

      // Product.stock stays the same (net zero change)

      return { outMovement, inMovement };
    });

    this.logger.log(
      `Transfer created: ${dto.quantity} units of ${product.sku} from ${sourceWarehouse.name} to ${destinationWarehouse.name}`,
    );

    return {
      outMovement: this.mapToMovementResponse(result.outMovement),
      inMovement: this.mapToMovementResponse(result.inMovement),
    };
  }

  /**
   * Gets the default warehouse ID for a tenant.
   * Returns the main warehouse or the first active warehouse.
   *
   * @param tx - Prisma transaction client
   * @param tenantId - Tenant ID
   * @returns Default warehouse ID
   * @throws BadRequestException if no active warehouses found
   */
  private async getDefaultWarehouseId(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<string> {
    const warehouse =
      (await tx.warehouse.findFirst({
        where: { tenantId, isMain: true, status: WarehouseStatus.ACTIVE },
      })) ??
      (await tx.warehouse.findFirst({
        where: { tenantId, status: WarehouseStatus.ACTIVE },
        orderBy: { createdAt: 'asc' },
      }));

    if (!warehouse) {
      throw new BadRequestException(
        'No hay bodegas activas. Cree una bodega primero.',
      );
    }

    return warehouse.id;
  }

  /**
   * Maps a StockMovement entity to a StockMovementResponse object.
   *
   * @param movement - The movement entity to map (with or without relations)
   * @returns StockMovementResponse object
   */
  private mapToMovementResponse(
    movement: MovementWithRelations,
  ): StockMovementResponse {
    const response: StockMovementResponse = {
      id: movement.id,
      tenantId: movement.tenantId,
      productId: movement.productId,
      warehouseId: movement.warehouseId,
      userId: movement.userId,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      notes: movement.notes,
      invoiceId: movement.invoiceId,
      createdAt: movement.createdAt,
    };

    // Map product if included
    if (movement.product) {
      response.product = {
        id: movement.product.id,
        sku: movement.product.sku,
        name: movement.product.name,
      };
    }

    // Map warehouse if included
    if (movement.warehouse) {
      response.warehouse = {
        id: movement.warehouse.id,
        code: movement.warehouse.code,
        name: movement.warehouse.name,
      };
    }

    // Map user if included
    if (movement.user) {
      response.user = {
        id: movement.user.id,
        firstName: movement.user.firstName,
        lastName: movement.user.lastName,
      };
    }

    return response;
  }

  /**
   * Builds a paginated response from movements and pagination params.
   */
  private buildPaginatedResponse(
    movements: MovementWithRelations[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedMovementsResponse {
    return {
      data: movements.map((movement) => this.mapToMovementResponse(movement)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }
}
