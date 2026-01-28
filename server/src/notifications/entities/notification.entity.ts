import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationPriority } from '@prisma/client';

// ============================================================================
// IN-APP NOTIFICATION ENTITIES
// ============================================================================

/**
 * Single notification entity for Swagger documentation
 */
export class NotificationEntity {
  @ApiProperty({
    description: 'Unique notification identifier',
    example: 'clx1234567890notif',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: 'clx1234567890tenant',
  })
  tenantId: string;

  @ApiPropertyOptional({
    description: 'User ID (if notification is user-specific)',
    example: 'clx1234567890user',
    nullable: true,
  })
  userId: string | null;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: 'LOW_STOCK',
  })
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'Low Stock Alert',
  })
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Product SKU-001 is running low on stock.',
  })
  message: string;

  @ApiProperty({
    description: 'Notification priority',
    enum: NotificationPriority,
    example: 'HIGH',
  })
  priority: NotificationPriority;

  @ApiProperty({
    description: 'Whether the notification has been read',
    example: false,
  })
  read: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp when notification was read',
    example: '2024-01-15T10:30:00.000Z',
    nullable: true,
  })
  readAt: Date | null;

  @ApiPropertyOptional({
    description: 'Link for navigation when clicking the notification',
    example: '/products/clx1234567890',
    nullable: true,
  })
  link: string | null;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { productId: 'clx1234567890', currentStock: 5 },
    nullable: true,
  })
  metadata: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Pagination metadata for notification responses
 */
export class NotificationPaginationMeta {
  @ApiProperty({
    description: 'Total number of notifications',
    example: 50,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Total unread notifications count',
    example: 12,
  })
  unreadCount: number;
}

/**
 * Paginated notifications response entity
 */
export class PaginatedNotificationsEntity {
  @ApiProperty({
    description: 'Array of notification objects',
    type: [NotificationEntity],
  })
  data: NotificationEntity[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: NotificationPaginationMeta,
  })
  meta: NotificationPaginationMeta;
}

/**
 * Unread count breakdown by type
 */
export class UnreadCountByTypeEntity {
  @ApiPropertyOptional({ example: 3 })
  LOW_STOCK?: number;

  @ApiPropertyOptional({ example: 1 })
  OUT_OF_STOCK?: number;

  @ApiPropertyOptional({ example: 2 })
  NEW_INVOICE?: number;

  @ApiPropertyOptional({ example: 0 })
  INVOICE_PAID?: number;

  @ApiPropertyOptional({ example: 1 })
  INVOICE_OVERDUE?: number;

  @ApiPropertyOptional({ example: 0 })
  PAYMENT_RECEIVED?: number;

  @ApiPropertyOptional({ example: 0 })
  PAYMENT_FAILED?: number;

  @ApiPropertyOptional({ example: 0 })
  NEW_CUSTOMER?: number;

  @ApiPropertyOptional({ example: 0 })
  REPORT_READY?: number;

  @ApiPropertyOptional({ example: 2 })
  SYSTEM?: number;

  @ApiPropertyOptional({ example: 1 })
  INFO?: number;
}

/**
 * Unread count breakdown by priority
 */
export class UnreadCountByPriorityEntity {
  @ApiPropertyOptional({ example: 2 })
  LOW?: number;

  @ApiPropertyOptional({ example: 5 })
  MEDIUM?: number;

  @ApiPropertyOptional({ example: 3 })
  HIGH?: number;

  @ApiPropertyOptional({ example: 1 })
  URGENT?: number;
}

/**
 * Unread count response entity
 */
export class UnreadCountEntity {
  @ApiProperty({
    description: 'Total unread notifications count',
    example: 12,
  })
  count: number;

  @ApiProperty({
    description: 'Unread count breakdown by notification type',
    type: UnreadCountByTypeEntity,
  })
  byType: Record<string, number>;

  @ApiProperty({
    description: 'Unread count breakdown by priority',
    type: UnreadCountByPriorityEntity,
  })
  byPriority: Record<string, number>;
}

/**
 * Bulk operation result entity
 */
export class BulkOperationResultEntity {
  @ApiProperty({
    description: 'Number of notifications affected',
    example: 5,
  })
  count: number;

  @ApiProperty({
    description: 'Success message',
    example: '5 notifications marked as read',
  })
  message: string;
}

// ============================================================================
// EMAIL NOTIFICATION ENTITIES (existing)
// ============================================================================

/**
 * Low stock product entity for notifications
 */
export class LowStockProductEntity {
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
    example: 'DELL-XPS-15-001',
  })
  sku: string;

  @ApiProperty({
    description: 'Current stock quantity',
    example: 3,
  })
  currentStock: number;

  @ApiProperty({
    description: 'Minimum stock threshold',
    example: 10,
  })
  minStock: number;
}

/**
 * Trigger response entity for notification operations
 */
export class TriggerResponseEntity {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the result',
    example: 'Low stock alert sent successfully for 5 product(s).',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Additional details about the operation',
  })
  details?: {
    emailsSent?: number;
    emailsFailed?: number;
    products?: LowStockProductEntity[];
  };
}

/**
 * Low stock preview response entity
 */
export class LowStockPreviewEntity {
  @ApiProperty({
    description: 'List of low stock products',
    type: [LowStockProductEntity],
  })
  products: LowStockProductEntity[];

  @ApiProperty({
    description: 'Total count of low stock products',
    example: 5,
  })
  count: number;
}

/**
 * Notification status response entity
 */
export class NotificationStatusEntity {
  @ApiProperty({
    description: 'Whether email is configured',
    example: true,
  })
  mailConfigured: boolean;

  @ApiProperty({
    description: 'List of scheduled jobs',
    example: [
      'daily-low-stock-alert (9:00 AM)',
      'daily-overdue-invoice-reminder (10:00 AM)',
    ],
  })
  scheduledJobs: string[];

  @ApiProperty({
    description: 'Status message',
    example:
      'Email notifications are enabled via Brevo and scheduled jobs are active.',
  })
  message: string;
}
