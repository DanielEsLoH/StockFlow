import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import {
  useCustomers,
  useCustomer,
  useCustomerStats,
  useCustomerCities,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "./useCustomers";
import { customersService } from "~/services/customers.service";
import { useAuthStore } from "~/stores/auth.store";
import type {
  Customer,
  CustomersResponse,
  CustomerStats,
} from "~/types/customer";

// Mock dependencies
vi.mock("~/services/customers.service", () => ({
  customersService: {
    getCustomers: vi.fn(),
    getCustomer: vi.fn(),
    getCustomerStats: vi.fn(),
    getCities: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
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
const mockCustomer: Customer = {
  id: "1",
  name: "Juan Carlos Perez",
  email: "jcperez@email.com",
  phone: "+57 300 123 4567",
  document: "1234567890",
  documentType: "CC",
  type: "INDIVIDUAL",
  address: "Calle 80 #45-12",
  city: "Bogota",
  notes: "Cliente frecuente, prefiere pago contra entrega",
  isActive: true,
  totalPurchases: 15,
  totalSpent: 2500000,
  lastPurchaseDate: "2024-01-10T14:30:00Z",
  createdAt: "2023-06-15T10:00:00Z",
  updatedAt: "2024-01-10T15:30:00Z",
};

const mockBusinessCustomer: Customer = {
  id: "2",
  name: "Distribuidora ABC S.A.S",
  email: "compras@distribuidoraabc.com",
  phone: "+57 1 234 5678",
  document: "900123456-7",
  documentType: "NIT",
  type: "BUSINESS",
  address: "Zona Industrial, Bodega 15",
  city: "Medellin",
  notes: "Compra al por mayor, credito a 30 dias",
  isActive: true,
  totalPurchases: 45,
  totalSpent: 85000000,
  lastPurchaseDate: "2024-01-09T11:20:00Z",
  createdAt: "2023-03-01T09:00:00Z",
  updatedAt: "2024-01-09T12:00:00Z",
};

const mockCustomersResponse: CustomersResponse = {
  data: [mockCustomer, mockBusinessCustomer],
  meta: {
    total: 2,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

const mockCustomerStats: CustomerStats = {
  totalInvoices: 15,
  totalSpent: 2500000,
  averageOrderValue: 166667,
  lastPurchaseDate: "2024-01-10T14:30:00Z",
};

const mockCities: string[] = ["Bogota", "Medellin", "Cali", "Barranquilla"];

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

describe("useCustomers hooks", () => {
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

  describe("useCustomers", () => {
    it("should fetch customers with no filters", async () => {
      vi.mocked(customersService.getCustomers).mockResolvedValue(
        mockCustomersResponse,
      );

      const { result } = renderHook(() => useCustomers(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(customersService.getCustomers).toHaveBeenCalledWith({});
      expect(result.current.data).toEqual(mockCustomersResponse);
    });

    it("should fetch customers with type filter", async () => {
      vi.mocked(customersService.getCustomers).mockResolvedValue(
        mockCustomersResponse,
      );

      const filters = { type: "BUSINESS" as const };
      const { result } = renderHook(() => useCustomers(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(customersService.getCustomers).toHaveBeenCalledWith(filters);
    });

    it("should fetch customers with city filter", async () => {
      vi.mocked(customersService.getCustomers).mockResolvedValue(
        mockCustomersResponse,
      );

      const filters = { city: "Bogota" };
      const { result } = renderHook(() => useCustomers(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(customersService.getCustomers).toHaveBeenCalledWith(filters);
    });

    it("should fetch customers with isActive filter", async () => {
      vi.mocked(customersService.getCustomers).mockResolvedValue(
        mockCustomersResponse,
      );

      const filters = { isActive: true };
      const { result } = renderHook(() => useCustomers(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(customersService.getCustomers).toHaveBeenCalledWith(filters);
    });

    it("should handle pagination filters", async () => {
      vi.mocked(customersService.getCustomers).mockResolvedValue(
        mockCustomersResponse,
      );

      const filters = { page: 2, limit: 20 };
      const { result } = renderHook(() => useCustomers(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(customersService.getCustomers).toHaveBeenCalledWith(filters);
    });

    it("should handle search filter", async () => {
      vi.mocked(customersService.getCustomers).mockResolvedValue(
        mockCustomersResponse,
      );

      const filters = { search: "Juan" };
      const { result } = renderHook(() => useCustomers(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(customersService.getCustomers).toHaveBeenCalledWith(filters);
    });

    it("should handle sorting filters", async () => {
      vi.mocked(customersService.getCustomers).mockResolvedValue(
        mockCustomersResponse,
      );

      const filters = { sortBy: "name", sortOrder: "desc" as const };
      const { result } = renderHook(() => useCustomers(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(customersService.getCustomers).toHaveBeenCalledWith(filters);
    });

    it("should handle multiple filters", async () => {
      vi.mocked(customersService.getCustomers).mockResolvedValue(
        mockCustomersResponse,
      );

      const filters = {
        type: "INDIVIDUAL" as const,
        city: "Bogota",
        isActive: true,
        page: 1,
        limit: 10,
      };
      const { result } = renderHook(() => useCustomers(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(customersService.getCustomers).toHaveBeenCalledWith(filters);
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch customers");
      vi.mocked(customersService.getCustomers).mockRejectedValue(error);

      const { result } = renderHook(() => useCustomers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe("useCustomer", () => {
    it("should fetch a single customer by id", async () => {
      vi.mocked(customersService.getCustomer).mockResolvedValue(mockCustomer);

      const { result } = renderHook(() => useCustomer("1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(customersService.getCustomer).toHaveBeenCalledWith("1");
      expect(result.current.data).toEqual(mockCustomer);
    });

    it("should not fetch if id is empty", async () => {
      const { result } = renderHook(() => useCustomer(""), {
        wrapper: createWrapper(),
      });

      // Should not be loading since query is disabled
      expect(result.current.isLoading).toBe(false);
      expect(customersService.getCustomer).not.toHaveBeenCalled();
    });

    it("should handle error state", async () => {
      const error = new Error("Customer not found");
      vi.mocked(customersService.getCustomer).mockRejectedValue(error);

      const { result } = renderHook(() => useCustomer("999"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useCustomerStats", () => {
    it("should fetch customer stats by id", async () => {
      vi.mocked(customersService.getCustomerStats).mockResolvedValue(
        mockCustomerStats,
      );

      const { result } = renderHook(() => useCustomerStats("1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(customersService.getCustomerStats).toHaveBeenCalledWith("1");
      expect(result.current.data).toEqual(mockCustomerStats);
    });

    it("should not fetch if id is empty", async () => {
      const { result } = renderHook(() => useCustomerStats(""), {
        wrapper: createWrapper(),
      });

      // Should not be loading since query is disabled
      expect(result.current.isLoading).toBe(false);
      expect(customersService.getCustomerStats).not.toHaveBeenCalled();
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch customer stats");
      vi.mocked(customersService.getCustomerStats).mockRejectedValue(error);

      const { result } = renderHook(() => useCustomerStats("1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useCustomerCities", () => {
    it("should fetch customer cities", async () => {
      vi.mocked(customersService.getCities).mockResolvedValue(mockCities);

      const { result } = renderHook(() => useCustomerCities(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(customersService.getCities).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockCities);
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch cities");
      vi.mocked(customersService.getCities).mockRejectedValue(error);

      const { result } = renderHook(() => useCustomerCities(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useCreateCustomer", () => {
    it("should create a customer and navigate to customers list", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(customersService.createCustomer).mockResolvedValue(
        mockCustomer,
      );

      const { result } = renderHook(() => useCreateCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "Juan Carlos Perez",
          email: "jcperez@email.com",
          phone: "+57 300 123 4567",
          document: "1234567890",
          documentType: "CC",
          type: "INDIVIDUAL",
          address: "Calle 80 #45-12",
          city: "Bogota",
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Cliente "${mockCustomer.name}" creado exitosamente`,
      );
      expect(mockNavigate).toHaveBeenCalledWith("/customers");
    });

    it("should create a business customer", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(customersService.createCustomer).mockResolvedValue(
        mockBusinessCustomer,
      );

      const { result } = renderHook(() => useCreateCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "Distribuidora ABC S.A.S",
          email: "compras@distribuidoraabc.com",
          phone: "+57 1 234 5678",
          document: "900123456-7",
          documentType: "NIT",
          type: "BUSINESS",
          address: "Zona Industrial, Bodega 15",
          city: "Medellin",
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Cliente "${mockBusinessCustomer.name}" creado exitosamente`,
      );
      expect(mockNavigate).toHaveBeenCalledWith("/customers");
    });

    it("should show error toast on failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error("Creation failed");
      vi.mocked(customersService.createCustomer).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "New Customer",
          email: "new@email.com",
          type: "INDIVIDUAL",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Creation failed");
    });

    it("should show default error message if error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(customersService.createCustomer).mockRejectedValue(
        new Error(""),
      );

      const { result } = renderHook(() => useCreateCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "New Customer",
          email: "new@email.com",
          type: "INDIVIDUAL",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Error al crear el cliente");
    });

    it("should show error for duplicate email", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error(
        "Ya existe un cliente con este correo electronico",
      );
      vi.mocked(customersService.createCustomer).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "New Customer",
          email: "existing@email.com",
          type: "INDIVIDUAL",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Ya existe un cliente con este correo electronico",
      );
    });
  });

  describe("useUpdateCustomer", () => {
    it("should update a customer and navigate to customer detail", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const updatedCustomer = {
        ...mockCustomer,
        name: "Juan Carlos Perez Updated",
      };
      vi.mocked(customersService.updateCustomer).mockResolvedValue(
        updatedCustomer,
      );

      const { result } = renderHook(() => useUpdateCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { name: "Juan Carlos Perez Updated" },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Cliente "${updatedCustomer.name}" actualizado exitosamente`,
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        `/customers/${updatedCustomer.id}`,
      );
    });

    it("should update customer email", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const updatedCustomer = { ...mockCustomer, email: "newemail@email.com" };
      vi.mocked(customersService.updateCustomer).mockResolvedValue(
        updatedCustomer,
      );

      const { result } = renderHook(() => useUpdateCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { email: "newemail@email.com" },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Cliente "${updatedCustomer.name}" actualizado exitosamente`,
      );
    });

    it("should update customer active status", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const updatedCustomer = { ...mockCustomer, isActive: false };
      vi.mocked(customersService.updateCustomer).mockResolvedValue(
        updatedCustomer,
      );

      const { result } = renderHook(() => useUpdateCustomer(), {
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

      expect(toast.success).toHaveBeenCalledWith(
        `Cliente "${updatedCustomer.name}" actualizado exitosamente`,
      );
    });

    it("should show error toast on failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error("Update failed");
      vi.mocked(customersService.updateCustomer).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { name: "Updated Customer" },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Update failed");
    });

    it("should show default error message if error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(customersService.updateCustomer).mockRejectedValue(
        new Error(""),
      );

      const { result } = renderHook(() => useUpdateCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { name: "Updated Customer" },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al actualizar el cliente",
      );
    });

    it("should show error for customer not found", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error("Cliente no encontrado");
      vi.mocked(customersService.updateCustomer).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "999",
          data: { name: "Updated Customer" },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Cliente no encontrado");
    });
  });

  describe("useDeleteCustomer", () => {
    it("should delete a customer and navigate to customers list", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(customersService.deleteCustomer).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Cliente eliminado exitosamente",
      );
      expect(mockNavigate).toHaveBeenCalledWith("/customers");
    });

    it("should show error toast on failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error("Delete failed");
      vi.mocked(customersService.deleteCustomer).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteCustomer(), {
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
      vi.mocked(customersService.deleteCustomer).mockRejectedValue(
        new Error(""),
      );

      const { result } = renderHook(() => useDeleteCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Error al eliminar el cliente");
    });

    it("should show error when deleting customer with invoices", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error(
        "No se puede eliminar un cliente con facturas asociadas",
      );
      vi.mocked(customersService.deleteCustomer).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "No se puede eliminar un cliente con facturas asociadas",
      );
    });

    it("should show error for customer not found", async () => {
      const { toast } = await import("~/components/ui/Toast");
      const error = new Error("Cliente no encontrado");
      vi.mocked(customersService.deleteCustomer).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteCustomer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("999");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Cliente no encontrado");
    });
  });
});
