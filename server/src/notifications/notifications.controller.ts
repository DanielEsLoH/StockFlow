import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { NotificationsService, LowStockProduct } from './notifications.service';
import {
  InAppNotificationsService,
  NotificationResponse,
  PaginatedNotificationsResponse,
  UnreadCountResponse,
  BulkOperationResult,
} from './in-app-notifications.service';
import { TenantContextService, Roles } from '../common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  FilterNotificationsDto,
  CreateNotificationDto,
  BulkNotificationIdsDto,
} from './dto';
import {
  TriggerResponseEntity,
  LowStockPreviewEntity,
  NotificationStatusEntity,
  NotificationEntity,
  PaginatedNotificationsEntity,
  UnreadCountEntity,
  BulkOperationResultEntity,
} from './entities/notification.entity';

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
 * Provides endpoints for both in-app notifications and email notification triggers.
 * All endpoints require authentication.
 *
 * In-App Notifications:
 * - CRUD operations for managing in-app notifications
 * - Bulk operations for marking as read/deleting
 * - Unread count with breakdown by type and priority
 *
 * Email Notifications:
 * - Manual triggers for email alerts (low stock, overdue invoices)
 * - Test email functionality
 * - Notification system status
 */
@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly inAppNotificationsService: InAppNotificationsService,
    private readonly tenantContext: TenantContextService,
  ) {}

  // ============================================================================
  // IN-APP NOTIFICATION ENDPOINTS
  // ============================================================================

  /**
   * GET /notifications
   *
   * Get paginated list of in-app notifications for the current tenant.
   * Supports filtering by type, priority, read status, and search.
   *
   * @param filters - Filter and pagination options
   * @returns Paginated list of notifications
   */
  @Get()
  @ApiOperation({
    summary: 'List all in-app notifications',
    description:
      'Returns a paginated list of in-app notifications for the current tenant with optional filtering by type, priority, read status, and search.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of notifications retrieved successfully',
    type: PaginatedNotificationsEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @Query() filters: FilterNotificationsDto,
  ): Promise<PaginatedNotificationsResponse> {
    this.logger.log(
      `Listing notifications - page: ${filters.page ?? 1}, limit: ${filters.limit ?? 10}`,
    );
    return this.inAppNotificationsService.findAll(filters);
  }

  /**
   * GET /notifications/recent
   *
   * Get recent notifications for dropdown display.
   *
   * @param limit - Maximum number of notifications to return (default: 5, max: 20)
   * @returns Array of recent notifications
   */
  @Get('recent')
  @ApiOperation({
    summary: 'Get recent notifications',
    description:
      'Returns the most recent notifications for dropdown display. Limited to 20 items maximum.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description:
      'Maximum number of notifications to return (default: 5, max: 20)',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Recent notifications retrieved successfully',
    type: [NotificationEntity],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findRecent(
    @Query('limit') limit?: string,
  ): Promise<NotificationResponse[]> {
    const limitNum = Math.min(20, Math.max(1, parseInt(limit ?? '5', 10) || 5));
    this.logger.log(`Getting ${limitNum} recent notifications`);
    return this.inAppNotificationsService.findRecent(limitNum);
  }

  /**
   * GET /notifications/unread/count
   *
   * Get unread notification count with breakdown by type and priority.
   *
   * @returns Unread count with breakdowns
   */
  @Get('unread/count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description:
      'Returns the total unread notification count along with breakdowns by type and priority.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    type: UnreadCountEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getUnreadCount(): Promise<UnreadCountResponse> {
    this.logger.log('Getting unread notification count');
    return this.inAppNotificationsService.getUnreadCount();
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
  @ApiOperation({
    summary: 'Get notification system status',
    description:
      'Returns the status of the notification system including whether email is configured and the list of scheduled jobs. ADMIN and MANAGER users can access this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification status retrieved successfully',
    type: NotificationStatusEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  getStatus(): {
    mailConfigured: boolean;
    scheduledJobs: string[];
    message: string;
  } {
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
  @ApiOperation({
    summary: 'Preview low stock products',
    description:
      'Preview low stock products without sending any emails. Useful for checking what would be included in a low stock alert. Only ADMIN users can access this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Low stock preview retrieved successfully',
    type: LowStockPreviewEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
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
   * GET /notifications/:id
   *
   * Get a single notification by ID.
   *
   * @param id - Notification ID
   * @returns Notification data
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get notification by ID',
    description: 'Returns a specific notification by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: 'clx1234567890notif',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification retrieved successfully',
    type: NotificationEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(@Param('id') id: string): Promise<NotificationResponse> {
    this.logger.log(`Getting notification: ${id}`);
    return this.inAppNotificationsService.findOne(id);
  }

  /**
   * POST /notifications
   *
   * Create a new in-app notification.
   * Primarily for system/internal use.
   *
   * @param dto - Notification creation data
   * @returns Created notification
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a notification',
    description:
      'Creates a new in-app notification. Primarily for system or admin use. Only ADMIN and MANAGER users can create notifications.',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
    type: NotificationEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async create(
    @Body() dto: CreateNotificationDto,
  ): Promise<NotificationResponse> {
    this.logger.log(`Creating notification: ${dto.title}`);
    return this.inAppNotificationsService.create(dto);
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
  @ApiOperation({
    summary: 'Trigger low stock alert',
    description:
      'Manually triggers a low stock alert email for the current tenant. Sends email to all admin users. Only ADMIN users can trigger this operation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Low stock alert triggered successfully',
    type: TriggerResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
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
  @ApiOperation({
    summary: 'Trigger overdue invoice reminders',
    description:
      'Manually triggers overdue invoice reminder emails for the current tenant. Sends reminder emails to customers with overdue invoices. Only ADMIN users can trigger this operation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Overdue invoice reminders triggered successfully',
    type: TriggerResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
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
   * @param type - Type of test email to send
   * @returns Result of the operation
   */
  @Post('test/:type')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send test email',
    description:
      'Sends a test email of the specified type. Available types: welcome, low-stock, invoice-sent, overdue, payment. Useful for verifying email configuration. Only ADMIN users can send test emails.',
  })
  @ApiParam({
    name: 'type',
    description: 'Type of test email to send',
    enum: ['welcome', 'low-stock', 'invoice-sent', 'overdue', 'payment'],
    example: 'welcome',
  })
  @ApiResponse({
    status: 200,
    description: 'Test email operation completed',
    type: TriggerResponseEntity,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid email type' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  sendTestEmail(@Param('type') type: string): TriggerResponse {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(`Test email requested: ${type} for tenant ${tenantId}`);

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

    return {
      success: true,
      message: `Test email type '${type}' acknowledged. To implement full test email functionality, extend this endpoint to fetch the current user's email and send a test with mock data.`,
    };
  }

  /**
   * PATCH /notifications/read
   *
   * Mark multiple notifications as read.
   *
   * @param dto - Object containing array of notification IDs
   * @returns Bulk operation result
   */
  @Patch('read')
  @ApiOperation({
    summary: 'Mark multiple notifications as read',
    description: 'Marks multiple notifications as read in a single operation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications marked as read successfully',
    type: BulkOperationResultEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async markManyAsRead(
    @Body() dto: BulkNotificationIdsDto,
  ): Promise<BulkOperationResult> {
    this.logger.log(`Marking ${dto.ids.length} notifications as read`);
    return this.inAppNotificationsService.markManyAsRead(dto);
  }

  /**
   * PATCH /notifications/read-all
   *
   * Mark all notifications as read for the current tenant.
   *
   * @returns Bulk operation result
   */
  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Marks all notifications as read for the current tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read successfully',
    type: BulkOperationResultEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async markAllAsRead(): Promise<BulkOperationResult> {
    this.logger.log('Marking all notifications as read');
    return this.inAppNotificationsService.markAllAsRead();
  }

  /**
   * PATCH /notifications/:id/read
   *
   * Mark a single notification as read.
   *
   * @param id - Notification ID
   * @returns Updated notification
   */
  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Marks a single notification as read.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: 'clx1234567890notif',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully',
    type: NotificationEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') id: string): Promise<NotificationResponse> {
    this.logger.log(`Marking notification ${id} as read`);
    return this.inAppNotificationsService.markAsRead(id);
  }

  /**
   * PATCH /notifications/:id/unread
   *
   * Mark a single notification as unread.
   *
   * @param id - Notification ID
   * @returns Updated notification
   */
  @Patch(':id/unread')
  @ApiOperation({
    summary: 'Mark notification as unread',
    description: 'Marks a single notification as unread.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: 'clx1234567890notif',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as unread successfully',
    type: NotificationEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsUnread(@Param('id') id: string): Promise<NotificationResponse> {
    this.logger.log(`Marking notification ${id} as unread`);
    return this.inAppNotificationsService.markAsUnread(id);
  }

  /**
   * DELETE /notifications/clear-read
   *
   * Delete all read notifications for the current tenant.
   *
   * @returns Bulk operation result
   */
  @Delete('clear-read')
  @ApiOperation({
    summary: 'Clear read notifications',
    description: 'Deletes all read notifications for the current tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Read notifications cleared successfully',
    type: BulkOperationResultEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async clearRead(): Promise<BulkOperationResult> {
    this.logger.log('Clearing read notifications');
    return this.inAppNotificationsService.clearRead();
  }

  /**
   * DELETE /notifications
   *
   * Delete multiple notifications.
   *
   * @param dto - Object containing array of notification IDs
   * @returns Bulk operation result
   */
  @Delete()
  @ApiOperation({
    summary: 'Delete multiple notifications',
    description: 'Deletes multiple notifications in a single operation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications deleted successfully',
    type: BulkOperationResultEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async deleteMany(
    @Body() dto: BulkNotificationIdsDto,
  ): Promise<BulkOperationResult> {
    this.logger.log(`Deleting ${dto.ids.length} notifications`);
    return this.inAppNotificationsService.deleteMany(dto);
  }

  /**
   * DELETE /notifications/:id
   *
   * Delete a single notification.
   *
   * @param id - Notification ID
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Deletes a single notification by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: 'clx1234567890notif',
  })
  @ApiResponse({
    status: 204,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting notification: ${id}`);
    return this.inAppNotificationsService.delete(id);
  }
}
