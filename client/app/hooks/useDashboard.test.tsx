import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useDashboardStats,
  useDashboardCharts,
  useRecentInvoices,
  useLowStockAlerts,
  useRecentActivity,
  useDashboard,
} from "./useDashboard";
import { dashboardService } from "~/services/dashboard.service";
import type {
  DashboardStats,
  DashboardCharts,
  RecentInvoice,
  LowStockAlert,
  RecentActivity,
} from "~/services/dashboard.service";

// Mock the dashboard service
vi.mock("~/services/dashboard.service", () => ({
  dashboardService: {
    getStats: vi.fn(),
    getCharts: vi.fn(),
    getRecentInvoices: vi.fn(),
    getLowStockAlerts: vi.fn(),
    getRecentActivity: vi.fn(),
  },
}));

const mockStats: DashboardStats = {
  totalSales: 125750000,
  salesGrowth: 12.5,
  totalProducts: 1247,
  productsGrowth: 3.2,
  totalInvoices: 856,
  invoicesGrowth: 8.1,
  totalCustomers: 342,
  customersGrowth: 5.7,
  overdueInvoicesCount: 3,
};

const mockCharts: DashboardCharts = {
  salesChart: [
    { date: "2024-01-01", sales: 4500000, orders: 45, previousPeriod: 4200000 },
    { date: "2024-01-02", sales: 5200000, orders: 52, previousPeriod: 4800000 },
  ],
  categoryDistribution: [
    { name: "Electronica", value: 35, color: "#3B82F6" },
    { name: "Ropa", value: 25, color: "#10B981" },
  ],
  topProducts: [
    {
      id: "1",
      name: "iPhone 15 Pro",
      category: "Electronica",
      sales: 45000000,
      quantity: 150,
    },
  ],
};

const mockActivity: RecentActivity[] = [
  {
    id: "1",
    type: "sale",
    title: "Nueva venta",
    description: "Venta completada",
    timestamp: "2024-01-14T10:00:00Z",
  },
  {
    id: "2",
    type: "product",
    title: "Stock actualizado",
    description: "iPhone 15 Pro",
    timestamp: "2024-01-14T09:00:00Z",
  },
];

const mockInvoices: RecentInvoice[] = [
  {
    id: "1",
    number: "INV-001",
    customer: "Company A",
    amount: 4500000,
    status: "PAID",
    date: "2024-01-14",
  },
  {
    id: "2",
    number: "INV-002",
    customer: "Company B",
    amount: 2800000,
    status: "PENDING",
    date: "2024-01-14",
  },
];

