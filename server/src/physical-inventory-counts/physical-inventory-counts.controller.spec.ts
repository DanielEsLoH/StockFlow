import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PhysicalCountStatus } from '@prisma/client';
import { PhysicalInventoryCountsController } from './physical-inventory-counts.controller';
import { PhysicalInventoryCountsService } from './physical-inventory-counts.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

describe('PhysicalInventoryCountsController', () => {
  let controller: PhysicalInventoryCountsController;
  let service: jest.Mocked<PhysicalInventoryCountsService>;

  const mockUser = { userId: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' };

  const mockCountResponse = {
    id: 'count-1',
    warehouseId: 'wh-1',
    warehouseName: 'Bodega 1',
    warehouseCode: 'B1',
    status: PhysicalCountStatus.DRAFT,
    countDate: new Date(),
    startedAt: null as Date | null,
    completedAt: null as Date | null,
    startedBy: null as string | null,
    completedBy: null as string | null,
    itemsCount: 0,
    notes: 'Test count',
    createdAt: new Date(),
  };

  const mockItemResponse = {
    id: 'item-1',
    tenantId: 'tenant-1',
    productId: 'prod-1',
    countId: 'count-1',
    productSku: 'SKU-001',
    productName: 'Test Product',
    systemQuantity: 10,
    physicalQuantity: 8,
    variance: -2,
    countedById: null as string | null,
    countedAt: null as Date | null,
    notes: null as string | null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      startCount: jest.fn(),
      completeCount: jest.fn(),
      cancelCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhysicalInventoryCountsController],
      providers: [
        { provide: PhysicalInventoryCountsService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PhysicalInventoryCountsController>(
      PhysicalInventoryCountsController,
    );
    service = module.get(PhysicalInventoryCountsService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and userId', async () => {
      const dto = { warehouseId: 'wh-1', notes: 'Test' };
      service.create.mockResolvedValue(mockCountResponse);

      const result = await controller.create(dto, mockUser);

      expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toEqual(mockCountResponse);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with parsed query params', async () => {
      const paginatedResult = {
        data: [mockCountResponse],
        total: 1,
        page: 1,
        limit: 20,
      };
      service.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(
        '2',
        '10',
        PhysicalCountStatus.DRAFT,
        'wh-1',
      );

      expect(service.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        status: PhysicalCountStatus.DRAFT,
        warehouseId: 'wh-1',
      });
      expect(result).toEqual(paginatedResult);
    });

    it('should pass undefined for missing optional params', async () => {
      service.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.findAll(undefined, undefined, undefined, undefined);

      expect(service.findAll).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        status: undefined,
        warehouseId: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      const detailResult = {
        ...mockCountResponse,
        startedBy: null,
        completedBy: null,
        items: [],
        summary: {
          totalItems: 0,
          itemsWithVariance: 0,
          totalPositiveVariance: 0,
          totalNegativeVariance: 0,
        },
        updatedAt: new Date(),
      };
      service.findOne.mockResolvedValue(detailResult);

      const result = await controller.findOne('count-1');

      expect(service.findOne).toHaveBeenCalledWith('count-1');
      expect(result).toEqual(detailResult);
    });
  });

  describe('addItem', () => {
    it('should call service.addItem with countId, dto, and userId', async () => {
      const dto = { productId: 'prod-1', physicalQuantity: 8 };
      service.addItem.mockResolvedValue(mockItemResponse);

      const result = await controller.addItem('count-1', dto, mockUser);

      expect(service.addItem).toHaveBeenCalledWith('count-1', dto, 'user-1');
      expect(result).toEqual(mockItemResponse);
    });
  });

  describe('updateItem', () => {
    it('should call service.updateItem with countId, itemId, dto, and userId', async () => {
      const dto = { physicalQuantity: 12 };
      const updatedItem = {
        ...mockItemResponse,
        physicalQuantity: 12,
        variance: 2,
      };
      service.updateItem.mockResolvedValue(updatedItem);

      const result = await controller.updateItem(
        'count-1',
        'item-1',
        dto,
        mockUser,
      );

      expect(service.updateItem).toHaveBeenCalledWith(
        'count-1',
        'item-1',
        dto,
        'user-1',
      );
      expect(result).toEqual(updatedItem);
    });
  });

  describe('removeItem', () => {
    it('should call service.removeItem with countId and itemId', async () => {
      service.removeItem.mockResolvedValue({ deleted: true });

      const result = await controller.removeItem('count-1', 'item-1');

      expect(service.removeItem).toHaveBeenCalledWith('count-1', 'item-1');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('startCount', () => {
    it('should call service.startCount with id and userId', async () => {
      const started = {
        ...mockCountResponse,
        status: PhysicalCountStatus.IN_PROGRESS,
        startedAt: new Date(),
      };
      service.startCount.mockResolvedValue(started);

      const result = await controller.startCount('count-1', mockUser);

      expect(service.startCount).toHaveBeenCalledWith('count-1', 'user-1');
      expect(result.status).toBe(PhysicalCountStatus.IN_PROGRESS);
    });
  });

  describe('completeCount', () => {
    it('should call service.completeCount with id and userId', async () => {
      const completed = {
        ...mockCountResponse,
        status: PhysicalCountStatus.COMPLETED,
        completedAt: new Date(),
        items: [],
        summary: {
          totalItems: 0,
          itemsWithVariance: 0,
          totalPositiveVariance: 0,
          totalNegativeVariance: 0,
        },
        updatedAt: new Date(),
      };
      service.completeCount.mockResolvedValue(completed);

      const result = await controller.completeCount('count-1', mockUser);

      expect(service.completeCount).toHaveBeenCalledWith('count-1', 'user-1');
      expect(result.status).toBe(PhysicalCountStatus.COMPLETED);
    });
  });

  describe('cancelCount', () => {
    it('should call service.cancelCount with id', async () => {
      const cancelled = {
        ...mockCountResponse,
        status: PhysicalCountStatus.CANCELLED,
      };
      service.cancelCount.mockResolvedValue(cancelled);

      const result = await controller.cancelCount('count-1');

      expect(service.cancelCount).toHaveBeenCalledWith('count-1');
      expect(result.status).toBe(PhysicalCountStatus.CANCELLED);
    });
  });

  describe('error propagation', () => {
    it('should propagate service errors from create', async () => {
      service.create.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.create({ warehouseId: 'wh-1' }, mockUser),
      ).rejects.toThrow('Service error');
    });

    it('should propagate service errors from findOne', async () => {
      service.findOne.mockRejectedValue(new Error('Not found'));

      await expect(controller.findOne('bad-id')).rejects.toThrow('Not found');
    });
  });
});
