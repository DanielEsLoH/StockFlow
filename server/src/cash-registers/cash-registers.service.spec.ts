import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CashRegistersService } from './cash-registers.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { CashRegisterStatus, POSSessionStatus } from '@prisma/client';
import type { CreateCashRegisterDto, UpdateCashRegisterDto } from './dto';

describe('CashRegistersService', () => {
  let service: CashRegistersService;
  let prisma: jest.Mocked<PrismaService>;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';
  const mockWarehouseId = 'warehouse-123';

  const mockCashRegister = {
    id: 'cash-register-123',
    tenantId: mockTenantId,
    warehouseId: mockWarehouseId,
    name: 'Caja Principal',
    code: 'CAJA-001',
    status: CashRegisterStatus.OPEN,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockWarehouse = {
    id: mockWarehouseId,
    name: 'Bodega Central',
    code: 'BOD-001',
  };

  const mockCashRegisterWithWarehouse = {
    ...mockCashRegister,
    warehouse: mockWarehouse,
    sessions: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      cashRegister: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      warehouse: {
        findFirst: jest.fn(),
      },
      pOSSession: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashRegistersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<CashRegistersService>(CashRegistersService);
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

  describe('findAll', () => {
    it('should return paginated cash registers', async () => {
      const cashRegisters = [mockCashRegisterWithWarehouse];
      (prisma.cashRegister.findMany as jest.Mock).mockResolvedValue(
        cashRegisters,
      );
      (prisma.cashRegister.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should use default pagination values', async () => {
      (prisma.cashRegister.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.cashRegister.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prisma.cashRegister.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should filter by warehouseId when provided', async () => {
      (prisma.cashRegister.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.cashRegister.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 10, mockWarehouseId);

      expect(prisma.cashRegister.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            warehouseId: mockWarehouseId,
          }),
        }),
      );
    });

    it('should require tenant context', async () => {
      (tenantContext.requireTenantId as jest.Mock).mockImplementation(() => {
        throw new Error('Tenant context required');
      });

      await expect(service.findAll()).rejects.toThrow(
        'Tenant context required',
      );
    });

    it('should calculate pagination correctly for page 2', async () => {
      (prisma.cashRegister.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.cashRegister.count as jest.Mock).mockResolvedValue(25);

      const result = await service.findAll(2, 10);

      expect(prisma.cashRegister.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.meta.totalPages).toBe(3);
    });

    it('should return empty array when no cash registers exist', async () => {
      (prisma.cashRegister.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.cashRegister.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should include active session if exists', async () => {
      const cashRegisterWithSession = {
        ...mockCashRegisterWithWarehouse,
        sessions: [
          {
            id: 'session-123',
            openedAt: new Date(),
            userId: 'user-123',
            status: POSSessionStatus.ACTIVE,
          },
        ],
      };
      (prisma.cashRegister.findMany as jest.Mock).mockResolvedValue([
        cashRegisterWithSession,
      ]);
      (prisma.cashRegister.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data[0].activeSession).toBeDefined();
      expect(result.data[0].activeSession?.id).toBe('session-123');
    });
  });

  describe('findOne', () => {
    it('should return a cash register by id', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(
        mockCashRegisterWithWarehouse,
      );

      const result = await service.findOne('cash-register-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('cash-register-123');
      expect(prisma.cashRegister.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'cash-register-123',
          tenantId: mockTenantId,
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when cash register not found', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with English message', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        /Cash register with ID nonexistent not found/i,
      );
    });

    it('should require tenant context', async () => {
      (tenantContext.requireTenantId as jest.Mock).mockImplementation(() => {
        throw new Error('Tenant context required');
      });

      await expect(service.findOne('cash-register-123')).rejects.toThrow(
        'Tenant context required',
      );
    });
  });

  describe('create', () => {
    const createDto: CreateCashRegisterDto = {
      warehouseId: mockWarehouseId,
      name: 'Nueva Caja',
      code: 'CAJA-002',
    };

    it('should create a cash register successfully', async () => {
      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prisma.cashRegister.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.cashRegister.create as jest.Mock).mockResolvedValue({
        ...mockCashRegister,
        ...createDto,
        id: 'new-cash-register',
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Nueva Caja');
      expect(prisma.cashRegister.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when code already exists', async () => {
      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prisma.cashRegister.findUnique as jest.Mock).mockResolvedValue(
        mockCashRegister,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should require tenant context', async () => {
      (tenantContext.requireTenantId as jest.Mock).mockImplementation(() => {
        throw new Error('Tenant context required');
      });

      await expect(service.create(createDto)).rejects.toThrow(
        'Tenant context required',
      );
    });

    it('should auto-generate code if not provided', async () => {
      const createDtoNoCode: CreateCashRegisterDto = {
        warehouseId: mockWarehouseId,
        name: 'Nueva Caja',
      };
      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prisma.cashRegister.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.cashRegister.create as jest.Mock).mockResolvedValue({
        ...mockCashRegister,
        name: 'Nueva Caja',
        code: 'NUEVA-XXXX',
        id: 'new-cash-register',
      });

      const result = await service.create(createDtoNoCode);

      expect(result).toBeDefined();
      expect(prisma.cashRegister.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Nueva Caja',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateCashRegisterDto = {
      name: 'Caja Actualizada',
    };

    it('should update a cash register successfully', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({
        ...mockCashRegisterWithWarehouse,
        sessions: [],
      });
      (prisma.cashRegister.update as jest.Mock).mockResolvedValue({
        ...mockCashRegister,
        ...updateDto,
      });

      const result = await service.update('cash-register-123', updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Caja Actualizada');
      expect(prisma.cashRegister.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when cash register not found', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when updating code to existing one', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({
        ...mockCashRegisterWithWarehouse,
        sessions: [],
      });
      (prisma.cashRegister.findUnique as jest.Mock).mockResolvedValue({
        ...mockCashRegister,
        id: 'another-cash-register',
      });

      await expect(
        service.update('cash-register-123', { code: 'EXISTING-CODE' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when trying to change status with active session', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({
        ...mockCashRegisterWithWarehouse,
        sessions: [{ id: 'session-123', status: POSSessionStatus.ACTIVE }],
      });

      await expect(
        service.update('cash-register-123', {
          status: CashRegisterStatus.CLOSED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update code successfully when new code does not conflict (line 320)', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({
        ...mockCashRegisterWithWarehouse,
        code: 'CAJA-001',
        sessions: [],
      });
      // No existing cash register with the new code
      (prisma.cashRegister.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.cashRegister.update as jest.Mock).mockResolvedValue({
        ...mockCashRegister,
        code: 'CAJA-NEW',
      });

      const result = await service.update('cash-register-123', {
        code: 'caja-new',
      });

      expect(result).toBeDefined();
      expect(prisma.cashRegister.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'CAJA-NEW',
          }),
        }),
      );
    });

    it('should update status successfully when no active session (line 329)', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({
        ...mockCashRegisterWithWarehouse,
        sessions: [],
      });
      (prisma.cashRegister.update as jest.Mock).mockResolvedValue({
        ...mockCashRegister,
        status: CashRegisterStatus.CLOSED,
      });

      const result = await service.update('cash-register-123', {
        status: CashRegisterStatus.CLOSED,
      });

      expect(result).toBeDefined();
      expect(prisma.cashRegister.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: CashRegisterStatus.CLOSED,
          }),
        }),
      );
    });

    it('should skip code update when normalized code matches current code', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({
        ...mockCashRegisterWithWarehouse,
        code: 'CAJA-001',
        sessions: [],
      });
      (prisma.cashRegister.update as jest.Mock).mockResolvedValue({
        ...mockCashRegister,
      });

      await service.update('cash-register-123', { code: 'caja-001' });

      // findUnique should NOT be called since normalized code matches current
      expect(prisma.cashRegister.findUnique).not.toHaveBeenCalled();
      // Update should not include code in data
      expect(prisma.cashRegister.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ code: expect.anything() }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete a cash register successfully', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(
        mockCashRegister,
      );
      (prisma.pOSSession.count as jest.Mock).mockResolvedValue(0);
      (prisma.cashRegister.delete as jest.Mock).mockResolvedValue(
        mockCashRegister,
      );

      await expect(service.delete('cash-register-123')).resolves.not.toThrow();
    });

    it('should throw NotFoundException when cash register not found', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when cash register has sessions', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(
        mockCashRegister,
      );
      (prisma.pOSSession.count as jest.Mock).mockResolvedValue(5);

      await expect(service.delete('cash-register-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
