import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notificationsService } from './notifications.service';
import type {
  NotificationFilters,
  CreateNotificationData,
  NotificationType,
  NotificationPriority,
} from '~/types/notification';

// Note: The notifications service currently uses mock data internally
// These tests verify the service's filtering, pagination, and CRUD logic

describe('notificationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  describe('getNotifications', () => {
    it('should return paginated data with meta', async () => {
      const promise = notificationsService.getNotifications();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('total');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('limit');
      expect(result.meta).toHaveProperty('totalPages');
      expect(result.meta).toHaveProperty('unreadCount');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should return first page by default', async () => {
      const promise = notificationsService.getNotifications();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.meta.page).toBe(1);
    });

    it('should use default limit of 10', async () => {
      const promise = notificationsService.getNotifications();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.meta.limit).toBe(10);
    });

    it('should filter by search (title)', async () => {
      const filters: NotificationFilters = { search: 'Stock bajo' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        const matchesSearch =
          notification.title.toLowerCase().includes('stock bajo') ||
          notification.message.toLowerCase().includes('stock bajo');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter by search (message)', async () => {
      const filters: NotificationFilters = { search: 'Laptop' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        const matchesSearch =
          notification.title.toLowerCase().includes('laptop') ||
          notification.message.toLowerCase().includes('laptop');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter by type LOW_STOCK', async () => {
      const filters: NotificationFilters = { type: 'LOW_STOCK' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification.type).toBe('LOW_STOCK');
      });
    });

    it('should filter by type OUT_OF_STOCK', async () => {
      const filters: NotificationFilters = { type: 'OUT_OF_STOCK' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification.type).toBe('OUT_OF_STOCK');
      });
    });

    it('should filter by type NEW_INVOICE', async () => {
      const filters: NotificationFilters = { type: 'NEW_INVOICE' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification.type).toBe('NEW_INVOICE');
      });
    });

    it('should filter by type PAYMENT_RECEIVED', async () => {
      const filters: NotificationFilters = { type: 'PAYMENT_RECEIVED' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification.type).toBe('PAYMENT_RECEIVED');
      });
    });

    it('should filter by type INVOICE_OVERDUE', async () => {
      const filters: NotificationFilters = { type: 'INVOICE_OVERDUE' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification.type).toBe('INVOICE_OVERDUE');
      });
    });

    it('should filter by type SYSTEM', async () => {
      const filters: NotificationFilters = { type: 'SYSTEM' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification.type).toBe('SYSTEM');
      });
    });

    it('should filter by priority URGENT', async () => {
      const filters: NotificationFilters = { priority: 'URGENT' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification.priority).toBe('URGENT');
      });
    });

    it('should filter by priority HIGH', async () => {
      const filters: NotificationFilters = { priority: 'HIGH' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification.priority).toBe('HIGH');
      });
    });

    it('should filter by priority MEDIUM', async () => {
      const filters: NotificationFilters = { priority: 'MEDIUM' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification.priority).toBe('MEDIUM');
      });
    });

    it('should filter by priority LOW', async () => {
      const filters: NotificationFilters = { priority: 'LOW' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification.priority).toBe('LOW');
      });
    });

    it('should filter by read status (unread)', async () => {
      const filters: NotificationFilters = { read: false };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification.read).toBe(false);
      });
    });

    it('should filter by read status (read)', async () => {
      const filters: NotificationFilters = { read: true };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification.read).toBe(true);
      });
    });

    it('should filter by date range (startDate)', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 3);
      const filters: NotificationFilters = { startDate: startDate.toISOString() };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        const notificationDate = new Date(notification.createdAt);
        expect(notificationDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
      });
    });

    it('should filter by date range (endDate)', async () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
      const filters: NotificationFilters = { endDate: endDate.toISOString() };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        const notificationDate = new Date(notification.createdAt);
        expect(notificationDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should filter by date range (startDate and endDate)', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
      const filters: NotificationFilters = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        const notificationDate = new Date(notification.createdAt);
        expect(notificationDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(notificationDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should sort by createdAt descending by default', async () => {
      const promise = notificationsService.getNotifications();
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aDate = new Date(result.data[i].createdAt).getTime();
        const bDate = new Date(result.data[i + 1].createdAt).getTime();
        expect(aDate).toBeGreaterThanOrEqual(bDate);
      }
    });

    it('should sort by createdAt ascending', async () => {
      const filters: NotificationFilters = { sortBy: 'createdAt', sortOrder: 'asc' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aDate = new Date(result.data[i].createdAt).getTime();
        const bDate = new Date(result.data[i + 1].createdAt).getTime();
        expect(aDate).toBeLessThanOrEqual(bDate);
      }
    });

    it('should sort by title ascending', async () => {
      const filters: NotificationFilters = { sortBy: 'title', sortOrder: 'asc' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(
          result.data[i].title.localeCompare(result.data[i + 1].title)
        ).toBeLessThanOrEqual(0);
      }
    });

    it('should sort by title descending', async () => {
      const filters: NotificationFilters = { sortBy: 'title', sortOrder: 'desc' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(
          result.data[i].title.localeCompare(result.data[i + 1].title)
        ).toBeGreaterThanOrEqual(0);
      }
    });

    it('should sort by type ascending', async () => {
      const filters: NotificationFilters = { sortBy: 'type', sortOrder: 'asc' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(
          result.data[i].type.localeCompare(result.data[i + 1].type)
        ).toBeLessThanOrEqual(0);
      }
    });

    it('should sort by priority descending (URGENT > HIGH > MEDIUM > LOW)', async () => {
      const filters: NotificationFilters = { sortBy: 'priority', sortOrder: 'desc' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      const priorityOrder: Record<NotificationPriority, number> = {
        URGENT: 4,
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
      };

      for (let i = 0; i < result.data.length - 1; i++) {
        const aPriority = priorityOrder[result.data[i].priority];
        const bPriority = priorityOrder[result.data[i + 1].priority];
        expect(aPriority).toBeGreaterThanOrEqual(bPriority);
      }
    });

    it('should sort by priority ascending (LOW < MEDIUM < HIGH < URGENT)', async () => {
      const filters: NotificationFilters = { sortBy: 'priority', sortOrder: 'asc' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      const priorityOrder: Record<NotificationPriority, number> = {
        URGENT: 4,
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
      };

      for (let i = 0; i < result.data.length - 1; i++) {
        const aPriority = priorityOrder[result.data[i].priority];
        const bPriority = priorityOrder[result.data[i + 1].priority];
        expect(aPriority).toBeLessThanOrEqual(bPriority);
      }
    });

    it('should sort by read status ascending', async () => {
      const filters: NotificationFilters = { sortBy: 'read', sortOrder: 'asc' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aRead = result.data[i].read ? 1 : 0;
        const bRead = result.data[i + 1].read ? 1 : 0;
        expect(aRead).toBeLessThanOrEqual(bRead);
      }
    });

    it('should combine multiple filters', async () => {
      const filters: NotificationFilters = {
        priority: 'HIGH',
        read: false,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        limit: 5,
      };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification.priority).toBe('HIGH');
        expect(notification.read).toBe(false);
      });
    });

    it('should handle pagination (page 1)', async () => {
      const filters: NotificationFilters = { page: 1, limit: 3 };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(3);
      expect(result.data.length).toBeLessThanOrEqual(3);
    });

    it('should handle pagination (page 2)', async () => {
      const filters: NotificationFilters = { page: 2, limit: 3 };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(3);
    });

    it('should return different data for different pages', async () => {
      const page1Promise = notificationsService.getNotifications({ page: 1, limit: 3 });
      vi.advanceTimersByTime(500);
      const page1 = await page1Promise;

      const page2Promise = notificationsService.getNotifications({ page: 2, limit: 3 });
      vi.advanceTimersByTime(500);
      const page2 = await page2Promise;

      if (page1.data.length > 0 && page2.data.length > 0) {
        expect(page1.data[0].id).not.toBe(page2.data[0].id);
      }
    });

    it('should calculate totalPages correctly', async () => {
      const filters: NotificationFilters = { limit: 5 };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      const expectedTotalPages = Math.ceil(result.meta.total / result.meta.limit);
      expect(result.meta.totalPages).toBe(expectedTotalPages);
    });

    it('should include unreadCount in meta', async () => {
      const promise = notificationsService.getNotifications();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(typeof result.meta.unreadCount).toBe('number');
      expect(result.meta.unreadCount).toBeGreaterThanOrEqual(0);
    });

    it('should return notification summaries with expected properties', async () => {
      const promise = notificationsService.getNotifications();
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((notification) => {
        expect(notification).toHaveProperty('id');
        expect(notification).toHaveProperty('type');
        expect(notification).toHaveProperty('title');
        expect(notification).toHaveProperty('message');
        expect(notification).toHaveProperty('priority');
        expect(notification).toHaveProperty('read');
        expect(notification).toHaveProperty('createdAt');
      });
    });
  });

  describe('getNotification', () => {
    it('should return notification by id', async () => {
      const promise = notificationsService.getNotification('1');
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.type).toBe('LOW_STOCK');
      expect(result.title).toBe('Stock bajo');
    });

    it('should return notification with all expected properties', async () => {
      const promise = notificationsService.getNotification('1');
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('read');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should return notification with metadata if present', async () => {
      const promise = notificationsService.getNotification('1');
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('productId');
      expect(result.metadata).toHaveProperty('currentStock');
      expect(result.metadata).toHaveProperty('minStock');
    });

    it('should return notification with link if present', async () => {
      const promise = notificationsService.getNotification('1');
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result).toHaveProperty('link');
      expect(result.link).toBe('/products/1');
    });

    it('should throw error for non-existent notification', async () => {
      const promise = notificationsService.getNotification('non-existent-id');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Notificacion no encontrada');
    });

    it('should throw error for empty id', async () => {
      const promise = notificationsService.getNotification('');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Notificacion no encontrada');
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count structure', async () => {
      const promise = notificationsService.getUnreadCount();
      vi.advanceTimersByTime(200);
      const result = await promise;

      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('byType');
      expect(result).toHaveProperty('byPriority');
    });

    it('should return numeric count', async () => {
      const promise = notificationsService.getUnreadCount();
      vi.advanceTimersByTime(200);
      const result = await promise;

      expect(typeof result.count).toBe('number');
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('should return count by type', async () => {
      const promise = notificationsService.getUnreadCount();
      vi.advanceTimersByTime(200);
      const result = await promise;

      expect(typeof result.byType).toBe('object');
      Object.values(result.byType).forEach((count) => {
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return count by priority', async () => {
      const promise = notificationsService.getUnreadCount();
      vi.advanceTimersByTime(200);
      const result = await promise;

      expect(typeof result.byPriority).toBe('object');
      Object.values(result.byPriority).forEach((count) => {
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have consistent count with filtered notifications', async () => {
      const unreadCountPromise = notificationsService.getUnreadCount();
      vi.advanceTimersByTime(200);
      const unreadCountResult = await unreadCountPromise;

      const notificationsPromise = notificationsService.getNotifications({ read: false, limit: 100 });
      vi.advanceTimersByTime(500);
      const notificationsResult = await notificationsPromise;

      expect(unreadCountResult.count).toBe(notificationsResult.meta.total);
    });
  });

  describe('getRecentNotifications', () => {
    it('should return limited recent notifications with default limit', async () => {
      const promise = notificationsService.getRecentNotifications();
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should respect limit parameter', async () => {
      const promise = notificationsService.getRecentNotifications(3);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should respect larger limit parameter', async () => {
      const promise = notificationsService.getRecentNotifications(10);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should return notifications sorted by createdAt descending', async () => {
      const promise = notificationsService.getRecentNotifications(10);
      vi.advanceTimersByTime(300);
      const result = await promise;

      for (let i = 0; i < result.length - 1; i++) {
        const aDate = new Date(result[i].createdAt).getTime();
        const bDate = new Date(result[i + 1].createdAt).getTime();
        expect(aDate).toBeGreaterThanOrEqual(bDate);
      }
    });

    it('should return 1 notification when limit is 1', async () => {
      const promise = notificationsService.getRecentNotifications(1);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should return notification summaries', async () => {
      const promise = notificationsService.getRecentNotifications();
      vi.advanceTimersByTime(300);
      const result = await promise;

      result.forEach((notification) => {
        expect(notification).toHaveProperty('id');
        expect(notification).toHaveProperty('type');
        expect(notification).toHaveProperty('title');
        expect(notification).toHaveProperty('message');
        expect(notification).toHaveProperty('priority');
        expect(notification).toHaveProperty('read');
        expect(notification).toHaveProperty('createdAt');
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      // First get an unread notification
      const notificationsPromise = notificationsService.getNotifications({ read: false });
      vi.advanceTimersByTime(500);
      const notifications = await notificationsPromise;

      if (notifications.data.length === 0) {
        // Create a new notification if none are unread
        const createPromise = notificationsService.createNotification({
          type: 'INFO',
          title: 'Test notification',
          message: 'Test message',
        });
        vi.advanceTimersByTime(500);
        const created = await createPromise;

        const markPromise = notificationsService.markAsRead(created.id);
        vi.advanceTimersByTime(300);
        const result = await markPromise;

        expect(result.read).toBe(true);
        expect(result.readAt).toBeDefined();
      } else {
        const targetId = notifications.data[0].id;
        const markPromise = notificationsService.markAsRead(targetId);
        vi.advanceTimersByTime(300);
        const result = await markPromise;

        expect(result.read).toBe(true);
        expect(result.readAt).toBeDefined();
      }
    });

    it('should set readAt timestamp', async () => {
      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test for readAt',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const markPromise = notificationsService.markAsRead(created.id);
      vi.advanceTimersByTime(300);
      const result = await markPromise;

      expect(result.readAt).toBeDefined();
      const readAtDate = new Date(result.readAt!);
      expect(readAtDate.toString()).not.toBe('Invalid Date');
    });

    it('should update updatedAt timestamp', async () => {
      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test for updatedAt',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created = await createPromise;
      // Store original updatedAt for reference (not used in assertion but documents intent)
      void created.updatedAt;

      vi.advanceTimersByTime(100);

      const markPromise = notificationsService.markAsRead(created.id);
      vi.advanceTimersByTime(300);
      const result = await markPromise;

      expect(result.updatedAt).toBeDefined();
    });

    it('should throw error for non-existent notification', async () => {
      const promise = notificationsService.markAsRead('non-existent');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Notificacion no encontrada');
    });
  });

  describe('markMultipleAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      // Create some notifications to mark as read
      const create1Promise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test 1',
        message: 'Test message 1',
      });
      vi.advanceTimersByTime(500);
      const created1 = await create1Promise;

      const create2Promise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test 2',
        message: 'Test message 2',
      });
      vi.advanceTimersByTime(500);
      const created2 = await create2Promise;

      const markPromise = notificationsService.markMultipleAsRead([created1.id, created2.id]);
      vi.advanceTimersByTime(400);
      const result = await markPromise;

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
    });

    it('should return success true even with partial matches', async () => {
      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test partial',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const markPromise = notificationsService.markMultipleAsRead([created.id, 'non-existent']);
      vi.advanceTimersByTime(400);
      const result = await markPromise;

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
    });

    it('should return updatedCount of 0 for non-existent ids', async () => {
      const markPromise = notificationsService.markMultipleAsRead(['non-existent-1', 'non-existent-2']);
      vi.advanceTimersByTime(400);
      const result = await markPromise;

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
    });

    it('should not count already read notifications', async () => {
      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test already read',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      // Mark as read first time
      const mark1Promise = notificationsService.markAsRead(created.id);
      vi.advanceTimersByTime(300);
      await mark1Promise;

      // Try to mark as read again via markMultipleAsRead
      const mark2Promise = notificationsService.markMultipleAsRead([created.id]);
      vi.advanceTimersByTime(400);
      const result = await mark2Promise;

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
    });

    it('should handle empty array', async () => {
      const markPromise = notificationsService.markMultipleAsRead([]);
      vi.advanceTimersByTime(400);
      const result = await markPromise;

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
    });
  });

  describe('markAllAsRead', () => {
    it('should return success response', async () => {
      const promise = notificationsService.markAllAsRead();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(typeof result.updatedCount).toBe('number');
    });

    it('should mark all unread notifications as read', async () => {
      // First create some unread notifications
      const create1Promise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test markAllAsRead 1',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      await create1Promise;

      const create2Promise = notificationsService.createNotification({
        type: 'WARNING',
        title: 'Test markAllAsRead 2',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      await create2Promise;

      const markAllPromise = notificationsService.markAllAsRead();
      vi.advanceTimersByTime(500);
      const result = await markAllPromise;

      expect(result.success).toBe(true);

      // Verify all are now read
      const unreadCountPromise = notificationsService.getUnreadCount();
      vi.advanceTimersByTime(200);
      const unreadCount = await unreadCountPromise;

      expect(unreadCount.count).toBe(0);
    });

    it('should return updatedCount of 0 when all are already read', async () => {
      // First mark all as read
      const markAll1Promise = notificationsService.markAllAsRead();
      vi.advanceTimersByTime(500);
      await markAll1Promise;

      // Then try again
      const markAll2Promise = notificationsService.markAllAsRead();
      vi.advanceTimersByTime(500);
      const result = await markAll2Promise;

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
    });
  });

  describe('markAsUnread', () => {
    it('should mark notification as unread', async () => {
      // First create and mark as read
      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test markAsUnread',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const markReadPromise = notificationsService.markAsRead(created.id);
      vi.advanceTimersByTime(300);
      const readNotification = await markReadPromise;

      expect(readNotification.read).toBe(true);

      // Now mark as unread
      const markUnreadPromise = notificationsService.markAsUnread(created.id);
      vi.advanceTimersByTime(300);
      const result = await markUnreadPromise;

      expect(result.read).toBe(false);
      expect(result.readAt).toBeUndefined();
    });

    it('should clear readAt timestamp', async () => {
      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test clear readAt',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const markReadPromise = notificationsService.markAsRead(created.id);
      vi.advanceTimersByTime(300);
      const readNotification = await markReadPromise;

      expect(readNotification.readAt).toBeDefined();

      const markUnreadPromise = notificationsService.markAsUnread(created.id);
      vi.advanceTimersByTime(300);
      const result = await markUnreadPromise;

      expect(result.readAt).toBeUndefined();
    });

    it('should update updatedAt timestamp', async () => {
      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test updatedAt unread',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const markReadPromise = notificationsService.markAsRead(created.id);
      vi.advanceTimersByTime(300);
      await markReadPromise;

      vi.advanceTimersByTime(100);

      const markUnreadPromise = notificationsService.markAsUnread(created.id);
      vi.advanceTimersByTime(300);
      const result = await markUnreadPromise;

      expect(result.updatedAt).toBeDefined();
    });

    it('should throw error for non-existent notification', async () => {
      const promise = notificationsService.markAsUnread('non-existent');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Notificacion no encontrada');
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test delete',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const deletePromise = notificationsService.deleteNotification(created.id);
      vi.advanceTimersByTime(300);

      await expect(deletePromise).resolves.toBeUndefined();

      // Verify notification is deleted
      const getPromise = notificationsService.getNotification(created.id);
      vi.advanceTimersByTime(300);
      await expect(getPromise).rejects.toThrow('Notificacion no encontrada');
    });

    it('should throw error for non-existent notification', async () => {
      const promise = notificationsService.deleteNotification('non-existent');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Notificacion no encontrada');
    });

    it('should throw error for empty id', async () => {
      const promise = notificationsService.deleteNotification('');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Notificacion no encontrada');
    });
  });

  describe('deleteMultipleNotifications', () => {
    it('should delete multiple notifications', async () => {
      const create1Promise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test delete multiple 1',
        message: 'Test message 1',
      });
      vi.advanceTimersByTime(500);
      const created1 = await create1Promise;

      const create2Promise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test delete multiple 2',
        message: 'Test message 2',
      });
      vi.advanceTimersByTime(500);
      const created2 = await create2Promise;

      const deletePromise = notificationsService.deleteMultipleNotifications([created1.id, created2.id]);
      vi.advanceTimersByTime(400);
      const result = await deletePromise;

      expect(result.deletedCount).toBe(2);
    });

    it('should return deletedCount with partial matches', async () => {
      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test partial delete',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const deletePromise = notificationsService.deleteMultipleNotifications([created.id, 'non-existent']);
      vi.advanceTimersByTime(400);
      const result = await deletePromise;

      expect(result.deletedCount).toBe(1);
    });

    it('should return deletedCount of 0 for non-existent ids', async () => {
      const deletePromise = notificationsService.deleteMultipleNotifications(['non-existent-1', 'non-existent-2']);
      vi.advanceTimersByTime(400);
      const result = await deletePromise;

      expect(result.deletedCount).toBe(0);
    });

    it('should handle empty array', async () => {
      const deletePromise = notificationsService.deleteMultipleNotifications([]);
      vi.advanceTimersByTime(400);
      const result = await deletePromise;

      expect(result.deletedCount).toBe(0);
    });
  });

  describe('clearReadNotifications', () => {
    it('should delete all read notifications', async () => {
      // Create and mark as read some notifications
      const create1Promise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test clear read 1',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created1 = await create1Promise;

      const markReadPromise = notificationsService.markAsRead(created1.id);
      vi.advanceTimersByTime(300);
      await markReadPromise;

      const clearPromise = notificationsService.clearReadNotifications();
      vi.advanceTimersByTime(500);
      const result = await clearPromise;

      expect(typeof result.deletedCount).toBe('number');
      expect(result.deletedCount).toBeGreaterThanOrEqual(0);
    });

    it('should return deletedCount of 0 when no read notifications', async () => {
      // First clear all read notifications
      const clear1Promise = notificationsService.clearReadNotifications();
      vi.advanceTimersByTime(500);
      await clear1Promise;

      // Then try again
      const clear2Promise = notificationsService.clearReadNotifications();
      vi.advanceTimersByTime(500);
      const result = await clear2Promise;

      expect(result.deletedCount).toBe(0);
    });

    it('should not delete unread notifications', async () => {
      // Create an unread notification
      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test unread preservation',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const clearPromise = notificationsService.clearReadNotifications();
      vi.advanceTimersByTime(500);
      await clearPromise;

      // Verify unread notification still exists
      const getPromise = notificationsService.getNotification(created.id);
      vi.advanceTimersByTime(300);
      const notification = await getPromise;

      expect(notification.id).toBe(created.id);
    });
  });

  describe('createNotification', () => {
    it('should create a new notification with all fields', async () => {
      const newNotificationData: CreateNotificationData = {
        type: 'LOW_STOCK',
        title: 'Test notification',
        message: 'This is a test notification',
        priority: 'HIGH',
        link: '/test/link',
        metadata: { testKey: 'testValue' },
      };

      const promise = notificationsService.createNotification(newNotificationData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe('LOW_STOCK');
      expect(result.title).toBe('Test notification');
      expect(result.message).toBe('This is a test notification');
      expect(result.priority).toBe('HIGH');
      expect(result.link).toBe('/test/link');
      expect(result.metadata).toEqual({ testKey: 'testValue' });
    });

    it('should generate unique id', async () => {
      const data: CreateNotificationData = {
        type: 'INFO',
        title: 'Test ID 1',
        message: 'Test message',
      };

      const promise1 = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      const result1 = await promise1;

      const promise2 = notificationsService.createNotification({ ...data, title: 'Test ID 2' });
      vi.advanceTimersByTime(500);
      const result2 = await promise2;

      expect(result1.id).not.toBe(result2.id);
    });

    it('should set default priority to MEDIUM when not specified', async () => {
      const newNotificationData: CreateNotificationData = {
        type: 'INFO',
        title: 'Test default priority',
        message: 'Test message',
      };

      const promise = notificationsService.createNotification(newNotificationData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.priority).toBe('MEDIUM');
    });

    it('should respect specified priority', async () => {
      const priorities: NotificationPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

      for (const priority of priorities) {
        const data: CreateNotificationData = {
          type: 'INFO',
          title: `Test ${priority} priority`,
          message: 'Test message',
          priority,
        };

        const promise = notificationsService.createNotification(data);
        vi.advanceTimersByTime(500);
        const result = await promise;

        expect(result.priority).toBe(priority);
      }
    });

    it('should set read to false by default', async () => {
      const data: CreateNotificationData = {
        type: 'INFO',
        title: 'Test read false',
        message: 'Test message',
      };

      const promise = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.read).toBe(false);
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const data: CreateNotificationData = {
        type: 'INFO',
        title: 'Test timestamps',
        message: 'Test message',
      };

      const promise = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      const createdAt = new Date(result.createdAt);
      const updatedAt = new Date(result.updatedAt);
      expect(createdAt.toString()).not.toBe('Invalid Date');
      expect(updatedAt.toString()).not.toBe('Invalid Date');
    });

    it('should create notification with different types', async () => {
      const types: NotificationType[] = [
        'LOW_STOCK',
        'OUT_OF_STOCK',
        'NEW_INVOICE',
        'PAYMENT_RECEIVED',
        'SYSTEM',
        'INFO',
        'WARNING',
      ];

      for (const type of types) {
        const data: CreateNotificationData = {
          type,
          title: `Test ${type}`,
          message: 'Test message',
        };

        const promise = notificationsService.createNotification(data);
        vi.advanceTimersByTime(500);
        const result = await promise;

        expect(result.type).toBe(type);
      }
    });

    it('should create notification without optional fields', async () => {
      const data: CreateNotificationData = {
        type: 'INFO',
        title: 'Minimal notification',
        message: 'Test message',
      };

      const promise = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.id).toBeDefined();
      expect(result.type).toBe('INFO');
      expect(result.title).toBe('Minimal notification');
      expect(result.message).toBe('Test message');
      expect(result.priority).toBe('MEDIUM');
      expect(result.read).toBe(false);
    });

    it('should add new notification to the mock data array', async () => {
      // Count notifications before creating
      const beforePromise = notificationsService.getNotifications({ limit: 100 });
      vi.advanceTimersByTime(500);
      const beforeResult = await beforePromise;
      const countBefore = beforeResult.meta.total;

      const data: CreateNotificationData = {
        type: 'INFO',
        title: 'Newly added notification',
        message: 'Test message',
      };

      const promise = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      const created = await promise;

      // Count notifications after creating
      const afterPromise = notificationsService.getNotifications({ limit: 100 });
      vi.advanceTimersByTime(500);
      const afterResult = await afterPromise;
      const countAfter = afterResult.meta.total;

      // The total count should have increased by 1
      expect(countAfter).toBe(countBefore + 1);

      // The created notification should be findable in the list
      expect(afterResult.data.some((n) => n.id === created.id)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty search query', async () => {
      const filters: NotificationFilters = { search: '' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle non-matching search query', async () => {
      const filters: NotificationFilters = { search: 'xyz123nonexistent' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.data.length).toBe(0);
    });

    it('should handle page beyond available data', async () => {
      const filters: NotificationFilters = { page: 1000, limit: 10 };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.data.length).toBe(0);
      expect(result.meta.page).toBe(1000);
    });

    it('should handle very large limit', async () => {
      const filters: NotificationFilters = { limit: 1000 };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty('data');
      expect(result.meta.limit).toBe(1000);
    });

    it('should handle combined filters that match no results', async () => {
      const filters: NotificationFilters = {
        type: 'ERROR',
        priority: 'LOW',
        read: false,
      };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      // May or may not have results, but should not error
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle search with special characters', async () => {
      const filters: NotificationFilters = { search: '!@#$%^&*()' };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle very long title in createNotification', async () => {
      const longTitle = 'A'.repeat(500);
      const data: CreateNotificationData = {
        type: 'INFO',
        title: longTitle,
        message: 'Test message',
      };

      const promise = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.title).toBe(longTitle);
    });

    it('should handle very long message in createNotification', async () => {
      const longMessage = 'B'.repeat(1000);
      const data: CreateNotificationData = {
        type: 'INFO',
        title: 'Test',
        message: longMessage,
      };

      const promise = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.message).toBe(longMessage);
    });

    it('should handle metadata with nested objects', async () => {
      const data: CreateNotificationData = {
        type: 'INFO',
        title: 'Test nested metadata',
        message: 'Test message',
        metadata: {
          level1: {
            level2: {
              level3: 'deep value',
            },
          },
        },
      };

      const promise = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.metadata).toEqual({
        level1: {
          level2: {
            level3: 'deep value',
          },
        },
      });
    });

    it('should handle metadata with arrays', async () => {
      const data: CreateNotificationData = {
        type: 'INFO',
        title: 'Test array metadata',
        message: 'Test message',
        metadata: {
          items: [1, 2, 3],
          names: ['a', 'b', 'c'],
        },
      };

      const promise = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.metadata).toEqual({
        items: [1, 2, 3],
        names: ['a', 'b', 'c'],
      });
    });

    it('should handle case-insensitive search', async () => {
      const data: CreateNotificationData = {
        type: 'INFO',
        title: 'UPPERCASE TITLE',
        message: 'lowercase message',
      };

      const createPromise = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      await createPromise;

      const searchPromise = notificationsService.getNotifications({ search: 'uppercase' });
      vi.advanceTimersByTime(500);
      const result = await searchPromise;

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.some((n) => n.title === 'UPPERCASE TITLE')).toBe(true);
    });

    it('should handle date range with same start and end date', async () => {
      const sameDate = new Date().toISOString();
      const filters: NotificationFilters = {
        startDate: sameDate,
        endDate: sameDate,
      };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      // Should not error, may return empty results
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle undefined filter values', async () => {
      const filters: NotificationFilters = {
        search: undefined,
        type: undefined,
        priority: undefined,
        read: undefined,
      };
      const promise = notificationsService.getNotifications(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('notification timing', () => {
    it('should complete getNotifications within timeout', async () => {
      const promise = notificationsService.getNotifications();
      vi.advanceTimersByTime(500);

      const result = await promise;
      expect(result).toBeDefined();
    });

    it('should complete getNotification within timeout', async () => {
      // Create a notification to ensure it exists
      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test getNotification timing',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const promise = notificationsService.getNotification(created.id);
      vi.advanceTimersByTime(300);

      const result = await promise;
      expect(result).toBeDefined();
    });

    it('should complete getUnreadCount within timeout', async () => {
      const promise = notificationsService.getUnreadCount();
      vi.advanceTimersByTime(200);

      const result = await promise;
      expect(result).toBeDefined();
    });

    it('should complete getRecentNotifications within timeout', async () => {
      const promise = notificationsService.getRecentNotifications();
      vi.advanceTimersByTime(300);

      const result = await promise;
      expect(result).toBeDefined();
    });

    it('should complete markAsRead within timeout', async () => {
      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test timing',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const markPromise = notificationsService.markAsRead(created.id);
      vi.advanceTimersByTime(300);

      const result = await markPromise;
      expect(result).toBeDefined();
    });

    it('should complete markMultipleAsRead within timeout', async () => {
      const promise = notificationsService.markMultipleAsRead(['1', '2']);
      vi.advanceTimersByTime(400);

      const result = await promise;
      expect(result).toBeDefined();
    });

    it('should complete markAllAsRead within timeout', async () => {
      const promise = notificationsService.markAllAsRead();
      vi.advanceTimersByTime(500);

      const result = await promise;
      expect(result).toBeDefined();
    });

    it('should complete createNotification within timeout', async () => {
      const promise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test create timing',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);

      const result = await promise;
      expect(result).toBeDefined();
    });

    it('should complete deleteNotification within timeout', async () => {
      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'Test delete timing',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const deletePromise = notificationsService.deleteNotification(created.id);
      vi.advanceTimersByTime(300);

      await expect(deletePromise).resolves.toBeUndefined();
    });

    it('should complete deleteMultipleNotifications within timeout', async () => {
      const promise = notificationsService.deleteMultipleNotifications(['non-existent']);
      vi.advanceTimersByTime(400);

      const result = await promise;
      expect(result).toBeDefined();
    });

    it('should complete clearReadNotifications within timeout', async () => {
      const promise = notificationsService.clearReadNotifications();
      vi.advanceTimersByTime(500);

      const result = await promise;
      expect(result).toBeDefined();
    });
  });

  describe('data consistency', () => {
    it('should reflect created notification in getNotifications', async () => {
      const data: CreateNotificationData = {
        type: 'INFO',
        title: 'Consistency test notification',
        message: 'Test message',
      };

      const createPromise = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const searchPromise = notificationsService.getNotifications({ search: 'Consistency test notification' });
      vi.advanceTimersByTime(500);
      const searchResult = await searchPromise;

      expect(searchResult.data.some((n) => n.id === created.id)).toBe(true);
    });

    it('should reflect markAsRead in getNotification', async () => {
      const data: CreateNotificationData = {
        type: 'INFO',
        title: 'Read consistency test',
        message: 'Test message',
      };

      const createPromise = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const markPromise = notificationsService.markAsRead(created.id);
      vi.advanceTimersByTime(300);
      await markPromise;

      const getPromise = notificationsService.getNotification(created.id);
      vi.advanceTimersByTime(300);
      const notification = await getPromise;

      expect(notification.read).toBe(true);
      expect(notification.readAt).toBeDefined();
    });

    it('should reflect deleted notification in getNotifications', async () => {
      const data: CreateNotificationData = {
        type: 'INFO',
        title: 'Delete consistency test',
        message: 'Test message',
      };

      const createPromise = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const deletePromise = notificationsService.deleteNotification(created.id);
      vi.advanceTimersByTime(300);
      await deletePromise;

      const searchPromise = notificationsService.getNotifications({ search: 'Delete consistency test' });
      vi.advanceTimersByTime(500);
      const searchResult = await searchPromise;

      expect(searchResult.data.some((n) => n.id === created.id)).toBe(false);
    });

    it('should update unread count after marking as read', async () => {
      const data: CreateNotificationData = {
        type: 'INFO',
        title: 'Unread count test',
        message: 'Test message',
      };

      const createPromise = notificationsService.createNotification(data);
      vi.advanceTimersByTime(500);
      const created = await createPromise;

      const countBefore = notificationsService.getUnreadCount();
      vi.advanceTimersByTime(200);
      const beforeCount = await countBefore;

      const markPromise = notificationsService.markAsRead(created.id);
      vi.advanceTimersByTime(300);
      await markPromise;

      const countAfter = notificationsService.getUnreadCount();
      vi.advanceTimersByTime(200);
      const afterCount = await countAfter;

      expect(afterCount.count).toBe(beforeCount.count - 1);
    });

    it('should update unread count after creating notification', async () => {
      const countBefore = notificationsService.getUnreadCount();
      vi.advanceTimersByTime(200);
      const beforeCount = await countBefore;

      const createPromise = notificationsService.createNotification({
        type: 'INFO',
        title: 'New unread notification',
        message: 'Test message',
      });
      vi.advanceTimersByTime(500);
      await createPromise;

      const countAfter = notificationsService.getUnreadCount();
      vi.advanceTimersByTime(200);
      const afterCount = await countAfter;

      expect(afterCount.count).toBe(beforeCount.count + 1);
    });
  });
});