import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CashRegistersController } from './cash-registers.controller';
import { CashRegistersService } from './cash-registers.service';
import type {
  CashRegisterResponse,
  CashRegisterWithWarehouse,
  PaginatedCashRegistersResponse,
} from './cash-registers.service';
import { CashRegisterStatus } from '@prisma/client';

describe('CashRegistersController', () => {
  let controller: CashRegistersController;
  let service: jest.Mocked<CashRegistersService>;

  const mockWarehouse = {
    id: 'warehouse-123',
    name: 'Bodega Central',
    code: 'BOD-001',
  };

  const mockCashRegister: CashRegisterWithWarehouse = {
    id: 'cash-register-123',
    tenantId: 'tenant-123',
    warehouseId: 'warehouse-123',
    name: 'Caja Principal',
    code: 'CAJA-001',
    status: CashRegisterStatus.OPEN,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    warehouse: mockWarehouse,
    activeSession: null,
  };

  const mockPaginatedResponse: PaginatedCashRegistersResponse = {
    data: [mockCashRegister],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockCashRegistersService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashRegistersController],
      providers: [
        { provide: CashRegistersService, useValue: mockCashRegistersService },
      ],
    }).compile();

    controller = module.get<CashRegistersController>(CashRegistersController);
    service = module.get(CashRegistersService);

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

  describe('findAll', () => {
    it('should return paginated cash registers', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('1', '10');

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should use default pagination values', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should pass warehouseId filter', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '10', 'warehouse-123');

      expect(service.findAll).toHaveBeenCalledWith(1, 10, 'warehouse-123');
    });

    it('should handle invalid page number by defaulting to 1', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('invalid', '10');

      // Controller normalizes NaN to 1 with Math.max(1, parseInt(...) || 1)
      expect(service.findAll).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should return empty data when no cash registers exist', async () => {
      const emptyResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      service.findAll.mockResolvedValue(emptyResponse);

      const result = await controller.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a cash register by id', async () => {
      service.findOne.mockResolvedValue(mockCashRegister);

      const result = await controller.findOne('cash-register-123');

      expect(result).toEqual(mockCashRegister);
      expect(service.findOne).toHaveBeenCalledWith('cash-register-123');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto = {
      warehouseId: 'warehouse-123',
      name: 'Nueva Caja',
      code: 'CAJA-002',
    };

    it('should create a cash register', async () => {
      const newCashRegister = {
        ...mockCashRegister,
        id: 'new-cash-register',
        name: 'Nueva Caja',
        code: 'CAJA-002',
      };
      service.create.mockResolvedValue(newCashRegister);

      const result = await controller.create(createDto);

      expect(result).toEqual(newCashRegister);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate NotFoundException for warehouse', async () => {
      service.create.mockRejectedValue(
        new NotFoundException('Bodega no encontrada'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate ConflictException for duplicate code', async () => {
      service.create.mockRejectedValue(
        new ConflictException('El codigo de caja ya existe'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Caja Actualizada',
    };

    it('should update a cash register', async () => {
      const updatedCashRegister = {
        ...mockCashRegister,
        name: 'Caja Actualizada',
      };
      service.update.mockResolvedValue(updatedCashRegister);

      const result = await controller.update('cash-register-123', updateDto);

      expect(result).toEqual(updatedCashRegister);
      expect(service.update).toHaveBeenCalledWith(
        'cash-register-123',
        updateDto,
      );
    });

    it('should propagate NotFoundException', async () => {
      service.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate ConflictException', async () => {
      service.update.mockRejectedValue(new ConflictException());

      await expect(
        controller.update('cash-register-123', { code: 'EXISTING' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete a cash register', async () => {
      service.delete.mockResolvedValue(undefined);

      await expect(
        controller.delete('cash-register-123'),
      ).resolves.not.toThrow();
      expect(service.delete).toHaveBeenCalledWith('cash-register-123');
    });

    it('should propagate NotFoundException', async () => {
      service.delete.mockRejectedValue(new NotFoundException());

      await expect(controller.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate BadRequestException for active session', async () => {
      service.delete.mockRejectedValue(
        new BadRequestException('La caja tiene una sesion activa'),
      );

      await expect(controller.delete('cash-register-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
