import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RecurringInterval, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { InvoicesService } from '../invoices/invoices.service';
import {
  CreateRecurringInvoiceDto,
  UpdateRecurringInvoiceDto,
} from './dto';

@Injectable()
export class RecurringInvoicesService {
  private readonly logger = new Logger(RecurringInvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly invoicesService: InvoicesService,
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

  /**
   * Cron job: processes recurring invoices daily at 7:00 AM Bogota time.
   * Finds all active templates where nextIssueDate <= now and generates invoices.
   */
  @Cron('0 7 * * *', {
    name: 'process-recurring-invoices',
    timeZone: 'America/Bogota',
  })
  async processRecurringInvoices(): Promise<void> {
    this.logger.log('Processing recurring invoices...');
    const now = new Date();

    const dueTemplates = await this.prisma.recurringInvoice.findMany({
      where: {
        isActive: true,
        nextIssueDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      include: { customer: true, tenant: true },
    });

    this.logger.log(
      `Found ${dueTemplates.length} recurring invoices to process`,
    );

    for (const template of dueTemplates) {
      try {
        await this.generateInvoiceFromTemplate(template);
      } catch (error) {
        this.logger.error(
          `Failed to process recurring invoice ${template.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  private async generateInvoiceFromTemplate(template: any): Promise<void> {
    const items = template.items as Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      discount?: number;
      taxCategory?: string;
    }>;

    // Use TenantContextService to set tenant context for the InvoicesService
    // Since the cron job runs outside a request, we need to use a transaction
    // that mimics the tenant context
    const createDto = {
      customerId: template.customerId,
      warehouseId: template.warehouseId || undefined,
      notes: template.notes || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discount: item.discount || 0,
        taxCategory: item.taxCategory,
      })),
    };

    // Create invoice directly via Prisma within the tenant context
    // We generate the invoice number and create items manually
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { tenantId: template.tenantId },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    const nextNumber = lastInvoice
      ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, ''), 10) + 1
      : 1;
    const invoiceNumber = `INV-${String(nextNumber).padStart(5, '0')}`;

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId: template.tenantId,
        customerId: template.customerId,
        warehouseId: template.warehouseId,
        invoiceNumber,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: template.autoSend
          ? InvoiceStatus.SENT
          : InvoiceStatus.DRAFT,
        notes: template.notes,
        subtotal: 0,
        tax: 0,
        total: 0,
        source: 'MANUAL',
        recurringInvoiceId: template.id,
        items: {
          create: items.map((item) => {
            const subtotal = item.quantity * item.unitPrice;
            const discountAmount = subtotal * ((item.discount || 0) / 100);
            const taxableAmount = subtotal - discountAmount;
            const tax = taxableAmount * (item.taxRate / 100);
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              discount: item.discount || 0,
              subtotal: taxableAmount,
              tax,
              total: taxableAmount + tax,
            };
          }),
        },
      },
      include: { items: true },
    });

    // Update totals
    const totals = invoice.items.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + Number(item.subtotal),
        tax: acc.tax + Number(item.tax),
        total: acc.total + Number(item.total),
      }),
      { subtotal: 0, tax: 0, total: 0 },
    );

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
      },
    });

    // Update recurring invoice: next issue date + last issued
    const nextIssueDate = this.calculateNextIssueDate(
      template.nextIssueDate,
      template.interval,
    );

    await this.prisma.recurringInvoice.update({
      where: { id: template.id },
      data: {
        nextIssueDate,
        lastIssuedAt: new Date(),
      },
    });

    this.logger.log(
      `Generated invoice ${invoiceNumber} from recurring template ${template.id}`,
    );
  }

  calculateNextIssueDate(
    current: Date,
    interval: RecurringInterval,
  ): Date {
    const next = new Date(current);
    switch (interval) {
      case RecurringInterval.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case RecurringInterval.BIWEEKLY:
        next.setDate(next.getDate() + 14);
        break;
      case RecurringInterval.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case RecurringInterval.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case RecurringInterval.ANNUAL:
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }
}
