import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  Prisma,
  Supplier,
  Account,
  CostCenter,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountingBridgeService } from '../accounting';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  FilterExpensesDto,
  PayExpenseDto,
} from './dto';

/**
 * Expense data returned in responses
 */
export interface ExpenseResponse {
  id: string;
  tenantId: string;
  expenseNumber: string;
  category: ExpenseCategory;
  description: string;
  supplierId: string | null;
  accountId: string | null;
  costCenterId: string | null;
  subtotal: number;
  taxRate: number;
  tax: number;
  reteFuente: number;
  total: number;
  status: ExpenseStatus;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentDate: Date | null;
  issueDate: Date;
  dueDate: Date | null;
  invoiceNumber: string | null;
  approvedAt: Date | null;
  approvedById: string | null;
  createdById: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  supplier?: {
    id: string;
    name: string;
    documentNumber: string;
  } | null;
  account?: {
    id: string;
    code: string;
    name: string;
  } | null;
  costCenter?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

/**
 * Paginated response for expense list endpoints
 */
export interface PaginatedExpensesResponse {
  data: ExpenseResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Expense statistics response
 */
export interface ExpenseStatsResponse {
  countsByStatus: Record<ExpenseStatus, number>;
  totalsByCategory: Record<string, number>;
  grandTotal: number;
}

/**
 * Expense with relations for internal use
 */
type ExpenseWithRelations = Expense & {
  supplier?: Supplier | null;
  account?: Account | null;
  costCenter?: CostCenter | null;
};

/** ReteFuente rate for HONORARIOS expenses (2.5%) */
const RETE_FUENTE_HONORARIOS_RATE = 0.025;

/** Minimum subtotal (in COP) for ReteFuente to apply on HONORARIOS */
const RETE_FUENTE_HONORARIOS_MIN_BASE = 523740;

/**
 * ExpensesService handles all expense management operations including
 * CRUD operations, status transitions (DRAFT -> APPROVED -> PAID),
 * amount calculations (tax, ReteFuente), and monthly statistics,
 * all with multi-tenant isolation.
 */
@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly accountingBridge: AccountingBridgeService,
  ) {}

