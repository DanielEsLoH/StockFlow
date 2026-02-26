import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  usePayments,
  usePayment,
  usePaymentsByInvoice,
  usePaymentsByCustomer,
  useRecentPayments,
  usePaymentStats,
  useCreatePayment,
  useCreatePaymentInline,
  useDeletePayment,
} from "./usePayments";
import { paymentsService } from "~/services/payments.service";
import { toast } from "~/components/ui/Toast";
import { queryKeys } from "~/lib/query-client";
import { useAuthStore } from "~/stores/auth.store";
import type {
  Payment,
  PaymentsResponse,
  PaymentFilters,
  CreatePaymentData,
  PaymentStats,
} from "~/types/payment";

// Mock dependencies
vi.mock("~/services/payments.service");
vi.mock("~/components/ui/Toast");
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));
vi.mock("~/stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

const mockNavigate = vi.fn();

// Mock data — matches backend PaymentResponse shape
const mockPayment: Payment = {
  id: "1",
  tenantId: "tenant-1",
  invoiceId: "inv-1",
  amount: 8446620,
  method: "BANK_TRANSFER",
  reference: "TRF-2024011814301234",
  notes: "Transferencia Bancolombia",
  paymentDate: "2024-01-15T10:00:00Z",
  createdAt: "2024-01-15T10:00:00Z",
  invoice: {
    id: "inv-1",
    invoiceNumber: "FAC-2024-0001",
    total: 8446620,
    paymentStatus: "PAID",
    customer: {
      id: "cust-1",
      name: "Juan Carlos Perez",
    },
  },
};

const mockPayment2: Payment = {
  id: "2",
  tenantId: "tenant-1",
  invoiceId: "inv-2",
  amount: 16169025,
  method: "CREDIT_CARD",
  reference: "CC-4532****8901",
  notes: "Pago parcial",
  paymentDate: "2024-01-16T10:00:00Z",
  createdAt: "2024-01-16T10:00:00Z",
  invoice: {
    id: "inv-2",
    invoiceNumber: "FAC-2024-0002",
    total: 20000000,
    paymentStatus: "PARTIALLY_PAID",
    customer: {
      id: "cust-2",
      name: "Distribuidora ABC S.A.S",
    },
  },
};

const mockPaymentsResponse: PaymentsResponse = {
  data: [mockPayment],
  meta: {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

const mockPaymentStats: PaymentStats = {
  totalPayments: 14,
  totalReceived: 50000000,
  totalPending: 0,
  totalRefunded: 0,
  totalProcessing: 0,
  averagePaymentValue: 5000000,
  paymentsByStatus: {
    UNPAID: 0,
    PARTIALLY_PAID: 0,
    PAID: 14,
  },
  paymentsByMethod: {
    CASH: 3,
    CREDIT_CARD: 4,
    DEBIT_CARD: 1,
    BANK_TRANSFER: 4,
    WIRE_TRANSFER: 1,
    CHECK: 1,
    PSE: 1,
    NEQUI: 0,
    DAVIPLATA: 0,
    OTHER: 0,
  },
  todayPayments: 3,
  todayTotal: 25000000,
  weekPayments: 10,
  weekTotal: 40000000,
};

// Helper to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

// Helper to create a wrapper with access to the queryClient
function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const wrapper = function Wrapper({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };

  return { wrapper, queryClient };
}

describe("usePayments hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

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

  // ============================================================================
  // QUERY HOOKS
  // ============================================================================

  describe("usePayments", () => {
    it("should fetch payments with default filters", async () => {
      vi.mocked(paymentsService.getPayments).mockResolvedValue(
        mockPaymentsResponse,
      );

      const { result } = renderHook(() => usePayments(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaymentsResponse);
      expect(paymentsService.getPayments).toHaveBeenCalledWith({});
    });

    it("should fetch payments with filters", async () => {
      const filters: PaymentFilters = {
        method: "BANK_TRANSFER",
        page: 1,
        limit: 10,
      };

      vi.mocked(paymentsService.getPayments).mockResolvedValue(
        mockPaymentsResponse,
      );

      const { result } = renderHook(() => usePayments(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(paymentsService.getPayments).toHaveBeenCalledWith(filters);
    });

    it("should return loading state initially", () => {
      vi.mocked(paymentsService.getPayments).mockImplementation(
        () => new Promise(() => {}),
      );

      const { result } = renderHook(() => usePayments(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it("should return error state on failure", async () => {
      const error = new Error("Failed to fetch payments");
      vi.mocked(paymentsService.getPayments).mockRejectedValue(error);

      const { result } = renderHook(() => usePayments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it("should filter by search term", async () => {
      const filters: PaymentFilters = { search: "Juan" };
      vi.mocked(paymentsService.getPayments).mockResolvedValue(
        mockPaymentsResponse,
      );

      const { result } = renderHook(() => usePayments(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(paymentsService.getPayments).toHaveBeenCalledWith(filters);
    });

    it("should filter by date range", async () => {
      const filters: PaymentFilters = {
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-01-31T23:59:59Z",
      };
      vi.mocked(paymentsService.getPayments).mockResolvedValue(
        mockPaymentsResponse,
      );

      const { result } = renderHook(() => usePayments(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(paymentsService.getPayments).toHaveBeenCalledWith(filters);
    });

    it("should filter by amount range", async () => {
      const filters: PaymentFilters = {
        minAmount: 1000000,
        maxAmount: 10000000,
      };
      vi.mocked(paymentsService.getPayments).mockResolvedValue(
        mockPaymentsResponse,
      );

      const { result } = renderHook(() => usePayments(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(paymentsService.getPayments).toHaveBeenCalledWith(filters);
    });
  });

  describe("usePayment", () => {
    it("should fetch a single payment by id", async () => {
      vi.mocked(paymentsService.getPayment).mockResolvedValue(mockPayment);

      const { result } = renderHook(() => usePayment("1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPayment);
      expect(paymentsService.getPayment).toHaveBeenCalledWith("1");
    });

    it("should not fetch when id is empty", () => {
      const { result } = renderHook(() => usePayment(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe("idle");
      expect(paymentsService.getPayment).not.toHaveBeenCalled();
    });

    it("should return error when payment not found", async () => {
      const error = new Error("Pago no encontrado");
      vi.mocked(paymentsService.getPayment).mockRejectedValue(error);

      const { result } = renderHook(() => usePayment("non-existent"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it("should return loading state initially", () => {
      vi.mocked(paymentsService.getPayment).mockImplementation(
        () => new Promise(() => {}),
      );

      const { result } = renderHook(() => usePayment("1"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("usePaymentsByInvoice", () => {
    it("should fetch payments for an invoice", async () => {
      const payments = [mockPayment, mockPayment2];
      vi.mocked(paymentsService.getPaymentsByInvoice).mockResolvedValue(
        payments,
      );

      const { result } = renderHook(() => usePaymentsByInvoice("inv-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(payments);
      expect(paymentsService.getPaymentsByInvoice).toHaveBeenCalledWith(
        "inv-1",
      );
    });

    it("should not fetch when invoiceId is empty", () => {
      const { result } = renderHook(() => usePaymentsByInvoice(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe("idle");
      expect(paymentsService.getPaymentsByInvoice).not.toHaveBeenCalled();
    });

    it("should return empty array for invoice with no payments", async () => {
      vi.mocked(paymentsService.getPaymentsByInvoice).mockResolvedValue([]);

      const { result } = renderHook(() => usePaymentsByInvoice("inv-empty"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it("should handle error state", async () => {
      const error = new Error("Error fetching payments");
      vi.mocked(paymentsService.getPaymentsByInvoice).mockRejectedValue(error);

      const { result } = renderHook(() => usePaymentsByInvoice("inv-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("usePaymentsByCustomer", () => {
    it("should fetch payments for a customer", async () => {
      const payments = [mockPayment];
      vi.mocked(paymentsService.getPaymentsByCustomer).mockResolvedValue(
        payments,
      );

      const { result } = renderHook(() => usePaymentsByCustomer("cust-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(payments);
      expect(paymentsService.getPaymentsByCustomer).toHaveBeenCalledWith(
        "cust-1",
      );
    });

    it("should not fetch when customerId is empty", () => {
      const { result } = renderHook(() => usePaymentsByCustomer(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe("idle");
      expect(paymentsService.getPaymentsByCustomer).not.toHaveBeenCalled();
    });

    it("should return empty array for customer with no payments", async () => {
      vi.mocked(paymentsService.getPaymentsByCustomer).mockResolvedValue([]);

      const { result } = renderHook(() => usePaymentsByCustomer("cust-empty"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it("should handle error state", async () => {
      const error = new Error("Error fetching customer payments");
      vi.mocked(paymentsService.getPaymentsByCustomer).mockRejectedValue(error);

      const { result } = renderHook(() => usePaymentsByCustomer("cust-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useRecentPayments", () => {
    it("should fetch recent payments with default limit", async () => {
      const recentPayments = [mockPayment, mockPayment2];
      vi.mocked(paymentsService.getRecentPayments).mockResolvedValue(
        recentPayments,
      );

      const { result } = renderHook(() => useRecentPayments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(recentPayments);
      expect(paymentsService.getRecentPayments).toHaveBeenCalledWith(5);
    });

    it("should fetch recent payments with custom limit", async () => {
      const recentPayments = [mockPayment];
      vi.mocked(paymentsService.getRecentPayments).mockResolvedValue(
        recentPayments,
      );

      const { result } = renderHook(() => useRecentPayments(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(paymentsService.getRecentPayments).toHaveBeenCalledWith(10);
    });

    it("should handle error state", async () => {
      const error = new Error("Error fetching recent payments");
      vi.mocked(paymentsService.getRecentPayments).mockRejectedValue(error);

      const { result } = renderHook(() => useRecentPayments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("usePaymentStats", () => {
    it("should fetch payment statistics", async () => {
      vi.mocked(paymentsService.getPaymentStats).mockResolvedValue(
        mockPaymentStats,
      );

      const { result } = renderHook(() => usePaymentStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaymentStats);
      expect(paymentsService.getPaymentStats).toHaveBeenCalled();
    });

    it("should return loading state initially", () => {
      vi.mocked(paymentsService.getPaymentStats).mockImplementation(
        () => new Promise(() => {}),
      );

      const { result } = renderHook(() => usePaymentStats(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("should handle error state", async () => {
      const error = new Error("Error fetching stats");
      vi.mocked(paymentsService.getPaymentStats).mockRejectedValue(error);

      const { result } = renderHook(() => usePaymentStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it("should return correct data structure", async () => {
      vi.mocked(paymentsService.getPaymentStats).mockResolvedValue(
        mockPaymentStats,
      );

      const { result } = renderHook(() => usePaymentStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveProperty("totalPayments");
      expect(result.current.data).toHaveProperty("totalReceived");
      expect(result.current.data).toHaveProperty("paymentsByMethod");
      expect(result.current.data).toHaveProperty("todayPayments");
      expect(result.current.data).toHaveProperty("weekPayments");
    });
  });

  // ============================================================================
  // MUTATION HOOKS
  // ============================================================================

  describe("useCreatePayment", () => {
    it("should create a payment successfully", async () => {
      const newPaymentData: CreatePaymentData = {
        invoiceId: "inv-1",
        amount: 5000000,
        method: "BANK_TRANSFER",
        paymentDate: "2024-01-20T10:00:00Z",
        reference: "TRF-123",
        notes: "Test payment",
      };

      const createdPayment: Payment = {
        ...mockPayment,
        ...newPaymentData,
        id: "new-id",
      };

      vi.mocked(paymentsService.createPayment).mockResolvedValue(
        createdPayment,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreatePayment(), { wrapper });

      await act(async () => {
        result.current.mutate(newPaymentData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(paymentsService.createPayment).toHaveBeenCalledWith(
        newPaymentData,
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Pago registrado exitosamente",
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        `/payments/${createdPayment.id}`,
      );
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it("should show error toast on creation failure", async () => {
      const error = new Error("Error al registrar el pago");
      vi.mocked(paymentsService.createPayment).mockRejectedValue(error);

      const { result } = renderHook(() => useCreatePayment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: "inv-1",
          amount: 5000000,
          method: "CASH",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Error al registrar el pago");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should invalidate all related queries on success", async () => {
      const createdPayment: Payment = {
        ...mockPayment,
        id: "new-id",
      };

      vi.mocked(paymentsService.createPayment).mockResolvedValue(
        createdPayment,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreatePayment(), { wrapper });

      await act(async () => {
        result.current.mutate({
          invoiceId: "inv-1",
          amount: 5000000,
          method: "CASH",
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });

    it("should navigate to payment detail on success", async () => {
      const createdPayment: Payment = {
        ...mockPayment,
        id: "created-123",
      };

      vi.mocked(paymentsService.createPayment).mockResolvedValue(
        createdPayment,
      );

      const { result } = renderHook(() => useCreatePayment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: "inv-1",
          amount: 5000000,
          method: "CASH",
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockNavigate).toHaveBeenCalledWith("/payments/created-123");
    });

    it("should use default error message when error has no message", async () => {
      vi.mocked(paymentsService.createPayment).mockRejectedValue(new Error());

      const { result } = renderHook(() => useCreatePayment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: "inv-1",
          amount: 5000000,
          method: "CASH",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Error al registrar el pago");
    });
  });

  describe("useCreatePaymentInline", () => {
    it("should create a payment inline without navigation", async () => {
      const newPaymentData: CreatePaymentData = {
        invoiceId: "inv-1",
        amount: 3000000,
        method: "CASH",
        paymentDate: "2024-01-20T10:00:00Z",
      };

      const createdPayment: Payment = {
        ...mockPayment,
        ...newPaymentData,
        id: "inline-id",
      };

      vi.mocked(paymentsService.createPayment).mockResolvedValue(
        createdPayment,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreatePaymentInline(), {
        wrapper,
      });

      await act(async () => {
        result.current.mutate(newPaymentData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(paymentsService.createPayment).toHaveBeenCalledWith(
        newPaymentData,
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Pago registrado exitosamente",
      );
      // Should NOT navigate (that's the difference from useCreatePayment)
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it("should invalidate all related queries on inline creation success", async () => {
      const createdPayment: Payment = {
        ...mockPayment,
        id: "inline-id",
        invoiceId: "inv-99",
      };

      vi.mocked(paymentsService.createPayment).mockResolvedValue(
        createdPayment,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreatePaymentInline(), {
        wrapper,
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: "inv-99",
          amount: 1000000,
          method: "CASH",
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.payments.all,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.payments.byInvoice("inv-99"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.invoices.detail("inv-99"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.invoices.all,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.payments.stats(),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.dashboard.all,
      });
    });

    it("should show error toast on inline creation failure", async () => {
      const error = new Error("Error al registrar el pago");
      vi.mocked(paymentsService.createPayment).mockRejectedValue(error);

      const { result } = renderHook(() => useCreatePaymentInline(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: "inv-1",
          amount: 5000000,
          method: "CASH",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Error al registrar el pago");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should use default error message when error has no message", async () => {
      vi.mocked(paymentsService.createPayment).mockRejectedValue(new Error());

      const { result } = renderHook(() => useCreatePaymentInline(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: "inv-1",
          amount: 5000000,
          method: "CASH",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Error al registrar el pago");
    });
  });

  describe("useDeletePayment", () => {
    it("should delete a payment successfully", async () => {
      vi.mocked(paymentsService.deletePayment).mockResolvedValue();

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(queryKeys.payments.detail("1"), mockPayment);

      const { result } = renderHook(() => useDeletePayment(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(paymentsService.deletePayment).toHaveBeenCalledWith("1");
      expect(toast.success).toHaveBeenCalledWith("Pago eliminado exitosamente");
      expect(mockNavigate).toHaveBeenCalledWith("/payments");
    });

    it("should invalidate related queries on delete", async () => {
      vi.mocked(paymentsService.deletePayment).mockResolvedValue();

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(queryKeys.payments.detail("1"), mockPayment);
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const removeSpy = vi.spyOn(queryClient, "removeQueries");

      const { result } = renderHook(() => useDeletePayment(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
    });

    it("should show error toast on delete failure", async () => {
      const error = new Error("Error al eliminar el pago");
      vi.mocked(paymentsService.deletePayment).mockRejectedValue(error);

      const { result } = renderHook(() => useDeletePayment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al eliminar el pago",
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should navigate to payments list on success", async () => {
      vi.mocked(paymentsService.deletePayment).mockResolvedValue();

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(queryKeys.payments.detail("1"), mockPayment);

      const { result } = renderHook(() => useDeletePayment(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockNavigate).toHaveBeenCalledWith("/payments");
    });

    it("should handle onSuccess when payment data exists with invoiceId", async () => {
      vi.mocked(paymentsService.deletePayment).mockResolvedValue();

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      queryClient.setQueryData(queryKeys.payments.detail("1"), {
        ...mockPayment,
        invoiceId: "inv-123",
      });

      const { result } = renderHook(() => useDeletePayment(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify invoice payments were invalidated
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.payments.byInvoice("inv-123"),
      });
      // Verify invoice detail was invalidated
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.invoices.detail("inv-123"),
      });
    });

    it("should handle onSuccess when payment data does NOT exist in cache", async () => {
      vi.mocked(paymentsService.deletePayment).mockResolvedValue();

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      // DO NOT set payment data in cache

      const { result } = renderHook(() => useDeletePayment(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should still invalidate general queries
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.payments.all,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.invoices.all,
      });
      expect(toast.success).toHaveBeenCalledWith("Pago eliminado exitosamente");
    });

    it("should use default error message when error has no message", async () => {
      vi.mocked(paymentsService.deletePayment).mockRejectedValue(new Error());

      const { result } = renderHook(() => useDeletePayment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Error al eliminar el pago");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge cases", () => {
    it("should handle empty search results", async () => {
      const emptyResponse: PaymentsResponse = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      vi.mocked(paymentsService.getPayments).mockResolvedValue(emptyResponse);

      const { result } = renderHook(
        () => usePayments({ search: "nonexistent" }),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data).toHaveLength(0);
      expect(result.current.data?.meta.total).toBe(0);
    });

    it("should handle network errors gracefully", async () => {
      const networkError = new Error("Network error");
      vi.mocked(paymentsService.getPayments).mockRejectedValue(networkError);

      const { result } = renderHook(() => usePayments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Network error");
    });
  });
});
