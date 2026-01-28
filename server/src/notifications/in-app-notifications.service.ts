import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  Prisma,
  type Prisma as PrismaTypes,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  FilterNotificationsDto,
  CreateNotificationDto,
  BulkNotificationIdsDto,
} from './dto';

/**
 * Single notification response data
 */
export interface NotificationResponse {
  id: string;
  tenantId: string;
  userId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  readAt: Date | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated notifications response matching frontend expectations
 */
export interface PaginatedNotificationsResponse {
  data: NotificationResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  };
}

/**
 * Unread count response with breakdown by type and priority
 */
export interface UnreadCountResponse {
  count: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  count: number;
  message: string;
}

/**
 * InAppNotificationsService
 *
 * Handles all in-app notification CRUD operations for the StockFlow application.
 * This service is separate from the email NotificationsService to maintain
 * clear separation of concerns.
 *
 * All operations are tenant-scoped using TenantContextService.
 *
 * Features:
 * - CRUD operations for in-app notifications
 * - Pagination and filtering support
 * - Bulk read/unread/delete operations
 * - Unread count with breakdown by type and priority
 */
@Injectable()
export class InAppNotificationsService {
  private readonly logger = new Logger(InAppNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  /**
   * Lists all notifications for the current tenant with filtering and pagination.
   *
   * @param filters - Filter and pagination options
   * @returns Paginated list of notifications with unread count
   */
  async findAll(
    filters: FilterNotificationsDto = {},
  ): Promise<PaginatedNotificationsResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const { page = 1, limit = 10, type, priority, read, search } = filters;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing notifications for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    // Build where clause
    const where: Prisma.NotificationWhereInput = { tenantId };

    if (type) {
      where.type = type;
    }

    if (priority) {
      where.priority = priority;
    }

    if (read !== undefined) {
      where.read = read;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { tenantId, read: false },
      }),
    ]);

    return this.buildPaginatedResponse(
      notifications,
      total,
      page,
      limit,
      unreadCount,
    );
  }

  /**
   * Gets recent notifications for dropdown display.
   *
   * @param limitNum - Maximum number of notifications to return (default: 5)
   * @returns Array of recent notifications
   */
  async findRecent(limitNum = 5): Promise<NotificationResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Getting ${limitNum} recent notifications for tenant ${tenantId}`,
    );

    const notifications = await this.prisma.notification.findMany({
      where: { tenantId },
      take: Math.min(limitNum, 20), // Cap at 20 to prevent abuse
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((n) => this.mapToNotificationResponse(n));
  }

  /**
   * Gets unread notification count with breakdown by type and priority.
   *
   * @returns Unread count with breakdowns
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Getting unread count for tenant ${tenantId}`);

    // Get total unread count
    const totalCount = await this.prisma.notification.count({
      where: { tenantId, read: false },
    });

    // Get unread notifications to calculate breakdowns
    const unreadNotifications = await this.prisma.notification.findMany({
      where: { tenantId, read: false },
      select: { type: true, priority: true },
    });

    // Calculate breakdown by type
    const byType: Record<string, number> = {};
    for (const notif of unreadNotifications) {
      byType[notif.type] = (byType[notif.type] || 0) + 1;
    }

    // Calculate breakdown by priority
    const byPriority: Record<string, number> = {};
    for (const notif of unreadNotifications) {
      byPriority[notif.priority] = (byPriority[notif.priority] || 0) + 1;
    }

    return {
      count: totalCount,
      byType,
      byPriority,
    };
  }

  /**
   * Finds a single notification by ID within the current tenant.
   *
   * @param id - Notification ID
   * @returns Notification data
   * @throws NotFoundException if notification not found
   */
  async findOne(id: string): Promise<NotificationResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding notification ${id} in tenant ${tenantId}`);

    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId },
    });

    if (!notification) {
      this.logger.warn(`Notification not found: ${id}`);
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return this.mapToNotificationResponse(notification);
  }

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================

  /**
   * Creates a new notification within the current tenant.
   *
   * @param dto - Notification creation data
   * @returns Created notification data
   * @throws BadRequestException if userId is provided but user doesn't exist in tenant
   */
  async create(dto: CreateNotificationDto): Promise<NotificationResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Creating notification "${dto.title}" in tenant ${tenantId}`,
    );

    // Validate userId if provided
    if (dto.userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, tenantId },
      });

      if (!user) {
        throw new BadRequestException(
          `User with ID ${dto.userId} not found in this tenant`,
        );
      }
    }

    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        userId: dto.userId || null,
        type: dto.type,
        title: dto.title.trim(),
        message: dto.message.trim(),
        priority: dto.priority || NotificationPriority.MEDIUM,
        link: dto.link?.trim() || null,
        metadata: dto.metadata as PrismaTypes.InputJsonValue | undefined,
      },
    });

    this.logger.log(
      `Notification created: ${notification.title} (${notification.id})`,
    );

    return this.mapToNotificationResponse(notification);
  }

  // ============================================================================
  // UPDATE OPERATIONS
  // ============================================================================

  /**
   * Marks a single notification as read.
   *
   * @param id - Notification ID
   * @returns Updated notification data
   * @throws NotFoundException if notification not found
   */
  async markAsRead(id: string): Promise<NotificationResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Marking notification ${id} as read in tenant ${tenantId}`);

    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    // If already read, just return it
    if (notification.read) {
      return this.mapToNotificationResponse(notification);
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    this.logger.log(`Notification marked as read: ${id}`);

    return this.mapToNotificationResponse(updated);
  }

  /**
   * Marks a single notification as unread.
   *
   * @param id - Notification ID
   * @returns Updated notification data
   * @throws NotFoundException if notification not found
   */
  async markAsUnread(id: string): Promise<NotificationResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Marking notification ${id} as unread in tenant ${tenantId}`,
    );

    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    // If already unread, just return it
    if (!notification.read) {
      return this.mapToNotificationResponse(notification);
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        read: false,
        readAt: null,
      },
    });

    this.logger.log(`Notification marked as unread: ${id}`);

    return this.mapToNotificationResponse(updated);
  }

  /**
   * Marks multiple notifications as read.
   *
   * @param dto - Object containing array of notification IDs
   * @returns Bulk operation result
   */
  async markManyAsRead(dto: BulkNotificationIdsDto): Promise<BulkOperationResult> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Marking ${dto.ids.length} notifications as read in tenant ${tenantId}`,
    );

    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: dto.ids },
        tenantId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    this.logger.log(`${result.count} notifications marked as read`);

    return {
      count: result.count,
      message: `${result.count} notification(s) marked as read`,
    };
  }

  /**
   * Marks all notifications as read for the current tenant.
   *
   * @returns Bulk operation result
   */
  async markAllAsRead(): Promise<BulkOperationResult> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Marking all notifications as read in tenant ${tenantId}`);

    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    this.logger.log(`${result.count} notifications marked as read (all)`);

    return {
      count: result.count,
      message: `${result.count} notification(s) marked as read`,
    };
  }

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  /**
   * Deletes a single notification.
   *
   * @param id - Notification ID
   * @throws NotFoundException if notification not found
   */
  async delete(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting notification ${id} in tenant ${tenantId}`);

    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    await this.prisma.notification.delete({ where: { id } });

    this.logger.log(`Notification deleted: ${id}`);
  }

  /**
   * Deletes multiple notifications.
   *
   * @param dto - Object containing array of notification IDs
   * @returns Bulk operation result
   */
  async deleteMany(dto: BulkNotificationIdsDto): Promise<BulkOperationResult> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Deleting ${dto.ids.length} notifications in tenant ${tenantId}`,
    );

    const result = await this.prisma.notification.deleteMany({
      where: {
        id: { in: dto.ids },
        tenantId,
      },
    });

    this.logger.log(`${result.count} notifications deleted`);

    return {
      count: result.count,
      message: `${result.count} notification(s) deleted`,
    };
  }

  /**
   * Deletes all read notifications for the current tenant.
   *
   * @returns Bulk operation result
   */
  async clearRead(): Promise<BulkOperationResult> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Clearing read notifications in tenant ${tenantId}`);

    const result = await this.prisma.notification.deleteMany({
      where: {
        tenantId,
        read: true,
      },
    });

    this.logger.log(`${result.count} read notifications cleared`);

    return {
      count: result.count,
      message: `${result.count} read notification(s) deleted`,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Maps a Notification entity to a NotificationResponse object.
   *
   * @param notification - The notification entity to map
   * @returns NotificationResponse object
   */
  private mapToNotificationResponse(
    notification: Notification,
  ): NotificationResponse {
    return {
      id: notification.id,
      tenantId: notification.tenantId,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      read: notification.read,
      readAt: notification.readAt,
      link: notification.link,
      metadata: notification.metadata as Record<string, unknown> | null,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  /**
   * Builds a paginated response from notifications and pagination params.
   */
  private buildPaginatedResponse(
    notifications: Notification[],
    total: number,
    page: number,
    limit: number,
    unreadCount: number,
  ): PaginatedNotificationsResponse {
    return {
      data: notifications.map((n) => this.mapToNotificationResponse(n)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
        unreadCount,
      },
    };
  }
}
