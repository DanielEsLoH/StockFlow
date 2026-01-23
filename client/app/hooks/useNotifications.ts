import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { notificationsService } from '~/services/notifications.service';
import { queryKeys } from '~/lib/query-client';
import { toast } from '~/components/ui/Toast';
import type {
  Notification,
  NotificationSummary,
  NotificationFilters,
  NotificationsResponse,
  UnreadCountResponse,
  CreateNotificationData,
} from '~/types/notification';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Paginated notifications list with filters
 */
export function useNotifications(filters: NotificationFilters = {}) {
  return useQuery<NotificationsResponse>({
    queryKey: queryKeys.notifications.list(filters as Record<string, unknown>),
    queryFn: () => notificationsService.getNotifications(filters),
    staleTime: 1000 * 60 * 1, // 1 minute (notifications should be fresh)
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Single notification detail by ID
 */
export function useNotification(id: string) {
  return useQuery<Notification>({
    queryKey: queryKeys.notifications.detail(id),
    queryFn: () => notificationsService.getNotification(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!id,
  });
}

/**
 * Recent notifications (for dropdown)
 */
export function useRecentNotifications(limit: number = 5) {
  return useQuery<NotificationSummary[]>({
    queryKey: queryKeys.notifications.recent(limit),
    queryFn: () => notificationsService.getRecentNotifications(limit),
    staleTime: 1000 * 30, // 30 seconds (dropdown should be fresh)
  });
}

/**
 * Unread notifications count
 */
export function useUnreadCount() {
  return useQuery<UnreadCountResponse>({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationsService.getUnreadCount(),
    staleTime: 1000 * 30, // 30 seconds (badge should update frequently)
    refetchInterval: 1000 * 60, // Poll every minute
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mark a single notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      // Snapshot the previous values
      const previousNotification = queryClient.getQueryData<Notification>(
        queryKeys.notifications.detail(id)
      );
      const previousUnreadCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount()
      );

      // Optimistically update the notification
      if (previousNotification && !previousNotification.read) {
        queryClient.setQueryData<Notification>(queryKeys.notifications.detail(id), {
          ...previousNotification,
          read: true,
          readAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Optimistically update the unread count
      if (previousUnreadCount && previousUnreadCount.count > 0) {
        queryClient.setQueryData<UnreadCountResponse>(
          queryKeys.notifications.unreadCount(),
          {
            ...previousUnreadCount,
            count: previousUnreadCount.count - 1,
          }
        );
      }

      return { previousNotification, previousUnreadCount };
    },
    onSuccess: (notification) => {
      // Update detail cache
      queryClient.setQueryData(queryKeys.notifications.detail(notification.id), notification);
      // Invalidate list and recent queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.recent() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
    onError: (error: Error, id, context) => {
      // Rollback optimistic updates
      if (context?.previousNotification) {
        queryClient.setQueryData(
          queryKeys.notifications.detail(id),
          context.previousNotification
        );
      }
      if (context?.previousUnreadCount) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount(),
          context.previousUnreadCount
        );
      }
      toast.error(error.message || 'Error al marcar la notificacion como leida');
    },
  });
}

/**
 * Mark multiple notifications as read
 */
export function useMarkMultipleAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => notificationsService.markMultipleAsRead(ids),
    onSuccess: (result) => {
      // Invalidate all notification queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

      if (result.updatedCount > 0) {
        toast.success(
          result.updatedCount === 1
            ? '1 notificacion marcada como leida'
            : `${result.updatedCount} notificaciones marcadas como leidas`
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al marcar las notificaciones como leidas');
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      // Snapshot the previous unread count
      const previousUnreadCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount()
      );

      // Optimistically set unread count to 0
      queryClient.setQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount(),
        { count: 0, byType: {}, byPriority: {} }
      );

      return { previousUnreadCount };
    },
    onSuccess: (result) => {
      // Invalidate all notification queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

      if (result.updatedCount > 0) {
        toast.success('Todas las notificaciones marcadas como leidas');
      }
    },
    onError: (error: Error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousUnreadCount) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount(),
          context.previousUnreadCount
        );
      }
      toast.error(error.message || 'Error al marcar todas las notificaciones como leidas');
    },
  });
}

