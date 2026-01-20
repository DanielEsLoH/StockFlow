import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
