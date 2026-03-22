import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RecurringInterval, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma';

@Injectable()
export class RecurringInvoicesCronService {
  private readonly logger = new Logger(RecurringInvoicesCronService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: template.autoSend ? InvoiceStatus.SENT : InvoiceStatus.DRAFT,
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

  calculateNextIssueDate(current: Date, interval: RecurringInterval): Date {
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
