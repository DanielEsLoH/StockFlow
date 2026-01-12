import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import type { DashboardResponse } from './dashboard.service';
import { JwtAuthGuard } from '../auth';
import { CurrentUser } from '../common/decorators';
import type { RequestUser } from '../auth/types';

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
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

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
  async getDashboard(
    @CurrentUser() user: RequestUser,
  ): Promise<DashboardResponse> {
    this.logger.log(
      `Fetching dashboard for tenant ${user.tenantId} by user ${user.userId}`,
    );

    return this.dashboardService.getDashboard();
  }
}
