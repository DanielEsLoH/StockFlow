import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';

  const mockCategory = {
    id: 'category-123',
    tenantId: mockTenantId,
    name: 'Electronics',
    description: 'Electronic devices and accessories',
    color: '#3b82f6',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCategory2 = {
    ...mockCategory,
    id: 'category-456',
    name: 'Clothing',
    description: 'Apparel and accessories',
    color: '#ef4444',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock implementations
    const mockPrismaService = {
      category: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      product: {
        count: jest.fn(),
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
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
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
    it('should return paginated categories', async () => {
      const categories = [mockCategory, mockCategory2];
      (prismaService.category.findMany as jest.Mock).mockResolvedValue(
        categories,
      );
      (prismaService.category.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(prismaService.category.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } },
      });
    });

    it('should calculate correct pagination for page 2', async () => {
      (prismaService.category.findMany as jest.Mock).mockResolvedValue([
        mockCategory,
      ]);
      (prismaService.category.count as jest.Mock).mockResolvedValue(15);

      const result = await service.findAll(2, 10);

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(2);
      expect(prismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should require tenant context', async () => {
      (prismaService.category.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.category.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return empty array when no categories exist', async () => {
      (prismaService.category.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.category.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should use default pagination values', async () => {
      (prismaService.category.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.category.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should order categories by name ascending', async () => {
      (prismaService.category.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.category.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(
        mockCategory,
      );

      const result = await service.findOne('category-123');

      expect(result.id).toBe('category-123');
      expect(result.name).toBe('Electronics');
      expect(prismaService.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'category-123', tenantId: mockTenantId },
      });
    });

    it('should throw NotFoundException when category not found', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Category with ID nonexistent not found',
      );
    });

    it('should include all expected fields in response', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(
        mockCategory,
      );

      const result = await service.findOne('category-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('color');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('create', () => {
    const createDto: CreateCategoryDto = {
      name: 'New Category',
      description: 'A new category description',
      color: '#22c55e',
    };

    const newCategory = {
      ...mockCategory,
      id: 'new-category-id',
      name: 'New Category',
      description: 'A new category description',
      color: '#22c55e',
    };

    beforeEach(() => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.category.create as jest.Mock).mockResolvedValue(
        newCategory,
      );
    });

    it('should create a new category', async () => {
      const result = await service.create(createDto);

      expect(result.name).toBe('New Category');
      expect(result.description).toBe('A new category description');
      expect(result.color).toBe('#22c55e');
      expect(prismaService.category.create).toHaveBeenCalled();
    });

    it('should trim category name', async () => {
      const dtoWithSpaces = {
        ...createDto,
        name: '  New Category  ',
      };

      await service.create(dtoWithSpaces);

      expect(prismaService.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Category',
          }),
        }),
      );
    });

    it('should check for existing category with compound key', async () => {
      await service.create(createDto);

      expect(prismaService.category.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_name: {
            tenantId: mockTenantId,
            name: 'New Category',
          },
        },
      });
    });

    it('should throw ConflictException when category name already exists', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(
        mockCategory,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException with correct message', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(
        mockCategory,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        'A category with the name "New Category" already exists',
      );
    });

    it('should create category without optional fields', async () => {
      const minimalDto: CreateCategoryDto = {
        name: 'Minimal Category',
      };
      const minimalCategory = {
        ...mockCategory,
        id: 'minimal-id',
        name: 'Minimal Category',
        description: null,
        color: null,
      };
      (prismaService.category.create as jest.Mock).mockResolvedValue(
        minimalCategory,
      );

      const result = await service.create(minimalDto);

      expect(result.name).toBe('Minimal Category');
      expect(result.description).toBeNull();
      expect(result.color).toBeNull();
    });

    it('should require tenant context', async () => {
      await service.create(createDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should include tenantId in created category', async () => {
      await service.create(createDto);

      expect(prismaService.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateCategoryDto = {
      name: 'Updated Category',
      description: 'Updated description',
      color: '#f59e0b',
    };

    beforeEach(() => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(
        mockCategory,
      );
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.category.update as jest.Mock).mockResolvedValue({
        ...mockCategory,
        ...updateDto,
      });
    });

    it('should update a category', async () => {
      const result = await service.update('category-123', updateDto);

      expect(result.name).toBe('Updated Category');
      expect(result.description).toBe('Updated description');
      expect(result.color).toBe('#f59e0b');
    });

    it('should throw NotFoundException when category not found', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        'Category with ID nonexistent not found',
      );
    });

    describe('name update', () => {
      it('should check uniqueness when changing name', async () => {
        const nameUpdate = { name: 'Different Name' };

        await service.update('category-123', nameUpdate);

        expect(prismaService.category.findUnique).toHaveBeenCalledWith({
          where: {
            tenantId_name: {
              tenantId: mockTenantId,
              name: 'Different Name',
            },
          },
        });
      });

      it('should throw ConflictException when new name already exists', async () => {
        const nameUpdate = { name: 'Existing Category' };
        (prismaService.category.findUnique as jest.Mock).mockResolvedValue(
          mockCategory2,
        );

        await expect(
          service.update('category-123', nameUpdate),
        ).rejects.toThrow(ConflictException);
      });

      it('should throw ConflictException with correct message for duplicate name', async () => {
        const nameUpdate = { name: 'Existing Category' };
        (prismaService.category.findUnique as jest.Mock).mockResolvedValue(
          mockCategory2,
        );

        await expect(
          service.update('category-123', nameUpdate),
        ).rejects.toThrow(
          'A category with the name "Existing Category" already exists',
        );
      });

      it('should not check uniqueness if name is unchanged', async () => {
        const nameUpdate = { name: 'Electronics' }; // Same as mockCategory

        await service.update('category-123', nameUpdate);

        expect(prismaService.category.findUnique).not.toHaveBeenCalled();
      });

      it('should trim name when updating', async () => {
        const nameUpdate = { name: '  Trimmed Name  ' };

        await service.update('category-123', nameUpdate);

        expect(prismaService.category.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              name: 'Trimmed Name',
            }),
          }),
        );
      });
    });

    it('should update only provided fields', async () => {
      const partialUpdate = { description: 'Only description updated' };
      (prismaService.category.update as jest.Mock).mockResolvedValue({
        ...mockCategory,
        description: 'Only description updated',
      });

      await service.update('category-123', partialUpdate);

      expect(prismaService.category.update).toHaveBeenCalledWith({
        where: { id: 'category-123' },
        data: { description: 'Only description updated' },
      });
    });

    it('should allow updating color only', async () => {
      const colorUpdate = { color: '#dc2626' };
      (prismaService.category.update as jest.Mock).mockResolvedValue({
        ...mockCategory,
        color: '#dc2626',
      });

      await service.update('category-123', colorUpdate);

      expect(prismaService.category.update).toHaveBeenCalledWith({
        where: { id: 'category-123' },
        data: { color: '#dc2626' },
      });
    });

    it('should require tenant context', async () => {
      await service.update('category-123', updateDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(
        mockCategory,
      );
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.category.delete as jest.Mock).mockResolvedValue(
        mockCategory,
      );
    });

    it('should delete a category', async () => {
      await service.delete('category-123');

      expect(prismaService.category.delete).toHaveBeenCalledWith({
        where: { id: 'category-123' },
      });
    });

    it('should throw NotFoundException when category not found', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        'Category with ID nonexistent not found',
      );
    });

    it('should check for associated products', async () => {
      await service.delete('category-123');

      expect(prismaService.product.count).toHaveBeenCalledWith({
        where: { categoryId: 'category-123', tenantId: mockTenantId },
      });
    });

    it('should throw BadRequestException when products are associated', async () => {
      (prismaService.product.count as jest.Mock).mockResolvedValue(5);

      await expect(service.delete('category-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct message for associated products', async () => {
      (prismaService.product.count as jest.Mock).mockResolvedValue(5);

      await expect(service.delete('category-123')).rejects.toThrow(
        'Cannot delete category "Electronics". 5 product(s) are still associated with this category. Please reassign or remove the products first.',
      );
    });

    it('should throw BadRequestException with singular product message', async () => {
      (prismaService.product.count as jest.Mock).mockResolvedValue(1);

      await expect(service.delete('category-123')).rejects.toThrow(
        'Cannot delete category "Electronics". 1 product(s) are still associated with this category. Please reassign or remove the products first.',
      );
    });

    it('should require tenant context', async () => {
      await service.delete('category-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('mapToCategoryResponse', () => {
    it('should include all expected fields', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(
        mockCategory,
      );

      const result = await service.findOne('category-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('color');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should return correct values', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(
        mockCategory,
      );

      const result = await service.findOne('category-123');

      expect(result.id).toBe('category-123');
      expect(result.name).toBe('Electronics');
      expect(result.description).toBe('Electronic devices and accessories');
      expect(result.color).toBe('#3b82f6');
      expect(result.tenantId).toBe(mockTenantId);
    });
  });

  describe('logging', () => {
    it('should log debug when listing categories', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (prismaService.category.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.category.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Listing categories for tenant'),
      );
    });

    it('should log when category is created', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.category.create as jest.Mock).mockResolvedValue({
        ...mockCategory,
        id: 'new-id',
      });

      await service.create({
        name: 'Test Category',
        description: 'Test description',
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Category created'),
      );
    });

    it('should log when category is updated', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(
        mockCategory,
      );
      (prismaService.category.update as jest.Mock).mockResolvedValue(
        mockCategory,
      );

      await service.update('category-123', { description: 'Updated' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Category updated'),
      );
    });

    it('should log when category is deleted', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(
        mockCategory,
      );
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.category.delete as jest.Mock).mockResolvedValue(
        mockCategory,
      );

      await service.delete('category-123');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Category deleted'),
      );
    });

    it('should log warning when category not found', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(null);

      try {
        await service.findOne('nonexistent');
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith('Category not found: nonexistent');
    });

    it('should log warning when category already exists', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(
        mockCategory,
      );

      try {
        await service.create({ name: 'Electronics' });
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'Category already exists: Electronics',
      );
    });

    it('should log warning when trying to delete category with products', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(
        mockCategory,
      );
      (prismaService.product.count as jest.Mock).mockResolvedValue(3);

      try {
        await service.delete('category-123');
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'Cannot delete category category-123: 3 products associated',
      );
    });
  });

  describe('tenant isolation', () => {
    it('should scope findAll to tenant', async () => {
      (prismaService.category.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.category.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
        }),
      );
      expect(prismaService.category.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
    });

    it('should scope findOne to tenant', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(
        mockCategory,
      );

      await service.findOne('category-123');

      expect(prismaService.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'category-123', tenantId: mockTenantId },
      });
    });

    it('should scope delete product check to tenant', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(
        mockCategory,
      );
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.category.delete as jest.Mock).mockResolvedValue(
        mockCategory,
      );

      await service.delete('category-123');

      expect(prismaService.product.count).toHaveBeenCalledWith({
        where: { categoryId: 'category-123', tenantId: mockTenantId },
      });
    });
  });
});
