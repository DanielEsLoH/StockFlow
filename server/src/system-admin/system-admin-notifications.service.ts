import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { SystemAdminNotificationType } from '@prisma/client';

interface CreateNotificationDto {
  adminId?: string;
  type: SystemAdminNotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

interface NotificationFilters {
  type?: SystemAdminNotificationType;
  read?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class SystemAdminNotificationsService {
  private readonly logger = new Logger(SystemAdminNotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new system admin notification.
   *
   * @param dto - Notification data
   * @returns Created notification
   */
  async create(dto: CreateNotificationDto) {
    this.logger.debug(
      `Creating notification: type=${dto.type}, adminId=${dto.adminId ?? 'broadcast'}`,
    );

    return this.prisma.systemAdminNotification.create({
      data: {
        adminId: dto.adminId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        link: dto.link,
        metadata: dto.metadata,
      },
    });
  }

  /**
   * Broadcasts a notification to all admins (adminId = null).
   *
   * @param dto - Notification data without adminId
   * @returns Created notification
   */
  async broadcast(dto: Omit<CreateNotificationDto, 'adminId'>) {
    return this.create({ ...dto, adminId: undefined });
  }

  /**
   * Gets paginated notifications for an admin (including broadcast notifications).
   *
   * @param adminId - The admin ID
   * @param filters - Optional filters for type, read status, pagination
   * @returns Paginated notifications with metadata
   */
  async findAll(adminId: string, filters: NotificationFilters = {}) {
    const { type, read, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ adminId }, { adminId: null }],
      ...(type && { type }),
      ...(read !== undefined && { read }),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.systemAdminNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.systemAdminNotification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets the most recent notifications for an admin (for dropdown display).
   *
   * @param adminId - The admin ID
   * @param limit - Max number of notifications to return (default 5)
   * @returns Array of recent notifications
   */
  async findRecent(adminId: string, limit = 5) {
    return this.prisma.systemAdminNotification.findMany({
      where: { OR: [{ adminId }, { adminId: null }] },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Gets the count of unread notifications for an admin.
   *
   * @param adminId - The admin ID
   * @returns Unread count
   */
  async getUnreadCount(adminId: string) {
    return this.prisma.systemAdminNotification.count({
      where: {
        OR: [{ adminId }, { adminId: null }],
        read: false,
      },
    });
  }

  /**
   * Marks a specific notification as read.
   *
   * @param id - Notification ID
   * @returns Updated notification
   * @throws NotFoundException if notification does not exist
   */
  async markAsRead(id: string) {
    const notification =
      await this.prisma.systemAdminNotification.findUnique({ where: { id } });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.systemAdminNotification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  /**
   * Marks all notifications for an admin as read.
   *
   * @param adminId - The admin ID
   * @returns Batch update result
   */
  async markAllAsRead(adminId: string) {
    return this.prisma.systemAdminNotification.updateMany({
      where: {
        OR: [{ adminId }, { adminId: null }],
        read: false,
      },
      data: { read: true, readAt: new Date() },
    });
  }

  /**
   * Deletes a specific notification.
   *
   * @param id - Notification ID
   * @returns Deleted notification
   */
  async delete(id: string) {
    const notification =
      await this.prisma.systemAdminNotification.findUnique({ where: { id } });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.systemAdminNotification.delete({ where: { id } });
  }

  /**
   * Deletes all read notifications for an admin.
   *
   * @param adminId - The admin ID
   * @returns Batch delete result
   */
  async clearRead(adminId: string) {
    return this.prisma.systemAdminNotification.deleteMany({
      where: {
        OR: [{ adminId }, { adminId: null }],
        read: true,
      },
    });
  }
}
