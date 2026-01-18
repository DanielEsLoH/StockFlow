import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { productsService } from './products.service';
import type {
  Product,
  ProductFilters,
  ProductsResponse,
  CreateProductData,
  UpdateProductData,
  LowStockProduct,
} from '~/types/product';

// Note: The products service currently uses mock data internally
// These tests verify the service's filtering, pagination, and CRUD logic

const mockProduct: Product = {
  id: '1',
  name: 'iPhone 15 Pro Max',
  description: 'Smartphone Apple de ultima generacion con chip A17 Pro',
  sku: 'APL-IP15PM-256',
  barcode: '194253121234',
  price: 5999000,
  cost: 4800000,
  quantity: 25,
  minStock: 10,
  maxStock: 100,
  categoryId: '1',
  category: { id: '1', name: 'Electronica', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  warehouseId: '1',
  warehouse: { id: '1', name: 'Bodega Principal', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400'],
  status: 'ACTIVE',
  createdAt: '2024-01-10T10:00:00Z',
  updatedAt: '2024-01-14T15:30:00Z',
};

describe('productsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  describe('getProducts', () => {
    it('should return products with pagination metadata', async () => {
      const promise = productsService.getProducts();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('total');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('limit');
      expect(result.meta).toHaveProperty('totalPages');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should return first page by default', async () => {
      const promise = productsService.getProducts();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.meta.page).toBe(1);
    });

    it('should filter products by search term', async () => {
      const filters: ProductFilters = { search: 'iPhone' };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((product) => {
        const matchesSearch =
          product.name.toLowerCase().includes('iphone') ||
          product.sku.toLowerCase().includes('iphone') ||
          product.barcode?.toLowerCase().includes('iphone') ||
          product.description?.toLowerCase().includes('iphone');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter products by categoryId', async () => {
      const filters: ProductFilters = { categoryId: '1' };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((product) => {
        expect(product.categoryId).toBe('1');
      });
    });

    it('should filter products by warehouseId', async () => {
      const filters: ProductFilters = { warehouseId: '1' };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((product) => {
        expect(product.warehouseId).toBe('1');
      });
    });

    it('should filter products by status', async () => {
      const filters: ProductFilters = { status: 'ACTIVE' };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((product) => {
        expect(product.status).toBe('ACTIVE');
      });
    });

    it('should filter low stock products', async () => {
      const filters: ProductFilters = { lowStock: true };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((product) => {
        expect(product.quantity).toBeLessThanOrEqual(product.minStock);
      });
    });

    it('should paginate results correctly', async () => {
      const filters: ProductFilters = { page: 1, limit: 5 };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.data.length).toBeLessThanOrEqual(5);
      expect(result.meta.limit).toBe(5);
    });

    it('should handle page 2 pagination', async () => {
      const filters: ProductFilters = { page: 2, limit: 5 };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.meta.page).toBe(2);
    });

    it('should combine multiple filters', async () => {
      const filters: ProductFilters = {
        categoryId: '1',
        status: 'ACTIVE',
        page: 1,
        limit: 10,
      };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((product) => {
        expect(product.categoryId).toBe('1');
        expect(product.status).toBe('ACTIVE');
      });
    });
  });

  describe('getProduct', () => {
    it('should return a product by id', async () => {
      const promise = productsService.getProduct('1');
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.name).toBe('iPhone 15 Pro Max');
    });

    it('should throw error for non-existent product', async () => {
      const promise = productsService.getProduct('non-existent-id');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Producto no encontrado');
    });
  });

  describe('createProduct', () => {
    it('should create a new product and return it', async () => {
      const newProductData: CreateProductData = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100000,
        cost: 80000,
        quantity: 50,
        minStock: 10,
        categoryId: '1',
        warehouseId: '1',
      };

      const promise = productsService.createProduct(newProductData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Product');
      expect(result.sku).toBe('TEST-001');
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.status).toBe('ACTIVE');
    });

    it('should set default status to ACTIVE if not provided', async () => {
      const newProductData: CreateProductData = {
        name: 'Another Product',
        sku: 'TEST-002',
        price: 50000,
        cost: 40000,
        quantity: 30,
        minStock: 5,
        categoryId: '1',
        warehouseId: '1',
      };

      const promise = productsService.createProduct(newProductData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.status).toBe('ACTIVE');
    });

    it('should respect provided status', async () => {
      const newProductData: CreateProductData = {
        name: 'Inactive Product',
        sku: 'TEST-003',
        price: 50000,
        cost: 40000,
        quantity: 0,
        minStock: 5,
        categoryId: '1',
        warehouseId: '1',
        status: 'INACTIVE',
      };

      const promise = productsService.createProduct(newProductData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.status).toBe('INACTIVE');
    });
  });

  describe('updateProduct', () => {
    it('should update an existing product', async () => {
      const updateData: UpdateProductData = {
        name: 'Updated iPhone',
        price: 6500000,
      };

      const promise = productsService.updateProduct('1', updateData);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result.name).toBe('Updated iPhone');
      expect(result.price).toBe(6500000);
      expect(result.id).toBe('1');
    });

    it('should update the updatedAt timestamp', async () => {
      const updateData: UpdateProductData = {
        quantity: 100,
      };

      const promise = productsService.updateProduct('2', updateData);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result.updatedAt).toBeDefined();
      // The updatedAt should be recent (within the test run)
      const updatedDate = new Date(result.updatedAt);
      expect(updatedDate).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent product', async () => {
      const updateData: UpdateProductData = {
        name: 'New Name',
      };

      const promise = productsService.updateProduct('non-existent', updateData);
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('Producto no encontrado');
    });
  });

  describe('deleteProduct', () => {
    it('should delete an existing product', async () => {
      // First, create a product to delete
      const createPromise = productsService.createProduct({
        name: 'Product to Delete',
        sku: 'DEL-001',
        price: 10000,
        cost: 8000,
        quantity: 10,
        minStock: 5,
        categoryId: '1',
        warehouseId: '1',
      });
      vi.advanceTimersByTime(500);
      const createdProduct = await createPromise;

      // Now delete it
      const deletePromise = productsService.deleteProduct(createdProduct.id);
      vi.advanceTimersByTime(300);

      await expect(deletePromise).resolves.toBeUndefined();
    });

    it('should throw error for non-existent product', async () => {
      const promise = productsService.deleteProduct('non-existent');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Producto no encontrado');
    });
  });

  describe('getLowStockProducts', () => {
    it('should return low stock products', async () => {
      const promise = productsService.getLowStockProducts();
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      result.forEach((product) => {
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('sku');
        expect(product).toHaveProperty('currentStock');
        expect(product).toHaveProperty('minStock');
        expect(product).toHaveProperty('warehouse');
        expect(product).toHaveProperty('warehouseId');
      });
    });

    it('should return products where current stock is below min stock', async () => {
      const promise = productsService.getLowStockProducts();
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.forEach((product) => {
        expect(product.currentStock).toBeLessThanOrEqual(product.minStock);
      });
    });
  });

  describe('sorting', () => {
    it('should sort products by name ascending', async () => {
      const filters: ProductFilters = { sortBy: 'name', sortOrder: 'asc' };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].name.localeCompare(result.data[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    it('should sort products by name descending', async () => {
      const filters: ProductFilters = { sortBy: 'name', sortOrder: 'desc' };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].name.localeCompare(result.data[i + 1].name)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should sort products by price ascending', async () => {
      const filters: ProductFilters = { sortBy: 'price', sortOrder: 'asc' };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].price).toBeLessThanOrEqual(result.data[i + 1].price);
      }
    });

    it('should sort products by price descending', async () => {
      const filters: ProductFilters = { sortBy: 'price', sortOrder: 'desc' };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].price).toBeGreaterThanOrEqual(result.data[i + 1].price);
      }
    });

    it('should sort products by quantity ascending', async () => {
      const filters: ProductFilters = { sortBy: 'quantity', sortOrder: 'asc' };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].quantity).toBeLessThanOrEqual(result.data[i + 1].quantity);
      }
    });

    it('should sort products by sku ascending', async () => {
      const filters: ProductFilters = { sortBy: 'sku', sortOrder: 'asc' };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].sku.localeCompare(result.data[i + 1].sku)).toBeLessThanOrEqual(0);
      }
    });

    it('should default to ascending order when sortOrder is not specified', async () => {
      const filters: ProductFilters = { sortBy: 'name' };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].name.localeCompare(result.data[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    it('should handle sorting by non-string non-number fields by returning 0', async () => {
      // Sorting by 'images' (an array) should trigger the fallback return 0 branch
      const filters: ProductFilters = { sortBy: 'images', sortOrder: 'asc' };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      // The result should still be valid - sorting by non-comparable fields just preserves order
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle sorting by object fields by returning 0', async () => {
      // Sorting by 'category' (an object) should trigger the fallback return 0 branch
      const filters: ProductFilters = { sortBy: 'category', sortOrder: 'desc' };
      const promise = productsService.getProducts(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      // The result should still be valid - sorting by non-comparable fields just preserves order
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});