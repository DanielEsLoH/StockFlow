import { ApiProperty } from '@nestjs/swagger';

/**
 * Dashboard stats for the frontend stats cards
 */
export class DashboardStatsEntity {
  @ApiProperty({
    description: 'Total sales amount',
    example: 125000,
  })
  totalSales: number;

  @ApiProperty({
    description: 'Sales growth percentage compared to previous period',
    example: 12.5,
  })
  salesGrowth: number;

  @ApiProperty({
    description: 'Total number of products',
    example: 234,
  })
  totalProducts: number;

  @ApiProperty({
    description: 'Products growth percentage',
    example: 5.2,
  })
  productsGrowth: number;

  @ApiProperty({
    description: 'Total number of invoices',
    example: 156,
  })
  totalInvoices: number;

  @ApiProperty({
    description: 'Invoices growth percentage',
    example: 8.3,
  })
  invoicesGrowth: number;

  @ApiProperty({
    description: 'Total number of customers',
    example: 89,
  })
  totalCustomers: number;

  @ApiProperty({
    description: 'Customers growth percentage',
    example: 15.0,
  })
  customersGrowth: number;

  @ApiProperty({
    description: 'Number of overdue invoices',
    example: 3,
  })
  overdueInvoicesCount: number;
}

/**
 * Sales chart data point
 */
export class SalesChartDataEntity {
  @ApiProperty({
    description: 'Date in ISO format',
    example: '2024-01-15',
  })
  date: string;

  @ApiProperty({
    description: 'Sales amount for the day',
    example: 15000,
  })
  sales: number;

  @ApiProperty({
    description: 'Number of orders for the day',
    example: 25,
  })
  orders: number;

  @ApiProperty({
    description: 'Sales from the previous period for comparison',
    example: 12000,
  })
  previousPeriod: number;
}

/**
 * Category distribution for pie chart
 */
export class CategoryDistributionEntity {
  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
  })
  name: string;

  @ApiProperty({
    description: 'Sales value for this category',
    example: 50000,
  })
  value: number;

  @ApiProperty({
    description: 'Color for the chart segment',
    example: '#3B82F6',
  })
  color: string;
}

/**
 * Top product for charts
 */
export class TopProductEntity {
  @ApiProperty({
    description: 'Product ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Laptop Dell XPS 15',
  })
  name: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
  })
  category: string;

  @ApiProperty({
    description: 'Total sales amount',
    example: 194850,
  })
  sales: number;

  @ApiProperty({
    description: 'Total quantity sold',
    example: 150,
  })
  quantity: number;
}

/**
 * Dashboard charts data
 */
export class DashboardChartsEntity {
  @ApiProperty({
    description: 'Sales chart data points',
    type: [SalesChartDataEntity],
  })
  salesChart: SalesChartDataEntity[];

  @ApiProperty({
    description: 'Category distribution for pie chart',
    type: [CategoryDistributionEntity],
  })
  categoryDistribution: CategoryDistributionEntity[];

  @ApiProperty({
    description: 'Top selling products',
    type: [TopProductEntity],
  })
  topProducts: TopProductEntity[];
}

/**
 * Recent invoice for dashboard
 */
export class RecentInvoiceEntity {
  @ApiProperty({
    description: 'Invoice ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({
    description: 'Invoice number',
    example: 'INV-2024-001',
  })
  number: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'Acme Corporation',
  })
  customer: string;

  @ApiProperty({
    description: 'Invoice total amount',
    example: 2500.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Invoice status',
    enum: ['PAID', 'PENDING', 'OVERDUE', 'CANCELLED'],
    example: 'PENDING',
  })
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';

  @ApiProperty({
    description: 'Invoice date in ISO format',
    example: '2024-01-15',
  })
  date: string;
}

/**
 * Low stock alert for dashboard
 */
export class LowStockAlertEntity {
  @ApiProperty({
    description: 'Product ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Laptop Dell XPS 15',
  })
  name: string;

  @ApiProperty({
    description: 'Product SKU',
    example: 'DELL-XPS-15',
  })
  sku: string;

  @ApiProperty({
    description: 'Current stock quantity',
    example: 5,
  })
  currentStock: number;

  @ApiProperty({
    description: 'Minimum stock threshold',
    example: 10,
  })
  minStock: number;

  @ApiProperty({
    description: 'Warehouse name',
    example: 'Main Warehouse',
  })
  warehouse: string;
}

/**
 * Recent activity for dashboard
 */
export class RecentActivityEntity {
  @ApiProperty({
    description: 'Activity ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({
    description: 'Activity type',
    enum: ['sale', 'product', 'customer', 'invoice', 'stock'],
    example: 'sale',
  })
  type: 'sale' | 'product' | 'customer' | 'invoice' | 'stock';

