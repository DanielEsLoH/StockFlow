import { api } from '~/lib/api';
import type {
  Notification,
  NotificationSummary,
  NotificationFilters,
  NotificationsResponse,
  UnreadCountResponse,
  CreateNotificationData,
  MarkAsReadResponse,
} from '~/types/notification';

// Service connected to real backend API
export const notificationsService = {
  // Get paginated notifications with filters
  async getNotifications(filters: NotificationFilters = {}): Promise<NotificationsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<NotificationsResponse>(
      `/notifications?${params.toString()}`
    );
    return data;
  },

  // Get single notification by ID
  async getNotification(id: string): Promise<Notification> {
    const { data } = await api.get<Notification>(`/notifications/${id}`);
    return data;
  },

  // Get unread notifications count
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const { data } = await api.get<UnreadCountResponse>('/notifications/unread/count');
    return data;
  },

  // Get recent notifications (for dropdown)
  async getRecentNotifications(limit: number = 5): Promise<NotificationSummary[]> {
    const { data } = await api.get<NotificationSummary[]>(
      `/notifications/recent?limit=${limit}`
    );
    return data;
  },

  // Mark single notification as read
  async markAsRead(id: string): Promise<Notification> {
    const { data } = await api.patch<Notification>(`/notifications/${id}/read`);
    return data;
  },

  // Mark multiple notifications as read
  async markMultipleAsRead(ids: string[]): Promise<MarkAsReadResponse> {
    const { data } = await api.patch<MarkAsReadResponse>('/notifications/read', { ids });
    return data;
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<MarkAsReadResponse> {
    const { data } = await api.patch<MarkAsReadResponse>('/notifications/read-all');
    return data;
  },

  // Mark single notification as unread
  async markAsUnread(id: string): Promise<Notification> {
    const { data } = await api.patch<Notification>(`/notifications/${id}/unread`);
    return data;
  },

  // Delete notification
  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },

  // Delete multiple notifications
  async deleteMultipleNotifications(ids: string[]): Promise<{ deletedCount: number }> {
    const { data } = await api.delete<{ deletedCount: number }>('/notifications', {
      data: { ids },
    });
    return data;
  },

  // Clear all read notifications
  async clearReadNotifications(): Promise<{ deletedCount: number }> {
    const { data } = await api.delete<{ deletedCount: number }>('/notifications/clear-read');
    return data;
  },

  // Create notification (for system/testing purposes)
  async createNotification(notificationData: CreateNotificationData): Promise<Notification> {
    const { data } = await api.post<Notification>('/notifications', notificationData);
    return data;
  },
};
