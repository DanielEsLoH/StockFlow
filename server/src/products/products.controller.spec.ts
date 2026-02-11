import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import type {
  ProductResponse,
  PaginatedProductsResponse,
} from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  UpdateStockDto,
  FilterProductsDto,
} from './dto';
import { ProductStatus } from '@prisma/client';
import { StockAdjustmentType } from './dto';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: jest.Mocked<ProductsService>;

  // Test data
  const mockProduct: ProductResponse = {
    id: 'product-123',
    tenantId: 'tenant-123',
    categoryId: 'category-123',
    sku: 'SKU-001',
    barcode: '1234567890',
    name: 'Wireless Headphones',
    description: 'High-quality wireless headphones',
    costPrice: 50,
    salePrice: 79.99,
    taxRate: 0,
    stock: 100,
    minStock: 10,
    maxStock: null,
    brand: null,
    unit: 'unit',
    imageUrl: null,
    status: ProductStatus.ACTIVE,
    category: { id: 'category-123', name: 'Electronics', color: null },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockProduct2: ProductResponse = {
    ...mockProduct,
    id: 'product-456',
    sku: 'SKU-002',
    name: 'Bluetooth Speaker',
    stock: 50,
  };

  const mockPaginatedResponse: PaginatedProductsResponse = {
    data: [mockProduct, mockProduct2],
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockProductsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findLowStock: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateStock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    productsService = module.get(ProductsService);

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
    it('should return paginated products with filters', async () => {
      productsService.findAll.mockResolvedValue(mockPaginatedResponse);

      const filters: FilterProductsDto = {
        page: 1,
        limit: 10,
        status: ProductStatus.ACTIVE,
      };

      const result = await controller.findAll(filters);

      expect(result).toEqual(mockPaginatedResponse);
      expect(productsService.findAll).toHaveBeenCalledWith(filters);
    });

    it('should handle empty filters', async () => {
      productsService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({});

      expect(result).toEqual(mockPaginatedResponse);
      expect(productsService.findAll).toHaveBeenCalledWith({});
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      productsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll({})).rejects.toThrow(error);
    });
  });

  describe('findLowStock', () => {
    it('should return paginated low stock products with default pagination', async () => {
      productsService.findLowStock.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findLowStock();

      expect(result).toEqual(mockPaginatedResponse);
      expect(productsService.findLowStock).toHaveBeenCalledWith(1, 10);
    });

    it('should parse page and limit from query params', async () => {
      productsService.findLowStock.mockResolvedValue(mockPaginatedResponse);

      await controller.findLowStock('2', '20');

      expect(productsService.findLowStock).toHaveBeenCalledWith(2, 20);
    });

    it('should enforce minimum page of 1', async () => {
      productsService.findLowStock.mockResolvedValue(mockPaginatedResponse);

      await controller.findLowStock('0', '10');

      expect(productsService.findLowStock).toHaveBeenCalledWith(1, 10);
    });

    it('should enforce minimum page of 1 for negative values', async () => {
      productsService.findLowStock.mockResolvedValue(mockPaginatedResponse);

      await controller.findLowStock('-5', '10');

      expect(productsService.findLowStock).toHaveBeenCalledWith(1, 10);
    });

    it('should enforce maximum limit of 100', async () => {
      productsService.findLowStock.mockResolvedValue(mockPaginatedResponse);

      await controller.findLowStock('1', '200');

      expect(productsService.findLowStock).toHaveBeenCalledWith(1, 100);
    });

    it('should use default limit of 10 when limit is 0', async () => {
      productsService.findLowStock.mockResolvedValue(mockPaginatedResponse);

      await controller.findLowStock('1', '0');

      // 0 is falsy, so || 10 kicks in for the default
      expect(productsService.findLowStock).toHaveBeenCalledWith(1, 10);
    });

    it('should handle invalid page value gracefully', async () => {
      productsService.findLowStock.mockResolvedValue(mockPaginatedResponse);

      await controller.findLowStock('invalid', '10');

      expect(productsService.findLowStock).toHaveBeenCalledWith(1, 10);
    });

    it('should handle invalid limit value gracefully', async () => {
      productsService.findLowStock.mockResolvedValue(mockPaginatedResponse);

      await controller.findLowStock('1', 'invalid');

      expect(productsService.findLowStock).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('search', () => {
    it('should search products with default pagination', async () => {
      productsService.search.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.search('headphones');

      expect(result).toEqual(mockPaginatedResponse);
      expect(productsService.search).toHaveBeenCalledWith('headphones', 1, 10);
    });

    it('should trim search query', async () => {
      productsService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('  headphones  ', '1', '10');

      expect(productsService.search).toHaveBeenCalledWith('headphones', 1, 10);
    });

    it('should handle empty search query', async () => {
      productsService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search();

      expect(productsService.search).toHaveBeenCalledWith('', 1, 10);
    });

    it('should handle undefined search query', async () => {
      productsService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search(undefined, '1', '10');

      expect(productsService.search).toHaveBeenCalledWith('', 1, 10);
    });

    it('should parse page and limit from query params', async () => {
      productsService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', '2', '20');

      expect(productsService.search).toHaveBeenCalledWith('test', 2, 20);
    });

    it('should enforce pagination limits', async () => {
      productsService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', '0', '200');

      expect(productsService.search).toHaveBeenCalledWith('test', 1, 100);
    });

    it('should handle invalid pagination values', async () => {
      productsService.search.mockResolvedValue(mockPaginatedResponse);

      await controller.search('test', 'invalid', 'invalid');

      expect(productsService.search).toHaveBeenCalledWith('test', 1, 10);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      productsService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne('product-123');

      expect(result).toEqual(mockProduct);
      expect(productsService.findOne).toHaveBeenCalledWith('product-123');
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Product not found');
      productsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('invalid-id')).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    const createDto: CreateProductDto = {
      sku: 'SKU-NEW',
      name: 'New Product',
      costPrice: 30,
      salePrice: 49.99,
      stock: 50,
      minStock: 5,
    };

    it('should create and return a new product', async () => {
      const createdProduct = { ...mockProduct, ...createDto };
      productsService.create.mockResolvedValue(createdProduct);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdProduct);
      expect(productsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate validation errors', async () => {
      const error = new Error('SKU already exists');
      productsService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    const updateDto: UpdateProductDto = {
      name: 'Updated Product',
      salePrice: 89.99,
    };

    it('should update and return the product', async () => {
      const updatedProduct = { ...mockProduct, ...updateDto };
      productsService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update('product-123', updateDto);

      expect(result).toEqual(updatedProduct);
      expect(productsService.update).toHaveBeenCalledWith(
        'product-123',
        updateDto,
      );
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Product not found');
      productsService.update.mockRejectedValue(error);

      await expect(controller.update('invalid-id', updateDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('delete', () => {
    it('should delete a product', async () => {
      productsService.delete.mockResolvedValue(undefined);

      await controller.delete('product-123');

      expect(productsService.delete).toHaveBeenCalledWith('product-123');
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Product not found');
      productsService.delete.mockRejectedValue(error);

      await expect(controller.delete('invalid-id')).rejects.toThrow(error);
    });

    it('should propagate conflict errors when product has invoice items', async () => {
      const error = new Error(
        'Cannot delete product with associated invoice items',
      );
      productsService.delete.mockRejectedValue(error);

      await expect(controller.delete('product-123')).rejects.toThrow(error);
    });
  });

  describe('updateStock', () => {
    const stockDto: UpdateStockDto = {
      quantity: 50,
      adjustmentType: StockAdjustmentType.ADD,
      reason: 'Received new shipment',
    };

    it('should update stock and return the product', async () => {
      const updatedProduct = { ...mockProduct, stock: 150 };
      productsService.updateStock.mockResolvedValue(updatedProduct);

      const result = await controller.updateStock('product-123', stockDto);

      expect(result).toEqual(updatedProduct);
      expect(productsService.updateStock).toHaveBeenCalledWith(
        'product-123',
        stockDto,
      );
    });

    it('should handle stock removal', async () => {
      const removeStockDto: UpdateStockDto = {
        quantity: 20,
        adjustmentType: StockAdjustmentType.SUBTRACT,
        reason: 'Damaged items',
      };
      const updatedProduct = { ...mockProduct, stock: 80 };
      productsService.updateStock.mockResolvedValue(updatedProduct);

      const result = await controller.updateStock(
        'product-123',
        removeStockDto,
      );

      expect(result).toEqual(updatedProduct);
      expect(productsService.updateStock).toHaveBeenCalledWith(
        'product-123',
        removeStockDto,
      );
    });

    it('should propagate not found errors', async () => {
      const error = new Error('Product not found');
      productsService.updateStock.mockRejectedValue(error);

      await expect(
        controller.updateStock('invalid-id', stockDto),
      ).rejects.toThrow(error);
    });

    it('should propagate insufficient stock errors', async () => {
      const error = new Error('Insufficient stock');
      productsService.updateStock.mockRejectedValue(error);

      const removeStockDto: UpdateStockDto = {
        quantity: 1000,
        adjustmentType: StockAdjustmentType.SUBTRACT,
        reason: 'Oversold',
      };

      await expect(
        controller.updateStock('product-123', removeStockDto),
      ).rejects.toThrow(error);
    });
  });
});
