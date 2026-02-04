import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { POSSessionsController } from './pos-sessions.controller';
import { POSSessionsService } from './pos-sessions.service';
import type {
  POSSessionWithDetails,
  PaginatedSessionsResponse,
  XZReport,
  CashMovementResponse,
} from './pos-sessions.service';
import {
  POSSessionStatus,
  CashMovementType,
  PaymentMethod,
  UserRole,
} from '@prisma/client';
import { CashMovementAction } from './dto';

describe('POSSessionsController', () => {
  let controller: POSSessionsController;
  let service: jest.Mocked<POSSessionsService>;

  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-123',
    role: UserRole.ADMIN,
  };

  const mockSessionWithDetails: POSSessionWithDetails = {
    id: 'session-123',
    tenantId: 'tenant-123',
    cashRegisterId: 'cash-register-123',
    userId: 'user-123',
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
      id: 'cash-register-123',
      name: 'Caja Principal',
      code: 'CAJA-001',
    },
    user: {
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
    summary: {
      totalSales: 5,
      totalSalesAmount: 500000,
      totalCashIn: 0,
      totalCashOut: 0,
      salesByMethod: {} as Record<PaymentMethod, number>,
    },
  };

  const mockPaginatedResponse: PaginatedSessionsResponse = {
    data: [mockSessionWithDetails],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  const mockXZReport: XZReport = {
    type: 'X',
    session: {
      id: 'session-123',
      cashRegisterName: 'Caja Principal',
      cashRegisterCode: 'CAJA-001',
      userName: 'John Doe',
      openedAt: new Date('2024-01-15'),
      closedAt: null,
    },
    openingAmount: 100000,
    totalCashSales: 300000,
    totalCardSales: 200000,
    totalOtherSales: 0,
    totalSalesAmount: 500000,
    totalCashIn: 50000,
    totalCashOut: 20000,
    expectedCashAmount: 430000,
    declaredCashAmount: null,
    difference: null,
    transactionCount: 5,
    salesByMethod: [
      { method: PaymentMethod.CASH, count: 3, total: 300000 },
      { method: PaymentMethod.CREDIT_CARD, count: 2, total: 200000 },
    ],
    generatedAt: new Date(),
  };

  const mockCashMovement: CashMovementResponse = {
    id: 'movement-123',
    sessionId: 'session-123',
    type: CashMovementType.CASH_IN,
    amount: 50000,
    method: PaymentMethod.CASH,
    reference: null,
    notes: 'Test movement',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPOSSessionsService = {
      openSession: jest.fn(),
      closeSession: jest.fn(),
      registerCashMovement: jest.fn(),
      getCurrentSession: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      generateXReport: jest.fn(),
      generateZReport: jest.fn(),
      getSessionMovements: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [POSSessionsController],
      providers: [
        { provide: POSSessionsService, useValue: mockPOSSessionsService },
      ],
    }).compile();

    controller = module.get<POSSessionsController>(POSSessionsController);
    service = module.get(POSSessionsService);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('openSession', () => {
    const openDto = {
      cashRegisterId: 'cash-register-123',
      openingAmount: 100000,
    };

    it('should open a session', async () => {
      service.openSession.mockResolvedValue(mockSessionWithDetails);

      const result = await controller.openSession(openDto, mockUser);

      expect(result).toEqual(mockSessionWithDetails);
      expect(service.openSession).toHaveBeenCalledWith(openDto, mockUser.id);
    });

    it('should propagate NotFoundException for cash register', async () => {
      service.openSession.mockRejectedValue(
        new NotFoundException('Cash register not found'),
      );

      await expect(controller.openSession(openDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate ConflictException for active session', async () => {
      service.openSession.mockRejectedValue(
        new ConflictException('Cash register already has an active session'),
      );

      await expect(controller.openSession(openDto, mockUser)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('closeSession', () => {
    const closeDto = {
      closingAmount: 150000,
    };

    it('should close a session', async () => {
      const closedSession = {
        ...mockSessionWithDetails,
        status: POSSessionStatus.CLOSED,
        closingAmount: 150000,
        expectedAmount: 140000,
        difference: 10000,
        closedAt: new Date(),
      };
      service.closeSession.mockResolvedValue(closedSession);

      const result = await controller.closeSession(
        'session-123',
        closeDto,
        mockUser,
      );

      expect(result.status).toBe(POSSessionStatus.CLOSED);
      expect(service.closeSession).toHaveBeenCalledWith(
        'session-123',
        closeDto,
        mockUser.id,
      );
    });

    it('should propagate NotFoundException', async () => {
      service.closeSession.mockRejectedValue(new NotFoundException());

      await expect(
        controller.closeSession('nonexistent', closeDto, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException for inactive session', async () => {
      service.closeSession.mockRejectedValue(
        new BadRequestException('Cannot close a session that is not active'),
      );

      await expect(
        controller.closeSession('session-123', closeDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate ForbiddenException', async () => {
      service.closeSession.mockRejectedValue(
        new ForbiddenException(
          'Only the session owner or a manager/admin can close this session',
        ),
      );

      await expect(
        controller.closeSession('session-123', closeDto, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('registerCashMovement', () => {
    const movementDto = {
      action: CashMovementAction.CASH_IN,
      amount: 50000,
      notes: 'Test movement',
    };

    it('should register a cash movement', async () => {
      service.registerCashMovement.mockResolvedValue(mockCashMovement);

      const result = await controller.registerCashMovement(
        'session-123',
        movementDto,
        mockUser,
      );

      expect(result).toEqual(mockCashMovement);
      expect(service.registerCashMovement).toHaveBeenCalledWith(
        'session-123',
        movementDto,
        mockUser.id,
      );
    });

    it('should propagate NotFoundException', async () => {
      service.registerCashMovement.mockRejectedValue(new NotFoundException());

      await expect(
        controller.registerCashMovement('nonexistent', movementDto, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException for inactive session', async () => {
      service.registerCashMovement.mockRejectedValue(
        new BadRequestException(
          'Cannot register movements in a closed session',
        ),
      );

      await expect(
        controller.registerCashMovement('session-123', movementDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCurrentSession', () => {
    it('should return current active session', async () => {
      service.getCurrentSession.mockResolvedValue(mockSessionWithDetails);

      const result = await controller.getCurrentSession(mockUser);

      expect(result).toEqual(mockSessionWithDetails);
      expect(service.getCurrentSession).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return null when no active session', async () => {
      service.getCurrentSession.mockResolvedValue(null);

      const result = await controller.getCurrentSession(mockUser);

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return a session by id', async () => {
      service.findOne.mockResolvedValue(mockSessionWithDetails);

      const result = await controller.findOne('session-123');

      expect(result).toEqual(mockSessionWithDetails);
      expect(service.findOne).toHaveBeenCalledWith('session-123');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated sessions', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('1', '10');

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should use default pagination values', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should handle invalid page number by defaulting to 1', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('invalid', '10');

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should pass cashRegisterId filter', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '10', 'cash-register-123');

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        'cash-register-123',
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should pass status filter', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '10', undefined, POSSessionStatus.ACTIVE);

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        POSSessionStatus.ACTIVE,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('getMovements', () => {
    it('should return movements for session', async () => {
      service.getSessionMovements.mockResolvedValue([mockCashMovement]);

      const result = await controller.getMovements('session-123');

      expect(result).toHaveLength(1);
      expect(service.getSessionMovements).toHaveBeenCalledWith('session-123');
    });

    it('should propagate NotFoundException', async () => {
      service.getSessionMovements.mockRejectedValue(new NotFoundException());

      await expect(controller.getMovements('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateXReport', () => {
    it('should generate X report', async () => {
      service.generateXReport.mockResolvedValue(mockXZReport);

      const result = await controller.generateXReport('session-123');

      expect(result.type).toBe('X');
      expect(service.generateXReport).toHaveBeenCalledWith('session-123');
    });

    it('should propagate NotFoundException', async () => {
      service.generateXReport.mockRejectedValue(new NotFoundException());

      await expect(controller.generateXReport('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateZReport', () => {
    it('should generate Z report', async () => {
      const zReport = { ...mockXZReport, type: 'Z' as const };
      service.generateZReport.mockResolvedValue(zReport);

      const result = await controller.generateZReport('session-123');

      expect(result.type).toBe('Z');
      expect(service.generateZReport).toHaveBeenCalledWith('session-123');
    });

    it('should propagate NotFoundException', async () => {
      service.generateZReport.mockRejectedValue(new NotFoundException());

      await expect(controller.generateZReport('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate BadRequestException for unclosed session', async () => {
      service.generateZReport.mockRejectedValue(
        new BadRequestException(
          'Z report can only be generated for closed sessions',
        ),
      );

      await expect(controller.generateZReport('session-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
