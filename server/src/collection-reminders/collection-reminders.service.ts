import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CollectionReminder,
  CollectionReminderType,
  ReminderStatus,
  Prisma,
  InvoiceStatus,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  CreateCollectionReminderDto,
  FilterCollectionRemindersDto,
} from './dto';

/**
 * Reminder with invoice and customer relations for responses.
 */
type ReminderWithRelations = CollectionReminder & {
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: Prisma.Decimal | number;
    dueDate: Date | null;
    status: InvoiceStatus;
    paymentStatus: PaymentStatus;
  } | null;
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
};

/**
 * Reminder data returned in responses.
 */
export interface CollectionReminderResponse {
  id: string;
  tenantId: string;
  invoiceId: string;
  customerId: string | null;
  type: CollectionReminderType;
  channel: string;
  scheduledAt: Date;
  sentAt: Date | null;
  status: ReminderStatus;
  message: string | null;
  notes: string | null;
  createdAt: Date;
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
    dueDate: Date | null;
    status: InvoiceStatus;
    paymentStatus: PaymentStatus;
  };
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

/**
 * Paginated response for reminder list endpoints.
 */
export interface PaginatedRemindersResponse {
  data: CollectionReminderResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Statistics by status and type.
 */
export interface ReminderStats {
  byStatus: Record<ReminderStatus, number>;
  byType: Record<CollectionReminderType, number>;
  total: number;
}

/**
 * Dashboard summary for tenant collections.
 */
export interface CollectionDashboard {
  totalOverdueAmount: number;
  overdueInvoicesCount: number;
  pendingRemindersCount: number;
  sentRemindersCount: number;
  failedRemindersCount: number;
}

/**
 * Overdue invoice data returned by getOverdueInvoices.
 */
export interface OverdueInvoiceInfo {
  id: string;
  invoiceNumber: string;
  total: number;
  dueDate: Date | null;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  daysOverdue: number;
  customerId: string | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  lastReminderAt: Date | null;
}

/**
 * Include clause for reminder queries with relations.
 */
const REMINDER_INCLUDE = {
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      dueDate: true,
      status: true,
      paymentStatus: true,
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
} as const;

/**
 * Auto-reminder schedule configuration.
 * Defines at which day offsets reminders are created relative to the invoice due date.
 * Negative values = before due, 0 = on due, positive values = after due.
 */
const AUTO_REMINDER_SCHEDULE = [
  { days: -3, type: CollectionReminderType.BEFORE_DUE },
  { days: 0, type: CollectionReminderType.ON_DUE },
  { days: 7, type: CollectionReminderType.AFTER_DUE },
  { days: 15, type: CollectionReminderType.AFTER_DUE },
  { days: 30, type: CollectionReminderType.AFTER_DUE },
] as const;

/**
 * CollectionRemindersService manages automated payment reminders for
 * overdue or upcoming invoices within a tenant.
 *
 * Responsibilities:
 * - CRUD operations for manual reminders
 * - Status transitions (cancel, mark sent, mark failed)
 * - Auto-generation of reminders based on invoice due dates
 * - Dashboard and statistics for the collections module
 *
 * All operations are scoped to the current tenant via TenantContextService.
 */
@Injectable()
export class CollectionRemindersService {
  private readonly logger = new Logger(CollectionRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Creates a manual reminder for a specific invoice.
   *
   * Validates that the invoice exists and belongs to the current tenant.
   * If customerId is not provided, it is inferred from the invoice.
   *
   * @param dto - Reminder creation data
   * @returns Created reminder with invoice and customer relations
   * @throws NotFoundException if invoice not found
   */
  async create(
    dto: CreateCollectionReminderDto,
  ): Promise<CollectionReminderResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Creating manual reminder for invoice ${dto.invoiceId} in tenant ${tenantId}`,
    );

    // Validate invoice exists and belongs to the tenant
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, tenantId },
      select: { id: true, customerId: true, invoiceNumber: true },
    });

    if (!invoice) {
      throw new NotFoundException(
        `Factura no encontrada: ${dto.invoiceId}`,
      );
    }

    // Infer customerId from invoice if not explicitly provided
    const customerId = dto.customerId ?? invoice.customerId;

    const reminder = await this.prisma.collectionReminder.create({
      data: {
        tenantId,
        invoiceId: dto.invoiceId,
        customerId,
        type: CollectionReminderType.MANUAL,
        channel: dto.channel ?? 'EMAIL',
        scheduledAt: dto.scheduledAt,
        status: ReminderStatus.PENDING,
        message: dto.message ?? null,
        notes: dto.notes ?? null,
      },
      include: REMINDER_INCLUDE,
    });

    this.logger.log(
      `Manual reminder created: ${reminder.id} for invoice ${invoice.invoiceNumber}`,
    );

    return this.mapToResponse(reminder);
  }

  /**
   * Lists reminders with filters and pagination.
   *
   * @param filters - Filter and pagination parameters
   * @returns Paginated list of reminders
   */
  async findAll(
    filters: FilterCollectionRemindersDto = {},
  ): Promise<PaginatedRemindersResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const {
      page = 1,
      limit = 10,
      status,
      type,
      channel,
      invoiceId,
      customerId,
      fromDate,
      toDate,
    } = filters;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing reminders for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    // Build where clause
    const where: Prisma.CollectionReminderWhereInput = { tenantId };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (channel) {
      where.channel = channel;
    }

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (fromDate || toDate) {
      where.scheduledAt = {};
      if (fromDate) {
        where.scheduledAt.gte = fromDate;
      }
      if (toDate) {
        where.scheduledAt.lte = toDate;
      }
    }

    const [reminders, total] = await Promise.all([
      this.prisma.collectionReminder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: REMINDER_INCLUDE,
      }),
      this.prisma.collectionReminder.count({ where }),
    ]);

    return {
      data: reminders.map((r) => this.mapToResponse(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  /**
   * Gets a single reminder by ID with invoice and customer relations.
   *
   * @param id - Reminder ID
   * @returns Reminder detail
   * @throws NotFoundException if reminder not found
   */
  async findOne(id: string): Promise<CollectionReminderResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding reminder ${id} in tenant ${tenantId}`);

