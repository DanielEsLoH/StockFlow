import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import {
  useCategoriesWithFilters,
  useCategories,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "./useCategories";
import { categoriesService } from "~/services/categories.service";
import type { Category, CategoriesResponse } from "~/types/category";

// Mock dependencies
vi.mock("~/services/categories.service", () => ({
  categoriesService: {
    getCategoriesWithFilters: vi.fn(),
    getCategories: vi.fn(),
    getCategory: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));

vi.mock("~/components/ui/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock data
const mockCategory: Category = {
  id: "1",
  name: "Electronica",
  description: "Dispositivos electronicos y tecnologia",
  productCount: 45,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockCategoryWithParent: Category = {
  id: "2",
  name: "Accesorios",
  description: "Accesorios para dispositivos electronicos",
  parentId: "1",
  productCount: 32,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockCategories: Category[] = [
  mockCategory,
  mockCategoryWithParent,
  {
    id: "3",
    name: "Ropa",
    description: "Prendas de vestir y moda",
    productCount: 78,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

const mockCategoriesResponse: CategoriesResponse = {
  data: mockCategories,
  meta: {
    total: 3,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

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

describe("useCategories hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("useCategoriesWithFilters", () => {
    it("should fetch categories with no filters", async () => {
      vi.mocked(categoriesService.getCategoriesWithFilters).mockResolvedValue(
        mockCategoriesResponse,
      );

      const { result } = renderHook(() => useCategoriesWithFilters(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(categoriesService.getCategoriesWithFilters).toHaveBeenCalledWith(
        {},
      );
      expect(result.current.data).toEqual(mockCategoriesResponse);
    });

    it("should fetch categories with search filter", async () => {
      vi.mocked(categoriesService.getCategoriesWithFilters).mockResolvedValue(
        mockCategoriesResponse,
      );

      const filters = { search: "Electronica" };
      const { result } = renderHook(() => useCategoriesWithFilters(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(categoriesService.getCategoriesWithFilters).toHaveBeenCalledWith(
        filters,
      );
    });

    it("should fetch categories with parentId filter", async () => {
      vi.mocked(categoriesService.getCategoriesWithFilters).mockResolvedValue(
        mockCategoriesResponse,
      );

      const filters = { parentId: "1" };
      const { result } = renderHook(() => useCategoriesWithFilters(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(categoriesService.getCategoriesWithFilters).toHaveBeenCalledWith(
        filters,
      );
    });

    it("should handle pagination filters", async () => {
      vi.mocked(categoriesService.getCategoriesWithFilters).mockResolvedValue(
        mockCategoriesResponse,
      );

      const filters = { page: 2, limit: 20 };
      const { result } = renderHook(() => useCategoriesWithFilters(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(categoriesService.getCategoriesWithFilters).toHaveBeenCalledWith(
        filters,
      );
    });

    it("should handle sorting filters", async () => {
      vi.mocked(categoriesService.getCategoriesWithFilters).mockResolvedValue(
        mockCategoriesResponse,
      );

      const filters = { sortBy: "name", sortOrder: "desc" as const };
      const { result } = renderHook(() => useCategoriesWithFilters(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(categoriesService.getCategoriesWithFilters).toHaveBeenCalledWith(
        filters,
      );
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch categories");
      vi.mocked(categoriesService.getCategoriesWithFilters).mockRejectedValue(
        error,
      );

      const { result } = renderHook(() => useCategoriesWithFilters(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe("useCategories", () => {
    it("should fetch all categories", async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategories,
      );

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(categoriesService.getCategories).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockCategories);
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch categories");
      vi.mocked(categoriesService.getCategories).mockRejectedValue(error);

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe("useCategory", () => {
    it("should fetch a single category by id", async () => {
      vi.mocked(categoriesService.getCategory).mockResolvedValue(mockCategory);

      const { result } = renderHook(() => useCategory("1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(categoriesService.getCategory).toHaveBeenCalledWith("1");
      expect(result.current.data).toEqual(mockCategory);
    });

    it("should not fetch if id is empty", async () => {
      const { result } = renderHook(() => useCategory(""), {
        wrapper: createWrapper(),
      });

      // Should not be loading since query is disabled
      expect(result.current.isLoading).toBe(false);
      expect(categoriesService.getCategory).not.toHaveBeenCalled();
    });

    it("should handle error state", async () => {
      const error = new Error("Category not found");
      vi.mocked(categoriesService.getCategory).mockRejectedValue(error);

      const { result } = renderHook(() => useCategory("999"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useCreateCategory", () => {
    it("should create a category and show success toast", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(categoriesService.createCategory).mockResolvedValue(
        mockCategory,
      );

      const { result } = renderHook(() => useCreateCategory(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "Electronica",
          description: "Dispositivos electronicos y tecnologia",
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Categoria "${mockCategory.name}" creada exitosamente`,
      );
    });

    it("should create a category with parentId", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(categoriesService.createCategory).mockResolvedValue(
        mockCategoryWithParent,
      );

      const { result } = renderHook(() => useCreateCategory(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "Accesorios",
          description: "Accesorios para dispositivos electronicos",
          parentId: "1",
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(categoriesService.createCategory).toHaveBeenCalledWith({
        name: "Accesorios",
        description: "Accesorios para dispositivos electronicos",
        parentId: "1",
      });
      expect(toast.success).toHaveBeenCalledWith(
        `Categoria "${mockCategoryWithParent.name}" creada exitosamente`,
      );
    });

    it("should show error toast on failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error("Creation failed");
      vi.mocked(categoriesService.createCategory).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateCategory(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "New Category",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Creation failed");
    });

    it("should show default error message if error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(categoriesService.createCategory).mockRejectedValue(
        new Error(""),
      );

      const { result } = renderHook(() => useCreateCategory(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "New Category",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Error al crear la categoria");
    });
  });

  describe("useUpdateCategory", () => {
    it("should update a category and show success toast", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const updatedCategory = {
        ...mockCategory,
        name: "Electronica Actualizada",
      };
      vi.mocked(categoriesService.updateCategory).mockResolvedValue(
        updatedCategory,
      );

      const { result } = renderHook(() => useUpdateCategory(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { name: "Electronica Actualizada" },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(categoriesService.updateCategory).toHaveBeenCalledWith("1", {
        name: "Electronica Actualizada",
      });
      expect(toast.success).toHaveBeenCalledWith(
        `Categoria "${updatedCategory.name}" actualizada exitosamente`,
      );
    });

    it("should update a category description", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const updatedCategory = {
        ...mockCategory,
        description: "Nueva descripcion",
      };
      vi.mocked(categoriesService.updateCategory).mockResolvedValue(
        updatedCategory,
      );

      const { result } = renderHook(() => useUpdateCategory(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { description: "Nueva descripcion" },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(categoriesService.updateCategory).toHaveBeenCalledWith("1", {
        description: "Nueva descripcion",
      });
      expect(toast.success).toHaveBeenCalledWith(
        `Categoria "${updatedCategory.name}" actualizada exitosamente`,
      );
    });

    it("should show error toast on failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error("Update failed");
      vi.mocked(categoriesService.updateCategory).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateCategory(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { name: "Updated Category" },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Update failed");
    });

    it("should show default error message if error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(categoriesService.updateCategory).mockRejectedValue(
        new Error(""),
      );

      const { result } = renderHook(() => useUpdateCategory(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { name: "Updated Category" },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al actualizar la categoria",
      );
    });
  });

  describe("useDeleteCategory", () => {
    it("should delete a category and show success toast", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(categoriesService.deleteCategory).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteCategory(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(categoriesService.deleteCategory).toHaveBeenCalledWith("1");
      expect(toast.success).toHaveBeenCalledWith(
        "Categoria eliminada exitosamente",
      );
    });

    it("should show error toast on failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error("Delete failed");
      vi.mocked(categoriesService.deleteCategory).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteCategory(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Delete failed");
    });

    it("should show default error message if error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(categoriesService.deleteCategory).mockRejectedValue(
        new Error(""),
      );

      const { result } = renderHook(() => useDeleteCategory(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al eliminar la categoria",
      );
    });
  });
});
