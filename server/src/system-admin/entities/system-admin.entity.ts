import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SystemAdminRole, SystemAdminStatus } from '../types';

/**
 * System admin user data returned in authentication responses
 */
export class SystemAdminUserEntity {
  @ApiProperty({
    description: 'Unique system admin identifier',
    example: 'clx1234567890admin',
  })
  id: string;

  @ApiProperty({
    description: 'System admin email address',
    example: 'admin@stockflow.com',
  })
  email: string;

  @ApiProperty({
    description: 'System admin first name',
    example: 'System',
  })
  firstName: string;

  @ApiProperty({
    description: 'System admin last name',
    example: 'Admin',
  })
  lastName: string;

  @ApiProperty({
    description: 'System admin role',
    enum: SystemAdminRole,
    example: SystemAdminRole.SUPER_ADMIN,
  })
  role: SystemAdminRole;

  @ApiProperty({
    description: 'System admin account status',
    enum: SystemAdminStatus,
    example: SystemAdminStatus.ACTIVE,
  })
  status: SystemAdminStatus;
}

/**
 * Response structure for successful system admin authentication
 */
export class SystemAdminAuthResponseEntity {
  @ApiProperty({
    description: 'Authenticated system admin data',
    type: SystemAdminUserEntity,
  })
  admin: SystemAdminUserEntity;

  @ApiProperty({
    description: 'JWT access token (short-lived)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaXNTeXN0ZW1BZG1pbiI6dHJ1ZX0.abc123',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token (long-lived)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidHlwZSI6InJlZnJlc2gifQ.xyz789',
  })
  refreshToken: string;
}

/**
 * Response structure for successful system admin logout
 */
export class SystemAdminLogoutResponseEntity {
  @ApiProperty({
    description: 'Logout confirmation message',
    example: 'Logged out successfully',
  })
  message: string;
}

/**
 * User list item for admin responses
 */
export class UserListItemEntity {
  @ApiProperty({
    description: 'User unique identifier',
    example: 'clx1234567890user',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@company.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'User role within tenant',
    enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'],
    example: 'ADMIN',
  })
  role: string;

  @ApiProperty({
    description: 'User account status',
    enum: ['ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE'],
    example: 'ACTIVE',
  })
  status: string;

  @ApiProperty({
    description: 'Tenant ID the user belongs to',
    example: 'clx1234567890tenant',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Name of the tenant the user belongs to',
    example: 'Acme Corporation',
  })
  tenantName: string;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-20T14:45:00.000Z',
    nullable: true,
  })
  lastLoginAt: Date | null;
}

/**
 * Tenant list item for admin responses
 */
export class TenantListItemEntity {
  @ApiProperty({
    description: 'Tenant unique identifier',
    example: 'clx1234567890tenant',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant name',
    example: 'Acme Corporation',
  })
  name: string;

  @ApiProperty({
    description: 'Tenant URL slug',
    example: 'acme-corporation',
  })
  slug: string;

  @ApiProperty({
    description: 'Tenant contact email',
    example: 'contact@acme.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'Tenant contact phone',
    example: '+1-555-123-4567',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: 'Tenant status',
    enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE', 'TRIAL'],
    example: 'ACTIVE',
  })
  status: string;

  @ApiProperty({
    description: 'Tenant subscription plan',
    enum: ['EMPRENDEDOR', 'PYME', 'PRO', 'PLUS'],
    example: 'PRO',
    nullable: true,
  })
  plan: string | null;

  @ApiProperty({
    description: 'Number of users in the tenant',
    example: 15,
  })
  userCount: number;

  @ApiProperty({
    description: 'Tenant creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Tenant last update timestamp',
    example: '2024-01-20T12:00:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Pagination metadata
 */
export class PaginationMetaEntity {
  @ApiProperty({
    description: 'Total number of items',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPreviousPage: boolean;
}

/**
 * Paginated user list response
 */
export class UserListResponseEntity {
  @ApiProperty({
    description: 'List of users',
    type: [UserListItemEntity],
  })
  data: UserListItemEntity[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaEntity,
  })
  meta: PaginationMetaEntity;
}

/**
 * Paginated tenant list response
 */
export class TenantListResponseEntity {
  @ApiProperty({
    description: 'List of tenants',
    type: [TenantListItemEntity],
  })
  data: TenantListItemEntity[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaEntity,
  })
  meta: PaginationMetaEntity;
}

/**
 * User action result response
 */
export class UserActionResultEntity {
  @ApiProperty({
    description: 'Whether the action was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Result message',
    example: 'User john.doe@company.com has been approved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'ID of the affected user',
    example: 'clx1234567890user',
  })
  userId: string;

  @ApiProperty({
    description: 'The action that was performed',
    enum: ['approve', 'suspend', 'delete'],
    example: 'approve',
  })
  action: 'approve' | 'suspend' | 'delete';
}

/**
 * Tenant action result response
 */
export class TenantActionResultEntity {
  @ApiProperty({
    description: 'Whether the action was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Result message',
    example: 'Tenant Acme Corporation plan changed from BASIC to PRO',
  })
  message: string;

  @ApiProperty({
    description: 'ID of the affected tenant',
    example: 'clx1234567890tenant',
  })
  tenantId: string;

  @ApiProperty({
    description: 'The action that was performed',
    enum: ['change_plan'],
    example: 'change_plan',
  })
  action: 'change_plan';

  @ApiPropertyOptional({
    description: 'Previous subscription plan',
    enum: ['EMPRENDEDOR', 'PYME', 'PRO', 'PLUS'],
    example: 'PYME',
  })
  previousPlan?: string;

  @ApiPropertyOptional({
    description: 'New subscription plan',
    enum: ['EMPRENDEDOR', 'PYME', 'PRO', 'PLUS'],
    example: 'PRO',
  })
  newPlan?: string;
}
