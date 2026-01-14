import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';

/**
 * Audit log entity for Swagger documentation
 */
export class AuditLogEntity {
  @ApiProperty({
    description: 'Unique identifier for the audit log',
    example: 'cmkcykam80004reya0hsdx337',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID this log belongs to',
    example: 'cmkcykam80001reya0hsdx334',
  })
  tenantId: string;

  @ApiPropertyOptional({
    description: 'User ID who performed the action',
    example: 'cmkcykam80002reya0hsdx335',
    nullable: true,
  })
  userId: string | null;

  @ApiProperty({
    description: 'Action performed',
    enum: AuditAction,
    example: 'CREATE',
  })
  action: AuditAction;

  @ApiProperty({
    description: 'Entity type affected',
    example: 'Product',
  })
  entityType: string;

  @ApiProperty({
    description: 'Entity ID affected',
    example: 'cmkcykam80003reya0hsdx336',
  })
  entityId: string;

  @ApiPropertyOptional({
    description: 'Old values before the change (for UPDATE actions)',
    example: { name: 'Old Name', price: 100 },
    nullable: true,
  })
  oldValues: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: 'New values after the change',
    example: { name: 'New Name', price: 150 },
    nullable: true,
  })
  newValues: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: 'IP address of the request',
    example: '192.168.1.100',
    nullable: true,
  })
  ipAddress: string | null;

  @ApiPropertyOptional({
    description: 'User agent of the request',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    nullable: true,
  })
  userAgent: string | null;

  @ApiProperty({
    description: 'Audit log creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;
}

/**
 * Paginated audit logs response for Swagger documentation
 */
export class PaginatedAuditLogsEntity {
  @ApiProperty({
    description: 'Array of audit logs',
    type: [AuditLogEntity],
  })
  data: AuditLogEntity[];

  @ApiProperty({
    description: 'Total number of audit logs matching the query',
    example: 5000,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 250,
  })
  totalPages: number;
}

/**
 * Audit action count entity
 */
export class AuditActionCountEntity {
  @ApiProperty({
    description: 'Action type',
    enum: AuditAction,
    example: 'CREATE',
  })
  action: AuditAction;

  @ApiProperty({
    description: 'Count of this action',
    example: 150,
  })
  count: number;
}

/**
 * Audit entity type count entity
 */
export class AuditEntityTypeCountEntity {
  @ApiProperty({
    description: 'Entity type',
    example: 'Product',
  })
  entityType: string;

  @ApiProperty({
    description: 'Count of logs for this entity type',
    example: 500,
  })
  count: number;
}

/**
 * Audit statistics response entity
 */
export class AuditStatsEntity {
  @ApiProperty({
    description: 'Total number of audit logs',
    example: 5000,
  })
  totalLogs: number;

  @ApiProperty({
    description: 'Logs by action type',
    type: [AuditActionCountEntity],
  })
  byAction: AuditActionCountEntity[];

  @ApiProperty({
    description: 'Logs by entity type',
    type: [AuditEntityTypeCountEntity],
  })
  byEntityType: AuditEntityTypeCountEntity[];

  @ApiProperty({
    description: 'Number of unique users who performed actions',
    example: 15,
  })
  uniqueUsers: number;
}

/**
 * Cleanup response entity
 */
export class AuditCleanupResponseEntity {
  @ApiProperty({
    description: 'Number of deleted audit log records',
    example: 1500,
  })
  deleted: number;
}