import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesService } from "~/services/categories.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import type {
  Category,
  CategoryFilters,
  CategoriesResponse,
  CreateCategoryData,
  UpdateCategoryData,
} from "~/types/category";

// Categories list hook with filters (paginated)
export function useCategoriesWithFilters(filters: CategoryFilters = {}) {
  return useQuery<CategoriesResponse>({
    queryKey: queryKeys.categories.list(filters as Record<string, unknown>),
    queryFn: () => categoriesService.getCategoriesWithFilters(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (previousData) => previousData,
  });
}

// All categories hook (for dropdowns)
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: queryKeys.categories.all,
    queryFn: () => categoriesService.getCategories(),
    staleTime: 1000 * 60 * 10, // 10 minutes - categories don't change often
  });
}

// Single category hook
export function useCategory(id: string) {
  return useQuery<Category>({
    queryKey: queryKeys.categories.detail(id),
    queryFn: () => categoriesService.getCategory(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!id,
  });
}

// Create category mutation
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryData) =>
      categoriesService.createCategory(data),
    onSuccess: (category) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.categories.all,
      });
      toast.success(`Categoria "${category.name}" creada exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear la categoria");
    },
  });
}

// Update category mutation
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryData }) =>
      categoriesService.updateCategory(id, data),
    onSuccess: (category) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.categories.all,
      });
      queryClient.setQueryData(
        queryKeys.categories.detail(category.id),
        category,
      );
      toast.success(`Categoria "${category.name}" actualizada exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar la categoria");
    },
  });
}

// Delete category mutation
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => categoriesService.deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.categories.all,
      });
      toast.success("Categoria eliminada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar la categoria");
    },
  });
}
