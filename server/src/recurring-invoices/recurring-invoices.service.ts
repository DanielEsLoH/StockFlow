import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  CreateRecurringInvoiceDto,
  UpdateRecurringInvoiceDto,
} from './dto';

@Injectable()
export class RecurringInvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateRecurringInvoiceDto) {
    const tenantId = this.tenantContext.requireTenantId();

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) {
      throw new BadRequestException('Cliente no encontrado');
    }

    return this.prisma.recurringInvoice.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        warehouseId: dto.warehouseId || null,
        notes: dto.notes || null,
        items: dto.items as any,
        interval: dto.interval,
        nextIssueDate: new Date(dto.nextIssueDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        autoSend: dto.autoSend ?? false,
        autoEmail: dto.autoEmail ?? false,
      },
      include: { customer: true },
    });
  }

  async findAll(page = 1, limit = 20) {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.recurringInvoice.findMany({
        where: { tenantId },
        include: { customer: true, _count: { select: { invoices: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.recurringInvoice.count({ where: { tenantId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  async findOne(id: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const record = await this.prisma.recurringInvoice.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { customer: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Factura recurrente no encontrada');
    }

    return record;
  }

  async update(id: string, dto: UpdateRecurringInvoiceDto) {
    const tenantId = this.tenantContext.requireTenantId();

    const existing = await this.prisma.recurringInvoice.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Factura recurrente no encontrada');
    }

    return this.prisma.recurringInvoice.update({
      where: { id },
      data: {
        ...(dto.customerId && { customerId: dto.customerId }),
        ...(dto.warehouseId !== undefined && {
          warehouseId: dto.warehouseId || null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes || null }),
        ...(dto.items && { items: dto.items as any }),
        ...(dto.interval && { interval: dto.interval }),
        ...(dto.nextIssueDate && {
          nextIssueDate: new Date(dto.nextIssueDate),
        }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
        ...(dto.autoSend !== undefined && { autoSend: dto.autoSend }),
        ...(dto.autoEmail !== undefined && { autoEmail: dto.autoEmail }),
      },
      include: { customer: true },
    });
  }

  async toggle(id: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const existing = await this.prisma.recurringInvoice.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Factura recurrente no encontrada');
    }

    return this.prisma.recurringInvoice.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: { customer: true },
    });
  }

  async remove(id: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const existing = await this.prisma.recurringInvoice.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Factura recurrente no encontrada');
    }

    await this.prisma.recurringInvoice.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Factura recurrente desactivada' };
  }
}
