import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * DashboardModule provides analytics and metrics functionality for tenant dashboards.
 *
 * Features:
 * - Sales metrics (today, week, month, growth comparison)
 * - Product metrics (total, low stock, out of stock, top selling)
 * - Invoice metrics by status (pending, overdue, paid, draft)
 * - Customer metrics (total, new this month)
 * - Chart data (sales by day, top products, sales by category)
 *
 * This module depends on:
 * - PrismaModule (global) - for database access
 * - CommonModule (global) - for TenantContextService
 * - AuthModule - for guards and decorators (imported at app level)
 *
 * All endpoints are protected by JwtAuthGuard.
 * Multi-tenant isolation is enforced through TenantContextService.
 *
 * Business Rules:
 * - All sales metrics exclude CANCELLED invoices
 * - Growth is calculated by comparing this month to last month
 * - Low stock products are those where stock < minStock AND stock > 0
 * - Out of stock products have stock = 0
 * - Top selling products are aggregated from InvoiceItem data
 */
@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
