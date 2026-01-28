import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationPriority } from '@prisma/client';

/**
 * Data transfer object for creating an in-app notification.
 * Used for system-generated or admin-created notifications.
 */
export class CreateNotificationDto {
  /**
   * Notification type
   * @example "LOW_STOCK"
   */
  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: 'LOW_STOCK',
  })
  @IsEnum(NotificationType, {
    message:
      'Type must be a valid notification type (LOW_STOCK, OUT_OF_STOCK, NEW_INVOICE, etc.)',
  })
  @IsNotEmpty({ message: 'Type is required' })
  type: NotificationType;

  /**
   * Notification title
   * @example "Low Stock Alert"
   */
  @ApiProperty({
    description: 'Notification title',
    example: 'Low Stock Alert',
    maxLength: 255,
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title: string;

  /**
   * Notification message body
   * @example "Product SKU-001 is running low on stock. Current: 5, Minimum: 10."
   */
  @ApiProperty({
    description: 'Notification message body',
    example:
      'Product SKU-001 is running low on stock. Current: 5, Minimum: 10.',
    maxLength: 2000,
  })
  @IsString({ message: 'Message must be a string' })
  @IsNotEmpty({ message: 'Message is required' })
  @MaxLength(2000, { message: 'Message must not exceed 2000 characters' })
  message: string;

  /**
   * Notification priority
   * @example "HIGH"
   */
  @ApiPropertyOptional({
    description: 'Notification priority (defaults to MEDIUM)',
    enum: NotificationPriority,
    example: 'HIGH',
    default: 'MEDIUM',
  })
  @IsEnum(NotificationPriority, {
    message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT',
  })
  @IsOptional()
  priority?: NotificationPriority;

  /**
   * Optional user ID to target a specific user within the tenant.
   * If not provided, the notification is tenant-wide.
   * @example "clx1234567890user"
   */
  @ApiPropertyOptional({
    description:
      'User ID to target (if not provided, notification is tenant-wide)',
    example: 'clx1234567890user',
  })
  @IsString({ message: 'User ID must be a string' })
  @IsOptional()
  userId?: string;

  /**
   * Optional link for navigation when clicking the notification
   * @example "/products/clx1234567890"
   */
  @ApiPropertyOptional({
    description: 'Link for navigation when clicking the notification',
    example: '/products/clx1234567890',
    maxLength: 500,
  })
  @IsString({ message: 'Link must be a string' })
  @MaxLength(500, { message: 'Link must not exceed 500 characters' })
  @IsOptional()
  link?: string;

  /**
   * Optional metadata object for additional context
   * @example { "productId": "clx1234567890", "currentStock": 5, "minStock": 10 }
   */
  @ApiPropertyOptional({
    description: 'Additional metadata object',
    example: { productId: 'clx1234567890', currentStock: 5, minStock: 10 },
  })
  @IsObject({ message: 'Metadata must be an object' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
