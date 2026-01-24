import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import type {
  DashboardResponse,
  DashboardStats,
  DashboardCharts,
  RecentInvoice,
  LowStockAlert,
  RecentActivity,
} from './dashboard.service';
import { JwtAuthGuard } from '../auth';
import { CurrentUser } from '../common/decorators';
import type { RequestUser } from '../auth/types';
import {
  DashboardEntity,
  DashboardStatsEntity,
  DashboardChartsEntity,
  RecentInvoiceEntity,
  LowStockAlertEntity,
  RecentActivityEntity,
} from './entities/dashboard.entity';

/**
 * DashboardController handles the dashboard analytics endpoint.
 *
 * This controller provides a single endpoint for retrieving all dashboard
 * metrics and statistics for the authenticated tenant.
 *
 * All endpoints require JWT authentication. The tenant is automatically
 * determined from the authenticated user's context.
 *
 * @example
 * GET /dashboard
 * Authorization: Bearer <jwt-token>
 *
 * Response:
 * {
 *   "sales": {
 *     "today": 1250000,
 *     "thisWeek": 8500000,
 *     "thisMonth": 35000000,
 *     "growth": 12.5
 *   },
 *   "products": {
 *     "total": 234,
 *     "lowStock": 12,
 *     "outOfStock": 3,
 *     "topSelling": [...]
 *   },
 *   "invoices": {
 *     "pending": 15,
 *     "overdue": 3,
 *     "paid": 145,
 *     "draft": 5
 *   },
 *   "customers": {
 *     "total": 89,
 *     "newThisMonth": 12
 *   },
 *   "charts": {
 *     "salesByDay": [...],
 *     "topProducts": [...],
 *     "salesByCategory": [...]
 *   }
 * }
 */
@ApiTags('dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Gets dashboard stats for the stats cards.
   *
   * Returns aggregated metrics including sales, products, invoices,
   * and customers totals with growth percentages.
   *
   * @param user - The authenticated user from JWT
   * @returns Dashboard stats with totals and growth percentages
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get dashboard stats',
    description:
      'Returns aggregated stats for dashboard cards including sales, products, invoices, and customers totals with growth percentages.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved successfully',
    type: DashboardStatsEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getStats(@CurrentUser() user: RequestUser): Promise<DashboardStats> {
    this.logger.log(
      `Fetching dashboard stats for tenant ${user.tenantId} by user ${user.userId}`,
    );

    return this.dashboardService.getStats();
  }

  /**
   * Gets dashboard charts data.
   *
   * Returns data for sales chart, category distribution pie chart,
   * and top products bar chart.
   *
   * @param user - The authenticated user from JWT
   * @returns Charts data including sales by day, category distribution, and top products
   */
  @Get('charts')
  @ApiOperation({
    summary: 'Get dashboard charts data',
    description:
      'Returns chart data for visualizations including sales chart, category distribution, and top products.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard charts data retrieved successfully',
    type: DashboardChartsEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getCharts(@CurrentUser() user: RequestUser): Promise<DashboardCharts> {
    this.logger.log(
      `Fetching dashboard charts for tenant ${user.tenantId} by user ${user.userId}`,
    );

    return this.dashboardService.getCharts();
  }

  /**
   * Gets recent invoices for the dashboard.
   *
   * Returns the most recent invoices with customer name, amount, and status.
   *
   * @param user - The authenticated user from JWT
   * @returns Array of recent invoices
   */
  @Get('recent-invoices')
  @ApiOperation({
    summary: 'Get recent invoices',
    description:
      'Returns the most recent invoices for display in the dashboard activity section.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent invoices retrieved successfully',
    type: [RecentInvoiceEntity],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getRecentInvoices(
    @CurrentUser() user: RequestUser,
  ): Promise<RecentInvoice[]> {
    this.logger.log(
      `Fetching recent invoices for tenant ${user.tenantId} by user ${user.userId}`,
    );

    return this.dashboardService.getRecentInvoices();
  }

  /**
   * Gets low stock alerts for the dashboard.
   *
   * Returns products where current stock is below the minimum stock threshold.
   *
   * @param user - The authenticated user from JWT
   * @returns Array of low stock alerts
   */
  @Get('low-stock-alerts')
  @ApiOperation({
    summary: 'Get low stock alerts',
    description:
      'Returns products with stock levels below the minimum threshold for inventory alerts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Low stock alerts retrieved successfully',
    type: [LowStockAlertEntity],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getLowStockAlerts(
    @CurrentUser() user: RequestUser,
  ): Promise<LowStockAlert[]> {
    this.logger.log(
      `Fetching low stock alerts for tenant ${user.tenantId} by user ${user.userId}`,
    );

    return this.dashboardService.getLowStockAlerts();
  }

  /**
   * Gets recent activity for the dashboard.
   *
   * Returns a combined feed of recent sales, invoices, stock movements,
   * and customer registrations.
   *
   * @param user - The authenticated user from JWT
   * @returns Array of recent activity items
   */
  @Get('recent-activity')
  @ApiOperation({
    summary: 'Get recent activity',
    description:
      'Returns a combined feed of recent activities including sales, invoices, stock movements, and new customers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent activity retrieved successfully',
    type: [RecentActivityEntity],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getRecentActivity(
    @CurrentUser() user: RequestUser,
  ): Promise<RecentActivity[]> {
    this.logger.log(
      `Fetching recent activity for tenant ${user.tenantId} by user ${user.userId}`,
    );

    return this.dashboardService.getRecentActivity();
  }

  /**
   * Gets all dashboard metrics for the authenticated tenant.
   *
   * Returns comprehensive analytics including:
   * - Sales metrics (today, this week, this month, growth percentage)
   * - Product metrics (total, low stock, out of stock, top selling)
   * - Invoice metrics by status (pending, overdue, paid, draft)
   * - Customer metrics (total, new this month)
   * - Chart data (sales by day, top products, sales by category)
   *
   * @param user - The authenticated user from JWT
   * @returns Complete dashboard data with all metrics and charts
   *
   * @example
   * GET /dashboard
   */
  @Get()
  @ApiOperation({
    summary: 'Get dashboard metrics',
    description:
      'Returns comprehensive dashboard analytics including sales metrics, product metrics, invoice status breakdown, customer metrics, and chart data for visualizations. All authenticated users can access this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics retrieved successfully',
    type: DashboardEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getDashboard(
    @CurrentUser() user: RequestUser,
  ): Promise<DashboardResponse> {
    this.logger.log(
      `Fetching dashboard for tenant ${user.tenantId} by user ${user.userId}`,
    );

    return this.dashboardService.getDashboard();
  }
}
