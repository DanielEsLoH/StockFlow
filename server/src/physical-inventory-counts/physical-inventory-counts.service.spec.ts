import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PhysicalCountStatus, MovementType } from '@prisma/client';
import { PhysicalInventoryCountsService } from './physical-inventory-counts.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/services/tenant-context.service';
import { AccountingBridgeService } from '../accounting/accounting-bridge.service';

describe('PhysicalInventoryCountsService', () => {
  let service: PhysicalInventoryCountsService;
  let prisma: any;
  let accountingBridge: any;

  const tenantId = 'tenant-counts';
  const userId = 'user-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      warehouse: { findFirst: jest.fn() },
      physicalInventoryCount: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      physicalCountItem: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      warehouseStock: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      stockMovement: { create: jest.fn() },
      product: { update: jest.fn() },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };

    accountingBridge = {
      onStockAdjustment: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhysicalInventoryCountsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: TenantContextService,
          useValue: { requireTenantId: jest.fn().mockReturnValue(tenantId) },
        },
        {
          provide: AccountingBridgeService,
          useValue: accountingBridge,
        },
      ],
    }).compile();

    service = module.get<PhysicalInventoryCountsService>(
      PhysicalInventoryCountsService,
    );

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new count for a valid warehouse', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1', name: 'Bodega 1' });
      prisma.physicalInventoryCount.findFirst.mockResolvedValue(null); // no active count
      prisma.physicalInventoryCount.create.mockResolvedValue({
        id: 'count-1',
        warehouseId: 'wh-1',
        status: PhysicalCountStatus.DRAFT,
        countDate: new Date(),
        startedAt: null,
        completedAt: null,
        notes: 'Test',
        createdAt: new Date(),
        warehouse: { name: 'Bodega 1', code: 'B1' },
        items: [],
      });

      const result = await service.create(
        { warehouseId: 'wh-1', notes: 'Test' },
        userId,
      );

      expect(result.id).toBe('count-1');
      expect(result.status).toBe(PhysicalCountStatus.DRAFT);
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      prisma.warehouse.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ warehouseId: 'wh-x' }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when active count exists', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1' });
      prisma.physicalInventoryCount.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ warehouseId: 'wh-1' }, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addItem', () => {
    it('should add an item with correct variance', async () => {
      prisma.physicalInventoryCount.findFirst.mockResolvedValue({
        id: 'count-1',
        warehouseId: 'wh-1',
        status: PhysicalCountStatus.IN_PROGRESS,
      });
      prisma.warehouseStock.findUnique.mockResolvedValue({ quantity: 10 });
      prisma.physicalCountItem.upsert.mockResolvedValue({
        id: 'item-1',
        productId: 'prod-1',
        systemQuantity: 10,
        physicalQuantity: 8,
        variance: -2,
        notes: null,
        product: { sku: 'SKU-001', name: 'Test Product' },
      });

      const result = await service.addItem(
        'count-1',
        { productId: 'prod-1', physicalQuantity: 8 },
        userId,
      );

      expect(result.systemQuantity).toBe(10);
      expect(result.physicalQuantity).toBe(8);
      expect(result.variance).toBe(-2);
    });

    it('should throw NotFoundException when count not found', async () => {
      prisma.physicalInventoryCount.findFirst.mockResolvedValue(null);

      await expect(
        service.addItem('count-x', { productId: 'prod-1', physicalQuantity: 5 }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when count is COMPLETED', async () => {
      prisma.physicalInventoryCount.findFirst.mockResolvedValue({
        id: 'count-1',
        status: PhysicalCountStatus.COMPLETED,
      });

      await expect(
        service.addItem('count-1', { productId: 'prod-1', physicalQuantity: 5 }, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('startCount', () => {
    it('should transition DRAFT to IN_PROGRESS', async () => {
      prisma.physicalInventoryCount.findFirst.mockResolvedValue({
        id: 'count-1',
        status: PhysicalCountStatus.DRAFT,
      });
      prisma.physicalInventoryCount.update.mockResolvedValue({
        id: 'count-1',
        warehouseId: 'wh-1',
        status: PhysicalCountStatus.IN_PROGRESS,
        countDate: new Date(),
        startedAt: new Date(),
        completedAt: null,
        notes: null,
        createdAt: new Date(),
        warehouse: { name: 'Bodega 1', code: 'B1' },
        items: [],
      });

      const result = await service.startCount('count-1', userId);

      expect(result.status).toBe(PhysicalCountStatus.IN_PROGRESS);
    });

    it('should throw BadRequestException when not DRAFT', async () => {
      prisma.physicalInventoryCount.findFirst.mockResolvedValue({
        id: 'count-1',
        status: PhysicalCountStatus.IN_PROGRESS,
      });

      await expect(service.startCount('count-1', userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('completeCount', () => {
    const mockCount = {
      id: 'count-1',
      warehouseId: 'wh-1',
      status: PhysicalCountStatus.IN_PROGRESS,
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          systemQuantity: 10,
          physicalQuantity: 8,
          variance: -2,
          product: { sku: 'SKU-001', costPrice: 5000 },
        },
        {
          id: 'item-2',
          productId: 'prod-2',
          systemQuantity: 5,
          physicalQuantity: 5,
          variance: 0,
          product: { sku: 'SKU-002', costPrice: 3000 },
        },
      ],
    };

    it('should generate adjustments for items with variance', async () => {
      prisma.physicalInventoryCount.findFirst.mockResolvedValue(mockCount);
      // findOne is called after completion
      prisma.physicalInventoryCount.findFirst
        .mockResolvedValueOnce(mockCount)
        .mockResolvedValueOnce({
          ...mockCount,
          status: PhysicalCountStatus.COMPLETED,
          warehouse: { name: 'Bodega 1', code: 'B1' },
          startedBy: null,
          completedBy: { firstName: 'Admin', lastName: 'User' },
          items: mockCount.items.map((i) => ({
            ...i,
            product: { ...i.product, stock: 10, name: 'Test' },
            countedBy: null,
            countedAt: null,
            notes: null,
          })),
        });

      await service.completeCount('count-1', userId);

      // Should create adjustment for item-1 (variance -2) but not item-2 (variance 0)
      expect(prisma.stockMovement.create).toHaveBeenCalledTimes(1);
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: MovementType.ADJUSTMENT,
          quantity: -2,
          productId: 'prod-1',
        }),
      });

      // Should update WarehouseStock for item-1 only
      expect(prisma.warehouseStock.upsert).toHaveBeenCalledTimes(1);

      // Should update Product stock for item-1 only
      expect(prisma.product.update).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when not IN_PROGRESS', async () => {
      prisma.physicalInventoryCount.findFirst.mockResolvedValue({
        id: 'count-1',
        status: PhysicalCountStatus.DRAFT,
        items: [],
      });

      await expect(service.completeCount('count-1', userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when no items', async () => {
      prisma.physicalInventoryCount.findFirst.mockResolvedValue({
        id: 'count-1',
        status: PhysicalCountStatus.IN_PROGRESS,
        items: [],
      });

      await expect(service.completeCount('count-1', userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelCount', () => {
    it('should cancel a DRAFT count', async () => {
      prisma.physicalInventoryCount.findFirst.mockResolvedValue({
        id: 'count-1',
        status: PhysicalCountStatus.DRAFT,
      });
      prisma.physicalInventoryCount.update.mockResolvedValue({
        id: 'count-1',
        warehouseId: 'wh-1',
        status: PhysicalCountStatus.CANCELLED,
        countDate: new Date(),
        startedAt: null,
        completedAt: null,
        notes: null,
        createdAt: new Date(),
        warehouse: { name: 'Bodega 1', code: 'B1' },
        items: [],
      });

      const result = await service.cancelCount('count-1');

      expect(result.status).toBe(PhysicalCountStatus.CANCELLED);
    });

    it('should throw BadRequestException when count is COMPLETED', async () => {
      prisma.physicalInventoryCount.findFirst.mockResolvedValue({
        id: 'count-1',
        status: PhysicalCountStatus.COMPLETED,
      });

      await expect(service.cancelCount('count-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when count not found', async () => {
      prisma.physicalInventoryCount.findFirst.mockResolvedValue(null);

      await expect(service.cancelCount('count-x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
