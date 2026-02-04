import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { POSSessionsService } from './pos-sessions.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  POSSessionStatus,
  CashRegisterStatus,
  CashMovementType,
  PaymentMethod,
} from '@prisma/client';
import type { OpenSessionDto, CloseSessionDto, CashMovementDto } from './dto';
import { CashMovementAction } from './dto';

describe('POSSessionsService', () => {
  let service: POSSessionsService;
  let prisma: any;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockCashRegisterId = 'cash-register-123';
  const mockSessionId = 'session-123';

  const mockCashRegister = {
    id: mockCashRegisterId,
    tenantId: mockTenantId,
    name: 'Caja Principal',
    code: 'CAJA-001',
    status: CashRegisterStatus.CLOSED,
  };

  const mockUser = {
    id: mockUserId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: 'ADMIN',
  };

  const mockSession = {
    id: mockSessionId,
    tenantId: mockTenantId,
    cashRegisterId: mockCashRegisterId,
    userId: mockUserId,
    status: POSSessionStatus.ACTIVE,
    openingAmount: 100000,
    closingAmount: null,
    expectedAmount: null,
    difference: null,
    openedAt: new Date('2024-01-15'),
    closedAt: null,
    notes: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    cashRegister: {
      id: mockCashRegisterId,
      name: 'Caja Principal',
      code: 'CAJA-001',
    },
    user: mockUser,
  };

  // Mock transaction client
  const createMockTx = () => ({
    pOSSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    cashRegister: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    cashRegisterMovement: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    pOSSale: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    salePayment: {
      findMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      pOSSession: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      cashRegister: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      cashRegisterMovement: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      pOSSale: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      salePayment: {
        findMany: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        POSSessionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<POSSessionsService>(POSSessionsService);
    prisma = module.get(PrismaService);
    tenantContext = module.get(TenantContextService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return a session by id with details', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 5 },
        _sum: { total: 500000 },
      });
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findOne(mockSessionId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockSessionId);
      expect(prisma.pOSSession.findFirst).toHaveBeenCalledWith({
        where: { id: mockSessionId, tenantId: mockTenantId },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when session not found', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should require tenant context', async () => {
      (tenantContext.requireTenantId as jest.Mock).mockImplementation(() => {
        throw new Error('Tenant context required');
      });

      await expect(service.findOne(mockSessionId)).rejects.toThrow('Tenant context required');
    });
  });

  describe('findAll', () => {
    it('should return paginated sessions', async () => {
      (prisma.pOSSession.findMany as jest.Mock).mockResolvedValue([mockSession]);
      (prisma.pOSSession.count as jest.Mock).mockResolvedValue(1);
      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 0 },
        _sum: { total: 0 },
      });
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should use default pagination values', async () => {
      (prisma.pOSSession.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSession.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prisma.pOSSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should filter by cashRegisterId when provided', async () => {
      (prisma.pOSSession.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSession.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 10, mockCashRegisterId);

      expect(prisma.pOSSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cashRegisterId: mockCashRegisterId,
          }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      (prisma.pOSSession.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSession.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 10, undefined, POSSessionStatus.ACTIVE);

      expect(prisma.pOSSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: POSSessionStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should filter by userId when provided', async () => {
      (prisma.pOSSession.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSession.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 10, undefined, undefined, mockUserId);

      expect(prisma.pOSSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
          }),
        }),
      );
    });

    it('should filter by date range when provided', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');

      (prisma.pOSSession.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSession.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 10, undefined, undefined, undefined, fromDate, toDate);

      expect(prisma.pOSSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            openedAt: expect.objectContaining({
              gte: fromDate,
              lte: toDate,
            }),
          }),
        }),
      );
    });

    it('should filter by fromDate only', async () => {
      const fromDate = new Date('2024-01-01');

      (prisma.pOSSession.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSession.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 10, undefined, undefined, undefined, fromDate);

      expect(prisma.pOSSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            openedAt: expect.objectContaining({
              gte: fromDate,
            }),
          }),
        }),
      );
    });

    it('should return empty array when no sessions exist', async () => {
      (prisma.pOSSession.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSession.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should calculate totalPages correctly', async () => {
      (prisma.pOSSession.findMany as jest.Mock).mockResolvedValue([mockSession]);
      (prisma.pOSSession.count as jest.Mock).mockResolvedValue(25);
      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 0 },
        _sum: { total: 0 },
      });
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll(1, 10);

      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('openSession', () => {
    const openDto: OpenSessionDto = {
      cashRegisterId: mockCashRegisterId,
      openingAmount: 100000,
    };

    it('should throw NotFoundException when cash register not found', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.openSession(openDto, mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when cash register has active session', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(mockCashRegister);
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);

      await expect(service.openSession(openDto, mockUserId)).rejects.toThrow(ConflictException);
    });

    it('should open session successfully', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(mockCashRegister);
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(null);

      const mockTx = createMockTx();
      mockTx.pOSSession.create.mockResolvedValue(mockSession);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 0 },
        _sum: { total: 0 },
      });
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.openSession(openDto, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockSessionId);
    });

    it('should open session with notes', async () => {
      const openDtoWithNotes = { ...openDto, notes: 'Test notes' };
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(mockCashRegister);
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(null);

      const mockTx = createMockTx();
      mockTx.pOSSession.create.mockResolvedValue({ ...mockSession, notes: 'Test notes' });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 0 },
        _sum: { total: 0 },
      });
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.openSession(openDtoWithNotes, mockUserId);

      expect(result).toBeDefined();
    });
  });

  describe('closeSession', () => {
    const closeDto: CloseSessionDto = {
      closingAmount: 150000,
    };

    it('should throw NotFoundException when session not found', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.closeSession('nonexistent', closeDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when session not active', async () => {
      const closedSession = { ...mockSession, status: POSSessionStatus.CLOSED };
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(closedSession);

      await expect(service.closeSession(mockSessionId, closeDto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when user is not owner and not admin', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE' });

      await expect(service.closeSession(mockSessionId, closeDto, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user not found', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.closeSession(mockSessionId, closeDto, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should close session successfully by owner', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([
        { type: CashMovementType.OPENING, amount: 100000, method: null },
        { type: CashMovementType.SALE, amount: 50000, method: PaymentMethod.CASH },
      ]);

      const closedSession = {
        ...mockSession,
        status: POSSessionStatus.CLOSED,
        closingAmount: 150000,
        expectedAmount: 150000,
        difference: 0,
        closedAt: new Date(),
      };

      const mockTx = createMockTx();
      mockTx.pOSSession.update.mockResolvedValue(closedSession);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 1 },
        _sum: { total: 50000 },
      });
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.closeSession(mockSessionId, closeDto, mockUserId);

      expect(result).toBeDefined();
      expect(result.status).toBe(POSSessionStatus.CLOSED);
    });

    it('should close session successfully by admin', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ role: 'ADMIN' });
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([]);

      const closedSession = {
        ...mockSession,
        status: POSSessionStatus.CLOSED,
        closingAmount: 150000,
        expectedAmount: 100000,
        difference: 50000,
        closedAt: new Date(),
      };

      const mockTx = createMockTx();
      mockTx.pOSSession.update.mockResolvedValue(closedSession);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 0 },
        _sum: { total: 0 },
      });
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.closeSession(mockSessionId, closeDto, 'admin-user');

      expect(result).toBeDefined();
    });

    it('should close session with notes', async () => {
      const closeDtoWithNotes = { ...closeDto, notes: 'Closing note' };
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([]);

      const closedSession = {
        ...mockSession,
        status: POSSessionStatus.CLOSED,
        closingAmount: 150000,
        notes: 'Closing note',
        closedAt: new Date(),
      };

      const mockTx = createMockTx();
      mockTx.pOSSession.update.mockResolvedValue(closedSession);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 0 },
        _sum: { total: 0 },
      });
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.closeSession(mockSessionId, closeDtoWithNotes, mockUserId);

      expect(result).toBeDefined();
    });

    it('should calculate expected amount with cash in/out movements', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([
        { type: CashMovementType.OPENING, amount: 100000, method: null },
        { type: CashMovementType.CASH_IN, amount: 20000, method: PaymentMethod.CASH },
        { type: CashMovementType.CASH_OUT, amount: 10000, method: PaymentMethod.CASH },
        { type: CashMovementType.SALE, amount: 50000, method: PaymentMethod.CASH },
        { type: CashMovementType.SALE, amount: 30000, method: PaymentMethod.CREDIT_CARD },
        { type: CashMovementType.REFUND, amount: 5000, method: PaymentMethod.CASH },
      ]);

      const closedSession = {
        ...mockSession,
        status: POSSessionStatus.CLOSED,
        closingAmount: 150000,
        closedAt: new Date(),
      };

      const mockTx = createMockTx();
      mockTx.pOSSession.update.mockResolvedValue(closedSession);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 0 },
        _sum: { total: 0 },
      });
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.closeSession(mockSessionId, closeDto, mockUserId);

      expect(result).toBeDefined();
    });
  });

  describe('registerCashMovement', () => {
    const movementDto: CashMovementDto = {
      action: CashMovementAction.CASH_IN,
      amount: 50000,
      notes: 'Test movement',
    };

    it('should throw NotFoundException when session not found', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.registerCashMovement('nonexistent', movementDto, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when session not active', async () => {
      const closedSession = { ...mockSession, status: POSSessionStatus.CLOSED };
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(closedSession);

      await expect(
        service.registerCashMovement(mockSessionId, movementDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not owner and not admin', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE' });

      await expect(
        service.registerCashMovement(mockSessionId, movementDto, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user not found', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.registerCashMovement(mockSessionId, movementDto, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should register cash in movement successfully', async () => {
      const activeSession = { ...mockSession, userId: mockUserId };
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(activeSession);
      (prisma.cashRegisterMovement.create as jest.Mock).mockResolvedValue({
        id: 'movement-123',
        sessionId: mockSessionId,
        type: CashMovementType.CASH_IN,
        amount: 50000,
        method: PaymentMethod.CASH,
        reference: null,
        notes: 'Test movement',
        createdAt: new Date(),
      });

      const result = await service.registerCashMovement(mockSessionId, movementDto, mockUserId);

      expect(result).toBeDefined();
      expect(result.type).toBe(CashMovementType.CASH_IN);
      expect(result.amount).toBe(50000);
    });

    it('should register cash out movement successfully', async () => {
      const cashOutDto: CashMovementDto = {
        action: CashMovementAction.CASH_OUT,
        amount: 30000,
        notes: 'Cash withdrawal',
      };

      const activeSession = { ...mockSession, userId: mockUserId };
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(activeSession);
      (prisma.cashRegisterMovement.create as jest.Mock).mockResolvedValue({
        id: 'movement-123',
        sessionId: mockSessionId,
        type: CashMovementType.CASH_OUT,
        amount: 30000,
        method: PaymentMethod.CASH,
        reference: null,
        notes: 'Cash withdrawal',
        createdAt: new Date(),
      });

      const result = await service.registerCashMovement(mockSessionId, cashOutDto, mockUserId);

      expect(result).toBeDefined();
      expect(result.type).toBe(CashMovementType.CASH_OUT);
    });

    it('should register movement with reference', async () => {
      const movementWithRef: CashMovementDto = {
        action: CashMovementAction.CASH_IN,
        amount: 50000,
        reference: 'REF-001',
        notes: 'Deposit',
      };

      const activeSession = { ...mockSession, userId: mockUserId };
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(activeSession);
      (prisma.cashRegisterMovement.create as jest.Mock).mockResolvedValue({
        id: 'movement-123',
        sessionId: mockSessionId,
        type: CashMovementType.CASH_IN,
        amount: 50000,
        method: PaymentMethod.CASH,
        reference: 'REF-001',
        notes: 'Deposit',
        createdAt: new Date(),
      });

      const result = await service.registerCashMovement(mockSessionId, movementWithRef, mockUserId);

      expect(result).toBeDefined();
      expect(result.reference).toBe('REF-001');
    });

    it('should allow manager to register movement on any session', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ role: 'MANAGER' });
      (prisma.cashRegisterMovement.create as jest.Mock).mockResolvedValue({
        id: 'movement-123',
        sessionId: mockSessionId,
        type: CashMovementType.CASH_IN,
        amount: 50000,
        method: PaymentMethod.CASH,
        reference: null,
        notes: 'Test movement',
        createdAt: new Date(),
      });

      const result = await service.registerCashMovement(mockSessionId, movementDto, 'manager-user');

      expect(result).toBeDefined();
    });
  });

  describe('getCurrentSession', () => {
    it('should return active session for user', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 0 },
        _sum: { total: 0 },
      });
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getCurrentSession(mockUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockSessionId);
    });

    it('should return null when no active session', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getCurrentSession(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('generateXReport', () => {
    it('should throw NotFoundException when session not found', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.generateXReport('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should generate X report successfully', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 0 },
        _sum: { total: 0 },
      });
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([
        { type: CashMovementType.OPENING, amount: 100000, method: null },
      ]);
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSale.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateXReport(mockSessionId);

      expect(result).toBeDefined();
      expect(result.type).toBe('X');
      expect(result.declaredCashAmount).toBeNull();
    });

    it('should calculate sales by method correctly', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 3 },
        _sum: { total: 150000 },
      });
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([
        { type: CashMovementType.OPENING, amount: 100000, method: null },
        { type: CashMovementType.CASH_IN, amount: 20000, method: PaymentMethod.CASH },
        { type: CashMovementType.CASH_OUT, amount: 10000, method: PaymentMethod.CASH },
      ]);
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSale.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'sale-1',
          payments: [
            { method: PaymentMethod.CASH, amount: 50000 },
            { method: PaymentMethod.CREDIT_CARD, amount: 30000 },
          ],
        },
        {
          id: 'sale-2',
          payments: [
            { method: PaymentMethod.CASH, amount: 40000 },
          ],
        },
        {
          id: 'sale-3',
          payments: [
            { method: PaymentMethod.BANK_TRANSFER, amount: 30000 },
          ],
        },
      ]);

      const result = await service.generateXReport(mockSessionId);

      expect(result).toBeDefined();
      expect(result.totalCashSales).toBe(90000);
      expect(result.totalCardSales).toBe(30000);
      expect(result.totalOtherSales).toBe(30000);
      expect(result.totalCashIn).toBe(20000);
      expect(result.totalCashOut).toBe(10000);
    });
  });

  describe('generateZReport', () => {
    it('should throw BadRequestException when session not closed', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 0 },
        _sum: { total: 0 },
      });
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.generateZReport(mockSessionId)).rejects.toThrow(BadRequestException);
    });

    it('should generate Z report for closed session', async () => {
      const closedSession = {
        ...mockSession,
        status: POSSessionStatus.CLOSED,
        closingAmount: 150000,
        expectedAmount: 150000,
        difference: 0,
        closedAt: new Date(),
      };

      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(closedSession);
      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 5 },
        _sum: { total: 500000 },
      });
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([
        { type: CashMovementType.OPENING, amount: 100000, method: null },
      ]);
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pOSSale.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateZReport(mockSessionId);

      expect(result).toBeDefined();
      expect(result.type).toBe('Z');
      expect(result.declaredCashAmount).toBe(150000);
      expect(result.difference).toBe(0);
    });
  });

  describe('getSessionMovements', () => {
    it('should return movements for session', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'movement-123',
          sessionId: mockSessionId,
          type: CashMovementType.OPENING,
          amount: 100000,
          method: null,
          reference: null,
          notes: 'Apertura de caja',
          createdAt: new Date(),
        },
        {
          id: 'movement-124',
          sessionId: mockSessionId,
          type: CashMovementType.CASH_IN,
          amount: 50000,
          method: PaymentMethod.CASH,
          reference: 'REF-001',
          notes: 'Deposit',
          createdAt: new Date(),
        },
      ]);

      const result = await service.getSessionMovements(mockSessionId);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe(CashMovementType.OPENING);
      expect(result[1].type).toBe(CashMovementType.CASH_IN);
    });

    it('should throw NotFoundException when session not found', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getSessionMovements('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when no movements', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSessionMovements(mockSessionId);

      expect(result).toEqual([]);
    });
  });

  describe('buildSessionWithDetails', () => {
    it('should calculate summary with cash in/out movements', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 5 },
        _sum: { total: 500000 },
      });
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([
        { type: CashMovementType.OPENING, amount: 100000, method: null },
        { type: CashMovementType.CASH_IN, amount: 50000, method: PaymentMethod.CASH },
        { type: CashMovementType.CASH_OUT, amount: 20000, method: PaymentMethod.CASH },
        { type: CashMovementType.SALE, amount: 30000, method: PaymentMethod.CASH },
      ]);
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([
        { method: PaymentMethod.CASH, amount: 30000 },
        { method: PaymentMethod.CREDIT_CARD, amount: 20000 },
      ]);

      const result = await service.findOne(mockSessionId);

      expect(result.summary.totalCashIn).toBe(50000);
      expect(result.summary.totalCashOut).toBe(20000);
      expect(result.summary.salesByMethod[PaymentMethod.CASH]).toBe(30000);
      expect(result.summary.salesByMethod[PaymentMethod.CREDIT_CARD]).toBe(20000);
    });

    it('should handle session with null closing values', async () => {
      (prisma.pOSSession.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.pOSSale.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 0 },
        _sum: { total: null },
      });
      (prisma.cashRegisterMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.salePayment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findOne(mockSessionId);

      expect(result.closingAmount).toBeNull();
      expect(result.expectedAmount).toBeNull();
      expect(result.difference).toBeNull();
      expect(result.summary.totalSalesAmount).toBe(0);
    });
  });
});
