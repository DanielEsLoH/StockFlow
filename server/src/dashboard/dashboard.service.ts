import { Injectable, Logger } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache';

/**
 * Sales metrics for the dashboard
 */
export interface SalesMetrics {
  /** Total sales amount for today */
  today: number;
  /** Total sales amount for this week */
  thisWeek: number;
  /** Total sales amount for this month */
  thisMonth: number;
  /** Growth percentage comparing this month to last month */
  growth: number;
}

/**
 * Top selling product information
 */
export interface TopSellingProduct {
  /** Product ID */
  id: string;
  /** Product name */
  name: string;
  /** Product SKU */
  sku: string;
  /** Total quantity sold */
  quantitySold: number;
  /** Total revenue generated */
  revenue: number;
}

/**
 * Product metrics for the dashboard
 */
export interface ProductMetrics {
  /** Total number of products */
  total: number;
  /** Number of products with stock below minStock */
  lowStock: number;
  /** Number of products with stock equal to 0 */
  outOfStock: number;
  /** Top selling products */
  topSelling: TopSellingProduct[];
}

/**
 * Invoice metrics for the dashboard
 */
export interface InvoiceMetrics {
  /** Number of pending invoices */
  pending: number;
  /** Number of overdue invoices */
  overdue: number;
  /** Number of paid invoices (PAID payment status) */
  paid: number;
  /** Number of draft invoices */
  draft: number;
}

/**
 * Customer metrics for the dashboard
 */
export interface CustomerMetrics {
  /** Total number of customers */
  total: number;
  /** Number of new customers this month */
  newThisMonth: number;
}

/**
 * Daily sales data point
 */
export interface SalesByDay {
  /** Date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Total sales amount for the day */
  amount: number;
}

/**
 * Top product data for charts
 */
export interface TopProductChart {
  /** Product ID */
  id: string;
  /** Product name */
  name: string;
  /** Total quantity sold */
  quantity: number;
  /** Total revenue */
  revenue: number;
}

/**
 * Sales by category data
 */
export interface SalesByCategory {
  /** Category ID */
  categoryId: string | null;
  /** Category name */
  categoryName: string;
  /** Total sales amount */
  amount: number;
  /** Percentage of total sales */
  percentage: number;
}

// Frontend-facing interfaces

/**
 * Dashboard stats for frontend stats cards
 */
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

/**
 * Sales chart data point for frontend
 */
export interface SalesChartData {
  date: string;
  sales: number;
  orders: number;
  previousPeriod: number;
}

/**
 * Category distribution for frontend pie chart
 */
export interface CategoryDistribution {
  name: string;
  value: number;
  color: string;
}

/**
 * Top product for frontend charts
 */
export interface TopProduct {
  id: string;
  name: string;
  category: string;
  sales: number;
  quantity: number;
}

/**
 * Dashboard charts data for frontend
 */
export interface DashboardCharts {
  salesChart: SalesChartData[];
  categoryDistribution: CategoryDistribution[];
  topProducts: TopProduct[];
}

/**
 * Recent invoice for dashboard
 */
export interface RecentInvoice {
  id: string;
  number: string;
  customer: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  date: string;
}

/**
 * Low stock alert for dashboard
 */
export interface LowStockAlert {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
  warehouse: string;
}

/**
 * Activity type for recent activity
 */
export type ActivityType =
  | 'sale'
  | 'product'
  | 'customer'
  | 'invoice'
  | 'stock';

/**
 * Recent activity for dashboard
 */
export interface RecentActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
}

/**
 * Chart data for the dashboard
 */
export interface ChartData {
  /** Sales amounts for the last 7 days */
  salesByDay: SalesByDay[];
  /** Top products by quantity sold */
  topProducts: TopProductChart[];
  /** Sales aggregated by category */
  salesByCategory: SalesByCategory[];
}

/**
 * Complete dashboard response structure
 */
export interface DashboardResponse {
  /** Sales metrics */
  sales: SalesMetrics;
  /** Product metrics */
  products: ProductMetrics;
  /** Invoice metrics */
  invoices: InvoiceMetrics;
  /** Customer metrics */
  customers: CustomerMetrics;
  /** Chart data */
  charts: ChartData;
}