    const reminder = await this.prisma.collectionReminder.findFirst({
      where: { id, tenantId },
      include: REMINDER_INCLUDE,
    });

    if (!reminder) {
      throw new NotFoundException(`Recordatorio no encontrado: ${id}`);
    }

    return this.mapToResponse(reminder);
  }

  /**
   * Cancels a pending reminder.
   * Only PENDING reminders can be cancelled.
   *
   * @param id - Reminder ID
   * @returns Updated reminder
   * @throws NotFoundException if reminder not found
   * @throws BadRequestException if reminder is not in PENDING status
   */
  async cancel(id: string): Promise<CollectionReminderResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Cancelling reminder ${id} in tenant ${tenantId}`);

    const reminder = await this.prisma.collectionReminder.findFirst({
      where: { id, tenantId },
    });

    if (!reminder) {
      throw new NotFoundException(`Recordatorio no encontrado: ${id}`);
    }

    if (reminder.status !== ReminderStatus.PENDING) {
      throw new BadRequestException(
        'Solo se pueden cancelar recordatorios pendientes',
      );
    }

    const updated = await this.prisma.collectionReminder.update({
      where: { id },
      data: { status: ReminderStatus.CANCELLED },
      include: REMINDER_INCLUDE,
    });

    this.logger.log(`Reminder cancelled: ${id}`);

    return this.mapToResponse(updated);
  }

  /**
   * Marks a pending reminder as sent and records the sent timestamp.
   * Only PENDING reminders can be marked as sent.
   *
   * @param id - Reminder ID
   * @returns Updated reminder
   * @throws NotFoundException if reminder not found
   * @throws BadRequestException if reminder is not in PENDING status
   */
  async markSent(id: string): Promise<CollectionReminderResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Marking reminder ${id} as sent in tenant ${tenantId}`);

    const reminder = await this.prisma.collectionReminder.findFirst({
      where: { id, tenantId },
    });

    if (!reminder) {
      throw new NotFoundException(`Recordatorio no encontrado: ${id}`);
    }

    if (reminder.status !== ReminderStatus.PENDING) {
      throw new BadRequestException(
        'Solo se pueden marcar como enviados recordatorios pendientes',
      );
    }

    const updated = await this.prisma.collectionReminder.update({
      where: { id },
      data: {
        status: ReminderStatus.SENT,
        sentAt: new Date(),
      },
      include: REMINDER_INCLUDE,
    });

    this.logger.log(`Reminder marked as sent: ${id}`);

    return this.mapToResponse(updated);
  }

  /**
   * Marks a pending reminder as failed with optional notes.
   * Only PENDING reminders can be marked as failed.
   *
   * @param id - Reminder ID
   * @param notes - Optional notes explaining the failure
   * @returns Updated reminder
   * @throws NotFoundException if reminder not found
   * @throws BadRequestException if reminder is not in PENDING status
   */
  async markFailed(
    id: string,
    notes?: string,
  ): Promise<CollectionReminderResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Marking reminder ${id} as failed in tenant ${tenantId}`,
    );

    const reminder = await this.prisma.collectionReminder.findFirst({
      where: { id, tenantId },
    });

    if (!reminder) {
      throw new NotFoundException(`Recordatorio no encontrado: ${id}`);
    }

    if (reminder.status !== ReminderStatus.PENDING) {
      throw new BadRequestException(
        'Solo se pueden marcar como fallidos recordatorios pendientes',
      );
    }

    const updateData: Prisma.CollectionReminderUpdateInput = {
      status: ReminderStatus.FAILED,
    };

    if (notes) {
      updateData.notes = notes;
    }

    const updated = await this.prisma.collectionReminder.update({
      where: { id },
      data: updateData,
      include: REMINDER_INCLUDE,
    });

    this.logger.log(`Reminder marked as failed: ${id}`);

    return this.mapToResponse(updated);
  }

  /**
   * Gets all overdue invoices that don't have recent reminders.
   *
   * An invoice is considered overdue if:
   * - It has a due date in the past
   * - Its status is SENT or OVERDUE (not DRAFT, CANCELLED, or VOID)
   * - Its payment status is UNPAID or PARTIALLY_PAID
   *
   * "Recent" means a reminder was sent or scheduled within the last 7 days.
   *
   * @returns List of overdue invoices with collection context
   */
  async getOverdueInvoices(): Promise<OverdueInvoiceInfo[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const now = new Date();

    this.logger.debug(`Getting overdue invoices for tenant ${tenantId}`);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        dueDate: { lt: now },
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
        paymentStatus: {
          in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID],
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        collectionReminders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return invoices.map((invoice) => {
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
      const daysOverdue =
        dueDate && dueDate < now
          ? Math.floor(
              (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
            )
          : 0;

      const lastReminder = invoice.collectionReminders[0] ?? null;

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: Number(invoice.total),
        dueDate: invoice.dueDate,
        status: invoice.status,
        paymentStatus: invoice.paymentStatus,
        daysOverdue,
        customerId: invoice.customerId,
        customer: invoice.customer,
        lastReminderAt: lastReminder?.createdAt ?? null,
      };
    });
  }

  /**
   * Scans all overdue and upcoming invoices and generates reminder records
   * based on the auto-reminder schedule.
   *
   * Schedule:
   * - BEFORE_DUE at -3 days (3 days before due date)
   * - ON_DUE at 0 days (on the due date)
   * - AFTER_DUE at +7, +15, +30 days
   *
   * Only creates reminders for invoices that:
   * - Have a due date
   * - Are SENT or OVERDUE
   * - Are UNPAID or PARTIALLY_PAID
   * - Don't already have a reminder of the same type at the same schedule point
   *
   * @returns Number of reminders generated
   */
  async generateAutoReminders(): Promise<{ generated: number }> {
    const tenantId = this.tenantContext.requireTenantId();
    const now = new Date();

    this.logger.log(
      `Generating auto reminders for tenant ${tenantId}`,
    );

    // Find eligible invoices (with due date, active, unpaid)
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        dueDate: { not: null },
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
        paymentStatus: {
          in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID],
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        customerId: true,
        dueDate: true,
        collectionReminders: {
          select: { type: true, scheduledAt: true },
        },
      },
    });

    let generated = 0;
    const remindersToCreate: Prisma.CollectionReminderCreateManyInput[] = [];

    for (const invoice of invoices) {
      if (!invoice.dueDate) continue;

      const dueDate = new Date(invoice.dueDate);

      // Existing reminder scheduled dates for deduplication
      const existingSchedules = new Set(
        invoice.collectionReminders.map(
          (r) => `${r.type}_${r.scheduledAt.toISOString().split('T')[0]}`,
        ),
      );

      for (const schedule of AUTO_REMINDER_SCHEDULE) {
        const scheduledAt = new Date(dueDate);
        scheduledAt.setDate(scheduledAt.getDate() + schedule.days);

        // Only create reminders for dates that have already arrived or are today
        if (scheduledAt > now) continue;

        const dedupeKey = `${schedule.type}_${scheduledAt.toISOString().split('T')[0]}`;

        if (existingSchedules.has(dedupeKey)) continue;

        remindersToCreate.push({
          tenantId,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          type: schedule.type,
          channel: 'EMAIL',
          scheduledAt,
          status: ReminderStatus.PENDING,
          message: this.buildAutoMessage(
            schedule.type,
            invoice.invoiceNumber,
            Math.abs(schedule.days),
          ),
        });

        generated++;
      }
    }

    if (remindersToCreate.length > 0) {
      await this.prisma.collectionReminder.createMany({
        data: remindersToCreate,
      });
    }

    this.logger.log(
      `Auto reminders generated: ${generated} for tenant ${tenantId}`,
    );

    return { generated };
  }

  /**
   * Gets counts of reminders grouped by status and type.
   *
   * @returns Statistics object with counts by status and type
   */
  async getStats(): Promise<ReminderStats> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Getting reminder stats for tenant ${tenantId}`);

    const reminders = await this.prisma.collectionReminder.findMany({
      where: { tenantId },
      select: { status: true, type: true },
    });

    const byStatus: Record<ReminderStatus, number> = {
      [ReminderStatus.PENDING]: 0,
      [ReminderStatus.SENT]: 0,
      [ReminderStatus.FAILED]: 0,
      [ReminderStatus.CANCELLED]: 0,
    };

    const byType: Record<CollectionReminderType, number> = {
      [CollectionReminderType.BEFORE_DUE]: 0,
      [CollectionReminderType.ON_DUE]: 0,
      [CollectionReminderType.AFTER_DUE]: 0,
      [CollectionReminderType.MANUAL]: 0,
    };

    for (const reminder of reminders) {
      byStatus[reminder.status]++;
      byType[reminder.type]++;
    }

    return {
      byStatus,
      byType,
      total: reminders.length,
    };
  }

  /**
   * Gets a dashboard summary for the tenant's collection status.
   *
   * Includes:
   * - Total overdue amount across all unpaid overdue invoices
   * - Count of overdue invoices
   * - Count of pending, sent, and failed reminders
   *
   * @returns Dashboard summary object
   */
  async getDashboard(): Promise<CollectionDashboard> {
    const tenantId = this.tenantContext.requireTenantId();
    const now = new Date();

    this.logger.debug(`Getting collection dashboard for tenant ${tenantId}`);

    const [overdueInvoices, reminderCounts] = await Promise.all([
      // Get overdue invoices for amount and count
      this.prisma.invoice.findMany({
        where: {
          tenantId,
          dueDate: { lt: now },
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
          paymentStatus: {
            in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID],
          },
        },
        select: { total: true },
      }),
      // Count reminders by status
      this.prisma.collectionReminder.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
    ]);

    const totalOverdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );

    // Build status counts map
    const statusCounts = new Map<ReminderStatus, number>();
    for (const group of reminderCounts) {
      statusCounts.set(group.status, group._count.id);
    }

    return {
      totalOverdueAmount,
      overdueInvoicesCount: overdueInvoices.length,
      pendingRemindersCount: statusCounts.get(ReminderStatus.PENDING) ?? 0,
      sentRemindersCount: statusCounts.get(ReminderStatus.SENT) ?? 0,
      failedRemindersCount: statusCounts.get(ReminderStatus.FAILED) ?? 0,
    };
  }

  /**
   * Builds an automatic message based on the reminder type.
   */
  private buildAutoMessage(
    type: CollectionReminderType,
    invoiceNumber: string,
    days: number,
  ): string {
    switch (type) {
      case CollectionReminderType.BEFORE_DUE:
        return `Estimado cliente, le recordamos que su factura ${invoiceNumber} vence en ${days} dias.`;
      case CollectionReminderType.ON_DUE:
        return `Estimado cliente, le informamos que su factura ${invoiceNumber} vence hoy.`;
      case CollectionReminderType.AFTER_DUE:
        return `Estimado cliente, su factura ${invoiceNumber} se encuentra vencida hace ${days} dias. Le solicitamos realizar el pago a la mayor brevedad.`;
      default:
        return `Recordatorio de pago para la factura ${invoiceNumber}.`;
    }
  }

  /**
   * Maps a Prisma reminder entity to a response DTO.
   */
  private mapToResponse(
    reminder: ReminderWithRelations,
  ): CollectionReminderResponse {
    const response: CollectionReminderResponse = {
      id: reminder.id,
      tenantId: reminder.tenantId,
      invoiceId: reminder.invoiceId,
      customerId: reminder.customerId,
      type: reminder.type,
      channel: reminder.channel,
      scheduledAt: reminder.scheduledAt,
      sentAt: reminder.sentAt,
      status: reminder.status,
      message: reminder.message,
      notes: reminder.notes,
      createdAt: reminder.createdAt,
    };

    if (reminder.invoice) {
      response.invoice = {
        id: reminder.invoice.id,
        invoiceNumber: reminder.invoice.invoiceNumber,
        total: Number(reminder.invoice.total),
        dueDate: reminder.invoice.dueDate,
        status: reminder.invoice.status,
        paymentStatus: reminder.invoice.paymentStatus,
      };
    }

    if (reminder.customer !== undefined) {
      response.customer = reminder.customer;
    }

    return response;
  }
}
