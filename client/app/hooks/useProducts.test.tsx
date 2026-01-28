import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useLowStockProducts,
  useCategories,
  useWarehouses,
  useProductFormData,
} from './useProducts';
import { productsService } from '~/services/products.service';
import { categoriesService } from '~/services/categories.service';
import { warehousesService } from '~/services/warehouses.service';
import type {
  Product,
  ProductsResponse,
  LowStockProduct,
  Category,
  Warehouse,
} from '~/types/product';

// Mock dependencies
vi.mock('~/services/products.service', () => ({
  productsService: {
    getProducts: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    getLowStockProducts: vi.fn(),
  },
}));

vi.mock('~/services/categories.service', () => ({
  categoriesService: {
    getCategories: vi.fn(),
  },
}));

vi.mock('~/services/warehouses.service', () => ({
  warehousesService: {
    getWarehouses: vi.fn(),
  },
}));

vi.mock('~/components/ui/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock data
const mockProduct: Product = {
  id: '1',
  name: 'Test Product',
  description: 'A test product',
  sku: 'TEST-001',
  barcode: '123456789',
  salePrice: 100000,
  costPrice: 80000,
  taxRate: 19,
  stock: 50,
  minStock: 10,
  maxStock: 100,
  categoryId: '1',
  category: { id: '1', name: 'Electronics', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  brand: 'TestBrand',
  unit: 'UND',
  imageUrl: null,
  status: 'ACTIVE',
  tenantId: 'tenant-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockProductsResponse: ProductsResponse = {
  data: [mockProduct],
  meta: {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

const mockLowStockProducts: LowStockProduct[] = [
  {
    id: '1',
    name: 'Low Stock Product',
    sku: 'LOW-001',
    currentStock: 2,
    minStock: 10,
    warehouse: 'Main Warehouse',
    warehouseId: '1',
  },
];

const mockCategories: Category[] = [
  { id: '1', name: 'Electronics', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: '2', name: 'Accessories', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
];

const mockWarehouses: Warehouse[] = [
  { id: '1', name: 'Main Warehouse', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: '2', name: 'Secondary Warehouse', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('useProducts hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useProducts', () => {
    it('should fetch products with no filters', async () => {
      vi.mocked(productsService.getProducts).mockResolvedValue(mockProductsResponse);

      const { result } = renderHook(() => useProducts(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(productsService.getProducts).toHaveBeenCalledWith({});
      expect(result.current.data).toEqual(mockProductsResponse);
    });

    it('should fetch products with filters', async () => {
      vi.mocked(productsService.getProducts).mockResolvedValue(mockProductsResponse);

      const filters = { categoryId: '1', status: 'ACTIVE' as const };
      const { result } = renderHook(() => useProducts(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(productsService.getProducts).toHaveBeenCalledWith(filters);
    });

    it('should handle pagination filters', async () => {
      vi.mocked(productsService.getProducts).mockResolvedValue(mockProductsResponse);

      const filters = { page: 2, limit: 20 };
      const { result } = renderHook(() => useProducts(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(productsService.getProducts).toHaveBeenCalledWith(filters);
    });

    it('should handle search filter', async () => {
      vi.mocked(productsService.getProducts).mockResolvedValue(mockProductsResponse);

      const filters = { search: 'iPhone' };
      const { result } = renderHook(() => useProducts(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(productsService.getProducts).toHaveBeenCalledWith(filters);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch products');
      vi.mocked(productsService.getProducts).mockRejectedValue(error);

      const { result } = renderHook(() => useProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useProduct', () => {
    it('should fetch a single product by id', async () => {
      vi.mocked(productsService.getProduct).mockResolvedValue(mockProduct);

      const { result } = renderHook(() => useProduct('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(productsService.getProduct).toHaveBeenCalledWith('1');
      expect(result.current.data).toEqual(mockProduct);
    });

    it('should not fetch if id is empty', async () => {
      const { result } = renderHook(() => useProduct(''), {
        wrapper: createWrapper(),
      });

      // Should not be loading since query is disabled
      expect(result.current.isLoading).toBe(false);
      expect(productsService.getProduct).not.toHaveBeenCalled();
    });

    it('should handle error state', async () => {
      const error = new Error('Product not found');
      vi.mocked(productsService.getProduct).mockRejectedValue(error);

      const { result } = renderHook(() => useProduct('999'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useCreateProduct', () => {
    it('should create a product and navigate to products list', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(productsService.createProduct).mockResolvedValue(mockProduct);

      const { result } = renderHook(() => useCreateProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: 'New Product',
          sku: 'NEW-001',
          salePrice: 50000,
          costPrice: 40000,
          stock: 20,
          minStock: 5,
          categoryId: '1',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Producto "${mockProduct.name}" creado exitosamente`
      );
      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });

    it('should show error toast on failure', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Creation failed');
      vi.mocked(productsService.createProduct).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: 'New Product',
          sku: 'NEW-001',
          salePrice: 50000,
          costPrice: 40000,
          stock: 20,
          minStock: 5,
          categoryId: '1',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Creation failed');
    });

    it('should show default error message if error has no message', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(productsService.createProduct).mockRejectedValue(new Error(''));

      const { result } = renderHook(() => useCreateProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: 'New Product',
          sku: 'NEW-001',
          salePrice: 50000,
          costPrice: 40000,
          stock: 20,
          minStock: 5,
          categoryId: '1',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al crear el producto');
    });
  });

  describe('useUpdateProduct', () => {
    it('should update a product and navigate to product detail', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const updatedProduct = { ...mockProduct, name: 'Updated Product' };
      vi.mocked(productsService.updateProduct).mockResolvedValue(updatedProduct);

      const { result } = renderHook(() => useUpdateProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          data: { name: 'Updated Product' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Producto "${updatedProduct.name}" actualizado exitosamente`
      );
      expect(mockNavigate).toHaveBeenCalledWith(`/products/${updatedProduct.id}`);
    });

    it('should show error toast on failure', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Update failed');
      vi.mocked(productsService.updateProduct).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          data: { name: 'Updated Product' },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Update failed');
    });

    it('should show default error message if error has no message', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(productsService.updateProduct).mockRejectedValue(new Error(''));

      const { result } = renderHook(() => useUpdateProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          data: { name: 'Updated Product' },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al actualizar el producto');
    });
  });

  describe('useDeleteProduct', () => {
    it('should delete a product and navigate to products list', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(productsService.deleteProduct).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Producto eliminado exitosamente');
      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });

    it('should show error toast on failure', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Delete failed');
      vi.mocked(productsService.deleteProduct).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Delete failed');
    });

    it('should show default error message if error has no message', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(productsService.deleteProduct).mockRejectedValue(new Error(''));

      const { result } = renderHook(() => useDeleteProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al eliminar el producto');
    });
  });

  describe('useLowStockProducts', () => {
    it('should fetch low stock products', async () => {
      vi.mocked(productsService.getLowStockProducts).mockResolvedValue(mockLowStockProducts);

      const { result } = renderHook(() => useLowStockProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(productsService.getLowStockProducts).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockLowStockProducts);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch low stock products');
      vi.mocked(productsService.getLowStockProducts).mockRejectedValue(error);

      const { result } = renderHook(() => useLowStockProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useCategories', () => {
    it('should fetch categories', async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue(mockCategories);

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(categoriesService.getCategories).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockCategories);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch categories');
      vi.mocked(categoriesService.getCategories).mockRejectedValue(error);

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useWarehouses', () => {
    it('should fetch warehouses', async () => {
      vi.mocked(warehousesService.getWarehouses).mockResolvedValue(mockWarehouses);

      const { result } = renderHook(() => useWarehouses(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(warehousesService.getWarehouses).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockWarehouses);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch warehouses');
      vi.mocked(warehousesService.getWarehouses).mockRejectedValue(error);

      const { result } = renderHook(() => useWarehouses(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useProductFormData', () => {
    it('should return combined categories and warehouses', async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue(mockCategories);
      vi.mocked(warehousesService.getWarehouses).mockResolvedValue(mockWarehouses);

      const { result } = renderHook(() => useProductFormData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toEqual(mockCategories);
      expect(result.current.warehouses).toEqual(mockWarehouses);
    });

    it('should return empty arrays when data is not loaded', async () => {
      vi.mocked(categoriesService.getCategories).mockReturnValue(new Promise(() => {}));
      vi.mocked(warehousesService.getWarehouses).mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useProductFormData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.categories).toEqual([]);
      expect(result.current.warehouses).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it('should set isError when categories fail', async () => {
      vi.mocked(categoriesService.getCategories).mockRejectedValue(new Error('Failed'));
      vi.mocked(warehousesService.getWarehouses).mockResolvedValue(mockWarehouses);

      const { result } = renderHook(() => useProductFormData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should set isError when warehouses fail', async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue(mockCategories);
      vi.mocked(warehousesService.getWarehouses).mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useProductFormData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});