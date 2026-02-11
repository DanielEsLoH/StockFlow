import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import {
  useWarehousesWithFilters,
  useWarehouses,
  useAllWarehouses,
  useWarehouse,
  useWarehouseStats,
  useWarehouseCities,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
} from "./useWarehouses";
import { warehousesService } from "~/services/warehouses.service";
import { useAuthStore } from "~/stores/auth.store";
import type {
  Warehouse,
  WarehousesResponse,
  WarehouseStats,
} from "~/types/warehouse";

// Mock dependencies
vi.mock("~/services/warehouses.service", () => ({
  warehousesService: {
    getWarehousesWithFilters: vi.fn(),
    getWarehouses: vi.fn(),
    getAllWarehouses: vi.fn(),
    getWarehouse: vi.fn(),
    getWarehouseStats: vi.fn(),
    getCities: vi.fn(),
    createWarehouse: vi.fn(),
    updateWarehouse: vi.fn(),
    deleteWarehouse: vi.fn(),
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

vi.mock("~/stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

// Mock data
const mockWarehouse: Warehouse = {
  id: "1",
  name: "Bodega Principal",
  address: "Calle 100 #45-67",
  city: "Bogota",
  phone: "+57 1 234 5678",
  email: "principal@stockflow.com",
  manager: "Carlos Rodriguez",
  capacity: 10000,
  currentOccupancy: 7500,
  isActive: true,
  productCount: 156,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockWarehouses: Warehouse[] = [
  mockWarehouse,
  {
    id: "2",
    name: "Bodega Sur",
    address: "Carrera 50 #12-34",
    city: "Cali",
    phone: "+57 2 345 6789",
    email: "sur@stockflow.com",
    manager: "Maria Lopez",
    capacity: 5000,
    currentOccupancy: 3200,
    isActive: true,
    productCount: 89,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    name: "Almacen Costa",
    address: "Calle 72 #54-21",
    city: "Barranquilla",
    isActive: false,
    productCount: 0,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

const mockWarehousesResponse: WarehousesResponse = {
  data: mockWarehouses,
  meta: {
    total: 3,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

const mockWarehouseStats: WarehouseStats = {
  totalProducts: 156,
  lowStockProducts: 5,
  totalValue: 500000,
  utilizationPercentage: 75,
};

const mockCities: string[] = ["Bogota", "Cali", "Barranquilla", "Medellin"];

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

describe("useWarehouses hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockImplementation((selector) => {
      const state = {
        isAuthenticated: true,
        isInitialized: true,
        user: null,
        tenant: null,
        isLoading: false,
        userPermissions: [],
        setUser: vi.fn(),
        setTenant: vi.fn(),
        setUserPermissions: vi.fn(),
        setLoading: vi.fn(),
        setInitialized: vi.fn(),
        logout: vi.fn(),
      };
      return selector(state as never);
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("useWarehousesWithFilters", () => {
    it("should fetch warehouses with no filters", async () => {
      vi.mocked(warehousesService.getWarehousesWithFilters).mockResolvedValue(
        mockWarehousesResponse,
      );

      const { result } = renderHook(() => useWarehousesWithFilters(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(warehousesService.getWarehousesWithFilters).toHaveBeenCalledWith(
        {},
      );
      expect(result.current.data).toEqual(mockWarehousesResponse);
    });

    it("should fetch warehouses with search filter", async () => {
      vi.mocked(warehousesService.getWarehousesWithFilters).mockResolvedValue(
        mockWarehousesResponse,
      );

      const filters = { search: "Bodega" };
      const { result } = renderHook(() => useWarehousesWithFilters(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(warehousesService.getWarehousesWithFilters).toHaveBeenCalledWith(
        filters,
      );
    });

    it("should fetch warehouses with city filter", async () => {
      vi.mocked(warehousesService.getWarehousesWithFilters).mockResolvedValue(
        mockWarehousesResponse,
      );

      const filters = { city: "Bogota" };
      const { result } = renderHook(() => useWarehousesWithFilters(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(warehousesService.getWarehousesWithFilters).toHaveBeenCalledWith(
        filters,
      );
    });

    it("should fetch warehouses with isActive filter", async () => {
      vi.mocked(warehousesService.getWarehousesWithFilters).mockResolvedValue(
        mockWarehousesResponse,
      );

      const filters = { isActive: true };
      const { result } = renderHook(() => useWarehousesWithFilters(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(warehousesService.getWarehousesWithFilters).toHaveBeenCalledWith(
        filters,
      );
    });

    it("should handle pagination filters", async () => {
      vi.mocked(warehousesService.getWarehousesWithFilters).mockResolvedValue(
        mockWarehousesResponse,
      );

      const filters = { page: 2, limit: 20 };
      const { result } = renderHook(() => useWarehousesWithFilters(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(warehousesService.getWarehousesWithFilters).toHaveBeenCalledWith(
        filters,
      );
    });

    it("should handle sorting filters", async () => {
      vi.mocked(warehousesService.getWarehousesWithFilters).mockResolvedValue(
        mockWarehousesResponse,
      );

      const filters = { sortBy: "name", sortOrder: "desc" as const };
      const { result } = renderHook(() => useWarehousesWithFilters(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(warehousesService.getWarehousesWithFilters).toHaveBeenCalledWith(
        filters,
      );
    });

    it("should handle combined filters", async () => {
      vi.mocked(warehousesService.getWarehousesWithFilters).mockResolvedValue(
        mockWarehousesResponse,
      );

      const filters = {
        search: "Bodega",
        city: "Bogota",
        isActive: true,
        page: 1,
        limit: 10,
      };
      const { result } = renderHook(() => useWarehousesWithFilters(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(warehousesService.getWarehousesWithFilters).toHaveBeenCalledWith(
        filters,
      );
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch warehouses");
      vi.mocked(warehousesService.getWarehousesWithFilters).mockRejectedValue(
        error,
      );

      const { result } = renderHook(() => useWarehousesWithFilters(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe("useWarehouses", () => {
    it("should fetch active warehouses", async () => {
      const activeWarehouses = mockWarehouses.filter((w) => w.isActive);
      vi.mocked(warehousesService.getWarehouses).mockResolvedValue(
        activeWarehouses,
      );

      const { result } = renderHook(() => useWarehouses(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(warehousesService.getWarehouses).toHaveBeenCalled();
      expect(result.current.data).toEqual(activeWarehouses);
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch warehouses");
      vi.mocked(warehousesService.getWarehouses).mockRejectedValue(error);

      const { result } = renderHook(() => useWarehouses(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe("useAllWarehouses", () => {
    it("should fetch all warehouses including inactive", async () => {
      vi.mocked(warehousesService.getAllWarehouses).mockResolvedValue(
        mockWarehouses,
      );

      const { result } = renderHook(() => useAllWarehouses(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(warehousesService.getAllWarehouses).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockWarehouses);
      expect(result.current.data?.some((w) => !w.isActive)).toBe(true);
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch all warehouses");
      vi.mocked(warehousesService.getAllWarehouses).mockRejectedValue(error);

      const { result } = renderHook(() => useAllWarehouses(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe("useWarehouse", () => {
    it("should fetch a single warehouse by id", async () => {
      vi.mocked(warehousesService.getWarehouse).mockResolvedValue(
        mockWarehouse,
      );

      const { result } = renderHook(() => useWarehouse("1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(warehousesService.getWarehouse).toHaveBeenCalledWith("1");
      expect(result.current.data).toEqual(mockWarehouse);
    });

    it("should not fetch if id is empty", async () => {
      const { result } = renderHook(() => useWarehouse(""), {
        wrapper: createWrapper(),
      });

      // Should not be loading since query is disabled
      expect(result.current.isLoading).toBe(false);
      expect(warehousesService.getWarehouse).not.toHaveBeenCalled();
    });

    it("should handle error state", async () => {
      const error = new Error("Bodega no encontrada");
      vi.mocked(warehousesService.getWarehouse).mockRejectedValue(error);

      const { result } = renderHook(() => useWarehouse("999"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useWarehouseStats", () => {
    it("should fetch warehouse stats by id", async () => {
      vi.mocked(warehousesService.getWarehouseStats).mockResolvedValue(
        mockWarehouseStats,
      );

      const { result } = renderHook(() => useWarehouseStats("1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(warehousesService.getWarehouseStats).toHaveBeenCalledWith("1");
      expect(result.current.data).toEqual(mockWarehouseStats);
    });

    it("should not fetch if id is empty", async () => {
      const { result } = renderHook(() => useWarehouseStats(""), {
        wrapper: createWrapper(),
      });

      // Should not be loading since query is disabled
      expect(result.current.isLoading).toBe(false);
      expect(warehousesService.getWarehouseStats).not.toHaveBeenCalled();
    });

    it("should handle error state", async () => {
      const error = new Error("Bodega no encontrada");
      vi.mocked(warehousesService.getWarehouseStats).mockRejectedValue(error);

      const { result } = renderHook(() => useWarehouseStats("999"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useWarehouseCities", () => {
    it("should fetch unique cities", async () => {
      vi.mocked(warehousesService.getCities).mockResolvedValue(mockCities);

      const { result } = renderHook(() => useWarehouseCities(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(warehousesService.getCities).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockCities);
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch cities");
      vi.mocked(warehousesService.getCities).mockRejectedValue(error);

      const { result } = renderHook(() => useWarehouseCities(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useCreateWarehouse", () => {
    it("should create a warehouse and navigate to warehouses list", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(warehousesService.createWarehouse).mockResolvedValue(
        mockWarehouse,
      );

      const { result } = renderHook(() => useCreateWarehouse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "Nueva Bodega",
          address: "Calle 123 #45-67",
          city: "Bogota",
          phone: "+57 1 234 5678",
          email: "nueva@stockflow.com",
          manager: "Juan Perez",
          capacity: 5000,
          isActive: true,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Bodega "${mockWarehouse.name}" creada exitosamente`,
      );
      expect(mockNavigate).toHaveBeenCalledWith("/warehouses");
    });

    it("should show error toast on failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error("Creation failed");
      vi.mocked(warehousesService.createWarehouse).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateWarehouse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "Nueva Bodega",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Creation failed");
    });

    it("should show default error message if error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(warehousesService.createWarehouse).mockRejectedValue(
        new Error(""),
      );

      const { result } = renderHook(() => useCreateWarehouse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "Nueva Bodega",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Error al crear la bodega");
    });
  });

  describe("useUpdateWarehouse", () => {
    it("should update a warehouse and navigate to warehouse detail", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const updatedWarehouse = { ...mockWarehouse, name: "Bodega Actualizada" };
      vi.mocked(warehousesService.updateWarehouse).mockResolvedValue(
        updatedWarehouse,
      );

      const { result } = renderHook(() => useUpdateWarehouse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { name: "Bodega Actualizada" },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Bodega "${updatedWarehouse.name}" actualizada exitosamente`,
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        `/warehouses/${updatedWarehouse.id}`,
      );
    });

    it("should update warehouse address", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const updatedWarehouse = {
        ...mockWarehouse,
        address: "Nueva Direccion #100",
      };
      vi.mocked(warehousesService.updateWarehouse).mockResolvedValue(
        updatedWarehouse,
      );

      const { result } = renderHook(() => useUpdateWarehouse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { address: "Nueva Direccion #100" },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Bodega "${updatedWarehouse.name}" actualizada exitosamente`,
      );
    });

    it("should update warehouse isActive status", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const updatedWarehouse = { ...mockWarehouse, isActive: false };
      vi.mocked(warehousesService.updateWarehouse).mockResolvedValue(
        updatedWarehouse,
      );

      const { result } = renderHook(() => useUpdateWarehouse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { isActive: false },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalled();
    });

    it("should show error toast on failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error("Update failed");
      vi.mocked(warehousesService.updateWarehouse).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateWarehouse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { name: "Bodega Actualizada" },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Update failed");
    });

    it("should show default error message if error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(warehousesService.updateWarehouse).mockRejectedValue(
        new Error(""),
      );

      const { result } = renderHook(() => useUpdateWarehouse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { name: "Bodega Actualizada" },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Error al actualizar la bodega");
    });
  });

  describe("useDeleteWarehouse", () => {
    it("should delete a warehouse and navigate to warehouses list", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(warehousesService.deleteWarehouse).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteWarehouse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Bodega eliminada exitosamente",
      );
      expect(mockNavigate).toHaveBeenCalledWith("/warehouses");
    });

    it("should show error toast on failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error("Delete failed");
      vi.mocked(warehousesService.deleteWarehouse).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteWarehouse(), {
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

    it("should show error when trying to delete warehouse with products", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error("No se puede eliminar una bodega con productos");
      vi.mocked(warehousesService.deleteWarehouse).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteWarehouse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "No se puede eliminar una bodega con productos",
      );
    });

    it("should show default error message if error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(warehousesService.deleteWarehouse).mockRejectedValue(
        new Error(""),
      );

      const { result } = renderHook(() => useDeleteWarehouse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Error al eliminar la bodega");
    });
  });
});
