import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RemissionStatus } from '@prisma/client';
import { RemissionsController } from './remissions.controller';
import { RemissionsService } from './remissions.service';
import type {
  RemissionResponse,
  PaginatedRemissionsResponse,
} from './remissions.service';
import type { RequestUser } from '../auth/types';

describe('RemissionsController', () => {
  let controller: RemissionsController;
  let service: jest.Mocked<RemissionsService>;

  const mockUser: RequestUser = {
    userId: 'user-456',
    email: 'john@test.com',
    role: 'ADMIN' as any,
    tenantId: 'tenant-123',
  };

  const now = new Date('2026-02-25T12:00:00.000Z');

  const mockRemissionResponse: RemissionResponse = {
    id: 'rem-1',
    tenantId: 'tenant-123',
    customerId: 'cust-1',
    userId: 'user-456',
    warehouseId: 'wh-1',
    invoiceId: null,
    remissionNumber: 'REM-00001',
    status: RemissionStatus.DRAFT,
    issueDate: now,
    deliveryDate: null,
    deliveryAddress: 'Calle 100 #15-20, Bogota',
    transportInfo: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: 'item-1',
        remissionId: 'rem-1',
        productId: 'prod-1',
        description: 'Producto XYZ',
        quantity: 10,
        unit: 'unit',
        notes: null,
        product: { id: 'prod-1', sku: 'SKU-001', name: 'Producto XYZ' },
      },
    ],
    customer: {
      id: 'cust-1',
      name: 'Cliente Test',
      email: 'cliente@test.com',
      phone: '3001234567',
      address: 'Calle 100',
    },
    user: { id: 'user-456', name: 'John Doe', email: 'john@test.com' },
    warehouse: { id: 'wh-1', name: 'Bodega Principal', code: 'BP-001' },
  };

  const mockPaginatedResponse: PaginatedRemissionsResponse = {
    data: [mockRemissionResponse],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRemissionsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      dispatch: jest.fn(),
      deliver: jest.fn(),
      cancel: jest.fn(),
      getStats: jest.fn(),
      createFromInvoice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RemissionsController],
      providers: [
        { provide: RemissionsService, useValue: mockRemissionsService },
      ],
    }).compile();

    controller = module.get<RemissionsController>(RemissionsController);
    service = module.get(RemissionsService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should delegate to service with filters', async () => {
      (service.findAll as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      const filters = { page: 1, limit: 10, status: RemissionStatus.DRAFT };
      const result = await controller.findAll(filters);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(filters);
    });

    it('should pass empty filters to service', async () => {
      (service.findAll as jest.Mock).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const result = await controller.findAll({} as any);

      expect(result.data).toEqual([]);
      expect(service.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('getStats', () => {
    it('should delegate to service', async () => {
      const mockStats = {
        totalRemissions: 10,
        remissionsByStatus: {
          DRAFT: 3,
          DISPATCHED: 4,
          DELIVERED: 2,
          CANCELLED: 1,
        },
      };
      (service.getStats as jest.Mock).mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should delegate to service with id', async () => {
      (service.findOne as jest.Mock).mockResolvedValue(mockRemissionResponse);

      const result = await controller.findOne('rem-1');

      expect(result).toEqual(mockRemissionResponse);
      expect(service.findOne).toHaveBeenCalledWith('rem-1');
    });
  });

  describe('create', () => {
    it('should delegate to service with dto and user id', async () => {
      (service.create as jest.Mock).mockResolvedValue(mockRemissionResponse);

      const createDto = {
        customerId: 'cust-1',
        deliveryAddress: 'Calle 100',
        items: [{ description: 'Producto XYZ', quantity: 10 }],
      };

      const result = await controller.create(createDto as any, mockUser);

      expect(result).toEqual(mockRemissionResponse);
      expect(service.create).toHaveBeenCalledWith(createDto, mockUser.userId);
    });
  });

  describe('createFromInvoice', () => {
    it('should delegate to service with invoiceId and user id', async () => {
      (service.createFromInvoice as jest.Mock).mockResolvedValue(
        mockRemissionResponse,
      );

      const result = await controller.createFromInvoice('inv-1', mockUser);

      expect(result).toEqual(mockRemissionResponse);
      expect(service.createFromInvoice).toHaveBeenCalledWith(
        'inv-1',
        mockUser.userId,
      );
    });
  });

  describe('update', () => {
    it('should delegate to service with id and dto', async () => {
      const updated = { ...mockRemissionResponse, notes: 'Updated' };
      (service.update as jest.Mock).mockResolvedValue(updated);

      const updateDto = { notes: 'Updated' };
      const result = await controller.update('rem-1', updateDto as any);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith('rem-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should delegate to service with id', async () => {
      (service.remove as jest.Mock).mockResolvedValue(undefined);

      await controller.remove('rem-1');

      expect(service.remove).toHaveBeenCalledWith('rem-1');
    });
  });

  describe('dispatch', () => {
    it('should delegate to service with id', async () => {
      const dispatched = {
        ...mockRemissionResponse,
        status: RemissionStatus.DISPATCHED,
      };
      (service.dispatch as jest.Mock).mockResolvedValue(dispatched);

      const result = await controller.dispatch('rem-1');

      expect(result.status).toBe(RemissionStatus.DISPATCHED);
      expect(service.dispatch).toHaveBeenCalledWith('rem-1');
    });
  });

  describe('deliver', () => {
    it('should delegate to service with id', async () => {
      const delivered = {
        ...mockRemissionResponse,
        status: RemissionStatus.DELIVERED,
      };
      (service.deliver as jest.Mock).mockResolvedValue(delivered);

      const result = await controller.deliver('rem-1');

      expect(result.status).toBe(RemissionStatus.DELIVERED);
      expect(service.deliver).toHaveBeenCalledWith('rem-1');
    });
  });

  describe('cancel', () => {
    it('should delegate to service with id', async () => {
      const cancelled = {
        ...mockRemissionResponse,
        status: RemissionStatus.CANCELLED,
      };
      (service.cancel as jest.Mock).mockResolvedValue(cancelled);

      const result = await controller.cancel('rem-1');

      expect(result.status).toBe(RemissionStatus.CANCELLED);
      expect(service.cancel).toHaveBeenCalledWith('rem-1');
    });
  });
});
