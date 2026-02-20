import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { MovementType } from '@prisma/client';
import { StockMovementsService } from './stock-movements.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountingBridgeService } from '../accounting';
import type { CreateMovementDto, FilterMovementsDto } from './dto';

describe('StockMovementsService', () => {
  let service: StockMovementsService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockProduct = {
    id: 'product-123',
    tenantId: mockTenantId,
    name: 'Test Product',
    sku: 'TEST-001',
    stock: 100,
  };

  const mockWarehouse = {
    id: 'warehouse-123',
    tenantId: mockTenantId,
    name: 'Main Warehouse',
    code: 'ALM-01',
  };

  const mockUser = {
    id: mockUserId,
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockStockMovement = {
    id: 'movement-123',
    tenantId: mockTenantId,
    productId: mockProduct.id,
    warehouseId: mockWarehouse.id,
    userId: mockUserId,
    type: MovementType.ADJUSTMENT,
    quantity: 10,
    reason: 'Physical inventory correction',
    notes: 'Found extra units',
    invoiceId: null,
    createdAt: new Date('2024-01-15'),
    product: {
      id: mockProduct.id,
      sku: mockProduct.sku,
      name: mockProduct.name,
    },
    warehouse: {
      id: mockWarehouse.id,
      code: mockWarehouse.code,
      name: mockWarehouse.name,
    },
    user: {
      id: mockUser.id,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
    },
  };

  const mockStockMovement2 = {
    ...mockStockMovement,
    id: 'movement-456',
    quantity: -5,
    reason: 'Damaged goods',
    notes: 'Items found damaged in storage',
    createdAt: new Date('2024-01-20'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock implementations
    const mockPrismaService = {
      stockMovement: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      warehouse: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        {
          provide: AccountingBridgeService,
          useValue: { onStockAdjustment: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<StockMovementsService>(StockMovementsService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
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
    beforeEach(() => {
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([
        mockStockMovement,
        mockStockMovement2,
      ]);
      (prismaService.stockMovement.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return paginated stock movements', async () => {
      const result = await service.findAll({});

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should use default empty object when called with no parameter', async () => {
      // This tests the default parameter: filters: FilterMovementsDto = {}
      const result = await service.findAll();

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should calculate correct pagination for page 2', async () => {
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([
        mockStockMovement,
      ]);
      (prismaService.stockMovement.count as jest.Mock).mockResolvedValue(15);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(2);
      expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should calculate correct skip for page 3 with limit 5', async () => {
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([
        mockStockMovement,
      ]);
      (prismaService.stockMovement.count as jest.Mock).mockResolvedValue(25);

      const result = await service.findAll({ page: 3, limit: 5 });

      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.totalPages).toBe(5);
      expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('should require tenant context', async () => {
      await service.findAll({});

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return empty array when no movements exist', async () => {
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.stockMovement.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should use default pagination values', async () => {
      await service.findAll({});

      expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should order movements by createdAt descending', async () => {
      await service.findAll({});

      expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    describe('filters', () => {
      it('should filter by productId', async () => {
        const filters: FilterMovementsDto = { productId: mockProduct.id };

        await service.findAll(filters);

        expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              productId: mockProduct.id,
            }),
          }),
        );
      });

      it('should filter by warehouseId', async () => {
        const filters: FilterMovementsDto = { warehouseId: mockWarehouse.id };

        await service.findAll(filters);

        expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              warehouseId: mockWarehouse.id,
            }),
          }),
        );
      });

      it('should filter by movement type', async () => {
        const filters: FilterMovementsDto = { type: MovementType.ADJUSTMENT };

        await service.findAll(filters);

        expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              type: MovementType.ADJUSTMENT,
            }),
          }),
        );
      });

      it('should filter by fromDate only', async () => {
        const fromDate = new Date('2024-01-01');
        const filters: FilterMovementsDto = { fromDate };

        await service.findAll(filters);

        expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              createdAt: { gte: fromDate },
            }),
          }),
        );
      });

      it('should filter by toDate only', async () => {
        const toDate = new Date('2024-12-31');
        const filters: FilterMovementsDto = { toDate };

        await service.findAll(filters);

        expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              createdAt: { lte: toDate },
            }),
          }),
        );
      });

      it('should filter by date range (fromDate and toDate)', async () => {
        const fromDate = new Date('2024-01-01');
        const toDate = new Date('2024-12-31');
        const filters: FilterMovementsDto = { fromDate, toDate };

        await service.findAll(filters);

        expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              createdAt: { gte: fromDate, lte: toDate },
            }),
          }),
        );
      });

      it('should combine multiple filters', async () => {
        const filters: FilterMovementsDto = {
          productId: mockProduct.id,
          warehouseId: mockWarehouse.id,
          type: MovementType.SALE,
        };

        await service.findAll(filters);

        expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: mockTenantId,
              productId: mockProduct.id,
              warehouseId: mockWarehouse.id,
              type: MovementType.SALE,
            }),
          }),
        );
      });

      it('should not include createdAt filter when neither fromDate nor toDate provided', async () => {
        await service.findAll({});

        const calls = (prismaService.stockMovement.findMany as jest.Mock).mock
          .calls as Array<[{ where: { createdAt?: unknown } }]>;
        const callArg = calls[0][0];
        expect(callArg.where.createdAt).toBeUndefined();
      });
    });

    it('should include product, warehouse, and user in response', async () => {
      const result = await service.findAll({});

      expect(result.data[0].product).toBeDefined();
      expect(result.data[0].warehouse).toBeDefined();
      expect(result.data[0].user).toBeDefined();
    });

    it('should include relations in query', async () => {
      await service.findAll({});

      expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
              },
            },
            warehouse: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    beforeEach(() => {
      (prismaService.stockMovement.findFirst as jest.Mock).mockResolvedValue(
        mockStockMovement,
      );
    });

    it('should return a stock movement by id', async () => {
      const result = await service.findOne('movement-123');

      expect(result.id).toBe('movement-123');
      expect(result.quantity).toBe(10);
      expect(result.type).toBe(MovementType.ADJUSTMENT);
    });

    it('should require tenant context', async () => {
      await service.findOne('movement-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should query with tenant filter', async () => {
      await service.findOne('movement-123');

      expect(prismaService.stockMovement.findFirst).toHaveBeenCalledWith({
        where: { id: 'movement-123', tenantId: mockTenantId },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when movement not found', async () => {
      (prismaService.stockMovement.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with Spanish message', async () => {
      (prismaService.stockMovement.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Movimiento de stock no encontrado',
      );
    });

    it('should include product relation in response', async () => {
      const result = await service.findOne('movement-123');

      expect(result.product).toBeDefined();
      expect(result.product?.sku).toBe('TEST-001');
    });

    it('should include warehouse relation in response', async () => {
      const result = await service.findOne('movement-123');

      expect(result.warehouse).toBeDefined();
      expect(result.warehouse?.code).toBe('ALM-01');
    });

    it('should include user relation in response', async () => {
      const result = await service.findOne('movement-123');

      expect(result.user).toBeDefined();
      expect(result.user?.firstName).toBe('John');
    });
  });

  describe('findByProduct', () => {
    beforeEach(() => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([
        mockStockMovement,
        mockStockMovement2,
      ]);
      (prismaService.stockMovement.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return all movements for a product', async () => {
      const result = await service.findByProduct('product-123');

      expect(result.data).toHaveLength(2);
      expect(result.data[0].productId).toBe('product-123');
    });

    it('should require tenant context', async () => {
      await service.findByProduct('product-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should throw NotFoundException when product not found', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findByProduct('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with Spanish message when product not found', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findByProduct('invalid-id')).rejects.toThrow(
        'Producto no encontrado',
      );
    });

    it('should verify product belongs to tenant', async () => {
      await service.findByProduct('product-123');

      expect(prismaService.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'product-123', tenantId: mockTenantId },
      });
    });

    it('should pass filters to findAll', async () => {
      const filters: FilterMovementsDto = {
        page: 2,
        limit: 5,
        type: MovementType.ADJUSTMENT,
      };

      await service.findByProduct('product-123', filters);

      expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId: 'product-123',
            type: MovementType.ADJUSTMENT,
          }),
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should use default empty object when filters not provided', async () => {
      await service.findByProduct('product-123');

      expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId: 'product-123',
          }),
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should return empty array when no movements exist for product', async () => {
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.stockMovement.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findByProduct('product-123');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findByWarehouse', () => {
    beforeEach(() => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([
        mockStockMovement,
        mockStockMovement2,
      ]);
      (prismaService.stockMovement.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return all movements for a warehouse', async () => {
      const result = await service.findByWarehouse('warehouse-123');

      expect(result.data).toHaveLength(2);
      expect(result.data[0].warehouseId).toBe('warehouse-123');
    });

    it('should require tenant context', async () => {
      await service.findByWarehouse('warehouse-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findByWarehouse('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with Spanish message when warehouse not found', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findByWarehouse('invalid-id')).rejects.toThrow(
        'Almacen no encontrado',
      );
    });

    it('should verify warehouse belongs to tenant', async () => {
      await service.findByWarehouse('warehouse-123');

      expect(prismaService.warehouse.findFirst).toHaveBeenCalledWith({
        where: { id: 'warehouse-123', tenantId: mockTenantId },
      });
    });

    it('should pass filters to findAll', async () => {
      const filters: FilterMovementsDto = {
        page: 2,
        limit: 5,
        type: MovementType.TRANSFER,
      };

      await service.findByWarehouse('warehouse-123', filters);

      expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            warehouseId: 'warehouse-123',
            type: MovementType.TRANSFER,
          }),
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should use default empty object when filters not provided', async () => {
      await service.findByWarehouse('warehouse-123');

      expect(prismaService.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            warehouseId: 'warehouse-123',
          }),
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should return empty array when no movements exist for warehouse', async () => {
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.stockMovement.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findByWarehouse('warehouse-123');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('create', () => {
    const createDto: CreateMovementDto = {
      productId: 'product-123',
      warehouseId: 'warehouse-123',
      quantity: 10,
      reason: 'Inventory count correction',
      notes: 'Found extra units',
    };

    beforeEach(() => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 60 }),
            },
            stockMovement: {
              create: jest.fn().mockResolvedValue(mockStockMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );
    });

    it('should create a movement and return it', async () => {
      const result = await service.create(createDto, mockUserId);

      expect(result.id).toBe('movement-123');
      expect(result.quantity).toBe(10);
      expect(result.type).toBe(MovementType.ADJUSTMENT);
    });

    it('should require tenant context', async () => {
      await service.create(createDto, mockUserId);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should verify product exists and belongs to tenant', async () => {
      await service.create(createDto, mockUserId);

      expect(prismaService.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'product-123', tenantId: mockTenantId },
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with Spanish message when product not found', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        'Producto no encontrado',
      );
    });

    it('should verify warehouse exists when warehouseId provided', async () => {
      let warehouseFindFirstCalled = false;
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockImplementation(() => {
                warehouseFindFirstCalled = true;
                return mockWarehouse;
              }),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 60 }),
            },
            stockMovement: {
              create: jest.fn().mockResolvedValue(mockStockMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.create(createDto, mockUserId);

      // Warehouse verification happens inside the transaction
      expect(warehouseFindFirstCalled).toBe(true);
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue(null),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest.fn().mockResolvedValue(mockStockMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with Spanish message when warehouse not found', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue(null),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest.fn().mockResolvedValue(mockStockMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        'Almacen no encontrado',
      );
    });

    it('should use default warehouse when warehouseId not provided', async () => {
      // When warehouseId is not provided, the service finds the default warehouse in the transaction
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 60 }),
            },
            stockMovement: {
              create: jest.fn().mockResolvedValue(mockStockMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      const dtoWithoutWarehouse: CreateMovementDto = {
        productId: 'product-123',
        quantity: 10,
        reason: 'Inventory correction',
      };

      await service.create(dtoWithoutWarehouse, mockUserId);

      // When no warehouseId is provided, prismaService.warehouse.findFirst is NOT called
      // directly (the call happens inside the transaction to get the default warehouse)
      expect(prismaService.warehouse.findFirst).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when stock would go negative', async () => {
      const negativeDto: CreateMovementDto = {
        productId: 'product-123',
        quantity: -150, // More than current stock of 100
        reason: 'Large adjustment',
      };

      await expect(service.create(negativeDto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with descriptive Spanish message for negative stock', async () => {
      const negativeDto: CreateMovementDto = {
        productId: 'product-123',
        quantity: -150,
        reason: 'Large adjustment',
      };

      await expect(service.create(negativeDto, mockUserId)).rejects.toThrow(
        'El ajuste resultaria en stock negativo. Stock actual: 100, ajuste: -150',
      );
    });

    it('should allow adjustment that brings stock to exactly zero', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              // The warehouse has exactly 100 units to allow -100 adjustment
              findUnique: jest.fn().mockResolvedValue({ quantity: 100 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 0 }),
            },
            stockMovement: {
              create: jest.fn().mockResolvedValue(mockStockMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      const exactZeroDto: CreateMovementDto = {
        productId: 'product-123',
        quantity: -100, // Exactly current stock
        reason: 'Clear inventory',
      };

      await service.create(exactZeroDto, mockUserId);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should successfully create adjustment with positive quantity', async () => {
      const positiveDto: CreateMovementDto = {
        productId: 'product-123',
        quantity: 50,
        reason: 'Stock received',
      };

      await service.create(positiveDto, mockUserId);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should successfully create adjustment with negative quantity within stock limits', async () => {
      const negativeDto: CreateMovementDto = {
        productId: 'product-123',
        quantity: -50, // Less than current stock of 100
        reason: 'Stock removed',
      };

      await service.create(negativeDto, mockUserId);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should use transaction for movement creation', async () => {
      await service.create(createDto, mockUserId);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should update product stock within transaction', async () => {
      let productUpdateData: unknown;
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockImplementation((data: unknown) => {
                productUpdateData = data;
                return mockProduct;
              }),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 60 }),
            },
            stockMovement: {
              create: jest.fn().mockResolvedValue(mockStockMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.create(createDto, mockUserId);

      expect(productUpdateData).toEqual({
        where: { id: 'product-123' },
        data: { stock: 110 }, // 100 + 10
      });
    });

    it('should calculate correct new stock for positive adjustment', async () => {
      let productUpdateData: unknown;
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockImplementation((data: unknown) => {
                productUpdateData = data;
                return mockProduct;
              }),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 75 }),
            },
            stockMovement: {
              create: jest.fn().mockResolvedValue(mockStockMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      const positiveDto: CreateMovementDto = {
        productId: 'product-123',
        quantity: 25,
        reason: 'Stock increase',
      };

      await service.create(positiveDto, mockUserId);

      expect(productUpdateData).toEqual(
        expect.objectContaining({
          data: { stock: 125 }, // 100 + 25
        }),
      );
    });

    it('should calculate correct new stock for negative adjustment', async () => {
      let productUpdateData: unknown;
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockImplementation((data: unknown) => {
                productUpdateData = data;
                return mockProduct;
              }),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 20 }),
            },
            stockMovement: {
              create: jest.fn().mockResolvedValue(mockStockMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      const negativeDto: CreateMovementDto = {
        productId: 'product-123',
        quantity: -30,
        reason: 'Stock decrease',
      };

      await service.create(negativeDto, mockUserId);

      expect(productUpdateData).toEqual(
        expect.objectContaining({
          data: { stock: 70 }, // 100 - 30
        }),
      );
    });

    it('should create movement record with correct data', async () => {
      let movementCreateData: unknown;
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 60 }),
            },
            stockMovement: {
              create: jest.fn().mockImplementation((data: unknown) => {
                movementCreateData = data;
                return mockStockMovement;
              }),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.create(createDto, mockUserId);

      expect(movementCreateData).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            productId: 'product-123',
            warehouseId: 'warehouse-123',
            userId: mockUserId,
            type: MovementType.ADJUSTMENT,
            quantity: 10,
            reason: 'Inventory count correction',
            notes: 'Found extra units',
          }),
        }),
      );
    });

    it('should use default warehouse when not provided', async () => {
      let movementCreateData: { data: { warehouseId: string | null } };
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 60 }),
            },
            stockMovement: {
              create: jest.fn().mockImplementation((data: unknown) => {
                movementCreateData = data as {
                  data: { warehouseId: string | null };
                };
                return mockStockMovement;
              }),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      const dtoWithoutWarehouse: CreateMovementDto = {
        productId: 'product-123',
        quantity: 10,
        reason: 'Correction',
      };

      await service.create(dtoWithoutWarehouse, mockUserId);

      // When no warehouse is provided, it uses the default warehouse
      expect(movementCreateData!.data.warehouseId).toBe('warehouse-123');
    });

    it('should set userId to null when not provided', async () => {
      let movementCreateData: { data: { userId: string | null } };
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 60 }),
            },
            stockMovement: {
              create: jest.fn().mockImplementation((data: unknown) => {
                movementCreateData = data as {
                  data: { userId: string | null };
                };
                return mockStockMovement;
              }),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.create(createDto); // No userId provided

      expect(movementCreateData!.data.userId).toBeNull();
    });

    it('should set notes to null when not provided', async () => {
      let movementCreateData: { data: { notes: string | null } };
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 60 }),
            },
            stockMovement: {
              create: jest.fn().mockImplementation((data: unknown) => {
                movementCreateData = data as { data: { notes: string | null } };
                return mockStockMovement;
              }),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      const dtoWithoutNotes: CreateMovementDto = {
        productId: 'product-123',
        quantity: 10,
        reason: 'Correction',
      };

      await service.create(dtoWithoutNotes, mockUserId);

      expect(movementCreateData!.data.notes).toBeNull();
    });

    it('should always set movement type to ADJUSTMENT', async () => {
      let movementCreateData: { data: { type: MovementType } };
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 60 }),
            },
            stockMovement: {
              create: jest.fn().mockImplementation((data: unknown) => {
                movementCreateData = data as { data: { type: MovementType } };
                return mockStockMovement;
              }),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.create(createDto, mockUserId);

      expect(movementCreateData!.data.type).toBe(MovementType.ADJUSTMENT);
    });

    it('should include relations in create query', async () => {
      let movementCreateData: { include: unknown };
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 60 }),
            },
            stockMovement: {
              create: jest.fn().mockImplementation((data: unknown) => {
                movementCreateData = data as { include: unknown };
                return mockStockMovement;
              }),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.create(createDto, mockUserId);

      expect(movementCreateData!.include).toEqual({
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      });
    });
  });

  describe('response mapping', () => {
    it('should correctly map movement to response format', async () => {
      (prismaService.stockMovement.findFirst as jest.Mock).mockResolvedValue(
        mockStockMovement,
      );

      const result = await service.findOne('movement-123');

      expect(result).toEqual({
        id: 'movement-123',
        tenantId: mockTenantId,
        productId: 'product-123',
        warehouseId: 'warehouse-123',
        userId: mockUserId,
        type: MovementType.ADJUSTMENT,
        quantity: 10,
        reason: 'Physical inventory correction',
        notes: 'Found extra units',
        invoiceId: null,
        createdAt: expect.any(Date),
        product: {
          id: 'product-123',
          sku: 'TEST-001',
          name: 'Test Product',
        },
        warehouse: {
          id: 'warehouse-123',
          code: 'ALM-01',
          name: 'Main Warehouse',
        },
        user: {
          id: mockUserId,
          firstName: 'John',
          lastName: 'Doe',
        },
      });
    });

    it('should handle movement without product relation', async () => {
      const movementWithoutProduct = {
        ...mockStockMovement,
        product: undefined,
      };
      (prismaService.stockMovement.findFirst as jest.Mock).mockResolvedValue(
        movementWithoutProduct,
      );

      const result = await service.findOne('movement-123');

      expect(result.id).toBe('movement-123');
      expect(result.product).toBeUndefined();
    });

    it('should handle movement without warehouse relation', async () => {
      const movementWithoutWarehouse = {
        ...mockStockMovement,
        warehouse: undefined,
        warehouseId: null,
      };
      (prismaService.stockMovement.findFirst as jest.Mock).mockResolvedValue(
        movementWithoutWarehouse,
      );

      const result = await service.findOne('movement-123');

      expect(result.id).toBe('movement-123');
      expect(result.warehouse).toBeUndefined();
    });

    it('should handle movement without user relation', async () => {
      const movementWithoutUser = {
        ...mockStockMovement,
        user: undefined,
        userId: null,
      };
      (prismaService.stockMovement.findFirst as jest.Mock).mockResolvedValue(
        movementWithoutUser,
      );

      const result = await service.findOne('movement-123');

      expect(result.id).toBe('movement-123');
      expect(result.user).toBeUndefined();
    });

    it('should handle movement with null warehouse (explicitly null)', async () => {
      const movementWithNullWarehouse = {
        ...mockStockMovement,
        warehouse: null,
        warehouseId: null,
      };
      (prismaService.stockMovement.findFirst as jest.Mock).mockResolvedValue(
        movementWithNullWarehouse,
      );

      const result = await service.findOne('movement-123');

      expect(result.warehouseId).toBeNull();
      expect(result.warehouse).toBeUndefined();
    });

    it('should handle movement with null user (explicitly null)', async () => {
      const movementWithNullUser = {
        ...mockStockMovement,
        user: null,
        userId: null,
      };
      (prismaService.stockMovement.findFirst as jest.Mock).mockResolvedValue(
        movementWithNullUser,
      );

      const result = await service.findOne('movement-123');

      expect(result.userId).toBeNull();
      expect(result.user).toBeUndefined();
    });
  });

  describe('buildPaginatedResponse', () => {
    it('should calculate totalPages as 0 when total is 0', async () => {
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.stockMovement.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result.meta.totalPages).toBe(0);
    });

    it('should calculate correct totalPages for exact division', async () => {
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([
        mockStockMovement,
      ]);
      (prismaService.stockMovement.count as jest.Mock).mockResolvedValue(20);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(2);
    });

    it('should round up totalPages for non-exact division', async () => {
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([
        mockStockMovement,
      ]);
      (prismaService.stockMovement.count as jest.Mock).mockResolvedValue(25);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should return totalPages as 1 for single item', async () => {
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([
        mockStockMovement,
      ]);
      (prismaService.stockMovement.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('create - warehouse stock negative validation', () => {
    const createDto: CreateMovementDto = {
      productId: 'product-123',
      warehouseId: 'warehouse-123',
      quantity: -30,
      reason: 'Stock removal',
    };

    beforeEach(() => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );
    });

    it('should throw BadRequestException when warehouse stock would go negative', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              // Warehouse has only 10 units, but we're trying to remove 30
              findUnique: jest.fn().mockResolvedValue({ quantity: 10 }),
              upsert: jest.fn(),
            },
            stockMovement: {
              create: jest.fn(),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with Spanish message for negative warehouse stock', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 10 }),
              upsert: jest.fn(),
            },
            stockMovement: {
              create: jest.fn(),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        'El ajuste resultaria en stock negativo en la bodega. Stock actual: 10, ajuste: -30',
      );
    });

    it('should throw when warehouse has no stock record and negative adjustment requested', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              // No warehouse stock record exists (null)
              findUnique: jest.fn().mockResolvedValue(null),
              upsert: jest.fn(),
            },
            stockMovement: {
              create: jest.fn(),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      const negativeDtoNoStock: CreateMovementDto = {
        productId: 'product-123',
        warehouseId: 'warehouse-123',
        quantity: -5,
        reason: 'Stock removal',
      };

      await expect(service.create(negativeDtoNoStock, mockUserId)).rejects.toThrow(
        'El ajuste resultaria en stock negativo en la bodega. Stock actual: 0, ajuste: -5',
      );
    });

    it('should allow adjustment that brings warehouse stock to exactly zero', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn().mockResolvedValue(mockProduct),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(mockWarehouse),
            },
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 30 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 0 }),
            },
            stockMovement: {
              create: jest.fn().mockResolvedValue(mockStockMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      const exactZeroDto: CreateMovementDto = {
        productId: 'product-123',
        warehouseId: 'warehouse-123',
        quantity: -30,
        reason: 'Clear warehouse stock',
      };

      // Need a product with enough stock
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue({
        ...mockProduct,
        stock: 100,
      });

      const result = await service.create(exactZeroDto, mockUserId);

      expect(result).toBeDefined();
    });
  });

  describe('create - no active warehouses', () => {
    const createDtoNoWarehouse: CreateMovementDto = {
      productId: 'product-123',
      quantity: 10,
      reason: 'Stock adjustment',
    };

    beforeEach(() => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );
    });

    it('should throw BadRequestException when no active warehouses exist', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn(),
            },
            warehouse: {
              // No active warehouse found (both isMain and fallback return null)
              findFirst: jest.fn().mockResolvedValue(null),
            },
            warehouseStock: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
            },
            stockMovement: {
              create: jest.fn(),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await expect(service.create(createDtoNoWarehouse, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with Spanish message when no active warehouses', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            product: {
              update: jest.fn(),
            },
            warehouse: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            warehouseStock: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
            },
            stockMovement: {
              create: jest.fn(),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await expect(service.create(createDtoNoWarehouse, mockUserId)).rejects.toThrow(
        'No hay bodegas activas. Cree una bodega primero.',
      );
    });
  });

  describe('createTransfer', () => {
    const mockSourceWarehouse = {
      id: 'warehouse-source',
      tenantId: mockTenantId,
      name: 'Source Warehouse',
      code: 'SRC-01',
    };

    const mockDestWarehouse = {
      id: 'warehouse-dest',
      tenantId: mockTenantId,
      name: 'Destination Warehouse',
      code: 'DST-01',
    };

    const mockOutMovement = {
      ...mockStockMovement,
      id: 'movement-out',
      warehouseId: 'warehouse-source',
      type: MovementType.TRANSFER,
      quantity: -10,
      reason: 'Salida: Transferencia de Source Warehouse a Destination Warehouse',
      warehouse: {
        id: 'warehouse-source',
        code: 'SRC-01',
        name: 'Source Warehouse',
      },
    };

    const mockInMovement = {
      ...mockStockMovement,
      id: 'movement-in',
      warehouseId: 'warehouse-dest',
      type: MovementType.TRANSFER,
      quantity: 10,
      reason: 'Entrada: Transferencia de Source Warehouse a Destination Warehouse',
      warehouse: {
        id: 'warehouse-dest',
        code: 'DST-01',
        name: 'Destination Warehouse',
      },
    };

    const transferDto = {
      productId: 'product-123',
      sourceWarehouseId: 'warehouse-source',
      destinationWarehouseId: 'warehouse-dest',
      quantity: 10,
      notes: 'Transfer test',
    };

    beforeEach(() => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(mockProduct);
      (prismaService.warehouse.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockSourceWarehouse)
        .mockResolvedValueOnce(mockDestWarehouse);
    });

    it('should transfer stock between warehouses successfully', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest
                .fn()
                .mockResolvedValueOnce(mockOutMovement)
                .mockResolvedValueOnce(mockInMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      const result = await service.createTransfer(transferDto, mockUserId);

      expect(result.outMovement).toBeDefined();
      expect(result.inMovement).toBeDefined();
      expect(result.outMovement.quantity).toBe(-10);
      expect(result.inMovement.quantity).toBe(10);
      expect(result.outMovement.type).toBe(MovementType.TRANSFER);
      expect(result.inMovement.type).toBe(MovementType.TRANSFER);
    });

    it('should require tenant context', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest
                .fn()
                .mockResolvedValueOnce(mockOutMovement)
                .mockResolvedValueOnce(mockInMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.createTransfer(transferDto, mockUserId);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should throw BadRequestException when source equals destination', async () => {
      const sameWarehouseDto = {
        ...transferDto,
        destinationWarehouseId: 'warehouse-source',
      };

      await expect(service.createTransfer(sameWarehouseDto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with Spanish message when source equals destination', async () => {
      const sameWarehouseDto = {
        ...transferDto,
        destinationWarehouseId: 'warehouse-source',
      };

      await expect(service.createTransfer(sameWarehouseDto, mockUserId)).rejects.toThrow(
        'La bodega origen y destino no pueden ser la misma',
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.createTransfer(transferDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with Spanish message when product not found', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.createTransfer(transferDto, mockUserId)).rejects.toThrow(
        'Producto no encontrado',
      );
    });

    it('should throw NotFoundException when source warehouse not found', async () => {
      (prismaService.warehouse.findFirst as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDestWarehouse);

      await expect(service.createTransfer(transferDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with Spanish message when source warehouse not found', async () => {
      (prismaService.warehouse.findFirst as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDestWarehouse);

      await expect(service.createTransfer(transferDto, mockUserId)).rejects.toThrow(
        'Bodega origen no encontrada',
      );
    });

    it('should throw NotFoundException when destination warehouse not found', async () => {
      (prismaService.warehouse.findFirst as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(mockSourceWarehouse)
        .mockResolvedValueOnce(null);

      await expect(service.createTransfer(transferDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with Spanish message when destination warehouse not found', async () => {
      (prismaService.warehouse.findFirst as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(mockSourceWarehouse)
        .mockResolvedValueOnce(null);

      await expect(service.createTransfer(transferDto, mockUserId)).rejects.toThrow(
        'Bodega destino no encontrada',
      );
    });

    it('should throw BadRequestException when insufficient stock in source warehouse', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 5 }),
            },
            stockMovement: {
              create: jest.fn(),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await expect(service.createTransfer(transferDto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with Spanish message for insufficient stock', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 5 }),
            },
            stockMovement: {
              create: jest.fn(),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await expect(service.createTransfer(transferDto, mockUserId)).rejects.toThrow(
        'Stock insuficiente en bodega origen. Disponible: 5, solicitado: 10',
      );
    });

    it('should throw BadRequestException when no stock record exists in source warehouse', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
            stockMovement: {
              create: jest.fn(),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await expect(service.createTransfer(transferDto, mockUserId)).rejects.toThrow(
        'Stock insuficiente en bodega origen. Disponible: 0, solicitado: 10',
      );
    });

    it('should decrement source warehouse stock', async () => {
      let warehouseStockUpdateArgs: unknown;
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockImplementation((args: unknown) => {
                warehouseStockUpdateArgs = args;
                return { quantity: 40 };
              }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest
                .fn()
                .mockResolvedValueOnce(mockOutMovement)
                .mockResolvedValueOnce(mockInMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.createTransfer(transferDto, mockUserId);

      expect(warehouseStockUpdateArgs).toEqual({
        where: {
          warehouseId_productId: {
            warehouseId: 'warehouse-source',
            productId: 'product-123',
          },
        },
        data: { quantity: { decrement: 10 } },
      });
    });

    it('should upsert destination warehouse stock', async () => {
      let warehouseStockUpsertArgs: unknown;
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockImplementation((args: unknown) => {
                warehouseStockUpsertArgs = args;
                return { quantity: 10 };
              }),
            },
            stockMovement: {
              create: jest
                .fn()
                .mockResolvedValueOnce(mockOutMovement)
                .mockResolvedValueOnce(mockInMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.createTransfer(transferDto, mockUserId);

      expect(warehouseStockUpsertArgs).toEqual({
        where: {
          warehouseId_productId: {
            warehouseId: 'warehouse-dest',
            productId: 'product-123',
          },
        },
        update: { quantity: { increment: 10 } },
        create: {
          tenantId: mockTenantId,
          warehouseId: 'warehouse-dest',
          productId: 'product-123',
          quantity: 10,
        },
      });
    });

    it('should create OUT movement with negative quantity', async () => {
      let outMovementData: unknown;
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest.fn().mockImplementation((args: unknown) => {
                const argsObj = args as { data: { quantity: number } };
                if (argsObj.data.quantity < 0) {
                  outMovementData = args;
                  return mockOutMovement;
                }
                return mockInMovement;
              }),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.createTransfer(transferDto, mockUserId);

      expect(outMovementData).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            productId: 'product-123',
            warehouseId: 'warehouse-source',
            type: MovementType.TRANSFER,
            quantity: -10,
            reason: expect.stringContaining('Salida:'),
          }),
        }),
      );
    });

    it('should create IN movement with positive quantity', async () => {
      let inMovementData: unknown;
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest.fn().mockImplementation((args: unknown) => {
                const argsObj = args as { data: { quantity: number } };
                if (argsObj.data.quantity > 0) {
                  inMovementData = args;
                  return mockInMovement;
                }
                return mockOutMovement;
              }),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.createTransfer(transferDto, mockUserId);

      expect(inMovementData).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            productId: 'product-123',
            warehouseId: 'warehouse-dest',
            type: MovementType.TRANSFER,
            quantity: 10,
            reason: expect.stringContaining('Entrada:'),
          }),
        }),
      );
    });

    it('should use custom reason when provided', async () => {
      let movementReasons: string[] = [];
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest.fn().mockImplementation((args: unknown) => {
                const argsObj = args as { data: { quantity: number; reason: string } };
                movementReasons.push(argsObj.data.reason);
                return argsObj.data.quantity < 0 ? mockOutMovement : mockInMovement;
              }),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      const dtoWithReason = {
        ...transferDto,
        reason: 'Custom transfer reason',
      };

      await service.createTransfer(dtoWithReason, mockUserId);

      expect(movementReasons[0]).toBe('Salida: Custom transfer reason');
      expect(movementReasons[1]).toBe('Entrada: Custom transfer reason');
    });

    it('should include notes in both movements', async () => {
      let movementNotes: (string | null)[] = [];
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest.fn().mockImplementation((args: unknown) => {
                const argsObj = args as { data: { quantity: number; notes: string | null } };
                movementNotes.push(argsObj.data.notes);
                return argsObj.data.quantity < 0 ? mockOutMovement : mockInMovement;
              }),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.createTransfer(transferDto, mockUserId);

      expect(movementNotes[0]).toBe('Transfer test');
      expect(movementNotes[1]).toBe('Transfer test');
    });

    it('should set notes to null when not provided', async () => {
      let movementNotes: (string | null)[] = [];
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest.fn().mockImplementation((args: unknown) => {
                const argsObj = args as { data: { quantity: number; notes: string | null } };
                movementNotes.push(argsObj.data.notes);
                return argsObj.data.quantity < 0 ? mockOutMovement : mockInMovement;
              }),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      const dtoWithoutNotes = {
        productId: 'product-123',
        sourceWarehouseId: 'warehouse-source',
        destinationWarehouseId: 'warehouse-dest',
        quantity: 10,
      };

      await service.createTransfer(dtoWithoutNotes, mockUserId);

      expect(movementNotes[0]).toBeNull();
      expect(movementNotes[1]).toBeNull();
    });

    it('should assign userId to both movements', async () => {
      let movementUserIds: (string | null)[] = [];
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest.fn().mockImplementation((args: unknown) => {
                const argsObj = args as { data: { quantity: number; userId: string | null } };
                movementUserIds.push(argsObj.data.userId);
                return argsObj.data.quantity < 0 ? mockOutMovement : mockInMovement;
              }),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.createTransfer(transferDto, mockUserId);

      expect(movementUserIds[0]).toBe(mockUserId);
      expect(movementUserIds[1]).toBe(mockUserId);
    });

    it('should set userId to null when not provided', async () => {
      let movementUserIds: (string | null)[] = [];
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest.fn().mockImplementation((args: unknown) => {
                const argsObj = args as { data: { quantity: number; userId: string | null } };
                movementUserIds.push(argsObj.data.userId);
                return argsObj.data.quantity < 0 ? mockOutMovement : mockInMovement;
              }),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.createTransfer(transferDto); // No userId

      expect(movementUserIds[0]).toBeNull();
      expect(movementUserIds[1]).toBeNull();
    });

    it('should verify product belongs to tenant', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest
                .fn()
                .mockResolvedValueOnce(mockOutMovement)
                .mockResolvedValueOnce(mockInMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.createTransfer(transferDto, mockUserId);

      expect(prismaService.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'product-123', tenantId: mockTenantId },
      });
    });

    it('should verify both warehouses belong to tenant', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest
                .fn()
                .mockResolvedValueOnce(mockOutMovement)
                .mockResolvedValueOnce(mockInMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      await service.createTransfer(transferDto, mockUserId);

      expect(prismaService.warehouse.findFirst).toHaveBeenCalledWith({
        where: { id: 'warehouse-source', tenantId: mockTenantId },
      });
      expect(prismaService.warehouse.findFirst).toHaveBeenCalledWith({
        where: { id: 'warehouse-dest', tenantId: mockTenantId },
      });
    });

    it('should return both movements in response', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest
                .fn()
                .mockResolvedValueOnce(mockOutMovement)
                .mockResolvedValueOnce(mockInMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      const result = await service.createTransfer(transferDto, mockUserId);

      expect(result).toHaveProperty('outMovement');
      expect(result).toHaveProperty('inMovement');
      expect(result.outMovement.id).toBe('movement-out');
      expect(result.inMovement.id).toBe('movement-in');
    });

    it('should include product and warehouse relations in response', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaService) => Promise<unknown>) => {
          const txMock = {
            warehouseStock: {
              findUnique: jest.fn().mockResolvedValue({ quantity: 50 }),
              update: jest.fn().mockResolvedValue({ quantity: 40 }),
              upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
            },
            stockMovement: {
              create: jest
                .fn()
                .mockResolvedValueOnce(mockOutMovement)
                .mockResolvedValueOnce(mockInMovement),
            },
          };
          return callback(txMock as unknown as typeof prismaService);
        },
      );

      const result = await service.createTransfer(transferDto, mockUserId);

      expect(result.outMovement.warehouse).toBeDefined();
      expect(result.outMovement.warehouse?.name).toBe('Source Warehouse');
      expect(result.inMovement.warehouse).toBeDefined();
      expect(result.inMovement.warehouse?.name).toBe('Destination Warehouse');
    });
  });
});
