import { describe, it, expect, vi, beforeEach } from "vitest";
import { dashboardService } from "./dashboard.service";

// Mock the api module
vi.mock("~/lib/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from "~/lib/api";

describe("dashboardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStats", () => {
    const mockStats = {
      totalSales: 150000,
      salesGrowth: 12.5,
      totalProducts: 45,
      productsGrowth: 5.2,
      totalInvoices: 120,
      invoicesGrowth: 8.3,
      totalCustomers: 30,
      customersGrowth: 15.0,
      overdueInvoicesCount: 3,
      todaySales: 25000,
      todayInvoiceCount: 5,
    };

    it("should call GET /dashboard/stats without params when no days provided", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockStats });

      const result = await dashboardService.getStats();

      expect(api.get).toHaveBeenCalledWith("/dashboard/stats", {
        params: undefined,
      });
      expect(result).toEqual(mockStats);
    });

    it("should call GET /dashboard/stats with days param when provided", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockStats });

      const result = await dashboardService.getStats(30);

      expect(api.get).toHaveBeenCalledWith("/dashboard/stats", {
        params: { days: 30 },
      });
      expect(result).toEqual(mockStats);
    });

    it("should call GET /dashboard/stats with days=7", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockStats });

      await dashboardService.getStats(7);

      expect(api.get).toHaveBeenCalledWith("/dashboard/stats", {
        params: { days: 7 },
      });
    });

    it("should propagate API errors", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Network error"));

      await expect(dashboardService.getStats()).rejects.toThrow(
        "Network error",
      );
    });
  });

  describe("getCharts", () => {
    const mockCharts = {
      salesChart: [
        { date: "2024-01-01", sales: 5000, orders: 10, previousPeriod: 4500 },
      ],
      categoryDistribution: [
        { name: "Electrónica", value: 45, color: "#3b82f6" },
      ],
      topProducts: [
        {
          id: "prod-1",
          name: "Laptop",
          category: "Electrónica",
          sales: 50000,
          quantity: 10,
        },
      ],
    };

    it("should call GET /dashboard/charts without params when no days provided", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockCharts });

      const result = await dashboardService.getCharts();

      expect(api.get).toHaveBeenCalledWith("/dashboard/charts", {
        params: undefined,
      });
      expect(result).toEqual(mockCharts);
    });

    it("should call GET /dashboard/charts with days param when provided", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockCharts });

      const result = await dashboardService.getCharts(90);

      expect(api.get).toHaveBeenCalledWith("/dashboard/charts", {
        params: { days: 90 },
      });
      expect(result).toEqual(mockCharts);
    });

    it("should propagate API errors", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Server error"));

      await expect(dashboardService.getCharts()).rejects.toThrow(
        "Server error",
      );
    });
  });

  describe("getRecentInvoices", () => {
    const mockInvoices = [
      {
        id: "inv-1",
        number: "FAC-001",
        customer: "Juan Perez",
        amount: 150000,
        status: "PAID" as const,
        date: "2024-01-15",
      },
      {
        id: "inv-2",
        number: "FAC-002",
        customer: "Maria Lopez",
        amount: 85000,
        status: "PENDING" as const,
        date: "2024-01-16",
      },
    ];

    it("should call GET /dashboard/recent-invoices", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockInvoices });

      const result = await dashboardService.getRecentInvoices();

      expect(api.get).toHaveBeenCalledWith("/dashboard/recent-invoices");
      expect(result).toEqual(mockInvoices);
    });

    it("should return empty array when no invoices", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] });

      const result = await dashboardService.getRecentInvoices();

      expect(result).toEqual([]);
    });

    it("should propagate API errors", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Unauthorized"));

      await expect(dashboardService.getRecentInvoices()).rejects.toThrow(
        "Unauthorized",
      );
    });
  });

  describe("getLowStockAlerts", () => {
    const mockAlerts = [
      {
        id: "prod-1",
        name: "Widget A",
        sku: "WA-001",
        currentStock: 3,
        minStock: 10,
        warehouse: "Bodega Principal",
      },
    ];

    it("should call GET /dashboard/low-stock-alerts", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockAlerts });

      const result = await dashboardService.getLowStockAlerts();

      expect(api.get).toHaveBeenCalledWith("/dashboard/low-stock-alerts");
      expect(result).toEqual(mockAlerts);
    });

    it("should return empty array when no alerts", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] });

      const result = await dashboardService.getLowStockAlerts();

      expect(result).toEqual([]);
    });

    it("should propagate API errors", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Forbidden"));

      await expect(dashboardService.getLowStockAlerts()).rejects.toThrow(
        "Forbidden",
      );
    });
  });

  describe("getRecentActivity", () => {
    const mockActivity = [
      {
        id: "act-1",
        type: "sale" as const,
        title: "Nueva venta",
        description: "Venta de $50,000",
        timestamp: "2024-01-15T10:30:00Z",
      },
      {
        id: "act-2",
        type: "product" as const,
        title: "Producto actualizado",
        description: "Stock actualizado para Widget A",
        timestamp: "2024-01-15T09:00:00Z",
        metadata: { productId: "prod-1" },
      },
    ];

    it("should call GET /dashboard/recent-activity", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockActivity });

      const result = await dashboardService.getRecentActivity();

      expect(api.get).toHaveBeenCalledWith("/dashboard/recent-activity");
      expect(result).toEqual(mockActivity);
    });

    it("should return empty array when no activity", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] });

      const result = await dashboardService.getRecentActivity();

      expect(result).toEqual([]);
    });

    it("should propagate API errors", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Internal server error"));

      await expect(dashboardService.getRecentActivity()).rejects.toThrow(
        "Internal server error",
      );
    });
  });

  describe("getAll", () => {
    const mockStats = {
      totalSales: 150000,
      salesGrowth: 12.5,
      totalProducts: 45,
      productsGrowth: 5.2,
      totalInvoices: 120,
      invoicesGrowth: 8.3,
      totalCustomers: 30,
      customersGrowth: 15.0,
      overdueInvoicesCount: 3,
      todaySales: 25000,
      todayInvoiceCount: 5,
    };

    const mockCharts = {
      salesChart: [],
      categoryDistribution: [],
      topProducts: [],
    };

    const mockInvoices = [
      {
        id: "inv-1",
        number: "FAC-001",
        customer: "Test",
        amount: 100,
        status: "PAID" as const,
        date: "2024-01-01",
      },
    ];

    const mockAlerts = [
      {
        id: "prod-1",
        name: "Widget",
        sku: "W-1",
        currentStock: 2,
        minStock: 10,
        warehouse: "Bodega",
      },
    ];

    const mockActivity = [
      {
        id: "act-1",
        type: "sale" as const,
        title: "Venta",
        description: "Desc",
        timestamp: "2024-01-01T00:00:00Z",
      },
    ];

    it("should fetch all dashboard data in parallel", async () => {
      vi.mocked(api.get)
        .mockResolvedValueOnce({ data: mockStats })
        .mockResolvedValueOnce({ data: mockCharts })
        .mockResolvedValueOnce({ data: mockInvoices })
        .mockResolvedValueOnce({ data: mockAlerts })
        .mockResolvedValueOnce({ data: mockActivity });

      const result = await dashboardService.getAll();

      expect(api.get).toHaveBeenCalledTimes(5);
      expect(result).toEqual({
        stats: mockStats,
        charts: mockCharts,
        recentInvoices: mockInvoices,
        lowStockAlerts: mockAlerts,
        recentActivity: mockActivity,
      });
    });

    it("should call all individual methods", async () => {
      vi.mocked(api.get)
        .mockResolvedValueOnce({ data: mockStats })
        .mockResolvedValueOnce({ data: mockCharts })
        .mockResolvedValueOnce({ data: mockInvoices })
        .mockResolvedValueOnce({ data: mockAlerts })
        .mockResolvedValueOnce({ data: mockActivity });

      await dashboardService.getAll();

      expect(api.get).toHaveBeenCalledWith("/dashboard/stats", {
        params: undefined,
      });
      expect(api.get).toHaveBeenCalledWith("/dashboard/charts", {
        params: undefined,
      });
      expect(api.get).toHaveBeenCalledWith("/dashboard/recent-invoices");
      expect(api.get).toHaveBeenCalledWith("/dashboard/low-stock-alerts");
      expect(api.get).toHaveBeenCalledWith("/dashboard/recent-activity");
    });

    it("should reject if any sub-request fails", async () => {
      vi.mocked(api.get)
        .mockResolvedValueOnce({ data: mockStats })
        .mockRejectedValueOnce(new Error("Charts failed"))
        .mockResolvedValueOnce({ data: mockInvoices })
        .mockResolvedValueOnce({ data: mockAlerts })
        .mockResolvedValueOnce({ data: mockActivity });

      await expect(dashboardService.getAll()).rejects.toThrow("Charts failed");
    });
  });
});
