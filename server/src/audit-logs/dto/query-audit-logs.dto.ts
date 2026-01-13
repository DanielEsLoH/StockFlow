import {
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
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
  @IsOptional()
  @IsEnum(AuditAction, {
    message: `action must be one of: ${Object.values(AuditAction).join(', ')}`,
  })
  action?: AuditAction;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'startDate must be a valid ISO 8601 date string' },
  )
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date string' })
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
