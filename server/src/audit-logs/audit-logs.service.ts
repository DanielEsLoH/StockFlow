import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { QueryAuditLogsDto } from './dto';

/**
 * Data required to create an audit log entry.
 */
export interface CreateAuditLogData {
  tenantId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Audit log response with optional user information.
 */
export interface AuditLogResponse {
  id: string;
  tenantId: string;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues: Prisma.JsonValue | null;
  newValues: Prisma.JsonValue | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

/**
 * Paginated response for audit log queries.
 */
export interface PaginatedAuditLogsResponse {
  data: AuditLogResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Audit statistics for a tenant.
 */
export interface AuditStatsResponse {
  totalLogs: number;
  actionBreakdown: Record<AuditAction, number>;
  entityTypeBreakdown: Record<string, number>;
  topUsers: Array<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    count: number;
  }>;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * Date range filter for statistics.
 */
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

/**
 * AuditLogsService handles all audit log operations including
 * creating, querying, and managing audit trail records.
 *
 * All operations are tenant-scoped for proper multi-tenant isolation.
 */
@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new audit log entry.
   *
   * This method is designed to be resilient - it catches and logs
   * any errors rather than throwing them, to avoid breaking the
   * main operation being audited.
   *
   * @param data - The audit log data to create
   * @returns The created audit log entry, or null if creation failed
   */
  async create(data: CreateAuditLogData): Promise<AuditLog | null> {
    try {
      this.logger.debug(
        `Creating audit log: ${data.action} ${data.entityType} ${data.entityId}`,
      );

      const auditLog = await this.prisma.auditLog.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          oldValues: data.oldValues as Prisma.InputJsonValue | undefined,
          newValues: data.newValues as Prisma.InputJsonValue | undefined,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: data.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      this.logger.log(
        `Audit log created: ${auditLog.id} (${data.action} ${data.entityType} ${data.entityId})`,
      );

      return auditLog;
    } catch (error) {
      // Log the error but don't throw - audit logging should not break main operations
      this.logger.error(
        `Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  /**
   * Queries audit logs with filters and pagination.
   *
   * @param tenantId - The tenant ID to filter by
   * @param query - Query parameters including filters and pagination
   * @returns Paginated list of audit logs
   */
  async findAll(
    tenantId: string,
    query: QueryAuditLogsDto = {},
  ): Promise<PaginatedAuditLogsResponse> {
    const {
      action,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;

    this.logger.debug(
      `Querying audit logs for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    // Build where clause
    const where: Prisma.AuditLogWhereInput = { tenantId };

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [auditLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: auditLogs.map((log) => this.mapToResponse(log)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  /**
   * Gets the audit history for a specific entity.
   *
   * @param tenantId - The tenant ID
   * @param entityType - The entity type (e.g., 'Product', 'User')
   * @param entityId - The entity's ID
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns Paginated list of audit logs for the entity
   */
  async findByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedAuditLogsResponse> {
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Getting audit history for ${entityType} ${entityId} in tenant ${tenantId}`,
    );

    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      entityType,
      entityId,
    };

    const [auditLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: auditLogs.map((log) => this.mapToResponse(log)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  /**
   * Gets all audit logs for a specific user's actions.
   *
   * @param tenantId - The tenant ID
   * @param userId - The user's ID
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns Paginated list of audit logs by the user
   */
  async findByUser(
    tenantId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedAuditLogsResponse> {
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Getting audit logs for user ${userId} in tenant ${tenantId}`,
    );

    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      userId,
    };

    const [auditLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: auditLogs.map((log) => this.mapToResponse(log)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  /**
   * Gets audit statistics for a tenant within an optional date range.
   *
   * @param tenantId - The tenant ID
   * @param dateRange - Optional date range filter
   * @returns Audit statistics including action breakdown, entity types, top users, and recent activity
   */
  async getStats(
    tenantId: string,
    dateRange: DateRangeFilter = {},
  ): Promise<AuditStatsResponse> {
    const { startDate, endDate } = dateRange;

    this.logger.debug(`Getting audit stats for tenant ${tenantId}`);

    // Build where clause for date range
    const where: Prisma.AuditLogWhereInput = { tenantId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get total count
    const totalLogs = await this.prisma.auditLog.count({ where });

    // Get action breakdown using groupBy
    const actionGroups = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { action: true },
    });

    const actionBreakdown = Object.values(AuditAction).reduce(
      (acc, action) => {
        const group = actionGroups.find((g) => g.action === action);
        acc[action] = group?._count?.action ?? 0;
        return acc;
      },
      {} as Record<AuditAction, number>,
    );

    // Get entity type breakdown
    const entityTypeGroups = await this.prisma.auditLog.groupBy({
      by: ['entityType'],
      where,
      _count: { entityType: true },
    });

    const entityTypeBreakdown = entityTypeGroups.reduce(
      (acc, group) => {
        acc[group.entityType] = group._count?.entityType ?? 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Get top users (top 10)
    const userGroups = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: { ...where, userId: { not: null } },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    });

    // Fetch user details for top users
    const userIds = userGroups
      .map((g) => g.userId)
      .filter((id): id is string => id !== null);

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const topUsers = userGroups
      .filter((g) => g.userId !== null)
      .map((group) => {
        const user = userMap.get(group.userId!);
        return {
          userId: group.userId!,
          email: user?.email ?? 'Unknown',
          firstName: user?.firstName ?? 'Unknown',
          lastName: user?.lastName ?? 'User',
          count: group._count?.userId ?? 0,
        };
      });

    // Get recent activity (last 30 days, grouped by date)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentWhere: Prisma.AuditLogWhereInput = {
      ...where,
      createdAt: {
        ...(where.createdAt as Prisma.DateTimeFilter),
        gte: thirtyDaysAgo,
      },
    };

    const recentLogs = await this.prisma.auditLog.findMany({
      where: recentWhere,
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // Group by date
    const activityByDate = new Map<string, number>();
    recentLogs.forEach((log) => {
      const dateKey = log.createdAt.toISOString().split('T')[0];
      activityByDate.set(dateKey, (activityByDate.get(dateKey) ?? 0) + 1);
    });

    const recentActivity = Array.from(activityByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      totalLogs,
      actionBreakdown,
      entityTypeBreakdown,
      topUsers,
      recentActivity,
    };
  }

  /**
   * Deletes old audit logs based on a retention policy.
   *
   * @param tenantId - The tenant ID
   * @param olderThan - Delete logs older than this date
   * @returns The count of deleted records
   */
  async cleanup(tenantId: string, olderThan: Date): Promise<number> {
    this.logger.log(
      `Cleaning up audit logs older than ${olderThan.toISOString()} for tenant ${tenantId}`,
    );

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        tenantId,
        createdAt: { lt: olderThan },
      },
    });

    this.logger.log(
      `Deleted ${result.count} audit logs for tenant ${tenantId}`,
    );

    return result.count;
  }

  /**
   * Maps an audit log entity to response format.
   */
  private mapToResponse(
    log: AuditLog & {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
      } | null;
    },
  ): AuditLogResponse {
    return {
      id: log.id,
      tenantId: log.tenantId,
      userId: log.userId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      oldValues: log.oldValues,
      newValues: log.newValues,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
      createdAt: log.createdAt,
      user: log.user ?? null,
    };
  }
}
