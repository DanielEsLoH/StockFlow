import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import type {
  CategoryResponse,
  PaginatedCategoriesResponse,
} from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let categoriesService: jest.Mocked<CategoriesService>;

  // Test data
  const mockCategory: CategoryResponse = {
    id: 'category-123',
    tenantId: 'tenant-123',
    name: 'Electronics',
    description: 'Electronic devices and accessories',
    color: '#3b82f6',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCategory2: CategoryResponse = {
    ...mockCategory,
    id: 'category-456',
    name: 'Clothing',
    description: 'Apparel and accessories',
    color: '#ef4444',
  };

  const mockPaginatedResponse: PaginatedCategoriesResponse = {
    data: [mockCategory, mockCategory2],
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockCategoriesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: mockCategoriesService },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    categoriesService = module.get(CategoriesService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
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
    it('should return paginated categories with default pagination', async () => {
      categoriesService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll();

      expect(result).toEqual(mockPaginatedResponse);
      expect(categoriesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should parse page and limit from query params', async () => {
      categoriesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('2', '20');

      expect(categoriesService.findAll).toHaveBeenCalledWith(2, 20);
    });

    it('should enforce minimum page of 1', async () => {
      categoriesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('0', '10');

      expect(categoriesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should enforce minimum page of 1 for negative values', async () => {
      categoriesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('-5', '10');

      expect(categoriesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should enforce maximum limit of 100', async () => {
      categoriesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '200');

      expect(categoriesService.findAll).toHaveBeenCalledWith(1, 100);
    });

    it('should use default limit of 10 when limit is 0', async () => {
      categoriesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '0');

      // 0 is falsy, so || 10 kicks in for the default
      expect(categoriesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle invalid page value gracefully', async () => {
      categoriesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('invalid', '10');

      expect(categoriesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle invalid limit value gracefully', async () => {
      categoriesService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', 'invalid');

      expect(categoriesService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      categoriesService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      categoriesService.findOne.mockResolvedValue(mockCategory);

      const result = await controller.findOne('category-123');

      expect(result).toEqual(mockCategory);
      expect(categoriesService.findOne).toHaveBeenCalledWith('category-123');
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Category not found');
      categoriesService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('invalid-id')).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    const createDto: CreateCategoryDto = {
      name: 'New Category',
      description: 'A new category',
      color: '#10b981',
    };

    it('should create and return a new category', async () => {
      const createdCategory = { ...mockCategory, ...createDto };
      categoriesService.create.mockResolvedValue(createdCategory);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdCategory);
      expect(categoriesService.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate validation errors', async () => {
      const error = new Error('Category name already exists');
      categoriesService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCategoryDto = {
      name: 'Updated Category',
      description: 'Updated description',
    };

    it('should update and return the category', async () => {
      const updatedCategory = { ...mockCategory, ...updateDto };
      categoriesService.update.mockResolvedValue(updatedCategory);

      const result = await controller.update('category-123', updateDto);

      expect(result).toEqual(updatedCategory);
      expect(categoriesService.update).toHaveBeenCalledWith(
        'category-123',
        updateDto,
      );
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Category not found');
      categoriesService.update.mockRejectedValue(error);

      await expect(
        controller.update('invalid-id', updateDto),
      ).rejects.toThrow(error);
    });
  });

  describe('delete', () => {
    it('should delete a category', async () => {
      categoriesService.delete.mockResolvedValue(undefined);

      await controller.delete('category-123');

      expect(categoriesService.delete).toHaveBeenCalledWith('category-123');
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Category not found');
      categoriesService.delete.mockRejectedValue(error);

      await expect(controller.delete('invalid-id')).rejects.toThrow(error);
    });

    it('should propagate conflict errors when category has products', async () => {
      const error = new Error('Cannot delete category with associated products');
      categoriesService.delete.mockRejectedValue(error);

      await expect(controller.delete('category-123')).rejects.toThrow(error);
    });
  });
});