/**
 * Mark a notification as unread
 */
export function useMarkAsUnread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsUnread(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      // Snapshot the previous values
      const previousNotification = queryClient.getQueryData<Notification>(
        queryKeys.notifications.detail(id)
      );
      const previousUnreadCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount()
      );

      // Optimistically update the notification
      if (previousNotification && previousNotification.read) {
        queryClient.setQueryData<Notification>(queryKeys.notifications.detail(id), {
          ...previousNotification,
          read: false,
          readAt: undefined,
          updatedAt: new Date().toISOString(),
        });
      }

      // Optimistically update the unread count
      if (previousUnreadCount) {
        queryClient.setQueryData<UnreadCountResponse>(
          queryKeys.notifications.unreadCount(),
          {
            ...previousUnreadCount,
            count: previousUnreadCount.count + 1,
          }
        );
      }

      return { previousNotification, previousUnreadCount };
    },
    onSuccess: (notification) => {
      // Update detail cache
      queryClient.setQueryData(queryKeys.notifications.detail(notification.id), notification);
      // Invalidate list and recent queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.recent() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
    onError: (error: Error, id, context) => {
      // Rollback optimistic updates
      if (context?.previousNotification) {
        queryClient.setQueryData(
          queryKeys.notifications.detail(id),
          context.previousNotification
        );
      }
      if (context?.previousUnreadCount) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount(),
          context.previousUnreadCount
        );
      }
      toast.error(error.message || 'Error al marcar la notificacion como no leida');
    },
  });
}

/**
 * Delete a single notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.deleteNotification(id),
    onSuccess: (_result, id) => {
      // Get the notification before removing to check if it was unread
      const notification = queryClient.getQueryData<Notification>(
        queryKeys.notifications.detail(id)
      );

      // Invalidate all notification queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

      // Remove from detail cache
      queryClient.removeQueries({ queryKey: queryKeys.notifications.detail(id) });

      // Update unread count if notification was unread
      if (notification && !notification.read) {
        const previousUnreadCount = queryClient.getQueryData<UnreadCountResponse>(
          queryKeys.notifications.unreadCount()
        );
        if (previousUnreadCount && previousUnreadCount.count > 0) {
          queryClient.setQueryData<UnreadCountResponse>(
            queryKeys.notifications.unreadCount(),
            {
              ...previousUnreadCount,
              count: previousUnreadCount.count - 1,
            }
          );
        }
      }

      toast.success('Notificacion eliminada');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar la notificacion');
    },
  });
}

/**
 * Delete multiple notifications
 */
export function useDeleteMultipleNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => notificationsService.deleteMultipleNotifications(ids),
    onSuccess: (result) => {
      // Invalidate all notification queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

      if (result.deletedCount > 0) {
        toast.success(
          result.deletedCount === 1
            ? '1 notificacion eliminada'
            : `${result.deletedCount} notificaciones eliminadas`
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar las notificaciones');
    },
  });
}

/**
 * Clear all read notifications
 */
export function useClearReadNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.clearReadNotifications(),
    onSuccess: (result) => {
      // Invalidate all notification queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

      if (result.deletedCount > 0) {
        toast.success(
          result.deletedCount === 1
            ? '1 notificacion leida eliminada'
            : `${result.deletedCount} notificaciones leidas eliminadas`
        );
      } else {
        toast.info('No hay notificaciones leidas para eliminar');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al limpiar las notificaciones leidas');
    },
  });
}

/**
 * Create a notification (for testing/admin purposes)
 */
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateNotificationData) => notificationsService.createNotification(data),
    onSuccess: (notification) => {
      // Invalidate all notification queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

      toast.success(`Notificacion "${notification.title}" creada`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear la notificacion');
    },
  });
}

/**
 * Navigate to notification link and mark as read
 */
export function useNotificationClick() {
  const navigate = useNavigate();
  const markAsRead = useMarkAsRead();

  return (notification: NotificationSummary | Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }

    // Navigate to link if present
    if (notification.link) {
      navigate(notification.link);
    }
  };
}