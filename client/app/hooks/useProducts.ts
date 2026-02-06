import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { productsService } from "~/services/products.service";
import { categoriesService } from "~/services/categories.service";
import { warehousesService } from "~/services/warehouses.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  Product,
  ProductFilters,
  ProductsResponse,
  CreateProductData,
  UpdateProductData,
  LowStockProduct,
  Category,
  Warehouse,
} from "~/types/product";

// Products list hook with filters
export function useProducts(filters: ProductFilters = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery<ProductsResponse>({
    queryKey: queryKeys.products.list(filters as Record<string, unknown>),
    queryFn: () => productsService.getProducts(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    enabled,
  });
}

// Single product hook
export function useProduct(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<Product>({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productsService.getProduct(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: enabled && !!id,
  });
}

// Create product mutation
export function useCreateProduct() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductData) =>
      productsService.createProduct(data),
    onSuccess: (product) => {
      // Invalidate products list
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success(`Producto "${product.name}" creado exitosamente`);
      navigate("/products");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear el producto");
    },
  });
}

// Update product mutation
export function useUpdateProduct() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductData }) =>
      productsService.updateProduct(id, data),
    onSuccess: (product) => {
      // Invalidate products list and specific product
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.setQueryData(queryKeys.products.detail(product.id), product);
      toast.success(`Producto "${product.name}" actualizado exitosamente`);
      navigate(`/products/${product.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar el producto");
    },
  });
}

// Delete product mutation
export function useDeleteProduct() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsService.deleteProduct(id),
    onSuccess: () => {
      // Invalidate products list
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success("Producto eliminado exitosamente");
      navigate("/products");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar el producto");
    },
  });
}

// Low stock products hook
export function useLowStockProducts() {
  const enabled = useIsQueryEnabled();
  return useQuery<LowStockProduct[]>({
    queryKey: queryKeys.products.lowStock(),
    queryFn: () => productsService.getLowStockProducts(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}

// Categories hook
export function useCategories() {
  const enabled = useIsQueryEnabled();
  return useQuery<Category[]>({
    queryKey: queryKeys.categories.list(),
    queryFn: () => categoriesService.getCategories(),
    staleTime: 1000 * 60 * 10, // 10 minutes - categories don't change often
    enabled,
  });
}

// Warehouses hook
export function useWarehouses() {
  const enabled = useIsQueryEnabled();
  return useQuery<Warehouse[]>({
    queryKey: queryKeys.warehouses.list(),
    queryFn: () => warehousesService.getWarehouses(),
    staleTime: 1000 * 60 * 10, // 10 minutes - warehouses don't change often
    enabled,
  });
}

// Combined hook for product form (categories + warehouses)
export function useProductFormData() {
  const categoriesQuery = useCategories();
  const warehousesQuery = useWarehouses();

  return {
    categories: categoriesQuery.data || [],
    warehouses: warehousesQuery.data || [],
    isLoading: categoriesQuery.isLoading || warehousesQuery.isLoading,
    isError: categoriesQuery.isError || warehousesQuery.isError,
    error: categoriesQuery.error || warehousesQuery.error,
  };
}