  /**
   * Creates a new expense within the current tenant.
   * Generates a sequential expense number (GTO-XXXXX) inside a transaction.
   * Calculates tax, ReteFuente (for HONORARIOS >= threshold), and total.
   *
   * @param dto - Expense creation data
   * @param userId - ID of the user creating the expense
   * @returns Created expense data with relations
   */
  async create(
    dto: CreateExpenseDto,
    userId: string,
  ): Promise<ExpenseResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Creating expense for tenant ${tenantId} by user ${userId}`,
    );

    // Validate supplier if provided
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      });

      if (!supplier) {
        throw new NotFoundException('Proveedor no encontrado');
      }
    }

    // Validate account if provided
    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, tenantId },
      });

      if (!account) {
        throw new NotFoundException('Cuenta contable no encontrada');
      }
    }

    // Validate cost center if provided
    if (dto.costCenterId) {
      const costCenter = await this.prisma.costCenter.findFirst({
        where: { id: dto.costCenterId, tenantId },
      });

      if (!costCenter) {
        throw new NotFoundException('Centro de costo no encontrado');
      }
    }

    // Calculate amounts
    const taxRate = dto.taxRate ?? 0;
    const tax = dto.subtotal * (taxRate / 100);
    const reteFuente =
      dto.category === ExpenseCategory.HONORARIOS &&
      dto.subtotal >= RETE_FUENTE_HONORARIOS_MIN_BASE
        ? Math.round(dto.subtotal * RETE_FUENTE_HONORARIOS_RATE)
        : 0;
    const total = dto.subtotal + tax - reteFuente;

    // Create expense within a transaction
    const expense = await this.prisma.$transaction(async (tx) => {
      const expenseNumber = await this.generateExpenseNumber(tx);

      const newExpense = await tx.expense.create({
        data: {
          tenantId,
          expenseNumber,
          category: dto.category,
          description: dto.description,
          supplierId: dto.supplierId ?? null,
          accountId: dto.accountId ?? null,
          costCenterId: dto.costCenterId ?? null,
          subtotal: dto.subtotal,
          taxRate,
          tax,
          reteFuente,
          total,
          status: ExpenseStatus.DRAFT,
          issueDate: dto.issueDate ?? new Date(),
          dueDate: dto.dueDate ?? null,
          invoiceNumber: dto.invoiceNumber ?? null,
          createdById: userId,
          notes: dto.notes ?? null,
        },
        include: {
          supplier: true,
          account: true,
          costCenter: true,
        },
      });

      return newExpense;
    });

    this.logger.log(
      `Expense created: ${expense.expenseNumber} (${expense.id})`,
    );

    return this.mapToResponse(expense);
  }

  /**
   * Lists all expenses within the current tenant with filtering and pagination.
   * Supports search by expense number and description, filtering by status,
   * category, supplier, and date range.
   *
   * @param filters - Filter and pagination options
   * @returns Paginated list of expenses
   */
  async findAll(
    filters: FilterExpensesDto = {},
  ): Promise<PaginatedExpensesResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const {
      page = 1,
      limit = 10,
      status,
      category,
      supplierId,
      fromDate,
      toDate,
      search,
    } = filters;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing expenses for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    // Build where clause
    const where: Prisma.ExpenseWhereInput = { tenantId };

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (fromDate || toDate) {
      where.issueDate = {};
      if (fromDate) {
        where.issueDate.gte = new Date(fromDate);
      }
      if (toDate) {
        where.issueDate.lte = new Date(toDate);
      }
    }

    // Search in expense number and description
    if (search) {
      where.OR = [
        {
          expenseNumber: { contains: search, mode: 'insensitive' },
        },
        {
          description: { contains: search, mode: 'insensitive' },
        },
      ];
    }

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              documentNumber: true,
            },
          },
          account: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          costCenter: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data: expenses.map((expense) =>
        this.mapToResponse(expense as ExpenseWithRelations),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  /**
   * Finds a single expense by ID within the current tenant.
   * Includes supplier, account, and cost center relations.
   *
   * @param id - Expense ID
   * @returns Expense data with full relations
   * @throws NotFoundException if expense not found
   */
  async findOne(id: string): Promise<ExpenseResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding expense ${id} in tenant ${tenantId}`);

    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        account: true,
        costCenter: true,
      },
    });

    if (!expense) {
      this.logger.warn(`Expense not found: ${id}`);
      throw new NotFoundException('Gasto no encontrado');
    }

    return this.mapToResponse(expense);
  }

  /**
   * Updates an existing expense.
   * Only DRAFT expenses can be fully updated.
   * Recalculates amounts if subtotal, taxRate, or category changed.
   *
   * @param id - Expense ID to update
   * @param dto - Update data
   * @returns Updated expense data
   * @throws NotFoundException if expense not found
   * @throws ConflictException if expense is not in DRAFT status
   */
  async update(
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Updating expense ${id} in tenant ${tenantId}`);

    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });

    if (!expense) {
      this.logger.warn(`Expense not found: ${id}`);
      throw new NotFoundException('Gasto no encontrado');
    }

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new ConflictException(
        'Solo se pueden editar gastos en estado borrador',
      );
    }

    // Build update data
    const updateData: Prisma.ExpenseUpdateInput = {};

    if (dto.category !== undefined) {
      updateData.category = dto.category;
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.supplierId !== undefined) {
      if (dto.supplierId) {
        const supplier = await this.prisma.supplier.findFirst({
          where: { id: dto.supplierId, tenantId },
        });

        if (!supplier) {
          throw new NotFoundException('Proveedor no encontrado');
        }

        updateData.supplier = { connect: { id: dto.supplierId } };
      } else {
        updateData.supplier = { disconnect: true };
      }
    }

    if (dto.accountId !== undefined) {
      if (dto.accountId) {
        const account = await this.prisma.account.findFirst({
          where: { id: dto.accountId, tenantId },
        });

        if (!account) {
          throw new NotFoundException('Cuenta contable no encontrada');
        }

        updateData.account = { connect: { id: dto.accountId } };
      } else {
        updateData.account = { disconnect: true };
      }
    }

    if (dto.costCenterId !== undefined) {
      if (dto.costCenterId) {
        const costCenter = await this.prisma.costCenter.findFirst({
          where: { id: dto.costCenterId, tenantId },
        });

        if (!costCenter) {
          throw new NotFoundException('Centro de costo no encontrado');
        }

        updateData.costCenter = { connect: { id: dto.costCenterId } };
      } else {
        updateData.costCenter = { disconnect: true };
      }
    }

    if (dto.issueDate !== undefined) {
      updateData.issueDate = dto.issueDate;
    }

    if (dto.dueDate !== undefined) {
      updateData.dueDate = dto.dueDate;
    }

    if (dto.invoiceNumber !== undefined) {
      updateData.invoiceNumber = dto.invoiceNumber;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    if (dto.paymentMethod !== undefined) {
      updateData.paymentMethod = dto.paymentMethod;
    }

    if (dto.paymentReference !== undefined) {
      updateData.paymentReference = dto.paymentReference;
    }

    if (dto.paymentDate !== undefined) {
      updateData.paymentDate = dto.paymentDate;
    }

    // Recalculate amounts if subtotal, taxRate, or category changed
    if (
      dto.subtotal !== undefined ||
      dto.taxRate !== undefined ||
      dto.category !== undefined
    ) {
      const subtotal = dto.subtotal ?? Number(expense.subtotal);
      const taxRate = dto.taxRate ?? Number(expense.taxRate);
      const category = dto.category ?? expense.category;

      const tax = subtotal * (taxRate / 100);
      const reteFuente =
        category === ExpenseCategory.HONORARIOS &&
        subtotal >= RETE_FUENTE_HONORARIOS_MIN_BASE
          ? Math.round(subtotal * RETE_FUENTE_HONORARIOS_RATE)
          : 0;
      const total = subtotal + tax - reteFuente;

      updateData.subtotal = subtotal;
      updateData.taxRate = taxRate;
      updateData.tax = tax;
      updateData.reteFuente = reteFuente;
      updateData.total = total;
    }

    const updatedExpense = await this.prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        supplier: true,
        account: true,
        costCenter: true,
      },
    });

    this.logger.log(
      `Expense updated: ${updatedExpense.expenseNumber} (${updatedExpense.id})`,
    );

    return this.mapToResponse(updatedExpense);
  }

  /**
   * Approves an expense (changes status from DRAFT to APPROVED).
   * Sets the approvedAt timestamp and approvedById.
   *
   * @param id - Expense ID to approve
   * @param userId - ID of the user approving the expense
   * @returns Updated expense data
   * @throws NotFoundException if expense not found
   * @throws ConflictException if expense is not in DRAFT status
   */
  async approve(id: string, userId: string): Promise<ExpenseResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Approving expense ${id} in tenant ${tenantId}`);

    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });

    if (!expense) {
      this.logger.warn(`Expense not found: ${id}`);
      throw new NotFoundException('Gasto no encontrado');
    }

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new ConflictException(
        'Solo se pueden aprobar gastos en estado borrador',
      );
    }

    const updatedExpense = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: userId,
      },
      include: {
        supplier: true,
        account: true,
        costCenter: true,
      },
    });

    this.logger.log(
      `Expense approved: ${updatedExpense.expenseNumber} (${updatedExpense.id})`,
    );

    return this.mapToResponse(updatedExpense);
  }

  /**
   * Pays an expense (changes status from APPROVED to PAID).
   * Sets payment fields and triggers accounting bridge entry.
   *
   * @param id - Expense ID to pay
   * @param dto - Payment data (method, reference, date)
   * @returns Updated expense data
   * @throws NotFoundException if expense not found
   * @throws ConflictException if expense is not in APPROVED status
   */
  async pay(id: string, dto: PayExpenseDto): Promise<ExpenseResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Paying expense ${id} in tenant ${tenantId}`);

    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });

    if (!expense) {
      this.logger.warn(`Expense not found: ${id}`);
      throw new NotFoundException('Gasto no encontrado');
    }

    if (expense.status !== ExpenseStatus.APPROVED) {
      throw new ConflictException(
        'Solo se pueden pagar gastos en estado aprobado',
      );
    }

    const updatedExpense = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.PAID,
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference ?? null,
        paymentDate: dto.paymentDate ?? new Date(),
      },
      include: {
        supplier: true,
        account: true,
        costCenter: true,
      },
    });

    this.logger.log(
      `Expense paid: ${updatedExpense.expenseNumber} (${updatedExpense.id})`,
    );

    // Generate accounting entry (non-blocking)
    // Note: onExpensePaid will be added to AccountingBridgeService
    try {
      await (this.accountingBridge as any).onExpensePaid({
        tenantId,
        expenseId: updatedExpense.id,
        expenseNumber: updatedExpense.expenseNumber,
        description: updatedExpense.description,
        subtotal: Number(updatedExpense.subtotal),
        tax: Number(updatedExpense.tax),
        reteFuente: Number(updatedExpense.reteFuente),
        total: Number(updatedExpense.total),
        paymentMethod: dto.paymentMethod,
        expenseAccountId: updatedExpense.accountId,
        costCenterId: updatedExpense.costCenterId,
      });
    } catch (error) {
      // Log but don't block - accounting entries can be created manually
      console.error('Failed to create expense journal entry:', error);
    }

    return this.mapToResponse(updatedExpense);
  }

  /**
   * Cancels an expense.
   * Can cancel from DRAFT or APPROVED status.
   * Cannot cancel a PAID expense (already settled).
   *
   * @param id - Expense ID to cancel
   * @returns Updated expense data
   * @throws NotFoundException if expense not found
   * @throws ConflictException if expense is in PAID or CANCELLED status
   */
  async cancel(id: string): Promise<ExpenseResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Cancelling expense ${id} in tenant ${tenantId}`);

    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });

    if (!expense) {
      this.logger.warn(`Expense not found: ${id}`);
      throw new NotFoundException('Gasto no encontrado');
    }

    if (expense.status === ExpenseStatus.PAID) {
      throw new ConflictException(
        'No se puede cancelar un gasto ya pagado',
      );
    }

    if (expense.status === ExpenseStatus.CANCELLED) {
      throw new ConflictException('El gasto ya esta cancelado');
    }

    const updatedExpense = await this.prisma.expense.update({
      where: { id },
      data: { status: ExpenseStatus.CANCELLED },
      include: {
        supplier: true,
        account: true,
        costCenter: true,
      },
    });

    this.logger.log(
      `Expense cancelled: ${updatedExpense.expenseNumber} (${updatedExpense.id})`,
    );

    return this.mapToResponse(updatedExpense);
  }

  /**
   * Deletes an expense from the tenant.
   * Only DRAFT expenses can be deleted (hard delete).
   *
   * @param id - Expense ID to delete
   * @throws NotFoundException if expense not found
   * @throws ConflictException if expense is not in DRAFT status
   */
  async remove(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting expense ${id} in tenant ${tenantId}`);

    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });

    if (!expense) {
      this.logger.warn(`Expense not found: ${id}`);
      throw new NotFoundException('Gasto no encontrado');
    }

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new ConflictException(
        'Solo se pueden eliminar gastos en estado borrador',
      );
    }

    await this.prisma.expense.delete({ where: { id } });

    this.logger.log(
      `Expense deleted: ${expense.expenseNumber} (${expense.id})`,
    );
  }

  /**
   * Gets aggregated statistics for expenses in the current tenant.
   * Returns counts by status, totals by category for the current month,
   * and grand total for the current month.
   *
   * @returns Expense statistics
   */
  async getStats(): Promise<ExpenseStatsResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Getting expense statistics for tenant ${tenantId}`);

    // Current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get all expenses for counts by status (all time)
    const allExpenses = await this.prisma.expense.findMany({
      where: { tenantId },
      select: { status: true },
    });

    // Initialize status counts
    const countsByStatus: Record<ExpenseStatus, number> = {
      [ExpenseStatus.DRAFT]: 0,
      [ExpenseStatus.APPROVED]: 0,
      [ExpenseStatus.PAID]: 0,
      [ExpenseStatus.CANCELLED]: 0,
    };

    for (const expense of allExpenses) {
      countsByStatus[expense.status]++;
    }

    // Get current month expenses for totals by category and grand total
    const monthExpenses = await this.prisma.expense.findMany({
      where: {
        tenantId,
        issueDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        status: { not: ExpenseStatus.CANCELLED },
      },
      select: {
        category: true,
        total: true,
      },
    });

    const totalsByCategory: Record<string, number> = {};
    let grandTotal = 0;

    for (const expense of monthExpenses) {
      const amount = Number(expense.total);
      totalsByCategory[expense.category] =
        (totalsByCategory[expense.category] ?? 0) + amount;
      grandTotal += amount;
    }

    return {
      countsByStatus,
      totalsByCategory,
      grandTotal,
    };
  }

  /**
   * Generates a consecutive expense number unique to the tenant.
   * Format: GTO-00001, GTO-00002, etc.
   *
   * Must be called inside a transaction to prevent race conditions.
   *
   * @param tx - Prisma transaction client
   * @returns Generated expense number
   */
  private async generateExpenseNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const tenantId = this.tenantContext.requireTenantId();

    const last = await tx.expense.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { expenseNumber: true },
    });

    const nextNum = last
      ? parseInt(last.expenseNumber.replace('GTO-', '')) + 1
      : 1;

    const expenseNumber = `GTO-${String(nextNum).padStart(5, '0')}`;

    this.logger.debug(`Generated expense number: ${expenseNumber}`);

    return expenseNumber;
  }

  /**
   * Maps an Expense entity (with Prisma Decimal fields) to an
   * ExpenseResponse object with plain number fields.
   *
   * @param expense - The expense entity to map (with or without relations)
   * @returns ExpenseResponse object
   */
  private mapToResponse(expense: ExpenseWithRelations): ExpenseResponse {
    const response: ExpenseResponse = {
      id: expense.id,
      tenantId: expense.tenantId,
      expenseNumber: expense.expenseNumber,
      category: expense.category,
      description: expense.description,
      supplierId: expense.supplierId,
      accountId: expense.accountId,
      costCenterId: expense.costCenterId,
      subtotal: Number(expense.subtotal),
      taxRate: Number(expense.taxRate),
      tax: Number(expense.tax),
      reteFuente: Number(expense.reteFuente),
      total: Number(expense.total),
      status: expense.status,
      paymentMethod: expense.paymentMethod,
      paymentReference: expense.paymentReference,
      paymentDate: expense.paymentDate,
      issueDate: expense.issueDate,
      dueDate: expense.dueDate,
      invoiceNumber: expense.invoiceNumber,
      approvedAt: expense.approvedAt,
      approvedById: expense.approvedById,
      createdById: expense.createdById,
      notes: expense.notes,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };

    // Map supplier if included
    if (expense.supplier) {
      response.supplier = {
        id: expense.supplier.id,
        name: expense.supplier.name,
        documentNumber: expense.supplier.documentNumber,
      };
    }

    // Map account if included
    if (expense.account) {
      response.account = {
        id: expense.account.id,
        code: expense.account.code,
        name: expense.account.name,
      };
    }

    // Map cost center if included
    if (expense.costCenter) {
      response.costCenter = {
        id: expense.costCenter.id,
        code: expense.costCenter.code,
        name: expense.costCenter.name,
      };
    }

    return response;
  }
}
