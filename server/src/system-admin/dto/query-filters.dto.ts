import { IsString, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  UserStatus,
  UserRole,
  TenantStatus,
  SubscriptionPlan,
} from '@prisma/client';

/**
 * Base pagination DTO
 */
export class PaginationDto {
  /**
   * Page number (1-indexed)
   * @example 1
   */
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @IsOptional()
  page?: number = 1;

  /**
   * Number of items per page
   * @example 20
   */
  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must be at most 100' })
  @IsOptional()
  limit?: number = 20;
}

/**
 * Query filters for listing users
 */
export class UsersQueryDto extends PaginationDto {
  /**
   * Filter by user status
   * @example "PENDING"
   */
  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: UserStatus,
    example: UserStatus.PENDING,
  })
  @IsEnum(UserStatus, {
    message: `Status must be one of: ${Object.values(UserStatus).join(', ')}`,
  })
  @IsOptional()
  status?: UserStatus;

  /**
   * Filter by user role
   * @example "ADMIN"
   */
  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsEnum(UserRole, {
    message: `Role must be one of: ${Object.values(UserRole).join(', ')}`,
  })
  @IsOptional()
  role?: UserRole;

  /**
   * Filter by tenant ID
   * @example "clx1234567890tenant"
   */
  @ApiPropertyOptional({
    description: 'Filter by tenant ID',
    example: 'clx1234567890tenant',
  })
  @IsString({ message: 'Tenant ID must be a string' })
  @IsOptional()
  tenantId?: string;

  /**
   * Search by email or name
   * @example "john"
   */
  @ApiPropertyOptional({
    description: 'Search by email, first name, or last name',
    example: 'john',
  })
  @IsString({ message: 'Search must be a string' })
  @IsOptional()
  search?: string;
}

/**
 * Query filters for listing pending users
 */
export class PendingUsersQueryDto extends PaginationDto {
  /**
   * Filter by tenant ID
   * @example "clx1234567890tenant"
   */
  @ApiPropertyOptional({
    description: 'Filter by tenant ID',
    example: 'clx1234567890tenant',
  })
  @IsString({ message: 'Tenant ID must be a string' })
  @IsOptional()
  tenantId?: string;

  /**
   * Search by email or name
   * @example "john"
   */
  @ApiPropertyOptional({
    description: 'Search by email, first name, or last name',
    example: 'john',
  })
  @IsString({ message: 'Search must be a string' })
  @IsOptional()
  search?: string;
}

/**
 * Query filters for listing tenants
 */
export class TenantsQueryDto extends PaginationDto {
  /**
   * Filter by tenant status
   * @example "ACTIVE"
   */
  @ApiPropertyOptional({
    description: 'Filter by tenant status',
    enum: TenantStatus,
    example: TenantStatus.ACTIVE,
  })
  @IsEnum(TenantStatus, {
    message: `Status must be one of: ${Object.values(TenantStatus).join(', ')}`,
  })
  @IsOptional()
  status?: TenantStatus;

  /**
   * Filter by subscription plan
   * @example "PRO"
   */
  @ApiPropertyOptional({
    description: 'Filter by subscription plan',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.PRO,
  })
  @IsEnum(SubscriptionPlan, {
    message: `Plan must be one of: ${Object.values(SubscriptionPlan).join(', ')}`,
  })
  @IsOptional()
  plan?: SubscriptionPlan;

  /**
   * Search by name, slug, or email
   * @example "acme"
   */
  @ApiPropertyOptional({
    description: 'Search by name, slug, or email',
    example: 'acme',
  })
  @IsString({ message: 'Search must be a string' })
  @IsOptional()
  search?: string;
}
