import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  POSSession,
  POSSessionStatus,
  CashRegisterStatus,
  CashMovementType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  OpenSessionDto,
  CloseSessionDto,
  CashMovementDto,
  CashMovementAction,
} from './dto';

/**
 * Session response with basic info
 */
export interface POSSessionResponse {
  id: string;
  tenantId: string;
  cashRegisterId: string;
  userId: string;
  status: POSSessionStatus;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  difference: number | null;
  openedAt: Date;
  closedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session with full details
 */
export interface POSSessionWithDetails extends POSSessionResponse {
  cashRegister: {
    id: string;
    name: string;
    code: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  summary: {
    totalSales: number;
    totalSalesAmount: number;
    totalCashIn: number;
    totalCashOut: number;
    salesByMethod: Record<PaymentMethod, number>;
  };
}

/**
 * X/Z Report data
 */
export interface XZReport {
  type: 'X' | 'Z';
  session: {
    id: string;
    cashRegisterName: string;
    cashRegisterCode: string;
    userName: string;
    openedAt: Date;
    closedAt: Date | null;
  };
  openingAmount: number;
  totalCashSales: number;
  totalCardSales: number;
  totalOtherSales: number;
  totalSalesAmount: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedCashAmount: number;
  declaredCashAmount: number | null;
  difference: number | null;
  transactionCount: number;
  salesByMethod: Array<{
    method: PaymentMethod;
    count: number;
    total: number;
  }>;
  generatedAt: Date;
}

/**
 * Cash movement response
 */
export interface CashMovementResponse {
  id: string;
  sessionId: string;
  type: CashMovementType;
  amount: number;
  method: PaymentMethod | null;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
}

/**
 * Paginated sessions response
 */
export interface PaginatedSessionsResponse {
  data: POSSessionWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * POSSessionsService handles all POS session operations including:
 * - Opening/closing sessions
 * - Cash movements (cash in/out)
 * - X and Z report generation
 */
@Injectable()
export class POSSessionsService {
  private readonly logger = new Logger(POSSessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Opens a new POS session for a cash register.
   * Only one active session is allowed per cash register.
   */
  async openSession(
    dto: OpenSessionDto,
    userId: string,
  ): Promise<POSSessionWithDetails> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Opening session for cash register ${dto.cashRegisterId} by user ${userId}`,
    );

    // Verify cash register exists and belongs to tenant
    const cashRegister = await this.prisma.cashRegister.findFirst({
      where: { id: dto.cashRegisterId, tenantId },
    });

    if (!cashRegister) {
      throw new NotFoundException(
        `Cash register with ID ${dto.cashRegisterId} not found`,
      );
    }

    // Check if cash register already has an active session
    const existingSession = await this.prisma.pOSSession.findFirst({
      where: {
        cashRegisterId: dto.cashRegisterId,
        status: POSSessionStatus.ACTIVE,
      },
    });

    if (existingSession) {
      throw new ConflictException(
        `Cash register "${cashRegister.name}" already has an active session`,
      );
    }

    // Create session and opening movement in a transaction
    const session = await this.prisma.$transaction(async (tx) => {
      // Create the session
      const newSession = await tx.pOSSession.create({
        data: {
          tenantId,
          cashRegisterId: dto.cashRegisterId,
          userId,
          status: POSSessionStatus.ACTIVE,
          openingAmount: dto.openingAmount,
          notes: dto.notes,
        },
        include: {
          cashRegister: {
            select: { id: true, name: true, code: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      // Create opening movement
      await tx.cashRegisterMovement.create({
        data: {
          tenantId,
          sessionId: newSession.id,
          type: CashMovementType.OPENING,
          amount: dto.openingAmount,
          notes: 'Apertura de caja',
        },
      });

      // Update cash register status
      await tx.cashRegister.update({
        where: { id: dto.cashRegisterId },
        data: { status: CashRegisterStatus.OPEN },
      });

      return newSession;
    });

    this.logger.log(
      `Session opened: ${session.id} for cash register ${cashRegister.name}`,
    );

    return this.buildSessionWithDetails(session);
  }

  /**
   * Closes an active POS session with cash count (arqueo).
   */
  async closeSession(
    sessionId: string,
    dto: CloseSessionDto,
    userId: string,
  ): Promise<POSSessionWithDetails> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Closing session ${sessionId}`);

