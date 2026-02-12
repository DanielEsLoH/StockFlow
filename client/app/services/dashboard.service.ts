import { api } from "~/lib/api";

// Types
export interface DashboardStats {
  totalSales: number;
  salesGrowth: number;
  totalProducts: number;
  productsGrowth: number;
  totalInvoices: number;
  invoicesGrowth: number;
  totalCustomers: number;
  customersGrowth: number;
  overdueInvoicesCount: number;
  todaySales: number;
  todayInvoiceCount: number;
}

export interface SalesChartData {
  date: string;
  sales: number;
  orders: number;
  previousPeriod: number;
}

export interface CategoryDistribution {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

export interface TopProduct {
  id: string;
  name: string;
  category: string;
  sales: number;
  quantity: number;
}

export interface RecentInvoice {
  id: string;
  number: string;
  customer: string;
  amount: number;
  status: "PAID" | "PENDING" | "OVERDUE" | "CANCELLED";
  date: string;
}

export interface LowStockAlert {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
  warehouse: string;
}

export type ActivityType =
  | "sale"
  | "product"
  | "customer"
  | "invoice"
  | "stock";

export interface RecentActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardCharts {
  salesChart: SalesChartData[];
  categoryDistribution: CategoryDistribution[];
  topProducts: TopProduct[];
}

export interface DashboardData {
  stats: DashboardStats;
  charts: DashboardCharts;
  recentInvoices: RecentInvoice[];
  lowStockAlerts: LowStockAlert[];
  recentActivity: RecentActivity[];
}

// Service - Real API calls
export const dashboardService = {
  async getStats(days?: number): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>("/dashboard/stats", {
      params: days ? { days } : undefined,
    });
    return data;
  },

  async getCharts(days?: number): Promise<DashboardCharts> {
    const { data } = await api.get<DashboardCharts>("/dashboard/charts", {
      params: days ? { days } : undefined,
    });
    return data;
  },

  async getRecentInvoices(): Promise<RecentInvoice[]> {
    const { data } = await api.get<RecentInvoice[]>(
      "/dashboard/recent-invoices",
    );
    return data;
  },

  async getLowStockAlerts(): Promise<LowStockAlert[]> {
    const { data } = await api.get<LowStockAlert[]>(
      "/dashboard/low-stock-alerts",
    );
    return data;
  },

  async getRecentActivity(): Promise<RecentActivity[]> {
    const { data } = await api.get<RecentActivity[]>(
      "/dashboard/recent-activity",
    );
    return data;
  },

  async getAll(): Promise<DashboardData> {
    const [stats, charts, recentInvoices, lowStockAlerts, recentActivity] =
      await Promise.all([
        this.getStats(),
        this.getCharts(),
        this.getRecentInvoices(),
        this.getLowStockAlerts(),
        this.getRecentActivity(),
      ]);

    return { stats, charts, recentInvoices, lowStockAlerts, recentActivity };
  },
};