  @ApiProperty({
    description: 'Activity title',
    example: 'New sale completed',
  })
  title: string;

  @ApiProperty({
    description: 'Activity description',
    example: 'Invoice INV-2024-001 was paid by Acme Corporation',
  })
  description: string;

  @ApiProperty({
    description: 'Activity timestamp in ISO format',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp: string;
}

/**
 * Sales metrics entity for dashboard
 */
export class SalesMetricsEntity {
  @ApiProperty({
    description: 'Total sales amount for today',
    example: 1250000,
  })
  today: number;

  @ApiProperty({
    description: 'Total sales amount for this week',
    example: 8500000,
  })
  thisWeek: number;

  @ApiProperty({
    description: 'Total sales amount for this month',
    example: 35000000,
  })
  thisMonth: number;

  @ApiProperty({
    description: 'Growth percentage compared to previous period',
    example: 12.5,
  })
  growth: number;
}

/**
 * Top selling product entity
 */
export class TopSellingProductEntity {
  @ApiProperty({
    description: 'Product ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Laptop Dell XPS 15',
  })
  name: string;

  @ApiProperty({
    description: 'Product SKU',
    example: 'DELL-XPS-15',
  })
  sku: string;

  @ApiProperty({
    description: 'Total quantity sold',
    example: 150,
  })
  quantitySold: number;

  @ApiProperty({
    description: 'Total revenue from this product',
    example: 194850,
  })
  revenue: number;
}

/**
 * Product metrics entity for dashboard
 */
export class ProductMetricsEntity {
  @ApiProperty({
    description: 'Total number of products',
    example: 234,
  })
  total: number;

  @ApiProperty({
    description: 'Number of products with low stock',
    example: 12,
  })
  lowStock: number;

  @ApiProperty({
    description: 'Number of products out of stock',
    example: 3,
  })
  outOfStock: number;

  @ApiProperty({
    description: 'Top selling products',
    type: [TopSellingProductEntity],
  })
  topSelling: TopSellingProductEntity[];
}

/**
 * Invoice metrics entity for dashboard
 */
export class InvoiceMetricsEntity {
  @ApiProperty({
    description: 'Number of pending invoices',
    example: 15,
  })
  pending: number;

  @ApiProperty({
    description: 'Number of overdue invoices',
    example: 3,
  })
  overdue: number;

  @ApiProperty({
    description: 'Number of paid invoices',
    example: 145,
  })
  paid: number;

  @ApiProperty({
    description: 'Number of draft invoices',
    example: 5,
  })
  draft: number;
}

/**
 * Customer metrics entity for dashboard
 */
export class CustomerMetricsEntity {
  @ApiProperty({
    description: 'Total number of customers',
    example: 89,
  })
  total: number;

  @ApiProperty({
    description: 'Number of new customers this month',
    example: 12,
  })
  newThisMonth: number;
}

/**
 * Sales by day chart data
 */
export class SalesByDayEntity {
  @ApiProperty({
    description: 'Date',
    example: '2024-01-15',
  })
  date: string;

  @ApiProperty({
    description: 'Sales amount for the day',
    example: 150000,
  })
  amount: number;
}

/**
 * Sales by category chart data
 */
export class SalesByCategoryEntity {
  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
  })
  category: string;

  @ApiProperty({
    description: 'Sales amount for the category',
    example: 500000,
  })
  amount: number;
}

/**
 * Chart data entity for dashboard
 */
export class ChartDataEntity {
  @ApiProperty({
    description: 'Sales by day for the current period',
    type: [SalesByDayEntity],
  })
  salesByDay: SalesByDayEntity[];

  @ApiProperty({
    description: 'Top selling products with quantities',
    type: [TopSellingProductEntity],
  })
  topProducts: TopSellingProductEntity[];

  @ApiProperty({
    description: 'Sales breakdown by category',
    type: [SalesByCategoryEntity],
  })
  salesByCategory: SalesByCategoryEntity[];
}

/**
 * Dashboard response entity for Swagger documentation
 */
export class DashboardEntity {
  @ApiProperty({
    description: 'Sales metrics',
    type: SalesMetricsEntity,
  })
  sales: SalesMetricsEntity;

  @ApiProperty({
    description: 'Product metrics',
    type: ProductMetricsEntity,
  })
  products: ProductMetricsEntity;

  @ApiProperty({
    description: 'Invoice metrics',
    type: InvoiceMetricsEntity,
  })
  invoices: InvoiceMetricsEntity;

  @ApiProperty({
    description: 'Customer metrics',
    type: CustomerMetricsEntity,
  })
  customers: CustomerMetricsEntity;

  @ApiProperty({
    description: 'Chart data for visualizations',
    type: ChartDataEntity,
  })
  charts: ChartDataEntity;
}
