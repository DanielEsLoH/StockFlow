import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  Invoice,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { CreatePaymentDto, FilterPaymentsDto } from './dto';

/**
 * Payment data returned in responses
 */
export interface PaymentResponse {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  paymentDate: Date;
  createdAt: Date;
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
    paymentStatus: PaymentStatus;
    customer?: {
      id: string;
      name: string;
    } | null;
  };
}

/**
 * Paginated response for payment list endpoints
 */
export interface PaginatedPaymentsResponse {
  data: PaymentResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Payment with invoice relation for internal use
 */
type PaymentWithInvoice = Payment & {
  invoice?: Invoice & {
    customer?: {
      id: string;
      name: string;
    } | null;
  };
};

/**
 * PaymentsService handles all payment recording operations including
 * payment creation with invoice status updates, payment listing,
 * and payment deletion with multi-tenant isolation.
 *
 * Payment recording follows these business rules:
 * 1. Invoice must exist and belong to the current tenant
 * 2. Payment amount cannot exceed the remaining balance
 * 3. Invoice paymentStatus is automatically updated:
 *    - UNPAID -> PARTIALLY_PAID (when partial payment)
 *    - UNPAID/PARTIALLY_PAID -> PAID (when fully paid)
 * 4. All operations are performed within transactions
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Gets aggregated statistics for all payments in the current tenant.
   *
   * @returns Payment statistics including totals, status/method breakdowns, and period summaries
   */
  async getStats(): Promise<{
    totalPayments: number;
    totalReceived: number;
    totalPending: number;
    totalRefunded: number;
    totalProcessing: number;
    averagePaymentValue: number;
    paymentsByStatus: Record<PaymentStatus, number>;
    paymentsByMethod: Record<PaymentMethod, number>;
    todayPayments: number;
    todayTotal: number;
    weekPayments: number;
    weekTotal: number;
  }> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Getting payment statistics for tenant ${tenantId}`);

    // Get date boundaries
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday

    // Get all payments for the tenant
    const payments = await this.prisma.payment.findMany({
      where: { tenantId },
      select: {
        amount: true,
        method: true,
        paymentDate: true,
      },
    });

    // Initialize status counts (payments don't have status in current schema, so we'll use PaymentStatus from invoice context)
    // For now, all recorded payments are considered PAID
    const paymentsByStatus: Record<PaymentStatus, number> = {
      [PaymentStatus.UNPAID]: 0,
      [PaymentStatus.PARTIALLY_PAID]: 0,
      [PaymentStatus.PAID]: payments.length, // All recorded payments count as paid
    };

    // Initialize method counts
    const paymentsByMethod: Record<PaymentMethod, number> = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.CREDIT_CARD]: 0,
      [PaymentMethod.DEBIT_CARD]: 0,
      [PaymentMethod.BANK_TRANSFER]: 0,
      [PaymentMethod.PSE]: 0,
      [PaymentMethod.NEQUI]: 0,
      [PaymentMethod.DAVIPLATA]: 0,
      [PaymentMethod.OTHER]: 0,
    };

    let totalReceived = 0;
    let todayPayments = 0;
    let todayTotal = 0;
    let weekPayments = 0;
    let weekTotal = 0;

    // Calculate statistics in a single pass
    for (const payment of payments) {
      const amount = Number(payment.amount);

      // Count by method
      paymentsByMethod[payment.method]++;

      // Total received
      totalReceived += amount;

      // Today's payments
      if (payment.paymentDate >= startOfToday) {
        todayPayments++;
        todayTotal += amount;
      }

      // This week's payments
      if (payment.paymentDate >= startOfWeek) {
        weekPayments++;
        weekTotal += amount;
      }
    }

    const totalPayments = payments.length;
    const averagePaymentValue = totalPayments > 0 ? totalReceived / totalPayments : 0;

    return {
      totalPayments,
      totalReceived,
      totalPending: 0, // No pending status for payments in current schema
      totalRefunded: 0, // Would need refund tracking
      totalProcessing: 0, // Would need processing status
      averagePaymentValue,
      paymentsByStatus,
      paymentsByMethod,
      todayPayments,
      todayTotal,
      weekPayments,
      weekTotal,
    };
  }

  /**
   * Lists all payments within the current tenant with filtering and pagination.
   *
   * @param filters - Filter and pagination options
   * @returns Paginated list of payments
   */
  async findAll(
    filters: FilterPaymentsDto = {},
  ): Promise<PaginatedPaymentsResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const {
      page = 1,
      limit = 10,
      invoiceId,
      method,
      fromDate,
      toDate,
    } = filters;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing payments for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    // Build where clause
    const where: Prisma.PaymentWhereInput = { tenantId };

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    if (method) {
      where.method = method;
    }

    if (fromDate || toDate) {
      where.paymentDate = {};
      if (fromDate) {
        where.paymentDate.gte = fromDate;
      }
      if (toDate) {
        where.paymentDate.lte = toDate;
      }
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          invoice: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return this.buildPaginatedResponse(payments, total, page, limit);
  }

  /**
   * Finds a single payment by ID within the current tenant.
   * Includes invoice and customer relations.
   *
   * @param id - Payment ID
   * @returns Payment data with relations
   * @throws NotFoundException if payment not found
   */
  async findOne(id: string): Promise<PaymentResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding payment ${id} in tenant ${tenantId}`);

    const payment = await this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: {
        invoice: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      this.logger.warn(`Payment not found: ${id}`);
      throw new NotFoundException('Pago no encontrado');
    }

    return this.mapToPaymentResponse(payment);
  }

  /**
   * Finds all payments for a specific invoice within the current tenant.
   *
   * @param invoiceId - Invoice ID to get payments for
   * @returns Array of payments for the invoice
   * @throws NotFoundException if invoice not found
   */
  async findByInvoice(invoiceId: string): Promise<PaymentResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Finding payments for invoice ${invoiceId} in tenant ${tenantId}`,
    );

    // Verify invoice exists and belongs to tenant
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found: ${invoiceId}`);
      throw new NotFoundException('Factura no encontrada');
    }

    const payments = await this.prisma.payment.findMany({
      where: { invoiceId, tenantId },
      orderBy: { paymentDate: 'desc' },
      include: {
        invoice: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return payments.map((payment) => this.mapToPaymentResponse(payment));
  }

  /**
   * Records a new payment against an invoice.
   *
   * Business logic:
   * 1. Verify invoice exists and belongs to tenant
   * 2. Calculate total already paid
   * 3. Verify payment doesn't exceed remaining amount
   * 4. Create payment record
   * 5. Update invoice paymentStatus (UNPAID -> PARTIALLY_PAID -> PAID)
   * All operations are performed within a transaction.
   *
   * @param dto - Payment creation data
   * @returns Created payment data
   * @throws NotFoundException if invoice not found
   * @throws BadRequestException if payment exceeds remaining balance
   */
  async create(dto: CreatePaymentDto): Promise<PaymentResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Recording payment for invoice ${dto.invoiceId} in tenant ${tenantId}`,
    );

    // Find the invoice with existing payments
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, tenantId },
      include: {
        payments: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found: ${dto.invoiceId}`);
      throw new NotFoundException('Factura no encontrada');
    }

    // Calculate total already paid
    const totalPaid = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    // Calculate remaining balance
    const invoiceTotal = Number(invoice.total);
    const remainingBalance = invoiceTotal - totalPaid;

    // Verify payment doesn't exceed remaining balance
    if (dto.amount > remainingBalance) {
      this.logger.warn(
        `Payment amount ${dto.amount} exceeds remaining balance ${remainingBalance} for invoice ${invoice.invoiceNumber}`,
      );
      throw new BadRequestException(
        `El monto del pago (${dto.amount}) excede el saldo pendiente (${remainingBalance.toFixed(2)})`,
      );
    }

    // Calculate new payment status
    const newTotalPaid = totalPaid + dto.amount;
    const newPaymentStatus = this.calculatePaymentStatus(
      newTotalPaid,
      invoiceTotal,
    );

    // Create payment within a transaction
    const payment = await this.prisma.$transaction(async (tx) => {
      // Create the payment record
      const newPayment = await tx.payment.create({
        data: {
          tenantId,
          invoiceId: dto.invoiceId,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference ?? null,
          notes: dto.notes ?? null,
          paymentDate: dto.paymentDate ?? new Date(),
        },
        include: {
          invoice: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Update invoice payment status if changed
      if (invoice.paymentStatus !== newPaymentStatus) {
        await tx.invoice.update({
          where: { id: dto.invoiceId },
          data: { paymentStatus: newPaymentStatus },
        });

        // Update the payment's invoice relation with new status
        newPayment.invoice.paymentStatus = newPaymentStatus;
      }

      return newPayment;
    });

    this.logger.log(
      `Payment recorded: ${payment.id} for invoice ${invoice.invoiceNumber}, amount: ${dto.amount}, new status: ${newPaymentStatus}`,
    );

    return this.mapToPaymentResponse(payment);
  }

  /**
   * Deletes a payment from the tenant.
   * Recalculates and updates the invoice's payment status after deletion.
   *
   * @param id - Payment ID to delete
   * @throws NotFoundException if payment not found
   */
  async delete(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting payment ${id} in tenant ${tenantId}`);

    // Find the payment with invoice
    const payment = await this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: {
        invoice: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!payment) {
      this.logger.warn(`Payment not found: ${id}`);
      throw new NotFoundException('Pago no encontrado');
    }

    // Calculate new payment status after deletion
    const paymentAmount = Number(payment.amount);
    const invoiceTotal = Number(payment.invoice.total);
    const currentTotalPaid = payment.invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const newTotalPaid = currentTotalPaid - paymentAmount;
    const newPaymentStatus = this.calculatePaymentStatus(
      newTotalPaid,
      invoiceTotal,
    );

    // Delete payment and update invoice status within a transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete the payment
      await tx.payment.delete({ where: { id } });

      // Update invoice payment status if changed
      if (payment.invoice.paymentStatus !== newPaymentStatus) {
        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: { paymentStatus: newPaymentStatus },
        });
      }
    });

    this.logger.log(
      `Payment deleted: ${id} from invoice ${payment.invoice.invoiceNumber}, new status: ${newPaymentStatus}`,
    );
  }

  /**
   * Calculates the payment status based on total paid vs invoice total.
   *
   * @param totalPaid - Total amount paid so far
   * @param invoiceTotal - Total invoice amount
   * @returns PaymentStatus (UNPAID, PARTIALLY_PAID, or PAID)
   */
  private calculatePaymentStatus(
    totalPaid: number,
    invoiceTotal: number,
  ): PaymentStatus {
    // Use a small epsilon for floating point comparison
    const epsilon = 0.01;

    if (totalPaid < epsilon) {
      return PaymentStatus.UNPAID;
    }

    if (totalPaid >= invoiceTotal - epsilon) {
      return PaymentStatus.PAID;
    }

    return PaymentStatus.PARTIALLY_PAID;
  }

  /**
   * Maps a Payment entity to a PaymentResponse object.
   *
   * @param payment - The payment entity to map (with or without relations)
   * @returns PaymentResponse object
   */
  private mapToPaymentResponse(payment: PaymentWithInvoice): PaymentResponse {
    const response: PaymentResponse = {
      id: payment.id,
      tenantId: payment.tenantId,
      invoiceId: payment.invoiceId,
      amount: Number(payment.amount),
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
      paymentDate: payment.paymentDate,
      createdAt: payment.createdAt,
    };

    // Map invoice if included
    if (payment.invoice) {
      response.invoice = {
        id: payment.invoice.id,
        invoiceNumber: payment.invoice.invoiceNumber,
        total: Number(payment.invoice.total),
        paymentStatus: payment.invoice.paymentStatus,
        customer: payment.invoice.customer ?? undefined,
      };
    }

    return response;
  }

  /**
   * Builds a paginated response from payments and pagination params.
   */
  private buildPaginatedResponse(
    payments: PaymentWithInvoice[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedPaymentsResponse {
    return {
      data: payments.map((payment) => this.mapToPaymentResponse(payment)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }
}
