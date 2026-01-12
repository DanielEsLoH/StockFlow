import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { NotificationsService, LowStockProduct } from './notifications.service';
import { TenantContextService, Roles } from '../common';

// Import the JwtAuthGuard - adjust path as needed based on your auth module structure
// This assumes a typical guard location; modify if your project structure differs
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * Response DTO for notification trigger operations
 */
interface TriggerResponse {
  success: boolean;
  message: string;
  details?: {
    emailsSent?: number;
    emailsFailed?: number;
    products?: LowStockProduct[];
  };
}

/**
 * NotificationsController
 *
 * Provides endpoints for manually triggering email notifications.
 * All endpoints require authentication and ADMIN role.
 *
 * These endpoints are useful for:
 * - Testing email functionality
 * - Manually sending alerts outside of scheduled times
 * - Admin-triggered notifications
 *
 * Scheduled jobs (cron) run automatically and don't require these endpoints.
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * GET /notifications/low-stock/preview
   *
   * Preview low stock products without sending any emails.
   * Useful for checking what would be included in an alert.
   *
   * @returns List of low stock products
   */
  @Get('low-stock/preview')
  @Roles(UserRole.ADMIN)
  async previewLowStock(): Promise<{
    products: LowStockProduct[];
    count: number;
  }> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Previewing low stock products for tenant ${tenantId}`);

    const products =
      await this.notificationsService.getLowStockProducts(tenantId);

    return {
      products,
      count: products.length,
    };
  }

  /**
   * POST /notifications/low-stock/trigger
   *
   * Manually triggers a low stock alert email for the current tenant.
   * Sends email to all admin users of the tenant.
   *
   * @returns Result of the operation
   */
  @Post('low-stock/trigger')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async triggerLowStockAlert(): Promise<TriggerResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(`Manual low stock alert triggered for tenant ${tenantId}`);

    const products =
      await this.notificationsService.getLowStockProducts(tenantId);

    if (products.length === 0) {
      return {
        success: true,
        message: 'No low stock products found. No email sent.',
        details: {
          emailsSent: 0,
          products: [],
        },
      };
    }

    const result =
      await this.notificationsService.triggerLowStockAlert(tenantId);

    if (!result) {
      return {
        success: false,
        message: 'Failed to send low stock alert. No admin users found.',
        details: {
          emailsSent: 0,
          products,
        },
      };
    }

    return {
      success: result.success,
      message: result.success
        ? `Low stock alert sent successfully for ${products.length} product(s).`
        : `Failed to send low stock alert: ${result.error}`,
      details: {
        emailsSent: result.success ? 1 : 0,
        emailsFailed: result.success ? 0 : 1,
        products,
      },
    };
  }

  /**
   * POST /notifications/overdue-invoices/trigger
   *
   * Manually triggers overdue invoice reminder emails for the current tenant.
   * Sends reminder emails to customers with overdue invoices.
   *
   * @returns Result of the operation
   */
  @Post('overdue-invoices/trigger')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async triggerOverdueReminders(): Promise<TriggerResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(
      `Manual overdue invoice reminders triggered for tenant ${tenantId}`,
    );

    const results =
      await this.notificationsService.triggerOverdueReminders(tenantId);

    const sent = results.filter((r) => r?.success).length;
    const failed = results.filter((r) => r && !r.success).length;
    const skipped = results.filter((r) => r === null).length;

    return {
      success: true,
      message: `Processed ${results.length} overdue invoice(s). Sent: ${sent}, Failed: ${failed}, Skipped: ${skipped}`,
      details: {
        emailsSent: sent,
        emailsFailed: failed,
      },
    };
  }

  /**
   * POST /notifications/test/:type
   *
   * Sends a test email of the specified type to the current user.
   * Useful for verifying email configuration and template rendering.
   *
   * Available types:
   * - welcome: Test welcome email
   * - low-stock: Test low stock alert (with mock data)
   * - invoice-sent: Test invoice sent notification (with mock data)
   * - overdue: Test overdue invoice reminder (with mock data)
   * - payment: Test payment received notification (with mock data)
   *
   * @param type - Type of test email to send
   * @returns Result of the operation
   */
  @Post('test/:type')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  sendTestEmail(@Param('type') type: string): TriggerResponse {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(`Test email requested: ${type} for tenant ${tenantId}`);

    // For now, we just return a message indicating this is a placeholder
    // In a full implementation, you would:
    // 1. Get the current user's email
    // 2. Send a test email with mock data

    const validTypes = [
      'welcome',
      'low-stock',
      'invoice-sent',
      'overdue',
      'payment',
    ];

    if (!validTypes.includes(type)) {
      return {
        success: false,
        message: `Invalid test email type: ${type}. Valid types are: ${validTypes.join(', ')}`,
      };
    }

    // This is a simplified implementation
    // A full implementation would send actual test emails
    return {
      success: true,
      message: `Test email type '${type}' acknowledged. To implement full test email functionality, extend this endpoint to fetch the current user's email and send a test with mock data.`,
    };
  }

  /**
   * GET /notifications/status
   *
   * Returns the status of the notification system.
   * Checks if Brevo is configured and enabled.
   *
   * @returns Notification system status
   */
  @Get('status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getStatus(): {
    mailConfigured: boolean;
    scheduledJobs: string[];
    message: string;
  } {
    // Check if Brevo API key is configured
    const brevoApiKey = process.env.BREVO_API_KEY;
    const isConfigured = !!brevoApiKey;

    return {
      mailConfigured: isConfigured,
      scheduledJobs: [
        'daily-low-stock-alert (9:00 AM)',
        'daily-overdue-invoice-reminder (10:00 AM)',
      ],
      message: isConfigured
        ? 'Email notifications are enabled via Brevo and scheduled jobs are active.'
        : 'Email notifications are disabled. Set BREVO_API_KEY environment variable to enable.',
    };
  }
}
