import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';
import { CacheService } from '../cache';
import {
  CreateProductDto,
  UpdateProductDto,
  UpdateStockDto,
  StockAdjustmentType,
} from './dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';

  const mockProduct = {
    id: 'product-123',
    tenantId: mockTenantId,
    sku: 'SKU-001',
    name: 'Test Product',
    description: 'A test product description',
    categoryId: 'category-123',
    costPrice: { toNumber: () => 50 } as unknown as number,
    salePrice: { toNumber: () => 79.99 } as unknown as number,
    taxRate: { toNumber: () => 19 } as unknown as number,
    stock: 100,
    minStock: 10,
    maxStock: null,
    barcode: '7501234567890',
    brand: 'TestBrand',
    unit: 'UND',
    imageUrl: null,
    status: ProductStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockProduct2 = {
    ...mockProduct,
    id: 'product-456',
    sku: 'SKU-002',
    name: 'Another Product',
    barcode: '7501234567891',
    stock: 5,
    minStock: 20, // Low stock - stock < minStock
  };

  const mockCategory = {
    id: 'category-123',
    tenantId: mockTenantId,
    name: 'Electronics',
    description: 'Electronic devices',
    color: '#3b82f6',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock implementations
    const mockPrismaService = {
      product: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      category: {
        findFirst: jest.fn(),
      },
      invoiceItem: {
        count: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
      enforceLimit: jest.fn().mockResolvedValue(undefined),
      checkLimit: jest.fn().mockResolvedValue(true),
      getTenant: jest.fn().mockResolvedValue({
        id: mockTenantId,
        name: 'Test Tenant',
        maxProducts: -1, // Unlimited
      }),
    };

    const mockCacheService = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delByPattern: jest.fn().mockResolvedValue(undefined),
      generateKey: jest
        .fn()
        .mockImplementation((prefix, tenantId, suffix) =>
          suffix ? `${prefix}:${tenantId}:${suffix}` : `${prefix}:${tenantId}`,
        ),
      invalidate: jest.fn().mockResolvedValue(undefined),
      invalidateMultiple: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
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
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        mockProduct,
        mockProduct2,
      ]);
      (prismaService.product.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return paginated products', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should calculate correct pagination for page 2', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        mockProduct,
      ]);
      (prismaService.product.count as jest.Mock).mockResolvedValue(15);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(2);
      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by categoryId', async () => {
      await service.findAll({ categoryId: 'category-123' });

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 'category-123' }),
        }),
      );
    });

    it('should filter by status', async () => {
      await service.findAll({ status: ProductStatus.ACTIVE });

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ProductStatus.ACTIVE }),
        }),
      );
    });

    it('should filter by search term', async () => {
      await service.findAll({ search: 'test' });

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: 'test', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should require tenant context', async () => {
      await service.findAll();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return empty array when no products exist', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should use default pagination values', async () => {
      await service.findAll();

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should order products by name ascending', async () => {
      await service.findAll();

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });

    describe('lowStock filter', () => {
      it('should filter low stock products via findAll with lowStock: true', async () => {
        // mockProduct has stock=100, minStock=10 (not low)
        // mockProduct2 has stock=5, minStock=20 (low stock)
        (prismaService.product.findMany as jest.Mock).mockResolvedValue([
          mockProduct,
          mockProduct2,
        ]);

        const result = await service.findAll({
          lowStock: true,
          page: 1,
          limit: 10,
        });

        // Should only include the low stock product
        expect(result.data.length).toBe(1);
        expect(result.data[0].sku).toBe('SKU-002');
        expect(result.meta.total).toBe(1);
      });

      it('should paginate low stock products correctly', async () => {
        // Create many low stock products for pagination test
        const lowStockProducts = Array.from({ length: 15 }, (_, i) => ({
          ...mockProduct2,
          id: `product-low-${i}`,
          sku: `SKU-LOW-${i}`,
          name: `Low Stock Product ${i}`,
          stock: 5,
          minStock: 20,
        }));
        (prismaService.product.findMany as jest.Mock).mockResolvedValue(
          lowStockProducts,
        );

        const result = await service.findAll({
          lowStock: true,
          page: 2,
          limit: 10,
        });

        expect(result.meta.page).toBe(2);
        expect(result.meta.limit).toBe(10);
        expect(result.meta.totalPages).toBe(2);
        expect(result.data.length).toBe(5); // Page 2 has 5 items
      });

      it('should return empty result when no low stock products exist', async () => {
        (prismaService.product.findMany as jest.Mock).mockResolvedValue([
          mockProduct, // stock=100, minStock=10 - not low stock
        ]);

        const result = await service.findAll({ lowStock: true });

        expect(result.data).toEqual([]);
        expect(result.meta.total).toBe(0);
        expect(result.meta.totalPages).toBe(0);
      });
    });

    describe('warehouseId filter', () => {
      const mockWarehouse = {
        id: 'warehouse-123',
        tenantId: mockTenantId,
        name: 'Main Warehouse',
        code: 'ALM-01',
      };

      beforeEach(() => {
        // Add warehouse mock to prismaService
        (prismaService as unknown as { warehouse: { findFirst: jest.Mock } }).warehouse = {
          findFirst: jest.fn(),
        };
      });

      it('should return warehouse-specific stock when warehouseId is provided', async () => {
        const warehouseFindFirst = (prismaService as unknown as { warehouse: { findFirst: jest.Mock } }).warehouse.findFirst;
        warehouseFindFirst.mockResolvedValue(mockWarehouse);

        const productsWithWarehouseStock = [
          { ...mockProduct, warehouseStock: [{ quantity: 25 }] },
          { ...mockProduct2, warehouseStock: [{ quantity: 10 }] },
        ];
        (prismaService.product.findMany as jest.Mock).mockResolvedValue(productsWithWarehouseStock);
        (prismaService.product.count as jest.Mock).mockResolvedValue(2);

        const result = await service.findAll({ warehouseId: 'warehouse-123' });

        expect(result.data[0].stock).toBe(25);
        expect(result.data[1].stock).toBe(10);
      });

      it('should return stock as 0 for products not in the warehouse', async () => {
        const warehouseFindFirst = (prismaService as unknown as { warehouse: { findFirst: jest.Mock } }).warehouse.findFirst;
        warehouseFindFirst.mockResolvedValue(mockWarehouse);

        const productsWithNoWarehouseStock = [
          { ...mockProduct, warehouseStock: [] },
        ];
        (prismaService.product.findMany as jest.Mock).mockResolvedValue(productsWithNoWarehouseStock);
        (prismaService.product.count as jest.Mock).mockResolvedValue(1);

        const result = await service.findAll({ warehouseId: 'warehouse-123' });

        expect(result.data[0].stock).toBe(0);
      });

      it('should throw NotFoundException when warehouse does not exist', async () => {
        const warehouseFindFirst = (prismaService as unknown as { warehouse: { findFirst: jest.Mock } }).warehouse.findFirst;
        warehouseFindFirst.mockResolvedValue(null);

        await expect(
          service.findAll({ warehouseId: 'invalid-warehouse' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw NotFoundException with Spanish message when warehouse not found', async () => {
        const warehouseFindFirst = (prismaService as unknown as { warehouse: { findFirst: jest.Mock } }).warehouse.findFirst;
        warehouseFindFirst.mockResolvedValue(null);

        await expect(
          service.findAll({ warehouseId: 'invalid-warehouse' }),
        ).rejects.toThrow('Bodega no encontrada');
      });

      it('should return global stock when warehouseId is not provided', async () => {
        (prismaService.product.findMany as jest.Mock).mockResolvedValue([mockProduct, mockProduct2]);
        (prismaService.product.count as jest.Mock).mockResolvedValue(2);

        const result = await service.findAll({});

        expect(result.data[0].stock).toBe(100); // Global stock from mockProduct
        expect(result.data[1].stock).toBe(5); // Global stock from mockProduct2
      });

      it('should verify warehouse belongs to tenant', async () => {
        const warehouseFindFirst = (prismaService as unknown as { warehouse: { findFirst: jest.Mock } }).warehouse.findFirst;
        warehouseFindFirst.mockResolvedValue(mockWarehouse);

        const productsWithWarehouseStock = [{ ...mockProduct, warehouseStock: [{ quantity: 50 }] }];
        (prismaService.product.findMany as jest.Mock).mockResolvedValue(productsWithWarehouseStock);
        (prismaService.product.count as jest.Mock).mockResolvedValue(1);

        await service.findAll({ warehouseId: 'warehouse-123' });

        expect(warehouseFindFirst).toHaveBeenCalledWith({
          where: { id: 'warehouse-123', tenantId: mockTenantId },
        });
      });

      it('should include warehouseStock in query when warehouseId is provided', async () => {
        const warehouseFindFirst = (prismaService as unknown as { warehouse: { findFirst: jest.Mock } }).warehouse.findFirst;
        warehouseFindFirst.mockResolvedValue(mockWarehouse);

        const productsWithWarehouseStock = [{ ...mockProduct, warehouseStock: [{ quantity: 50 }] }];
        (prismaService.product.findMany as jest.Mock).mockResolvedValue(productsWithWarehouseStock);
        (prismaService.product.count as jest.Mock).mockResolvedValue(1);

        await service.findAll({ warehouseId: 'warehouse-123' });

        expect(prismaService.product.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.objectContaining({
              warehouseStock: {
                where: { warehouseId: 'warehouse-123' },
                select: { quantity: true },
              },
            }),
          }),
        );
      });
    });
  });

  describe('findLowStock', () => {
    beforeEach(() => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        mockProduct,
        mockProduct2, // This one has low stock (5 < 20)
      ]);
    });

    it('should return only low stock products', async () => {
      const result = await service.findLowStock(1, 10);

      // mockProduct has stock=100, minStock=10 (not low)
      // mockProduct2 has stock=5, minStock=20 (low stock)
      expect(result.data.length).toBe(1);
      expect(result.data[0].sku).toBe('SKU-002');
    });

    it('should paginate low stock results', async () => {
      const result = await service.findLowStock(1, 10);

      expect(result.meta).toHaveProperty('total');
      expect(result.meta).toHaveProperty('page', 1);
      expect(result.meta).toHaveProperty('limit', 10);
      expect(result.meta).toHaveProperty('totalPages');
    });

    it('should require tenant context', async () => {
      await service.findLowStock();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        mockProduct,
      ]);
      (prismaService.product.count as jest.Mock).mockResolvedValue(1);
    });

    it('should search products by query', async () => {
      const result = await service.search('Test', 1, 10);

      expect(result.data).toHaveLength(1);
      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: 'Test', mode: 'insensitive' },
              }),
              expect.objectContaining({
                sku: { contains: 'Test', mode: 'insensitive' },
              }),
              expect.objectContaining({
                barcode: { contains: 'Test', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should paginate search results', async () => {
      await service.search('Test', 2, 10);

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should require tenant context', async () => {
      await service.search('Test');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      const result = await service.findOne('product-123');

      expect(result.id).toBe('product-123');
      expect(result.name).toBe('Test Product');
      expect(prismaService.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'product-123', tenantId: mockTenantId },
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Product with ID nonexistent not found',
      );
    });

    it('should include all expected fields in response', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      const result = await service.findOne('product-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('sku');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('categoryId');
      expect(result).toHaveProperty('costPrice');
      expect(result).toHaveProperty('salePrice');
      expect(result).toHaveProperty('taxRate');
      expect(result).toHaveProperty('stock');
      expect(result).toHaveProperty('minStock');
      expect(result).toHaveProperty('barcode');
      expect(result).toHaveProperty('brand');
      expect(result).toHaveProperty('unit');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('create', () => {
    const createDto: CreateProductDto = {
      sku: 'NEW-SKU',
      name: 'New Product',
      description: 'A new product',
      categoryId: 'category-123',
      costPrice: 30,
      salePrice: 49.99,
      taxRate: 19,
      stock: 50,
      minStock: 5,
      barcode: '1234567890123',
      brand: 'NewBrand',
      unit: 'UND',
    };

    const newProduct = {
      ...mockProduct,
      id: 'new-product-id',
      sku: 'NEW-SKU',
      name: 'New Product',
      description: 'A new product',
      costPrice: { toNumber: () => 30 },
      salePrice: { toNumber: () => 49.99 },
      stock: 50,
      minStock: 5,
      barcode: '1234567890123',
      brand: 'NewBrand',
    };

    beforeEach(() => {
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(
        mockCategory,
      );
      (prismaService.product.create as jest.Mock).mockResolvedValue(newProduct);
    });

    it('should create a new product', async () => {
      const result = await service.create(createDto);

      expect(result.sku).toBe('NEW-SKU');
      expect(result.name).toBe('New Product');
      expect(prismaService.product.create).toHaveBeenCalled();
    });

    it('should enforce tenant product limit', async () => {
      await service.create(createDto);

      expect(tenantContextService.enforceLimit).toHaveBeenCalledWith(
        'products',
      );
    });

    it('should throw ForbiddenException when product limit reached', async () => {
      (tenantContextService.enforceLimit as jest.Mock).mockRejectedValue(
        new ForbiddenException('Products limit reached'),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should trim SKU', async () => {
      const dtoWithSpaces = { ...createDto, sku: '  NEW-SKU  ' };

      await service.create(dtoWithSpaces);

      expect(prismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sku: 'NEW-SKU' }),
        }),
      );
    });

    it('should check for existing SKU with compound key', async () => {
      await service.create(createDto);

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_sku: {
            tenantId: mockTenantId,
            sku: 'NEW-SKU',
          },
        },
      });
    });

    it('should throw ConflictException when SKU already exists', async () => {
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException with correct message for duplicate SKU', async () => {
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        'A product with the SKU "NEW-SKU" already exists',
      );
    });

    it('should check for existing barcode', async () => {
      await service.create(createDto);

      expect(prismaService.product.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          barcode: '1234567890123',
        },
      });
    });

    it('should throw ConflictException when barcode already exists', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException with correct message for duplicate barcode', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        'A product with the barcode "1234567890123" already exists',
      );
    });

    it('should validate categoryId exists in tenant', async () => {
      await service.create(createDto);

      expect(prismaService.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'category-123', tenantId: mockTenantId },
      });
    });

    it('should throw BadRequestException when category not found', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create product without optional fields', async () => {
      const minimalDto: CreateProductDto = {
        sku: 'MIN-SKU',
        name: 'Minimal Product',
        costPrice: 10,
        salePrice: 20,
      };
      const minimalProduct = {
        ...mockProduct,
        id: 'minimal-id',
        sku: 'MIN-SKU',
        name: 'Minimal Product',
        description: null,
        categoryId: null,
        barcode: null,
        brand: null,
      };
      (prismaService.product.create as jest.Mock).mockResolvedValue(
        minimalProduct,
      );

      const result = await service.create(minimalDto);

      expect(result.sku).toBe('MIN-SKU');
      expect(result.name).toBe('Minimal Product');
    });

    it('should require tenant context', async () => {
      await service.create(createDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should include tenantId in created product', async () => {
      await service.create(createDto);

      expect(prismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
          }),
        }),
      );
    });

    it('should set default values for optional fields', async () => {
      const minimalDto: CreateProductDto = {
        sku: 'MIN-SKU',
        name: 'Minimal Product',
        costPrice: 10,
        salePrice: 20,
      };
      const minimalProduct = {
        ...mockProduct,
        sku: 'MIN-SKU',
        name: 'Minimal Product',
        taxRate: { toNumber: () => 19 },
        stock: 0,
        minStock: 0,
        unit: 'UND',
      };
      (prismaService.product.create as jest.Mock).mockResolvedValue(
        minimalProduct,
      );

      await service.create(minimalDto);

      expect(prismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taxRate: 19,
            stock: 0,
            minStock: 0,
            unit: 'UND',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateProductDto = {
      name: 'Updated Product',
      salePrice: 89.99,
    };

    beforeEach(() => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(
        mockCategory,
      );
      (prismaService.product.update as jest.Mock).mockResolvedValue({
        ...mockProduct,
        name: 'Updated Product',
        salePrice: { toNumber: () => 89.99 },
      });
    });

    it('should update a product', async () => {
      const result = await service.update('product-123', updateDto);

      expect(result.name).toBe('Updated Product');
      expect(prismaService.product.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when product not found', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        'Product with ID nonexistent not found',
      );
    });

    describe('SKU update', () => {
      it('should check uniqueness when changing SKU', async () => {
        const skuUpdate = { sku: 'DIFFERENT-SKU' };

        await service.update('product-123', skuUpdate);

        expect(prismaService.product.findUnique).toHaveBeenCalledWith({
          where: {
            tenantId_sku: {
              tenantId: mockTenantId,
              sku: 'DIFFERENT-SKU',
            },
          },
        });
      });

      it('should throw ConflictException when new SKU already exists', async () => {
        const skuUpdate = { sku: 'EXISTING-SKU' };
        (prismaService.product.findUnique as jest.Mock).mockResolvedValue(
          mockProduct2,
        );

        await expect(service.update('product-123', skuUpdate)).rejects.toThrow(
          ConflictException,
        );
      });

      it('should not check uniqueness if SKU is unchanged', async () => {
        const skuUpdate = { sku: 'SKU-001' }; // Same as mockProduct

        await service.update('product-123', skuUpdate);

        expect(prismaService.product.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('barcode update', () => {
      it('should check uniqueness when changing barcode', async () => {
        const barcodeUpdate = { barcode: '9999999999999' };
        // First call returns product for lookup, second returns null (no conflict)
        (prismaService.product.findFirst as jest.Mock)
          .mockResolvedValueOnce(mockProduct)
          .mockResolvedValueOnce(null);

        await service.update('product-123', barcodeUpdate);

        expect(prismaService.product.findFirst).toHaveBeenCalledWith({
          where: {
            tenantId: mockTenantId,
            barcode: '9999999999999',
            NOT: { id: 'product-123' },
          },
        });
      });

      it('should throw ConflictException when new barcode already exists', async () => {
        const barcodeUpdate = { barcode: '7501234567891' };
        // Mock a product with this barcode
        (prismaService.product.findFirst as jest.Mock)
          .mockResolvedValueOnce(mockProduct) // First call for finding product by id
          .mockResolvedValueOnce(mockProduct2); // Second call for barcode check

        await expect(
          service.update('product-123', barcodeUpdate),
        ).rejects.toThrow(ConflictException);
      });

      it('should allow setting barcode to null', async () => {
        const barcodeUpdate = { barcode: null };

        await service.update('product-123', barcodeUpdate);

        expect(prismaService.product.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ barcode: null }),
          }),
        );
      });
    });

    describe('categoryId update', () => {
      it('should validate new categoryId exists in tenant', async () => {
        const categoryUpdate = { categoryId: 'new-category-id' };

        await service.update('product-123', categoryUpdate);

        expect(prismaService.category.findFirst).toHaveBeenCalledWith({
          where: { id: 'new-category-id', tenantId: mockTenantId },
        });
      });

      it('should throw BadRequestException when new category not found', async () => {
        const categoryUpdate = { categoryId: 'nonexistent-category' };
        (prismaService.category.findFirst as jest.Mock).mockResolvedValue(null);

        await expect(
          service.update('product-123', categoryUpdate),
        ).rejects.toThrow(BadRequestException);
      });

      it('should allow setting categoryId to null', async () => {
        const categoryUpdate = { categoryId: null };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          categoryId: null,
        });

        await service.update('product-123', categoryUpdate);

        expect(prismaService.product.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              category: { disconnect: true },
            }),
          }),
        );
      });
    });

    it('should update only provided fields', async () => {
      const partialUpdate = { name: 'Only Name Updated' };
      (prismaService.product.update as jest.Mock).mockResolvedValue({
        ...mockProduct,
        name: 'Only Name Updated',
      });

      await service.update('product-123', partialUpdate);

      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'product-123' },
        data: { name: 'Only Name Updated' },
      });
    });

    it('should require tenant context', async () => {
      await service.update('product-123', updateDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    describe('individual field updates', () => {
      it('should update description when provided', async () => {
        const descriptionUpdate = { description: 'New description' };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          description: 'New description',
        });

        await service.update('product-123', descriptionUpdate);

        expect(prismaService.product.update).toHaveBeenCalledWith({
          where: { id: 'product-123' },
          data: { description: 'New description' },
        });
      });

      it('should update costPrice when provided', async () => {
        const costPriceUpdate = { costPrice: 99.99 };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          costPrice: { toNumber: () => 99.99 },
        });

        await service.update('product-123', costPriceUpdate);

        expect(prismaService.product.update).toHaveBeenCalledWith({
          where: { id: 'product-123' },
          data: { costPrice: 99.99 },
        });
      });

      it('should update salePrice when provided', async () => {
        const salePriceUpdate = { salePrice: 149.99 };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          salePrice: { toNumber: () => 149.99 },
        });

        await service.update('product-123', salePriceUpdate);

        expect(prismaService.product.update).toHaveBeenCalledWith({
          where: { id: 'product-123' },
          data: { salePrice: 149.99 },
        });
      });

      it('should update taxRate when provided', async () => {
        const taxRateUpdate = { taxRate: 21 };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          taxRate: { toNumber: () => 21 },
        });

        await service.update('product-123', taxRateUpdate);

        expect(prismaService.product.update).toHaveBeenCalledWith({
          where: { id: 'product-123' },
          data: { taxRate: 21 },
        });
      });

      it('should update minStock when provided', async () => {
        const minStockUpdate = { minStock: 25 };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          minStock: 25,
        });

        await service.update('product-123', minStockUpdate);

        expect(prismaService.product.update).toHaveBeenCalledWith({
          where: { id: 'product-123' },
          data: { minStock: 25 },
        });
      });

      it('should update brand when provided', async () => {
        const brandUpdate = { brand: 'NewBrand' };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          brand: 'NewBrand',
        });

        await service.update('product-123', brandUpdate);

        expect(prismaService.product.update).toHaveBeenCalledWith({
          where: { id: 'product-123' },
          data: { brand: 'NewBrand' },
        });
      });

      it('should update unit when provided', async () => {
        const unitUpdate = { unit: 'KG' };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          unit: 'KG',
        });

        await service.update('product-123', unitUpdate);

        expect(prismaService.product.update).toHaveBeenCalledWith({
          where: { id: 'product-123' },
          data: { unit: 'KG' },
        });
      });

      it('should update maxStock when provided', async () => {
        const maxStockUpdate = { maxStock: 500 };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          maxStock: 500,
        });

        await service.update('product-123', maxStockUpdate);

        expect(prismaService.product.update).toHaveBeenCalledWith({
          where: { id: 'product-123' },
          data: { maxStock: 500 },
        });
      });

      it('should update imageUrl when provided', async () => {
        const imageUrlUpdate = { imageUrl: 'https://example.com/image.png' };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          imageUrl: 'https://example.com/image.png',
        });

        await service.update('product-123', imageUrlUpdate);

        expect(prismaService.product.update).toHaveBeenCalledWith({
          where: { id: 'product-123' },
          data: { imageUrl: 'https://example.com/image.png' },
        });
      });

      it('should update status when provided', async () => {
        const statusUpdate = { status: ProductStatus.INACTIVE };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          status: ProductStatus.INACTIVE,
        });

        await service.update('product-123', statusUpdate);

        expect(prismaService.product.update).toHaveBeenCalledWith({
          where: { id: 'product-123' },
          data: { status: ProductStatus.INACTIVE },
        });
      });

      it('should update multiple fields at once', async () => {
        const multiUpdate = {
          name: 'Updated Name',
          description: 'Updated Description',
          costPrice: 50,
          salePrice: 100,
          taxRate: 18,
          minStock: 15,
          brand: 'UpdatedBrand',
          unit: 'LTR',
          status: ProductStatus.OUT_OF_STOCK,
        };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          ...multiUpdate,
        });

        await service.update('product-123', multiUpdate);

        expect(prismaService.product.update).toHaveBeenCalledWith({
          where: { id: 'product-123' },
          data: expect.objectContaining({
            name: 'Updated Name',
            description: 'Updated Description',
            costPrice: 50,
            salePrice: 100,
            taxRate: 18,
            minStock: 15,
            brand: 'UpdatedBrand',
            unit: 'LTR',
            status: ProductStatus.OUT_OF_STOCK,
          }),
        });
      });
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );
      (prismaService.invoiceItem.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.delete as jest.Mock).mockResolvedValue(
        mockProduct,
      );
    });

    it('should delete a product', async () => {
      await service.delete('product-123');

      expect(prismaService.product.delete).toHaveBeenCalledWith({
        where: { id: 'product-123' },
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        'Product with ID nonexistent not found',
      );
    });

    it('should check for associated invoice items', async () => {
      await service.delete('product-123');

      expect(prismaService.invoiceItem.count).toHaveBeenCalledWith({
        where: { productId: 'product-123' },
      });
    });

    it('should throw BadRequestException when invoice items are associated', async () => {
      (prismaService.invoiceItem.count as jest.Mock).mockResolvedValue(5);

      await expect(service.delete('product-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct message for associated invoice items', async () => {
      (prismaService.invoiceItem.count as jest.Mock).mockResolvedValue(5);

      await expect(service.delete('product-123')).rejects.toThrow(
        'Cannot delete product "Test Product". 5 invoice item(s) are associated with this product.',
      );
    });

    it('should require tenant context', async () => {
      await service.delete('product-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('updateStock', () => {
    beforeEach(() => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );
      (prismaService.stockMovement.create as jest.Mock).mockResolvedValue({});
    });

    describe('SET adjustment type', () => {
      it('should set stock to absolute value', async () => {
        const stockDto: UpdateStockDto = {
          quantity: 50,
          adjustmentType: StockAdjustmentType.SET,
          reason: 'Inventory count',
        };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          stock: 50,
        });

        const result = await service.updateStock('product-123', stockDto);

        expect(result.stock).toBe(50);
        expect(prismaService.product.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ stock: 50 }),
          }),
        );
      });

      it('should use SET as default adjustment type', async () => {
        const stockDto: UpdateStockDto = {
          quantity: 75,
        };
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          stock: 75,
        });

        const result = await service.updateStock('product-123', stockDto);

        expect(result.stock).toBe(75);
      });
    });

    describe('ADD adjustment type', () => {
      it('should add to current stock', async () => {
        const stockDto: UpdateStockDto = {
          quantity: 20,
          adjustmentType: StockAdjustmentType.ADD,
          reason: 'Received shipment',
        };
        // mockProduct has stock: 100
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          stock: 120,
        });

        const result = await service.updateStock('product-123', stockDto);

        expect(result.stock).toBe(120);
        expect(prismaService.product.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ stock: 120 }),
          }),
        );
      });
    });

    describe('SUBTRACT adjustment type', () => {
      it('should subtract from current stock', async () => {
        const stockDto: UpdateStockDto = {
          quantity: 30,
          adjustmentType: StockAdjustmentType.SUBTRACT,
          reason: 'Damaged goods',
        };
        // mockProduct has stock: 100
        (prismaService.product.update as jest.Mock).mockResolvedValue({
          ...mockProduct,
          stock: 70,
        });

        const result = await service.updateStock('product-123', stockDto);

        expect(result.stock).toBe(70);
        expect(prismaService.product.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ stock: 70 }),
          }),
        );
      });

      it('should throw BadRequestException if result would be negative', async () => {
        const stockDto: UpdateStockDto = {
          quantity: 150, // More than current stock of 100
          adjustmentType: StockAdjustmentType.SUBTRACT,
        };

        await expect(
          service.updateStock('product-123', stockDto),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException with correct message for negative stock', async () => {
        const stockDto: UpdateStockDto = {
          quantity: 150,
          adjustmentType: StockAdjustmentType.SUBTRACT,
        };

        await expect(
          service.updateStock('product-123', stockDto),
        ).rejects.toThrow(
          'Stock adjustment would result in negative stock (-50). Current stock: 100',
        );
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      const stockDto: UpdateStockDto = { quantity: 50 };

      await expect(
        service.updateStock('nonexistent', stockDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create stock movement record', async () => {
      const stockDto: UpdateStockDto = {
        quantity: 50,
        adjustmentType: StockAdjustmentType.SET,
        reason: 'Inventory count',
        notes: 'Monthly audit',
      };
      (prismaService.product.update as jest.Mock).mockResolvedValue({
        ...mockProduct,
        stock: 50,
      });

      await service.updateStock('product-123', stockDto);

      expect(prismaService.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          productId: 'product-123',
          type: 'ADJUSTMENT',
          reason: 'Inventory count',
          notes: 'Monthly audit',
        }),
      });
    });

    it('should update status to OUT_OF_STOCK when stock becomes 0', async () => {
      const stockDto: UpdateStockDto = {
        quantity: 0,
        adjustmentType: StockAdjustmentType.SET,
      };
      (prismaService.product.update as jest.Mock).mockResolvedValue({
        ...mockProduct,
        stock: 0,
        status: ProductStatus.OUT_OF_STOCK,
      });

      await service.updateStock('product-123', stockDto);

      expect(prismaService.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stock: 0,
            status: ProductStatus.OUT_OF_STOCK,
          }),
        }),
      );
    });

    it('should not change INACTIVE status when adjusting stock', async () => {
      const inactiveProduct = {
        ...mockProduct,
        status: ProductStatus.INACTIVE,
      };
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        inactiveProduct,
      );
      (prismaService.product.update as jest.Mock).mockResolvedValue({
        ...inactiveProduct,
        stock: 50,
      });

      const stockDto: UpdateStockDto = { quantity: 50 };

      await service.updateStock('product-123', stockDto);

      expect(prismaService.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ProductStatus.INACTIVE,
          }),
        }),
      );
    });

    it('should require tenant context', async () => {
      const stockDto: UpdateStockDto = { quantity: 50 };
      (prismaService.product.update as jest.Mock).mockResolvedValue({
        ...mockProduct,
        stock: 50,
      });

      await service.updateStock('product-123', stockDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('mapToProductResponse', () => {
    it('should include all expected fields', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      const result = await service.findOne('product-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('sku');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('categoryId');
      expect(result).toHaveProperty('costPrice');
      expect(result).toHaveProperty('salePrice');
      expect(result).toHaveProperty('taxRate');
      expect(result).toHaveProperty('stock');
      expect(result).toHaveProperty('minStock');
      expect(result).toHaveProperty('maxStock');
      expect(result).toHaveProperty('barcode');
      expect(result).toHaveProperty('brand');
      expect(result).toHaveProperty('unit');
      expect(result).toHaveProperty('imageUrl');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should convert Decimal fields to numbers', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      const result = await service.findOne('product-123');

      expect(typeof result.costPrice).toBe('number');
      expect(typeof result.salePrice).toBe('number');
      expect(typeof result.taxRate).toBe('number');
    });
  });

  describe('logging', () => {
    it('should log debug when listing products', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Listing products for tenant'),
      );
    });

    it('should log when product is created', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.product.create as jest.Mock).mockResolvedValue({
        ...mockProduct,
        id: 'new-id',
      });

      await service.create({
        sku: 'NEW-SKU',
        name: 'Test Product',
        costPrice: 10,
        salePrice: 20,
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Product created'),
      );
    });

    it('should log when product is updated', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );
      (prismaService.product.update as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      await service.update('product-123', { name: 'Updated' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Product updated'),
      );
    });

    it('should log when product is deleted', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );
      (prismaService.invoiceItem.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.delete as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      await service.delete('product-123');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Product deleted'),
      );
    });

    it('should log warning when product not found', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

      try {
        await service.findOne('nonexistent');
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith('Product not found: nonexistent');
    });

    it('should log warning when SKU already exists', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.product.findUnique as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      try {
        await service.create({
          sku: 'SKU-001',
          name: 'Test',
          costPrice: 10,
          salePrice: 20,
        });
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith('SKU already exists: SKU-001');
    });
  });

  describe('tenant isolation', () => {
    it('should scope findAll to tenant', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
      expect(prismaService.product.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should scope findOne to tenant', async () => {
      (prismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      await service.findOne('product-123');

      expect(prismaService.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'product-123', tenantId: mockTenantId },
      });
    });

    it('should scope search to tenant', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);

      await service.search('test');

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should scope findLowStock to tenant', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);

      await service.findLowStock();

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
        }),
      );
    });
  });

  describe('findOne - cache hit', () => {
    it('should return cached product without querying database', async () => {
      const cachedProduct = {
        id: 'product-123',
        sku: 'SKU-001',
        name: 'Cached Product',
        tenantId: mockTenantId,
        stock: 100,
      };

      // Access cacheService from the service instance
      const cacheService = (service as unknown as { cache: { get: jest.Mock } }).cache;
      cacheService.get.mockResolvedValue(cachedProduct);

      const result = await service.findOne('product-123');

      expect(result).toEqual(cachedProduct);
      // Should NOT query the database
      expect(prismaService.product.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('create - auto-generate SKU', () => {
    it('should generate SKU when not provided', async () => {
      const createDtoNoSku = {
        name: 'Auto SKU Product',
        costPrice: 10,
        salePrice: 20,
      } as CreateProductDto;

      // First call to findFirst for generateSku (get last PROD- SKU)
      (prismaService.product.findFirst as jest.Mock)
        .mockResolvedValueOnce({ sku: 'PROD-00003' }) // last product
        .mockResolvedValueOnce(null); // barcode check

      // findUnique for SKU uniqueness check in generateSku
      (prismaService.product.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // PROD-00004 doesn't exist
        .mockResolvedValueOnce(null); // SKU unique check in create

      (prismaService.product.create as jest.Mock).mockResolvedValue({
        ...mockProduct,
        sku: 'PROD-00004',
        name: 'Auto SKU Product',
      });

      const result = await service.create(createDtoNoSku);

      expect(result.sku).toBe('PROD-00004');
    });

    it('should generate PROD-00001 when no existing PROD- SKUs', async () => {
      const createDtoNoSku = {
        name: 'First Product',
        costPrice: 10,
        salePrice: 20,
      } as CreateProductDto;

      (prismaService.product.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // no existing PROD- products
        .mockResolvedValueOnce(null); // barcode check

      (prismaService.product.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // PROD-00001 doesn't exist
        .mockResolvedValueOnce(null); // SKU unique check

      (prismaService.product.create as jest.Mock).mockResolvedValue({
        ...mockProduct,
        sku: 'PROD-00001',
        name: 'First Product',
      });

      const result = await service.create(createDtoNoSku);

      expect(result.sku).toBe('PROD-00001');
    });

    it('should retry when generated SKU already exists', async () => {
      const createDtoNoSku = {
        name: 'Retry Product',
        costPrice: 10,
        salePrice: 20,
      } as CreateProductDto;

      (prismaService.product.findFirst as jest.Mock)
        .mockResolvedValueOnce({ sku: 'PROD-00005' }) // first generateSku call
        .mockResolvedValueOnce({ sku: 'PROD-00006' }) // second (recursive) generateSku call
        .mockResolvedValueOnce(null); // barcode check

      (prismaService.product.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'exists' }) // PROD-00006 already exists! triggers retry
        .mockResolvedValueOnce(null) // PROD-00007 is free
        .mockResolvedValueOnce(null); // SKU unique check in create

      (prismaService.product.create as jest.Mock).mockResolvedValue({
        ...mockProduct,
        sku: 'PROD-00007',
        name: 'Retry Product',
      });

      const result = await service.create(createDtoNoSku);

      expect(result.sku).toBe('PROD-00007');
    });
  });
});
