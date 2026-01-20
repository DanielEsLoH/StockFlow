import {
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AuditAction } from '@prisma/client';

/**
 * DTO for querying audit logs with filters and pagination.
 *
 * Supports filtering by:
 * - action: The type of action performed (CREATE, UPDATE, DELETE, etc.)
 * - entityType: The type of entity affected (User, Product, Invoice, etc.)
 * - entityId: Specific entity ID to filter by
 * - userId: Filter logs by the user who performed the action
 * - startDate/endDate: Date range filter for createdAt
 *
 * Pagination:
 * - page: Page number (1-indexed, default: 1)
 * - limit: Items per page (1-100, default: 20)
 */
export class QueryAuditLogsDto {
  @ApiPropertyOptional({
    description: 'Filter by action type',
    enum: AuditAction,
    example: 'CREATE',
  })
  @IsOptional()
  @IsEnum(AuditAction, {
    message: `action must be one of: ${Object.values(AuditAction).join(', ')}`,
  })
  action?: AuditAction;

  @ApiPropertyOptional({
    description: 'Filter by entity type (e.g., User, Product, Invoice)',
    example: 'Product',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific entity ID',
    example: 'clx1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID who performed the action',
    example: 'clx1234567890user',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter logs from this date (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'startDate must be a valid ISO 8601 date string' },
  )
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter logs until this date (ISO 8601 format)',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date string' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page (max: 100)',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