const mockAlerts: LowStockAlert[] = [
  {
    id: "1",
    name: "Laptop HP",
    sku: "HP-001",
    currentStock: 5,
    minStock: 10,
    warehouse: "Main",
  },
  {
    id: "2",
    name: "Mouse Logitech",
    sku: "LOG-001",
    currentStock: 3,
    minStock: 8,
    warehouse: "Main",
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useDashboard hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("useDashboardStats", () => {
    it("should return loading state initially", () => {
      vi.mocked(dashboardService.getStats).mockReturnValue(
        new Promise(() => {}),
      );

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it("should return stats data on success", async () => {
      vi.mocked(dashboardService.getStats).mockResolvedValue(mockStats);

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(result.current.isError).toBe(false);
    });

    it("should return error state on failure", async () => {
      const error = new Error("Failed to fetch stats");
      vi.mocked(dashboardService.getStats).mockRejectedValue(error);

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(error);
    });

    it("should call dashboardService.getStats", async () => {
      vi.mocked(dashboardService.getStats).mockResolvedValue(mockStats);

      renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      expect(dashboardService.getStats).toHaveBeenCalled();
    });
  });

  describe("useDashboardCharts", () => {
    it("should return loading state initially", () => {
      vi.mocked(dashboardService.getCharts).mockReturnValue(
        new Promise(() => {}),
      );

      const { result } = renderHook(() => useDashboardCharts(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it("should return charts data on success", async () => {
      vi.mocked(dashboardService.getCharts).mockResolvedValue(mockCharts);

      const { result } = renderHook(() => useDashboardCharts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCharts);
    });

    it("should include salesChart, categoryDistribution, and topProducts", async () => {
      vi.mocked(dashboardService.getCharts).mockResolvedValue(mockCharts);

      const { result } = renderHook(() => useDashboardCharts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.salesChart).toBeDefined();
      expect(result.current.data?.categoryDistribution).toBeDefined();
      expect(result.current.data?.topProducts).toBeDefined();
    });
  });

  describe("useRecentInvoices", () => {
    it("should return invoices data on success", async () => {
      vi.mocked(dashboardService.getRecentInvoices).mockResolvedValue(
        mockInvoices,
      );

      const { result } = renderHook(() => useRecentInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockInvoices);
      expect(result.current.data?.length).toBe(2);
    });

    it("should call dashboardService.getRecentInvoices", async () => {
      vi.mocked(dashboardService.getRecentInvoices).mockResolvedValue(
        mockInvoices,
      );

      renderHook(() => useRecentInvoices(), {
        wrapper: createWrapper(),
      });

      expect(dashboardService.getRecentInvoices).toHaveBeenCalled();
    });
  });

  describe("useLowStockAlerts", () => {
    it("should return alerts data on success", async () => {
      vi.mocked(dashboardService.getLowStockAlerts).mockResolvedValue(
        mockAlerts,
      );

      const { result } = renderHook(() => useLowStockAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockAlerts);
      expect(result.current.data?.length).toBe(2);
    });

    it("should call dashboardService.getLowStockAlerts", async () => {
      vi.mocked(dashboardService.getLowStockAlerts).mockResolvedValue(
        mockAlerts,
      );

      renderHook(() => useLowStockAlerts(), {
        wrapper: createWrapper(),
      });

      expect(dashboardService.getLowStockAlerts).toHaveBeenCalled();
    });
  });

  describe("useRecentActivity", () => {
    it("should return activity data on success", async () => {
      vi.mocked(dashboardService.getRecentActivity).mockResolvedValue(
        mockActivity,
      );

      const { result } = renderHook(() => useRecentActivity(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockActivity);
      expect(result.current.data?.length).toBe(2);
    });

    it("should call dashboardService.getRecentActivity", async () => {
      vi.mocked(dashboardService.getRecentActivity).mockResolvedValue(
        mockActivity,
      );

      renderHook(() => useRecentActivity(), {
        wrapper: createWrapper(),
      });

      expect(dashboardService.getRecentActivity).toHaveBeenCalled();
    });
  });

  describe("useDashboard", () => {
    it("should return loading true when any query is loading", () => {
      vi.mocked(dashboardService.getStats).mockReturnValue(
        new Promise(() => {}),
      );
      vi.mocked(dashboardService.getCharts).mockResolvedValue(mockCharts);
      vi.mocked(dashboardService.getRecentInvoices).mockResolvedValue(
        mockInvoices,
      );
      vi.mocked(dashboardService.getLowStockAlerts).mockResolvedValue(
        mockAlerts,
      );
      vi.mocked(dashboardService.getRecentActivity).mockResolvedValue(
        mockActivity,
      );

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("should return all data when all queries succeed", async () => {
      vi.mocked(dashboardService.getStats).mockResolvedValue(mockStats);
      vi.mocked(dashboardService.getCharts).mockResolvedValue(mockCharts);
      vi.mocked(dashboardService.getRecentInvoices).mockResolvedValue(
        mockInvoices,
      );
      vi.mocked(dashboardService.getLowStockAlerts).mockResolvedValue(
        mockAlerts,
      );
      vi.mocked(dashboardService.getRecentActivity).mockResolvedValue(
        mockActivity,
      );

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.charts).toEqual(mockCharts);
      expect(result.current.recentInvoices).toEqual(mockInvoices);
      expect(result.current.lowStockAlerts).toEqual(mockAlerts);
      expect(result.current.recentActivity).toEqual(mockActivity);
      expect(result.current.isError).toBe(false);
    });

    it("should return isError true when any query fails", async () => {
      vi.mocked(dashboardService.getStats).mockRejectedValue(
        new Error("Stats error"),
      );
      vi.mocked(dashboardService.getCharts).mockResolvedValue(mockCharts);
      vi.mocked(dashboardService.getRecentInvoices).mockResolvedValue(
        mockInvoices,
      );
      vi.mocked(dashboardService.getLowStockAlerts).mockResolvedValue(
        mockAlerts,
      );
      vi.mocked(dashboardService.getRecentActivity).mockResolvedValue(
        mockActivity,
      );

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
    });

    it("should return first error from multiple failed queries", async () => {
      const statsError = new Error("Stats error");
      vi.mocked(dashboardService.getStats).mockRejectedValue(statsError);
      vi.mocked(dashboardService.getCharts).mockRejectedValue(
        new Error("Charts error"),
      );
      vi.mocked(dashboardService.getRecentInvoices).mockResolvedValue(
        mockInvoices,
      );
      vi.mocked(dashboardService.getLowStockAlerts).mockResolvedValue(
        mockAlerts,
      );
      vi.mocked(dashboardService.getRecentActivity).mockResolvedValue(
        mockActivity,
      );

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      // First error should be from stats (order in the hook)
      expect(result.current.error).toBe(statsError);
    });

    it("should provide a refetch function that calls all queries", async () => {
      vi.mocked(dashboardService.getStats).mockResolvedValue(mockStats);
      vi.mocked(dashboardService.getCharts).mockResolvedValue(mockCharts);
      vi.mocked(dashboardService.getRecentInvoices).mockResolvedValue(
        mockInvoices,
      );
      vi.mocked(dashboardService.getLowStockAlerts).mockResolvedValue(
        mockAlerts,
      );
      vi.mocked(dashboardService.getRecentActivity).mockResolvedValue(
        mockActivity,
      );

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mocks to count new calls
      vi.clearAllMocks();

      // Call refetch
      result.current.refetch();

      await waitFor(() => {
        expect(dashboardService.getStats).toHaveBeenCalled();
        expect(dashboardService.getCharts).toHaveBeenCalled();
        expect(dashboardService.getRecentInvoices).toHaveBeenCalled();
        expect(dashboardService.getLowStockAlerts).toHaveBeenCalled();
        expect(dashboardService.getRecentActivity).toHaveBeenCalled();
      });
    });

    it("should return undefined data for failed queries", async () => {
      vi.mocked(dashboardService.getStats).mockRejectedValue(
        new Error("Error"),
      );
      vi.mocked(dashboardService.getCharts).mockResolvedValue(mockCharts);
      vi.mocked(dashboardService.getRecentInvoices).mockResolvedValue(
        mockInvoices,
      );
      vi.mocked(dashboardService.getLowStockAlerts).mockResolvedValue(
        mockAlerts,
      );
      vi.mocked(dashboardService.getRecentActivity).mockResolvedValue(
        mockActivity,
      );

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toBeUndefined();
      expect(result.current.charts).toEqual(mockCharts);
      expect(result.current.recentInvoices).toEqual(mockInvoices);
      expect(result.current.lowStockAlerts).toEqual(mockAlerts);
      expect(result.current.recentActivity).toEqual(mockActivity);
    });
  });
});
