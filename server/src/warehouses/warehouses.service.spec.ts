import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { WarehouseStatus } from '@prisma/client';
import { WarehousesService } from './warehouses.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto';

describe('WarehousesService', () => {
  let service: WarehousesService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';

  const mockWarehouse = {
    id: 'warehouse-123',
    tenantId: mockTenantId,
    name: 'Main Warehouse',
    code: 'WH-001',
    address: '123 Industrial Ave',
    city: 'Bogota',
    phone: '+57 1 234 5678',
    isMain: true,
    status: WarehouseStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockWarehouse2 = {
    ...mockWarehouse,
    id: 'warehouse-456',
    name: 'Secondary Warehouse',
    code: 'WH-002',
    isMain: false,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock implementations
    const mockPrismaService = {
      warehouse: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      warehouseStock: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
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
        maxWarehouses: -1, // Unlimited
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehousesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
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
      (prismaService.warehouse.findMany as jest.Mock).mockResolvedValue([
        mockWarehouse,
        mockWarehouse2,
      ]);
      (prismaService.warehouse.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return paginated warehouses', async () => {
      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should calculate correct pagination for page 2', async () => {
      (prismaService.warehouse.findMany as jest.Mock).mockResolvedValue([
        mockWarehouse,
      ]);
      (prismaService.warehouse.count as jest.Mock).mockResolvedValue(15);

      const result = await service.findAll(2, 10);

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(2);
      expect(prismaService.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should require tenant context', async () => {
      await service.findAll();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return empty array when no warehouses exist', async () => {
      (prismaService.warehouse.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.warehouse.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should use default pagination values', async () => {
      await service.findAll();

      expect(prismaService.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should order warehouses by isMain desc then name asc', async () => {
      await service.findAll();

      expect(prismaService.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
        }),
      );
    });

    it('should scope query to tenant', async () => {
      await service.findAll();

      expect(prismaService.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
        }),
      );
    });
  });

  describe('findOne', () => {
    beforeEach(() => {
      (prismaService.warehouseStock.aggregate as jest.Mock).mockResolvedValue({
        _count: { productId: 10 },
        _sum: { quantity: 500 },
      });
    });

    it('should return a warehouse by id with stock summary', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );

      const result = await service.findOne('warehouse-123');

      expect(result.id).toBe('warehouse-123');
      expect(result.name).toBe('Main Warehouse');
      expect(result.stockSummary).toEqual({
        totalProducts: 10,
        totalQuantity: 500,
      });
      expect(prismaService.warehouse.findFirst).toHaveBeenCalledWith({
        where: { id: 'warehouse-123', tenantId: mockTenantId },
      });
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Warehouse with ID nonexistent not found',
      );
    });

    it('should include all expected fields in response', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );

      const result = await service.findOne('warehouse-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('city');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('isDefault');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('stockSummary');
    });

    it('should handle zero stock', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prismaService.warehouseStock.aggregate as jest.Mock).mockResolvedValue({
        _count: { productId: 0 },
        _sum: { quantity: null },
      });

      const result = await service.findOne('warehouse-123');

      expect(result.stockSummary).toEqual({
        totalProducts: 0,
        totalQuantity: 0,
      });
    });
  });

  describe('create', () => {
    const createDto: CreateWarehouseDto = {
      name: 'New Warehouse',
      code: 'WH-NEW',
      address: '456 Storage Blvd',
      city: 'Medellin',
      phone: '+57 4 567 8901',
      isDefault: false,
    };

    const newWarehouse = {
      ...mockWarehouse,
      id: 'new-warehouse-id',
      name: 'New Warehouse',
      code: 'WH-NEW',
      address: '456 Storage Blvd',
      city: 'Medellin',
      phone: '+57 4 567 8901',
      isMain: false,
    };

    beforeEach(() => {
      (prismaService.warehouse.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.warehouse.create as jest.Mock).mockResolvedValue(
        newWarehouse,
      );
    });

    it('should create a new warehouse', async () => {
      const result = await service.create(createDto);

      expect(result.code).toBe('WH-NEW');
      expect(result.name).toBe('New Warehouse');
      expect(prismaService.warehouse.create).toHaveBeenCalled();
    });

    it('should enforce tenant warehouse limit', async () => {
      await service.create(createDto);

      expect(tenantContextService.enforceLimit).toHaveBeenCalledWith(
        'warehouses',
      );
    });

    it('should throw ForbiddenException when warehouse limit reached', async () => {
      (tenantContextService.enforceLimit as jest.Mock).mockRejectedValue(
        new ForbiddenException('Warehouses limit reached'),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should trim name and code', async () => {
      const dtoWithSpaces = {
        ...createDto,
        name: '  New Warehouse  ',
        code: '  WH-NEW  ',
      };

      await service.create(dtoWithSpaces);

      expect(prismaService.warehouse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Warehouse',
            code: 'WH-NEW',
          }),
        }),
      );
    });

    it('should check for existing code with compound key', async () => {
      await service.create(createDto);

      expect(prismaService.warehouse.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_code: {
            tenantId: mockTenantId,
            code: 'WH-NEW',
          },
        },
      });
    });

    it('should throw ConflictException when code already exists', async () => {
      (prismaService.warehouse.findUnique as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException with correct message for duplicate code', async () => {
      (prismaService.warehouse.findUnique as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        'A warehouse with the code "WH-NEW" already exists',
      );
    });

    it('should auto-generate code from name if not provided', async () => {
      const dtoWithoutCode = { name: 'Test Warehouse' };

      await service.create(dtoWithoutCode);

      expect(prismaService.warehouse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: expect.stringMatching(/^TESTWA-[A-Z0-9]+$/),
          }),
        }),
      );
    });

    it('should unset previous default when setting as default', async () => {
      const dtoWithDefault = { ...createDto, isDefault: true };
      (prismaService.warehouse.create as jest.Mock).mockResolvedValue({
        ...newWarehouse,
        isMain: true,
      });

      await service.create(dtoWithDefault);

      expect(prismaService.warehouse.updateMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isMain: true },
        data: { isMain: false },
      });
    });

    it('should not unset default if not setting as default', async () => {
      await service.create(createDto);

      expect(prismaService.warehouse.updateMany).not.toHaveBeenCalled();
    });

    it('should create warehouse without optional fields', async () => {
      const minimalDto: CreateWarehouseDto = {
        name: 'Minimal Warehouse',
      };
      const minimalWarehouse = {
        ...mockWarehouse,
        id: 'minimal-id',
        name: 'Minimal Warehouse',
        code: expect.any(String),
        address: null,
        city: null,
        phone: null,
        isMain: false,
      };
      (prismaService.warehouse.create as jest.Mock).mockResolvedValue(
        minimalWarehouse,
      );

      const result = await service.create(minimalDto);

      expect(result.name).toBe('Minimal Warehouse');
    });

    it('should require tenant context', async () => {
      await service.create(createDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should include tenantId in created warehouse', async () => {
      await service.create(createDto);

      expect(prismaService.warehouse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateWarehouseDto = {
      name: 'Updated Warehouse',
      address: '789 New Address',
    };

    beforeEach(() => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prismaService.warehouse.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.warehouse.update as jest.Mock).mockResolvedValue({
        ...mockWarehouse,
        name: 'Updated Warehouse',
        address: '789 New Address',
      });
    });

    it('should update a warehouse', async () => {
      const result = await service.update('warehouse-123', updateDto);

      expect(result.name).toBe('Updated Warehouse');
      expect(prismaService.warehouse.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        'Warehouse with ID nonexistent not found',
      );
    });

    describe('code update', () => {
      it('should check uniqueness when changing code', async () => {
        const codeUpdate = { code: 'DIFFERENT-CODE' };

        await service.update('warehouse-123', codeUpdate);

        expect(prismaService.warehouse.findUnique).toHaveBeenCalledWith({
          where: {
            tenantId_code: {
              tenantId: mockTenantId,
              code: 'DIFFERENT-CODE',
            },
          },
        });
      });

      it('should throw ConflictException when new code already exists', async () => {
        const codeUpdate = { code: 'EXISTING-CODE' };
        (prismaService.warehouse.findUnique as jest.Mock).mockResolvedValue(
          mockWarehouse2,
        );

        await expect(
          service.update('warehouse-123', codeUpdate),
        ).rejects.toThrow(ConflictException);
      });

      it('should not check uniqueness if code is unchanged', async () => {
        const codeUpdate = { code: 'WH-001' }; // Same as mockWarehouse

        await service.update('warehouse-123', codeUpdate);

        expect(prismaService.warehouse.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('default warehouse update', () => {
      it('should unset previous default when setting as new default', async () => {
        const nonDefaultWarehouse = { ...mockWarehouse, isMain: false };
        (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
          nonDefaultWarehouse,
        );
        const defaultUpdate = { isDefault: true };

        await service.update('warehouse-123', defaultUpdate);

        expect(prismaService.warehouse.updateMany).toHaveBeenCalledWith({
          where: { tenantId: mockTenantId, isMain: true },
          data: { isMain: false },
        });
      });

      it('should not unset default if already default', async () => {
        const defaultUpdate = { isDefault: true };

        await service.update('warehouse-123', defaultUpdate);

        expect(prismaService.warehouse.updateMany).not.toHaveBeenCalled();
      });

      it('should allow unsetting default', async () => {
        const unsetDefaultUpdate = { isDefault: false };
        (prismaService.warehouse.update as jest.Mock).mockResolvedValue({
          ...mockWarehouse,
          isMain: false,
        });

        await service.update('warehouse-123', unsetDefaultUpdate);

        expect(prismaService.warehouse.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ isMain: false }),
          }),
        );
      });
    });

    it('should update only provided fields', async () => {
      const partialUpdate = { name: 'Only Name Updated' };
      (prismaService.warehouse.update as jest.Mock).mockResolvedValue({
        ...mockWarehouse,
        name: 'Only Name Updated',
      });

      await service.update('warehouse-123', partialUpdate);

      expect(prismaService.warehouse.update).toHaveBeenCalledWith({
        where: { id: 'warehouse-123' },
        data: { name: 'Only Name Updated' },
      });
    });

    it('should require tenant context', async () => {
      await service.update('warehouse-123', updateDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    describe('individual field updates', () => {
      it('should update city when provided', async () => {
        const cityUpdate = { city: 'New City' };
        (prismaService.warehouse.update as jest.Mock).mockResolvedValue({
          ...mockWarehouse,
          city: 'New City',
        });

        await service.update('warehouse-123', cityUpdate);

        expect(prismaService.warehouse.update).toHaveBeenCalledWith({
          where: { id: 'warehouse-123' },
          data: { city: 'New City' },
        });
      });

      it('should allow setting city to null', async () => {
        const cityUpdate = { city: null };
        (prismaService.warehouse.update as jest.Mock).mockResolvedValue({
          ...mockWarehouse,
          city: null,
        });

        await service.update('warehouse-123', cityUpdate);

        expect(prismaService.warehouse.update).toHaveBeenCalledWith({
          where: { id: 'warehouse-123' },
          data: { city: null },
        });
      });

      it('should update phone when provided', async () => {
        const phoneUpdate = { phone: '+57 1 999 8888' };
        (prismaService.warehouse.update as jest.Mock).mockResolvedValue({
          ...mockWarehouse,
          phone: '+57 1 999 8888',
        });

        await service.update('warehouse-123', phoneUpdate);

        expect(prismaService.warehouse.update).toHaveBeenCalledWith({
          where: { id: 'warehouse-123' },
          data: { phone: '+57 1 999 8888' },
        });
      });

      it('should allow setting phone to null', async () => {
        const phoneUpdate = { phone: null };
        (prismaService.warehouse.update as jest.Mock).mockResolvedValue({
          ...mockWarehouse,
          phone: null,
        });

        await service.update('warehouse-123', phoneUpdate);

        expect(prismaService.warehouse.update).toHaveBeenCalledWith({
          where: { id: 'warehouse-123' },
          data: { phone: null },
        });
      });

      it('should update status when provided', async () => {
        const statusUpdate = { status: WarehouseStatus.INACTIVE };
        (prismaService.warehouse.update as jest.Mock).mockResolvedValue({
          ...mockWarehouse,
          status: WarehouseStatus.INACTIVE,
        });

        await service.update('warehouse-123', statusUpdate);

        expect(prismaService.warehouse.update).toHaveBeenCalledWith({
          where: { id: 'warehouse-123' },
          data: { status: WarehouseStatus.INACTIVE },
        });
      });

      it('should update multiple fields at once', async () => {
        const multiUpdate = {
          name: 'Updated Warehouse',
          address: 'New Address',
          city: 'Cali',
          phone: '+57 2 123 4567',
          status: WarehouseStatus.ACTIVE,
        };
        (prismaService.warehouse.update as jest.Mock).mockResolvedValue({
          ...mockWarehouse,
          ...multiUpdate,
        });

        await service.update('warehouse-123', multiUpdate);

        expect(prismaService.warehouse.update).toHaveBeenCalledWith({
          where: { id: 'warehouse-123' },
          data: expect.objectContaining({
            name: 'Updated Warehouse',
            address: 'New Address',
            city: 'Cali',
            phone: '+57 2 123 4567',
            status: WarehouseStatus.ACTIVE,
          }),
        });
      });
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prismaService.warehouseStock.count as jest.Mock).mockResolvedValue(0);
      (prismaService.warehouseStock.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prismaService.warehouse.delete as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
    });

    it('should delete a warehouse', async () => {
      await service.delete('warehouse-123');

      expect(prismaService.warehouse.delete).toHaveBeenCalledWith({
        where: { id: 'warehouse-123' },
      });
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        'Warehouse with ID nonexistent not found',
      );
    });

    it('should check for stock in warehouse', async () => {
      await service.delete('warehouse-123');

      expect(prismaService.warehouseStock.count).toHaveBeenCalledWith({
        where: {
          warehouseId: 'warehouse-123',
          quantity: { gt: 0 },
        },
      });
    });

    it('should throw BadRequestException when stock exists', async () => {
      (prismaService.warehouseStock.count as jest.Mock).mockResolvedValue(5);

      await expect(service.delete('warehouse-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct message for existing stock', async () => {
      (prismaService.warehouseStock.count as jest.Mock).mockResolvedValue(5);

      await expect(service.delete('warehouse-123')).rejects.toThrow(
        'Cannot delete warehouse "Main Warehouse". 5 product(s) still have stock in this warehouse. Transfer or remove all stock first.',
      );
    });

    it('should delete warehouse stock records before deleting warehouse', async () => {
      await service.delete('warehouse-123');

      expect(prismaService.warehouseStock.deleteMany).toHaveBeenCalledWith({
        where: { warehouseId: 'warehouse-123' },
      });
      expect(prismaService.warehouse.delete).toHaveBeenCalled();
    });

    it('should require tenant context', async () => {
      await service.delete('warehouse-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('getStock', () => {
    const mockStockItems = [
      {
        id: 'stock-1',
        warehouseId: 'warehouse-123',
        productId: 'product-1',
        quantity: 100,
        product: {
          id: 'product-1',
          name: 'Product A',
          sku: 'SKU-A',
        },
      },
      {
        id: 'stock-2',
        warehouseId: 'warehouse-123',
        productId: 'product-2',
        quantity: 50,
        product: {
          id: 'product-2',
          name: 'Product B',
          sku: 'SKU-B',
        },
      },
    ];

    beforeEach(() => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prismaService.warehouseStock.findMany as jest.Mock).mockResolvedValue(
        mockStockItems,
      );
      (prismaService.warehouseStock.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return paginated stock items', async () => {
      const result = await service.getStock('warehouse-123', 1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should return stock items with product details', async () => {
      const result = await service.getStock('warehouse-123');

      expect(result.data[0]).toEqual({
        productId: 'product-1',
        productName: 'Product A',
        productSku: 'SKU-A',
        quantity: 100,
      });
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getStock('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should only include items with quantity > 0', async () => {
      await service.getStock('warehouse-123');

      expect(prismaService.warehouseStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            quantity: { gt: 0 },
          }),
        }),
      );
    });

    it('should paginate results correctly', async () => {
      await service.getStock('warehouse-123', 2, 10);

      expect(prismaService.warehouseStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should order by product name', async () => {
      await service.getStock('warehouse-123');

      expect(prismaService.warehouseStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { product: { name: 'asc' } },
        }),
      );
    });

    it('should require tenant context', async () => {
      await service.getStock('warehouse-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return empty array when no stock exists', async () => {
      (prismaService.warehouseStock.findMany as jest.Mock).mockResolvedValue(
        [],
      );
      (prismaService.warehouseStock.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getStock('warehouse-123');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('mapToWarehouseResponse', () => {
    it('should map isMain to isDefault', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prismaService.warehouseStock.aggregate as jest.Mock).mockResolvedValue({
        _count: { productId: 0 },
        _sum: { quantity: null },
      });

      const result = await service.findOne('warehouse-123');

      expect(result.isDefault).toBe(true); // isMain is true in mockWarehouse
    });

    it('should include all expected fields', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prismaService.warehouseStock.aggregate as jest.Mock).mockResolvedValue({
        _count: { productId: 0 },
        _sum: { quantity: null },
      });

      const result = await service.findOne('warehouse-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('city');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('isDefault');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('isActive');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should derive isActive from status', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prismaService.warehouseStock.aggregate as jest.Mock).mockResolvedValue({
        _count: { productId: 0 },
        _sum: { quantity: null },
      });

      const result = await service.findOne('warehouse-123');

      expect(result.isActive).toBe(true); // status is ACTIVE in mockWarehouse
    });
  });

  describe('generateCode', () => {
    it('should generate code from name', async () => {
      const dto = { name: 'Test Warehouse' };
      (prismaService.warehouse.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.warehouse.create as jest.Mock).mockImplementation(
        (args: { data: { code: string; name: string } }) => ({
          ...mockWarehouse,
          ...args.data,
        }),
      );

      await service.create(dto);

      const mockCalls = (prismaService.warehouse.create as jest.Mock).mock
        .calls as Array<[{ data: { code: string } }]>;
      const createCall = mockCalls[0][0];
      expect(createCall.data.code).toMatch(/^TESTWA-[A-Z0-9]+$/);
    });

    it('should handle special characters in name', async () => {
      const dto = { name: 'Test & Warehouse #1!' };
      (prismaService.warehouse.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.warehouse.create as jest.Mock).mockImplementation(
        (args: { data: { code: string; name: string } }) => ({
          ...mockWarehouse,
          ...args.data,
        }),
      );

      await service.create(dto);

      const mockCalls = (prismaService.warehouse.create as jest.Mock).mock
        .calls as Array<[{ data: { code: string } }]>;
      const createCall = mockCalls[0][0];
      // Should only contain alphanumeric characters
      expect(createCall.data.code).toMatch(/^[A-Z0-9]+-[A-Z0-9]+$/);
    });
  });

  describe('logging', () => {
    it('should log debug when listing warehouses', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (prismaService.warehouse.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.warehouse.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Listing warehouses for tenant'),
      );
    });

    it('should log when warehouse is created', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.warehouse.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.warehouse.create as jest.Mock).mockResolvedValue({
        ...mockWarehouse,
        id: 'new-id',
      });

      await service.create({ name: 'Test Warehouse' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warehouse created'),
      );
    });

    it('should log when warehouse is updated', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prismaService.warehouse.update as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );

      await service.update('warehouse-123', { name: 'Updated' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warehouse updated'),
      );
    });

    it('should log when warehouse is deleted', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prismaService.warehouseStock.count as jest.Mock).mockResolvedValue(0);
      (prismaService.warehouseStock.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prismaService.warehouse.delete as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );

      await service.delete('warehouse-123');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warehouse deleted'),
      );
    });

    it('should log warning when warehouse not found', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      try {
        await service.findOne('nonexistent');
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith('Warehouse not found: nonexistent');
    });

    it('should log warning when code already exists', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.warehouse.findUnique as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );

      try {
        await service.create({ name: 'Test', code: 'WH-001' });
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith('Code already exists: WH-001');
    });
  });

  describe('getCities', () => {
    it('should return unique cities sorted alphabetically', async () => {
      (prismaService.warehouse.findMany as jest.Mock).mockResolvedValue([
        { city: 'Cali' },
        { city: 'Bogota' },
        { city: 'Medellin' },
      ]);

      const result = await service.getCities();

      expect(result).toEqual(['Bogota', 'Cali', 'Medellin']);
      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
      expect(prismaService.warehouse.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        select: { city: true },
        distinct: ['city'],
      });
    });

    it('should filter out null cities', async () => {
      (prismaService.warehouse.findMany as jest.Mock).mockResolvedValue([
        { city: 'Bogota' },
        { city: null },
        { city: 'Cali' },
        { city: null },
      ]);

      const result = await service.getCities();

      expect(result).toEqual(['Bogota', 'Cali']);
      expect(result).not.toContain(null);
    });

    it('should return empty array when no warehouses exist', async () => {
      (prismaService.warehouse.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getCities();

      expect(result).toEqual([]);
    });

    it('should return empty array when all cities are null', async () => {
      (prismaService.warehouse.findMany as jest.Mock).mockResolvedValue([
        { city: null },
        { city: null },
      ]);

      const result = await service.getCities();

      expect(result).toEqual([]);
    });

    it('should log debug message when getting cities', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (prismaService.warehouse.findMany as jest.Mock).mockResolvedValue([
        { city: 'Bogota' },
      ]);

      await service.getCities();

      expect(debugSpy).toHaveBeenCalledWith(
        `Getting unique cities for tenant ${mockTenantId}`,
      );
    });
  });

  describe('tenant isolation', () => {
    it('should scope findAll to tenant', async () => {
      (prismaService.warehouse.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.warehouse.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prismaService.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
      expect(prismaService.warehouse.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should scope findOne to tenant', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prismaService.warehouseStock.aggregate as jest.Mock).mockResolvedValue({
        _count: { productId: 0 },
        _sum: { quantity: null },
      });

      await service.findOne('warehouse-123');

      expect(prismaService.warehouse.findFirst).toHaveBeenCalledWith({
        where: { id: 'warehouse-123', tenantId: mockTenantId },
      });
    });

    it('should scope getStock to tenant', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(
        mockWarehouse,
      );
      (prismaService.warehouseStock.findMany as jest.Mock).mockResolvedValue(
        [],
      );
      (prismaService.warehouseStock.count as jest.Mock).mockResolvedValue(0);

      await service.getStock('warehouse-123');

      expect(prismaService.warehouse.findFirst).toHaveBeenCalledWith({
        where: { id: 'warehouse-123', tenantId: mockTenantId },
      });
    });
  });
});
