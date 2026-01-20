import { ApiProperty } from '@nestjs/swagger';

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
