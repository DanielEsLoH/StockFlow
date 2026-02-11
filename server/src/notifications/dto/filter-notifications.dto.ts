import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { PaginationDto } from '../../common/dto';

/**
 * Data transfer object for filtering and paginating in-app notifications.
 * Extends PaginationDto for page-based pagination support.
 */
export class FilterNotificationsDto extends PaginationDto {
  /**
   * Filter by notification type
   * @example "LOW_STOCK"
   */
  @ApiPropertyOptional({
    description: 'Filter by notification type',
    enum: NotificationType,
    example: 'LOW_STOCK',
  })
  @IsEnum(NotificationType, {
    message:
      'Type must be a valid notification type (LOW_STOCK, OUT_OF_STOCK, NEW_INVOICE, etc.)',
  })
  @IsOptional()
  type?: NotificationType;

  /**
   * Filter by notification priority
   * @example "HIGH"
   */
  @ApiPropertyOptional({
    description: 'Filter by notification priority',
    enum: NotificationPriority,
    example: 'HIGH',
  })
  @IsEnum(NotificationPriority, {
    message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT',
  })
  @IsOptional()
  priority?: NotificationPriority;

  /**
   * Filter by read status
   * @example false
   */
  @ApiPropertyOptional({
    description: 'Filter by read status (true for read, false for unread)',
    example: false,
    type: Boolean,
  })
  @IsBoolean({ message: 'read must be a boolean' })
  @Transform(({ obj, key }): boolean | undefined => {
    const raw = obj[key];
    if (raw === 'true' || raw === true) return true;
    if (raw === 'false' || raw === false) return false;
    return undefined;
  })
  @IsOptional()
  read?: boolean;

  /**
   * Search term for title or message (case-insensitive)
   * @example "low stock"
   */
  @ApiPropertyOptional({
    description: 'Search term for title or message (case-insensitive)',
    example: 'low stock',
  })
  @IsString({ message: 'Search must be a string' })
  @IsOptional()
  search?: string;
}
