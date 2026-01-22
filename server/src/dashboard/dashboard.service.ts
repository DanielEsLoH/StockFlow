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
   */
  async getProductMetrics(tenantId: string): Promise<ProductMetrics> {
    // Get all product counts in parallel
    const [total, outOfStock, topSelling] = await Promise.all([
      this.prisma.product.count({
        where: { tenantId },
      }),
      this.prisma.product.count({
        where: {
          tenantId,
          stock: 0,
        },
      }),
      this.getTopSellingProducts(tenantId),
    ]);

    // For low stock, we need products where stock < minStock AND stock > 0
    // This requires raw query or fetching all products
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        tenantId,
        stock: { gt: 0 },
      },
      select: {
        stock: true,
        minStock: true,
      },
    });

    const lowStock = lowStockProducts.filter(
      (p) => p.stock < p.minStock,
    ).length;

    return {
      total,
      lowStock,
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
   */
  async getSalesByCategory(tenantId: string): Promise<SalesByCategory[]> {
    // Get total sales first
    const totalSales = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        status: {
          not: InvoiceStatus.CANCELLED,
        },
      },
      _sum: { total: true },
    });

    const totalAmount = Number(totalSales._sum.total ?? 0);

    // Get all invoice items with their products and categories
    const invoiceItems = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          tenantId,
          status: {
            not: InvoiceStatus.CANCELLED,
          },
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    // Aggregate by category
    const categoryMap = new Map<
      string | null,
      { name: string; amount: number }
    >();

    for (const item of invoiceItems) {
      const categoryId = item.product?.categoryId ?? null;
      const categoryName = item.product?.category?.name ?? 'Sin categoria';
      const itemTotal = Number(item.total);

      const existing = categoryMap.get(categoryId);
      if (existing) {
        existing.amount += itemTotal;
      } else {
        categoryMap.set(categoryId, { name: categoryName, amount: itemTotal });
      }
    }

    // Convert to array and calculate percentages
    const result: SalesByCategory[] = [];
    for (const [categoryId, data] of categoryMap.entries()) {
      result.push({
        categoryId,
        categoryName: data.name,
        amount: Math.round(data.amount * 100) / 100,
        percentage:
          totalAmount > 0
            ? Math.round((data.amount / totalAmount) * 10000) / 100
            : 0,
      });
    }

    // Sort by amount descending
    result.sort((a, b) => b.amount - a.amount);

    return result;
  }
}