/**
 * DashboardService provides analytics and metrics for the tenant dashboard.
 *
 * Features:
 * - Sales metrics (today, week, month, growth)
 * - Product metrics (total, low stock, out of stock, top selling)
 * - Invoice metrics by status
 * - Customer metrics (total, new this month)
 * - Chart data (sales by day, top products, sales by category)
 *
 * All queries are scoped to the current tenant for multi-tenant isolation.
 * Cancelled invoices are excluded from all sales calculations.
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Gets all dashboard metrics for the current tenant.
   * Results are cached to improve performance.
   *
   * @returns Complete dashboard data with sales, products, invoices, customers, and charts
   */
  async getDashboard(): Promise<DashboardResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const cacheKey = this.cache.generateKey(CACHE_KEYS.DASHBOARD, tenantId);

    this.logger.debug(`Fetching dashboard metrics for tenant ${tenantId}`);

    // Try to get from cache first
    const cached = await this.cache.get<DashboardResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // Execute all metric queries in parallel for performance
    const [sales, products, invoices, customers, charts] = await Promise.all([
      this.getSalesMetrics(tenantId),
      this.getProductMetrics(tenantId),
      this.getInvoiceMetrics(tenantId),
      this.getCustomerMetrics(tenantId),
      this.getChartData(tenantId),
    ]);

    this.logger.log(`Dashboard metrics fetched for tenant ${tenantId}`);

    const response = {
      sales,
      products,
      invoices,
      customers,
      charts,
    };

    // Cache the result with shorter TTL since dashboard data changes frequently
    await this.cache.set(cacheKey, response, CACHE_TTL.DASHBOARD);

    return response;
  }

  /**
   * Calculates sales metrics for the tenant.
   * Excludes cancelled invoices from all calculations.
   */
  async getSalesMetrics(tenantId: string): Promise<SalesMetrics> {
    const now = new Date();

    // Calculate date boundaries
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Base where clause excluding cancelled invoices
    const baseWhere = {
      tenantId,
      status: {
        not: InvoiceStatus.CANCELLED,
      },
    };

    // Query all sales metrics in parallel
    const [todaySales, weekSales, monthSales, lastMonthSales] =
      await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            ...baseWhere,
            issueDate: { gte: startOfToday },
          },
          _sum: { total: true },
        }),
        this.prisma.invoice.aggregate({
          where: {
            ...baseWhere,
            issueDate: { gte: startOfWeek },
          },
          _sum: { total: true },
        }),
        this.prisma.invoice.aggregate({
          where: {
            ...baseWhere,
            issueDate: { gte: startOfMonth },
          },
          _sum: { total: true },
        }),
        this.prisma.invoice.aggregate({
          where: {
            ...baseWhere,
            issueDate: {
              gte: startOfLastMonth,
              lte: endOfLastMonth,
            },
          },
          _sum: { total: true },
        }),
      ]);

    const thisMonthTotal = Number(monthSales._sum.total ?? 0);
    const lastMonthTotal = Number(lastMonthSales._sum.total ?? 0);

    // Calculate growth percentage
    let growth = 0;
    if (lastMonthTotal > 0) {
      growth = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
    } else if (thisMonthTotal > 0) {
      growth = 100; // 100% growth if last month was 0 but this month has sales
    }

    return {
      today: Number(todaySales._sum.total ?? 0),
      thisWeek: Number(weekSales._sum.total ?? 0),
      thisMonth: thisMonthTotal,
      growth: Math.round(growth * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Calculates product metrics for the tenant.
   * Includes low stock and out of stock counts, plus top selling products.
   * Optimized to use SQL for low stock count instead of loading all products in memory.
   */
  async getProductMetrics(tenantId: string): Promise<ProductMetrics> {
    // Get all product counts in parallel, including low stock using raw SQL
    const [total, outOfStock, lowStockResult, topSelling] = await Promise.all([
      this.prisma.product.count({
        where: { tenantId },
      }),
      this.prisma.product.count({
        where: {
          tenantId,
          stock: 0,
        },
      }),
      // Use raw SQL to count low stock products where stock < minStock AND stock > 0
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count
        FROM products
        WHERE tenant_id = ${tenantId}
          AND stock > 0
          AND stock < min_stock
      `,
      this.getTopSellingProducts(tenantId),
    ]);

    return {
      total,
      lowStock: Number(lowStockResult[0]?.count ?? 0),
      outOfStock,
      topSelling,
    };
  }

  /**
   * Gets the top selling products by quantity sold.
   * Aggregates from invoice items, excluding cancelled invoices.
   */
  async getTopSellingProducts(
    tenantId: string,
    limit = 5,
  ): Promise<TopSellingProduct[]> {
    // Get invoice items grouped by product, excluding cancelled invoices
    const topProducts = await this.prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: {
        invoice: {
          tenantId,
          status: {
            not: InvoiceStatus.CANCELLED,
          },
        },
        productId: {
          not: null,
        },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    // Fetch product details for the top products
    const productIds = topProducts
      .map((p) => p.productId)
      .filter((id): id is string => id !== null);

    if (productIds.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        sku: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return topProducts
      .map((tp) => {
        const product = productMap.get(tp.productId!);
        if (!product) return null;

        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          quantitySold: tp._sum.quantity ?? 0,
          revenue: Number(tp._sum.total ?? 0),
        };
      })
      .filter((p): p is TopSellingProduct => p !== null);
  }

  /**
   * Calculates invoice metrics by status.
   */
  async getInvoiceMetrics(tenantId: string): Promise<InvoiceMetrics> {
    const [pending, overdue, paid, draft] = await Promise.all([
      this.prisma.invoice.count({
        where: {
          tenantId,
          status: InvoiceStatus.PENDING,
        },
      }),
      this.prisma.invoice.count({
        where: {
          tenantId,
          status: InvoiceStatus.OVERDUE,
        },
      }),
      this.prisma.invoice.count({
        where: {
          tenantId,
          paymentStatus: 'PAID',
        },
      }),
      this.prisma.invoice.count({
        where: {
          tenantId,
          status: InvoiceStatus.DRAFT,
        },
      }),
    ]);

    return {
      pending,
      overdue,
      paid,
      draft,
    };
  }

  /**
   * Calculates customer metrics for the tenant.
   */
  async getCustomerMetrics(tenantId: string): Promise<CustomerMetrics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, newThisMonth] = await Promise.all([
      this.prisma.customer.count({
        where: { tenantId },
      }),
      this.prisma.customer.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    return {
      total,
      newThisMonth,
    };
  }

  /**
   * Gets chart data for the dashboard.
   * Includes sales by day, top products, and sales by category.
   */
  async getChartData(tenantId: string): Promise<ChartData> {
    const [salesByDay, topProducts, salesByCategory] = await Promise.all([
      this.getSalesByDay(tenantId),
      this.getTopProductsChart(tenantId),
      this.getSalesByCategory(tenantId),
    ]);

    return {
      salesByDay,
      topProducts,
      salesByCategory,
    };
  }

  /**
   * Gets sales amounts for the last 7 days.
   * Uses a single raw SQL query with GROUP BY instead of N queries.
   */
  async getSalesByDay(tenantId: string, days = 7): Promise<SalesByDay[]> {
    const now = new Date();

    // Calculate the start date (beginning of the day, N days ago)
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Single query with GROUP BY date
    const result = await this.prisma.$queryRaw<
      Array<{ date: Date; total: bigint | null }>
    >`
      SELECT DATE_TRUNC('day', issue_date) as date,
             COALESCE(SUM(total), 0) as total
      FROM invoices
      WHERE tenant_id = ${tenantId}
        AND status != 'CANCELLED'
        AND issue_date >= ${startDate}
      GROUP BY DATE_TRUNC('day', issue_date)
      ORDER BY date ASC
    `;

    // Create a map of date string to total for O(1) lookup
    const salesMap = new Map(
      result.map((r) => [
        r.date.toISOString().split('T')[0],
        Number(r.total ?? 0),
      ]),
    );

    // Fill in all days, including those with no sales (0)
    const salesByDay: SalesByDay[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      salesByDay.push({
        date: dateStr,
        amount: salesMap.get(dateStr) ?? 0,
      });
    }

    return salesByDay;
  }

  /**
   * Gets top products for chart display.
   */
  async getTopProductsChart(
    tenantId: string,
    limit = 10,
  ): Promise<TopProductChart[]> {
    const topProducts = await this.prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: {
        invoice: {
          tenantId,
          status: {
            not: InvoiceStatus.CANCELLED,
          },
        },
        productId: {
          not: null,
        },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: limit,
    });

    const productIds = topProducts
      .map((p) => p.productId)
      .filter((id): id is string => id !== null);

    if (productIds.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return topProducts
      .map((tp) => {
        const product = productMap.get(tp.productId!);
        if (!product) return null;

        return {
          id: product.id,
          name: product.name,
          quantity: tp._sum.quantity ?? 0,
          revenue: Number(tp._sum.total ?? 0),
        };
      })
      .filter((p): p is TopProductChart => p !== null);
  }

  /**
   * Gets sales aggregated by category.
   * Optimized to use a single SQL query with JOINs instead of loading all items in memory.
   */
  async getSalesByCategory(tenantId: string): Promise<SalesByCategory[]> {
    // Use raw SQL to aggregate by category in the database instead of memory
    const salesByCategory = await this.prisma.$queryRaw<
      Array<{
        category_id: string | null;
        category_name: string | null;
        total: bigint | null;
      }>
    >`
      SELECT
        p.category_id,
        COALESCE(c.name, 'Sin categoria') as category_name,
        COALESCE(SUM(ii.total), 0) as total
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      LEFT JOIN products p ON ii.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE i.tenant_id = ${tenantId}
        AND i.status != 'CANCELLED'
      GROUP BY p.category_id, c.name
      ORDER BY total DESC
    `;

    // Calculate total for percentages
    const totalAmount = salesByCategory.reduce(
      (sum, cat) => sum + Number(cat.total ?? 0),
      0,
    );

    // Map to response format
    return salesByCategory.map((cat) => {
      const amount = Number(cat.total ?? 0);
      return {
        categoryId: cat.category_id,
        categoryName: cat.category_name ?? 'Sin categoria',
        amount: Math.round(amount * 100) / 100,
        percentage:
          totalAmount > 0
            ? Math.round((amount / totalAmount) * 10000) / 100
            : 0,
      };
    });
  }

  // ============================================
  // Frontend-facing endpoint methods
  // ============================================

  /**
   * Gets dashboard stats for the frontend stats cards.
   * Aggregates sales, products, invoices, and customers metrics.
   */
  async getStats(days = 30): Promise<DashboardStats> {
    const tenantId = this.tenantContext.requireTenantId();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Dynamic period based on days parameter
    const startOfPeriod = new Date(now);
    startOfPeriod.setDate(now.getDate() - days);
    startOfPeriod.setHours(0, 0, 0, 0);

    // Previous period for growth comparison (same length, immediately before)
    const startOfPreviousPeriod = new Date(startOfPeriod);
    startOfPreviousPeriod.setDate(startOfPreviousPeriod.getDate() - days);
    const endOfPreviousPeriod = new Date(startOfPeriod);
    endOfPreviousPeriod.setMilliseconds(endOfPreviousPeriod.getMilliseconds() - 1);

    // Base where clause excluding cancelled invoices
    const baseInvoiceWhere = {
      tenantId,
      status: {
        not: InvoiceStatus.CANCELLED,
      },
    };

    // Execute all queries in parallel
    const [
      thisMonthSales,
      lastMonthSales,
      todaySalesAgg,
      todayInvoiceCount,
      totalProducts,
      lastMonthProducts,
      totalInvoices,
      lastMonthInvoices,
      overdueInvoices,
      totalCustomers,
      lastMonthCustomers,
    ] = await Promise.all([
      // Current period sales
      this.prisma.invoice.aggregate({
        where: {
          ...baseInvoiceWhere,
          issueDate: { gte: startOfPeriod },
        },
        _sum: { total: true },
      }),
      // Previous period sales
      this.prisma.invoice.aggregate({
        where: {
          ...baseInvoiceWhere,
          issueDate: {
            gte: startOfPreviousPeriod,
            lte: endOfPreviousPeriod,
          },
        },
        _sum: { total: true },
      }),
      // Today's sales
      this.prisma.invoice.aggregate({
        where: {
          ...baseInvoiceWhere,
          issueDate: { gte: startOfToday },
        },
        _sum: { total: true },
      }),
      // Today's invoice count
      this.prisma.invoice.count({
        where: {
          ...baseInvoiceWhere,
          issueDate: { gte: startOfToday },
        },
      }),
      // Total products
      this.prisma.product.count({
        where: { tenantId },
      }),
      // Products created in previous period (for growth calculation)
      this.prisma.product.count({
        where: {
          tenantId,
          createdAt: {
            gte: startOfPreviousPeriod,
            lte: endOfPreviousPeriod,
          },
        },
      }),
      // Total invoices (non-cancelled)
      this.prisma.invoice.count({
        where: baseInvoiceWhere,
      }),
      // Invoices in previous period
      this.prisma.invoice.count({
        where: {
          ...baseInvoiceWhere,
          issueDate: {
            gte: startOfPreviousPeriod,
            lte: endOfPreviousPeriod,
          },
        },
      }),
      // Overdue invoices count
      this.prisma.invoice.count({
        where: {
          tenantId,
          status: InvoiceStatus.OVERDUE,
        },
      }),
      // Total customers
      this.prisma.customer.count({
        where: { tenantId },
      }),
      // Customers created in previous period
      this.prisma.customer.count({
        where: {
          tenantId,
          createdAt: {
            gte: startOfPreviousPeriod,
            lte: endOfPreviousPeriod,
          },
        },
      }),
    ]);

    // Execute the remaining queries in parallel
    const [thisPeriodProducts, thisPeriodInvoices, thisPeriodCustomers] =
      await Promise.all([
        // Products this period
        this.prisma.product.count({
          where: {
            tenantId,
            createdAt: { gte: startOfPeriod },
          },
        }),
        // Invoices this period
        this.prisma.invoice.count({
          where: {
            ...baseInvoiceWhere,
            issueDate: { gte: startOfPeriod },
          },
        }),
        // Customers this period
        this.prisma.customer.count({
          where: {
            tenantId,
            createdAt: { gte: startOfPeriod },
          },
        }),
      ]);

    // Calculate totals and growth percentages
    const thisPeriodSalesTotal = Number(thisMonthSales._sum.total ?? 0);
    const previousPeriodSalesTotal = Number(lastMonthSales._sum.total ?? 0);
    const salesGrowth = this.calculateGrowth(
      thisPeriodSalesTotal,
      previousPeriodSalesTotal,
    );
    const productsGrowth = this.calculateGrowth(
      thisPeriodProducts,
      lastMonthProducts,
    );
    const invoicesGrowth = this.calculateGrowth(
      thisPeriodInvoices,
      lastMonthInvoices,
    );
    const customersGrowth = this.calculateGrowth(
      thisPeriodCustomers,
      lastMonthCustomers,
    );

    return {
      totalSales: thisPeriodSalesTotal,
      salesGrowth,
      totalProducts,
      productsGrowth,
      totalInvoices,
      invoicesGrowth,
      totalCustomers,
      customersGrowth,
      overdueInvoicesCount: overdueInvoices,
      todaySales: Number(todaySalesAgg._sum.total ?? 0),
      todayInvoiceCount,
    };
  }

  /**
   * Gets chart data for the frontend dashboard charts.
   */
  async getCharts(days = 7): Promise<DashboardCharts> {
    const tenantId = this.tenantContext.requireTenantId();

    const [salesChart, categoryDistribution, topProducts] = await Promise.all([
      this.getSalesChartData(tenantId, days),
      this.getCategoryDistribution(tenantId),
      this.getTopProductsForCharts(tenantId),
    ]);

    return {
      salesChart,
      categoryDistribution,
      topProducts,
    };
  }

  /**
   * Gets sales chart data with previous period comparison.
   */
  private async getSalesChartData(
    tenantId: string,
    days = 7,
  ): Promise<SalesChartData[]> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Previous period start (for comparison)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    // Get current period data
    const currentPeriodData = await this.prisma.$queryRaw<
      Array<{ date: Date; total: bigint | null; count: bigint }>
    >`
      SELECT DATE_TRUNC('day', issue_date) as date,
             COALESCE(SUM(total), 0) as total,
             COUNT(*) as count
      FROM invoices
      WHERE tenant_id = ${tenantId}
        AND status != 'CANCELLED'
        AND issue_date >= ${startDate}
      GROUP BY DATE_TRUNC('day', issue_date)
      ORDER BY date ASC
    `;

    // Get previous period data
    const previousPeriodData = await this.prisma.$queryRaw<
      Array<{ date: Date; total: bigint | null }>
    >`
      SELECT DATE_TRUNC('day', issue_date) as date,
             COALESCE(SUM(total), 0) as total
      FROM invoices
      WHERE tenant_id = ${tenantId}
        AND status != 'CANCELLED'
        AND issue_date >= ${previousStartDate}
        AND issue_date < ${startDate}
      GROUP BY DATE_TRUNC('day', issue_date)
      ORDER BY date ASC
    `;

    // Create maps for O(1) lookup
    const currentMap = new Map(
      currentPeriodData.map((r) => [
        r.date.toISOString().split('T')[0],
        { total: Number(r.total ?? 0), count: Number(r.count) },
      ]),
    );

    const previousMap = new Map(
      previousPeriodData.map((r) => [
        r.date.toISOString().split('T')[0],
        Number(r.total ?? 0),
      ]),
    );

    // Build result with all days filled
    const salesChart: SalesChartData[] = [];
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const currentDateStr = currentDate.toISOString().split('T')[0];

      const previousDate = new Date(previousStartDate);
      previousDate.setDate(previousStartDate.getDate() + i);
      const previousDateStr = previousDate.toISOString().split('T')[0];

      const current = currentMap.get(currentDateStr) ?? { total: 0, count: 0 };
      const previous = previousMap.get(previousDateStr) ?? 0;

      salesChart.push({
        date: currentDateStr,
        sales: current.total,
        orders: current.count,
        previousPeriod: previous,
      });
    }

    return salesChart;
  }

  /**
   * Gets category distribution for pie chart.
   */
  private async getCategoryDistribution(
    tenantId: string,
  ): Promise<CategoryDistribution[]> {
    const salesByCategory = await this.getSalesByCategory(tenantId);

    // Color palette for categories
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#84CC16', // lime
    ];

    return salesByCategory.map((category, index) => ({
      name: category.categoryName,
      value: category.amount,
      color: colors[index % colors.length],
    }));
  }

  /**
   * Gets top products for charts with category info.
   */
  private async getTopProductsForCharts(
    tenantId: string,
    limit = 5,
  ): Promise<TopProduct[]> {
    const topProducts = await this.prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: {
        invoice: {
          tenantId,
          status: {
            not: InvoiceStatus.CANCELLED,
          },
        },
        productId: {
          not: null,
        },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: limit,
    });

    const productIds = topProducts
      .map((p) => p.productId)
      .filter((id): id is string => id !== null);

    if (productIds.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return topProducts
      .map((tp) => {
        const product = productMap.get(tp.productId!);
        if (!product) return null;

        return {
          id: product.id,
          name: product.name,
          category: product.category?.name ?? 'Sin categoria',
          sales: Number(tp._sum.total ?? 0),
          quantity: tp._sum.quantity ?? 0,
        };
      })
      .filter((p): p is TopProduct => p !== null);
  }

  /**
   * Gets recent invoices for the dashboard.
   */
  async getRecentInvoices(limit = 5): Promise<RecentInvoice[]> {
    const tenantId = this.tenantContext.requireTenantId();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: {
          not: InvoiceStatus.CANCELLED,
        },
      },
      orderBy: {
        issueDate: 'desc',
      },
      take: limit,
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        status: true,
        paymentStatus: true,
        issueDate: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    return invoices.map((invoice) => {
      // Map status to frontend format
      let status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
      if (invoice.paymentStatus === 'PAID') {
        status = 'PAID';
      } else if (invoice.status === InvoiceStatus.OVERDUE) {
        status = 'OVERDUE';
      } else if (invoice.status === InvoiceStatus.CANCELLED) {
        status = 'CANCELLED';
      } else {
        status = 'PENDING';
      }

      return {
        id: invoice.id,
        number: invoice.invoiceNumber,
        customer: invoice.customer?.name ?? 'Cliente desconocido',
        amount: Number(invoice.total),
        status,
        date: invoice.issueDate.toISOString().split('T')[0],
      };
    });
  }

  /**
   * Gets low stock alerts for the dashboard.
   */
  async getLowStockAlerts(limit = 10): Promise<LowStockAlert[]> {
    const tenantId = this.tenantContext.requireTenantId();

    // Get products where stock < minStock
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        tenantId,
        stock: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        minStock: true,
        warehouseStock: {
          select: {
            warehouse: {
              select: {
                name: true,
              },
            },
            quantity: true,
          },
          orderBy: {
            quantity: 'asc',
          },
          take: 1,
        },
      },
    });

    // Filter products where stock < minStock and map to response format
    return lowStockProducts
      .filter((p) => p.stock < p.minStock)
      .slice(0, limit)
      .map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentStock: product.stock,
        minStock: product.minStock,
        warehouse: product.warehouseStock[0]?.warehouse?.name ?? 'Sin almacen',
      }));
  }

  /**
   * Gets recent activity for the dashboard.
   * Aggregates recent invoices, stock movements, and new customers.
   */
  async getRecentActivity(limit = 10): Promise<RecentActivity[]> {
    const tenantId = this.tenantContext.requireTenantId();

    // Fetch recent activities from different sources in parallel
    const [recentInvoices, recentStockMovements, recentCustomers] =
      await Promise.all([
        // Recent invoices (for sales and invoice activity)
        this.prisma.invoice.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
            customer: {
              select: { name: true },
            },
          },
        }),
        // Recent stock movements
        this.prisma.stockMovement.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            type: true,
            quantity: true,
            createdAt: true,
            product: {
              select: { name: true },
            },
            warehouse: {
              select: { name: true },
            },
          },
        }),
        // Recent customers
        this.prisma.customer.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        }),
      ]);

    // Transform to RecentActivity format
    const activities: RecentActivity[] = [];

    // Add invoice activities
    for (const invoice of recentInvoices) {
      if (invoice.paymentStatus === 'PAID') {
        activities.push({
          id: `sale-${invoice.id}`,
          type: 'sale',
          title: 'Venta completada',
          description: `Factura ${invoice.invoiceNumber} pagada por ${invoice.customer?.name ?? 'Cliente'} - $${Number(invoice.total).toLocaleString()}`,
          timestamp: invoice.createdAt.toISOString(),
        });
      } else {
        activities.push({
          id: `invoice-${invoice.id}`,
          type: 'invoice',
          title: 'Nueva factura creada',
          description: `Factura ${invoice.invoiceNumber} para ${invoice.customer?.name ?? 'Cliente'} - $${Number(invoice.total).toLocaleString()}`,
          timestamp: invoice.createdAt.toISOString(),
        });
      }
    }

    // Add stock movement activities
    for (const movement of recentStockMovements) {
      const typeLabels: Record<string, string> = {
        PURCHASE: 'compra',
        SALE: 'venta',
        ADJUSTMENT: 'ajuste',
        TRANSFER: 'transferencia',
        RETURN: 'devolucion',
        DAMAGED: 'danado',
      };
      const typeLabel = typeLabels[movement.type] || 'movimiento';
      activities.push({
        id: `stock-${movement.id}`,
        type: 'stock',
        title: `Movimiento de stock (${typeLabel})`,
        description: `${movement.quantity} unidades de ${movement.product?.name ?? 'Producto'} en ${movement.warehouse?.name ?? 'Almacen'}`,
        timestamp: movement.createdAt.toISOString(),
      });
    }

    // Add customer activities
    for (const customer of recentCustomers) {
      activities.push({
        id: `customer-${customer.id}`,
        type: 'customer',
        title: 'Nuevo cliente registrado',
        description: customer.name,
        timestamp: customer.createdAt.toISOString(),
      });
    }

    // Sort by timestamp descending and take the most recent
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return activities.slice(0, limit);
  }

  /**
   * Helper to calculate growth percentage.
   */
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    const growth = ((current - previous) / previous) * 100;
    return Math.round(growth * 100) / 100;
  }
}