    // Find session with related data
    const session = await this.prisma.pOSSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        cashRegister: {
          select: { id: true, name: true, code: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (session.status !== POSSessionStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot close a session that is not active',
      );
    }

    // Only the user who opened the session or a manager/admin can close it
    if (session.userId !== userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: { role: true },
      });

      if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
        throw new ForbiddenException(
          'Only the session owner or a manager/admin can close this session',
        );
      }
    }

    // Calculate expected amount
    const expectedAmount = await this.calculateExpectedCashAmount(sessionId);

    // Calculate difference
    const difference = dto.closingAmount - expectedAmount;

    // Close session in a transaction
    const closedSession = await this.prisma.$transaction(async (tx) => {
      // Create closing movement
      await tx.cashRegisterMovement.create({
        data: {
          tenantId,
          sessionId,
          type: CashMovementType.CLOSING,
          amount: dto.closingAmount,
          notes: dto.notes || 'Cierre de caja',
        },
      });

      // Update session
      const updated = await tx.pOSSession.update({
        where: { id: sessionId },
        data: {
          status: POSSessionStatus.CLOSED,
          closingAmount: dto.closingAmount,
          expectedAmount,
          difference,
          closedAt: new Date(),
          notes: dto.notes
            ? `${session.notes || ''}\n${dto.notes}`.trim()
            : session.notes,
        },
        include: {
          cashRegister: {
            select: { id: true, name: true, code: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      // Update cash register status
      await tx.cashRegister.update({
        where: { id: session.cashRegisterId },
        data: { status: CashRegisterStatus.CLOSED },
      });

      return updated;
    });

    this.logger.log(
      `Session closed: ${sessionId}, expected: ${expectedAmount}, declared: ${dto.closingAmount}, difference: ${difference}`,
    );

    return this.buildSessionWithDetails(closedSession);
  }

  /**
   * Registers a cash in/out movement in the current session.
   */
  async registerCashMovement(
    sessionId: string,
    dto: CashMovementDto,
    userId: string,
  ): Promise<CashMovementResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Registering ${dto.action} movement for session ${sessionId}`,
    );

    // Find session
    const session = await this.prisma.pOSSession.findFirst({
      where: { id: sessionId, tenantId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (session.status !== POSSessionStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot register movements in a closed session',
      );
    }

    // Verify user has access to this session
    if (session.userId !== userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: { role: true },
      });

      if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
        throw new ForbiddenException(
          'Only the session owner or a manager/admin can register movements',
        );
      }
    }

    const movementType =
      dto.action === CashMovementAction.CASH_IN
        ? CashMovementType.CASH_IN
        : CashMovementType.CASH_OUT;

    const movement = await this.prisma.cashRegisterMovement.create({
      data: {
        tenantId,
        sessionId,
        type: movementType,
        amount: dto.amount,
        method: PaymentMethod.CASH,
        reference: dto.reference,
        notes: dto.notes,
      },
    });

    this.logger.log(
      `Cash movement registered: ${movementType} ${dto.amount} for session ${sessionId}`,
    );

    return {
      id: movement.id,
      sessionId: movement.sessionId,
      type: movement.type,
      amount: Number(movement.amount),
      method: movement.method,
      reference: movement.reference,
      notes: movement.notes,
      createdAt: movement.createdAt,
    };
  }

  /**
   * Gets the current active session for the user or cash register.
   */
  async getCurrentSession(
    userId: string,
  ): Promise<POSSessionWithDetails | null> {
    const tenantId = this.tenantContext.requireTenantId();

    const session = await this.prisma.pOSSession.findFirst({
      where: {
        tenantId,
        userId,
        status: POSSessionStatus.ACTIVE,
      },
      include: {
        cashRegister: {
          select: {
            id: true,
            name: true,
            code: true,
            warehouseId: true,
            warehouse: { select: { id: true, name: true } },
          },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!session) {
      return null;
    }

    return this.buildSessionWithDetails(session);
  }

  /**
   * Gets a session by ID with full details.
   */
  async findOne(sessionId: string): Promise<POSSessionWithDetails> {
    const tenantId = this.tenantContext.requireTenantId();

    const session = await this.prisma.pOSSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        cashRegister: {
          select: { id: true, name: true, code: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    return this.buildSessionWithDetails(session);
  }

  /**
   * Lists sessions with pagination and filters.
   * Optimized to avoid N+1 queries by batching all summary data in single queries.
   */
  async findAll(
    page = 1,
    limit = 10,
    cashRegisterId?: string,
    status?: POSSessionStatus,
    userId?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<PaginatedSessionsResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    const where: Prisma.POSSessionWhereInput = {
      tenantId,
      ...(cashRegisterId && { cashRegisterId }),
      ...(status && { status }),
      ...(userId && { userId }),
      ...(fromDate || toDate
        ? {
            openedAt: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          }
        : {}),
    };

    const [sessions, total] = await Promise.all([
      this.prisma.pOSSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { openedAt: 'desc' },
        include: {
          cashRegister: {
            select: { id: true, name: true, code: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.pOSSession.count({ where }),
    ]);

    if (sessions.length === 0) {
      return {
        data: [],
        meta: {
          total,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    // Batch load all summary data in single queries to avoid N+1
    const sessionIds = sessions.map((s) => s.id);

    const [salesSummaries, movements, salePayments] = await Promise.all([
      // Get sales summaries for all sessions in one query
      this.prisma.pOSSale.groupBy({
        by: ['sessionId'],
        where: { sessionId: { in: sessionIds } },
        _count: { id: true },
        _sum: { total: true },
      }),
      // Get all movements for all sessions in one query
      this.prisma.cashRegisterMovement.findMany({
        where: { sessionId: { in: sessionIds } },
        select: {
          sessionId: true,
          type: true,
          amount: true,
        },
      }),
      // Get all sale payments for all sessions in one query
      this.prisma.salePayment.findMany({
        where: {
          sale: { sessionId: { in: sessionIds } },
        },
        select: {
          method: true,
          amount: true,
          sale: { select: { sessionId: true } },
        },
      }),
    ]);

    // Create lookup maps for O(1) access
    const salesSummaryMap = new Map(
      salesSummaries.map((s) => [
        s.sessionId,
        { count: s._count.id, total: Number(s._sum.total) || 0 },
      ]),
    );

    // Process movements into per-session summaries
    const movementsSummaryMap = new Map<
      string,
      { totalCashIn: number; totalCashOut: number }
    >();
    for (const m of movements) {
      let summary = movementsSummaryMap.get(m.sessionId);
      if (!summary) {
        summary = { totalCashIn: 0, totalCashOut: 0 };
        movementsSummaryMap.set(m.sessionId, summary);
      }
      const amount = Number(m.amount);
      if (m.type === CashMovementType.CASH_IN) {
        summary.totalCashIn += amount;
      } else if (m.type === CashMovementType.CASH_OUT) {
        summary.totalCashOut += amount;
      }
    }

    // Process payments into per-session sales by method
    const salesByMethodMap = new Map<string, Record<PaymentMethod, number>>();
    for (const payment of salePayments) {
      const sessionId = payment.sale.sessionId;
      let methodSummary = salesByMethodMap.get(sessionId);
      if (!methodSummary) {
        methodSummary = {} as Record<PaymentMethod, number>;
        Object.values(PaymentMethod).forEach((method) => {
          methodSummary![method] = 0;
        });
        salesByMethodMap.set(sessionId, methodSummary);
      }
      methodSummary[payment.method] += Number(payment.amount);
    }

    // Build response using pre-loaded data
    const data: POSSessionWithDetails[] = sessions.map((session) => {
      const salesSummary = salesSummaryMap.get(session.id) || {
        count: 0,
        total: 0,
      };
      const movementsSummary = movementsSummaryMap.get(session.id) || {
        totalCashIn: 0,
        totalCashOut: 0,
      };
      const salesByMethod =
        salesByMethodMap.get(session.id) ||
        (Object.fromEntries(
          Object.values(PaymentMethod).map((method) => [method, 0]),
        ) as Record<PaymentMethod, number>);

      return {
        id: session.id,
        tenantId: session.tenantId,
        cashRegisterId: session.cashRegisterId,
        userId: session.userId,
        status: session.status,
        openingAmount: Number(session.openingAmount),
        closingAmount: session.closingAmount
          ? Number(session.closingAmount)
          : null,
        expectedAmount: session.expectedAmount
          ? Number(session.expectedAmount)
          : null,
        difference: session.difference ? Number(session.difference) : null,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        notes: session.notes,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        cashRegister: session.cashRegister,
        user: session.user,
        summary: {
          totalSales: salesSummary.count,
          totalSalesAmount: salesSummary.total,
          totalCashIn: movementsSummary.totalCashIn,
          totalCashOut: movementsSummary.totalCashOut,
          salesByMethod,
        },
      };
    });

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

  /**
   * Generates an X report (intraday report without closing).
   */
  async generateXReport(sessionId: string): Promise<XZReport> {
    return this.generateReport(sessionId, 'X');
  }

  /**
   * Generates a Z report (closing report).
   */
  async generateZReport(sessionId: string): Promise<XZReport> {
    const session = await this.findOne(sessionId);

    if (session.status !== POSSessionStatus.CLOSED) {
      throw new BadRequestException(
        'Z report can only be generated for closed sessions',
      );
    }

    return this.generateReport(sessionId, 'Z');
  }

  /**
   * Gets all movements for a session.
   */
  async getSessionMovements(
    sessionId: string,
  ): Promise<CashMovementResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();

    // Verify session exists
    const session = await this.prisma.pOSSession.findFirst({
      where: { id: sessionId, tenantId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    const movements = await this.prisma.cashRegisterMovement.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return movements.map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      type: m.type,
      amount: Number(m.amount),
      method: m.method,
      reference: m.reference,
      notes: m.notes,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Calculates the expected cash amount in the drawer.
   */
  private async calculateExpectedCashAmount(
    sessionId: string,
  ): Promise<number> {
    const movements = await this.prisma.cashRegisterMovement.findMany({
      where: { sessionId },
    });

    let expectedCash = 0;

    for (const movement of movements) {
      const amount = Number(movement.amount);

      switch (movement.type) {
        case CashMovementType.OPENING:
        case CashMovementType.CASH_IN:
          expectedCash += amount;
          break;
        case CashMovementType.CASH_OUT:
          expectedCash -= amount;
          break;
        case CashMovementType.SALE:
          // Only cash sales add to expected cash
          if (movement.method === PaymentMethod.CASH) {
            expectedCash += amount;
          }
          break;
        case CashMovementType.REFUND:
          // Cash refunds reduce expected cash
          if (movement.method === PaymentMethod.CASH) {
            expectedCash -= amount;
          }
          break;
      }
    }

    return expectedCash;
  }

  /**
   * Generates X or Z report.
   */
  private async generateReport(
    sessionId: string,
    type: 'X' | 'Z',
  ): Promise<XZReport> {
    const tenantId = this.tenantContext.requireTenantId();

    const session = await this.prisma.pOSSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        cashRegister: {
          select: { name: true, code: true },
        },
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    // Get all movements
    const movements = await this.prisma.cashRegisterMovement.findMany({
      where: { sessionId },
    });

    // Get all sales for this session
    const sales = await this.prisma.pOSSale.findMany({
      where: { sessionId },
      include: {
        payments: true,
      },
    });

    // Calculate totals
    let totalCashSales = 0;
    let totalCardSales = 0;
    let totalOtherSales = 0;
    let totalCashIn = 0;
    let totalCashOut = 0;
    const salesByMethod: Map<PaymentMethod, { count: number; total: number }> =
      new Map();

    // Initialize all payment methods
    Object.values(PaymentMethod).forEach((method) => {
      salesByMethod.set(method, { count: 0, total: 0 });
    });

    // Process sales
    for (const sale of sales) {
      for (const payment of sale.payments) {
        const amount = Number(payment.amount);
        const methodData = salesByMethod.get(payment.method)!;
        methodData.count++;
        methodData.total += amount;

        if (payment.method === PaymentMethod.CASH) {
          totalCashSales += amount;
        } else if (
          payment.method === PaymentMethod.CREDIT_CARD ||
          payment.method === PaymentMethod.DEBIT_CARD
        ) {
          totalCardSales += amount;
        } else {
          totalOtherSales += amount;
        }
      }
    }

    // Process other movements
    for (const movement of movements) {
      const amount = Number(movement.amount);

      if (movement.type === CashMovementType.CASH_IN) {
        totalCashIn += amount;
      } else if (movement.type === CashMovementType.CASH_OUT) {
        totalCashOut += amount;
      }
    }

    const totalSalesAmount = totalCashSales + totalCardSales + totalOtherSales;
    const expectedCashAmount =
      Number(session.openingAmount) +
      totalCashSales +
      totalCashIn -
      totalCashOut;

    return {
      type,
      session: {
        id: session.id,
        cashRegisterName: session.cashRegister.name,
        cashRegisterCode: session.cashRegister.code,
        userName: `${session.user.firstName} ${session.user.lastName}`,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
      },
      openingAmount: Number(session.openingAmount),
      totalCashSales,
      totalCardSales,
      totalOtherSales,
      totalSalesAmount,
      totalCashIn,
      totalCashOut,
      expectedCashAmount,
      declaredCashAmount: type === 'Z' ? Number(session.closingAmount) : null,
      difference: type === 'Z' ? Number(session.difference) : null,
      transactionCount: sales.length,
      salesByMethod: Array.from(salesByMethod.entries())
        .filter(([, data]) => data.count > 0)
        .map(([method, data]) => ({
          method,
          count: data.count,
          total: data.total,
        })),
      generatedAt: new Date(),
    };
  }

  /**
   * Builds a session response with summary details.
   */
  private async buildSessionWithDetails(
    session: POSSession & {
      cashRegister: { id: string; name: string; code: string };
      user: { id: string; firstName: string; lastName: string; email: string };
    },
  ): Promise<POSSessionWithDetails> {
    // Get sales summary
    const salesSummary = await this.prisma.pOSSale.aggregate({
      where: { sessionId: session.id },
      _count: { id: true },
      _sum: { total: true },
    });

    // Get cash movements summary
    const movements = await this.prisma.cashRegisterMovement.findMany({
      where: { sessionId: session.id },
    });

    let totalCashIn = 0;
    let totalCashOut = 0;

    for (const m of movements) {
      if (m.type === CashMovementType.CASH_IN) {
        totalCashIn += Number(m.amount);
      } else if (m.type === CashMovementType.CASH_OUT) {
        totalCashOut += Number(m.amount);
      }
    }

    // Get sales by payment method
    const salePayments = await this.prisma.salePayment.findMany({
      where: {
        sale: { sessionId: session.id },
      },
    });

    const salesByMethod: Record<PaymentMethod, number> = {} as Record<
      PaymentMethod,
      number
    >;
    Object.values(PaymentMethod).forEach((method) => {
      salesByMethod[method] = 0;
    });

    for (const payment of salePayments) {
      salesByMethod[payment.method] += Number(payment.amount);
    }

    return {
      id: session.id,
      tenantId: session.tenantId,
      cashRegisterId: session.cashRegisterId,
      userId: session.userId,
      status: session.status,
      openingAmount: Number(session.openingAmount),
      closingAmount: session.closingAmount
        ? Number(session.closingAmount)
        : null,
      expectedAmount: session.expectedAmount
        ? Number(session.expectedAmount)
        : null,
      difference: session.difference ? Number(session.difference) : null,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      notes: session.notes,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      cashRegister: session.cashRegister,
      user: session.user,
      summary: {
        totalSales: salesSummary._count.id,
        totalSalesAmount: Number(salesSummary._sum.total) || 0,
        totalCashIn,
        totalCashOut,
        salesByMethod,
      },
    };
  }
}
