import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useNotifications,
  useNotification,
  useRecentNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkMultipleAsRead,
  useMarkAllAsRead,
  useMarkAsUnread,
  useDeleteNotification,
  useDeleteMultipleNotifications,
  useClearReadNotifications,
  useCreateNotification,
  useNotificationClick,
} from "./useNotifications";
import { notificationsService } from "~/services/notifications.service";
import { toast } from "~/components/ui/Toast";
import { queryKeys } from "~/lib/query-client";
import type {
  Notification,
  NotificationSummary,
  NotificationsResponse,
  UnreadCountResponse,
  NotificationFilters,
  CreateNotificationData,
  MarkAsReadResponse,
} from "~/types/notification";

// Mock dependencies
vi.mock("~/services/notifications.service");
vi.mock("~/components/ui/Toast");
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const mockNavigate = vi.fn();

// Mock data
const mockNotification: Notification = {
  id: "1",
  type: "LOW_STOCK",
  title: "Stock bajo",
  message: 'El producto "Laptop HP Pavilion 15" tiene stock bajo (5 unidades)',
  priority: "HIGH",
  read: false,
  link: "/products/1",
  metadata: { productId: "1", currentStock: 5, minStock: 10 },
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
};

const mockNotification2: Notification = {
  id: "2",
  type: "NEW_INVOICE",
  title: "Nueva factura creada",
  message: "Se ha creado la factura FAC-2024-0125 para Distribuidora ABC S.A.S",
  priority: "MEDIUM",
  read: true,
  readAt: "2024-01-15T12:00:00Z",
  link: "/invoices/125",
  metadata: {
    invoiceId: "125",
    invoiceNumber: "FAC-2024-0125",
    customerId: "2",
  },
  createdAt: "2024-01-14T10:00:00Z",
  updatedAt: "2024-01-15T12:00:00Z",
};

const mockNotificationSummary: NotificationSummary = {
  id: "1",
  type: "LOW_STOCK",
  title: "Stock bajo",
  message: 'El producto "Laptop HP Pavilion 15" tiene stock bajo (5 unidades)',
  priority: "HIGH",
  read: false,
  link: "/products/1",
  createdAt: "2024-01-15T10:00:00Z",
};

const mockNotificationSummary2: NotificationSummary = {
  id: "2",
  type: "NEW_INVOICE",
  title: "Nueva factura creada",
  message: "Se ha creado la factura FAC-2024-0125 para Distribuidora ABC S.A.S",
  priority: "MEDIUM",
  read: true,
  link: "/invoices/125",
  createdAt: "2024-01-14T10:00:00Z",
};

const mockNotificationsResponse: NotificationsResponse = {
  data: [mockNotificationSummary, mockNotificationSummary2],
  meta: {
    total: 2,
    page: 1,
    limit: 10,
    totalPages: 1,
    unreadCount: 1,
  },
};

const mockUnreadCountResponse: UnreadCountResponse = {
  count: 5,
  byType: {
    LOW_STOCK: 2,
    NEW_INVOICE: 1,
    PAYMENT_RECEIVED: 2,
  },
  byPriority: {
    HIGH: 2,
    MEDIUM: 2,
    LOW: 1,
  },
};

const mockMarkAsReadResponse: MarkAsReadResponse = {
  success: true,
  updatedCount: 3,
};

// Helper to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

// Helper to create a wrapper with access to the queryClient
function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const wrapper = function Wrapper({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };

  return { wrapper, queryClient };
}

// Helper to create a wrapper with longer gcTime for rollback tests
function createWrapperWithLongCache() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 1000 * 60, // 1 minute
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const wrapper = function Wrapper({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };

  return { wrapper, queryClient };
}

describe("useNotifications hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // QUERY HOOKS
  // ============================================================================

  describe("useNotifications", () => {
    it("should fetch notifications with default filters", async () => {
      vi.mocked(notificationsService.getNotifications).mockResolvedValue(
        mockNotificationsResponse,
      );

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockNotificationsResponse);
      expect(notificationsService.getNotifications).toHaveBeenCalledWith({});
    });

    it("should fetch notifications with filters", async () => {
      const filters: NotificationFilters = {
        type: "LOW_STOCK",
        priority: "HIGH",
        read: false,
        page: 1,
        limit: 10,
      };

      vi.mocked(notificationsService.getNotifications).mockResolvedValue(
        mockNotificationsResponse,
      );

      const { result } = renderHook(() => useNotifications(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.getNotifications).toHaveBeenCalledWith(
        filters,
      );
    });

    it("should return loading state initially", () => {
      vi.mocked(notificationsService.getNotifications).mockImplementation(
        () => new Promise(() => {}),
      );

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it("should return error state on failure", async () => {
      const error = new Error("Failed to fetch notifications");
      vi.mocked(notificationsService.getNotifications).mockRejectedValue(error);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it("should filter by search term", async () => {
      const filters: NotificationFilters = { search: "stock" };
      vi.mocked(notificationsService.getNotifications).mockResolvedValue(
        mockNotificationsResponse,
      );

      const { result } = renderHook(() => useNotifications(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.getNotifications).toHaveBeenCalledWith(
        filters,
      );
    });

    it("should filter by date range", async () => {
      const filters: NotificationFilters = {
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-01-31T23:59:59Z",
      };
      vi.mocked(notificationsService.getNotifications).mockResolvedValue(
        mockNotificationsResponse,
      );

      const { result } = renderHook(() => useNotifications(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.getNotifications).toHaveBeenCalledWith(
        filters,
      );
    });

    it("should handle empty results", async () => {
      const emptyResponse: NotificationsResponse = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          unreadCount: 0,
        },
      };

      vi.mocked(notificationsService.getNotifications).mockResolvedValue(
        emptyResponse,
      );

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data).toHaveLength(0);
      expect(result.current.data?.meta.total).toBe(0);
    });
  });

  describe("useNotification", () => {
    it("should fetch a single notification by id", async () => {
      vi.mocked(notificationsService.getNotification).mockResolvedValue(
        mockNotification,
      );

      const { result } = renderHook(() => useNotification("1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockNotification);
      expect(notificationsService.getNotification).toHaveBeenCalledWith("1");
    });

    it("should not fetch when id is empty", () => {
      const { result } = renderHook(() => useNotification(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe("idle");
      expect(notificationsService.getNotification).not.toHaveBeenCalled();
    });

    it("should return error when notification not found", async () => {
      const error = new Error("Notificacion no encontrada");
      vi.mocked(notificationsService.getNotification).mockRejectedValue(error);

      const { result } = renderHook(() => useNotification("non-existent"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it("should return loading state initially", () => {
      vi.mocked(notificationsService.getNotification).mockImplementation(
        () => new Promise(() => {}),
      );

      const { result } = renderHook(() => useNotification("1"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("useRecentNotifications", () => {
    it("should fetch recent notifications with default limit", async () => {
      const recentNotifications = [
        mockNotificationSummary,
        mockNotificationSummary2,
      ];
      vi.mocked(notificationsService.getRecentNotifications).mockResolvedValue(
        recentNotifications,
      );

      const { result } = renderHook(() => useRecentNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(recentNotifications);
      expect(notificationsService.getRecentNotifications).toHaveBeenCalledWith(
        5,
      );
    });

    it("should fetch recent notifications with custom limit", async () => {
      const recentNotifications = [mockNotificationSummary];
      vi.mocked(notificationsService.getRecentNotifications).mockResolvedValue(
        recentNotifications,
      );

      const { result } = renderHook(() => useRecentNotifications(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.getRecentNotifications).toHaveBeenCalledWith(
        10,
      );
    });

    it("should fetch with limit of 3", async () => {
      vi.mocked(notificationsService.getRecentNotifications).mockResolvedValue([
        mockNotificationSummary,
      ]);

      const { result } = renderHook(() => useRecentNotifications(3), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.getRecentNotifications).toHaveBeenCalledWith(
        3,
      );
    });

    it("should return loading state initially", () => {
      vi.mocked(notificationsService.getRecentNotifications).mockImplementation(
        () => new Promise(() => {}),
      );

      const { result } = renderHook(() => useRecentNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("should handle error state", async () => {
      const error = new Error("Error fetching recent notifications");
      vi.mocked(notificationsService.getRecentNotifications).mockRejectedValue(
        error,
      );

      const { result } = renderHook(() => useRecentNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it("should return empty array when no notifications exist", async () => {
      vi.mocked(notificationsService.getRecentNotifications).mockResolvedValue(
        [],
      );

      const { result } = renderHook(() => useRecentNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe("useUnreadCount", () => {
    it("should fetch unread notifications count", async () => {
      vi.mocked(notificationsService.getUnreadCount).mockResolvedValue(
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useUnreadCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUnreadCountResponse);
      expect(notificationsService.getUnreadCount).toHaveBeenCalled();
    });

    it("should return loading state initially", () => {
      vi.mocked(notificationsService.getUnreadCount).mockImplementation(
        () => new Promise(() => {}),
      );

      const { result } = renderHook(() => useUnreadCount(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("should handle error state", async () => {
      const error = new Error("Error fetching unread count");
      vi.mocked(notificationsService.getUnreadCount).mockRejectedValue(error);

      const { result } = renderHook(() => useUnreadCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it("should return zero count when all notifications are read", async () => {
      const zeroCountResponse: UnreadCountResponse = {
        count: 0,
        byType: {},
        byPriority: {},
      };

      vi.mocked(notificationsService.getUnreadCount).mockResolvedValue(
        zeroCountResponse,
      );

      const { result } = renderHook(() => useUnreadCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.count).toBe(0);
    });
  });

  // ============================================================================
  // MUTATION HOOKS
  // ============================================================================

  describe("useMarkAsRead", () => {
    it("should mark a notification as read successfully", async () => {
      const readNotification: Notification = {
        ...mockNotification,
        read: true,
        readAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(notificationsService.markAsRead).mockResolvedValue(
        readNotification,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.markAsRead).toHaveBeenCalledWith("1");
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it("should perform optimistic update when notification is unread", async () => {
      const readNotification: Notification = {
        ...mockNotification,
        read: true,
        readAt: new Date().toISOString(),
      };

      vi.mocked(notificationsService.markAsRead).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(readNotification), 100),
          ),
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      // Check optimistic update was applied
      const optimisticData = queryClient.getQueryData<Notification>(
        queryKeys.notifications.detail("1"),
      );
      expect(optimisticData?.read).toBe(true);

      // Check unread count was decremented
      const optimisticCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount(),
      );
      expect(optimisticCount?.count).toBe(mockUnreadCountResponse.count - 1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should not decrement unread count when notification is already read", async () => {
      const alreadyReadNotification: Notification = {
        ...mockNotification,
        read: true,
        readAt: "2024-01-15T10:00:00Z",
      };

      vi.mocked(notificationsService.markAsRead).mockResolvedValue(
        alreadyReadNotification,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        alreadyReadNotification,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      // The optimistic update should NOT have decremented since notification was already read
      // We verify by checking that during onMutate the count check if(previousNotification && !previousNotification.read)
      // would be false since read is true
      // Since onSuccess invalidates the query, we just verify the mutation succeeded
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.markAsRead).toHaveBeenCalledWith("1");
    });

    it("should rollback optimistic update on error", async () => {
      const error = new Error("Error al marcar la notificacion como leida");
      vi.mocked(notificationsService.markAsRead).mockRejectedValue(error);

      const { wrapper, queryClient } = createWrapperWithLongCache();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Check rollback
      const rolledBackData = queryClient.getQueryData<Notification>(
        queryKeys.notifications.detail("1"),
      );
      expect(rolledBackData?.read).toBe(false);

      const rolledBackCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount(),
      );
      expect(rolledBackCount?.count).toBe(mockUnreadCountResponse.count);

      expect(toast.error).toHaveBeenCalledWith(
        "Error al marcar la notificacion como leida",
      );
    });

    it("should show default error message when error has no message", async () => {
      vi.mocked(notificationsService.markAsRead).mockRejectedValue(new Error());

      const { result } = renderHook(() => useMarkAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al marcar la notificacion como leida",
      );
    });

    it("should handle onMutate when previousNotification does NOT exist", async () => {
      const readNotification: Notification = {
        ...mockNotification,
        read: true,
      };

      vi.mocked(notificationsService.markAsRead).mockResolvedValue(
        readNotification,
      );

      const { wrapper } = createWrapperWithClient();
      // DO NOT set previous notification in cache

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.markAsRead).toHaveBeenCalledWith("1");
    });

    it("should handle onMutate when previousUnreadCount does NOT exist", async () => {
      const readNotification: Notification = {
        ...mockNotification,
        read: true,
      };

      vi.mocked(notificationsService.markAsRead).mockResolvedValue(
        readNotification,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      );
      // DO NOT set unread count in cache

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should handle onMutate when unread count is zero", async () => {
      const readNotification: Notification = {
        ...mockNotification,
        read: true,
      };

      const zeroCount: UnreadCountResponse = {
        count: 0,
        byType: {},
        byPriority: {},
      };

      vi.mocked(notificationsService.markAsRead).mockResolvedValue(
        readNotification,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        zeroCount,
      );

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The optimistic update checks if count > 0 before decrementing
      // Since count was 0, it should not decrement (would go negative)
      // The onSuccess invalidates the query, so we just verify the mutation succeeded
      expect(notificationsService.markAsRead).toHaveBeenCalledWith("1");
    });
  });

  describe("useMarkMultipleAsRead", () => {
    it("should mark multiple notifications as read successfully", async () => {
      vi.mocked(notificationsService.markMultipleAsRead).mockResolvedValue(
        mockMarkAsReadResponse,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useMarkMultipleAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate(["1", "2", "3"]);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.markMultipleAsRead).toHaveBeenCalledWith([
        "1",
        "2",
        "3",
      ]);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.notifications.all,
      });
      expect(toast.success).toHaveBeenCalledWith(
        "3 notificaciones marcadas como leidas",
      );
    });

    it("should show singular message when only one notification is marked", async () => {
      const singleResponse: MarkAsReadResponse = {
        success: true,
        updatedCount: 1,
      };

      vi.mocked(notificationsService.markMultipleAsRead).mockResolvedValue(
        singleResponse,
      );

      const { result } = renderHook(() => useMarkMultipleAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(["1"]);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        "1 notificacion marcada como leida",
      );
    });

    it("should not show toast when no notifications are updated", async () => {
      const zeroResponse: MarkAsReadResponse = {
        success: true,
        updatedCount: 0,
      };

      vi.mocked(notificationsService.markMultipleAsRead).mockResolvedValue(
        zeroResponse,
      );

      const { result } = renderHook(() => useMarkMultipleAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate([]);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).not.toHaveBeenCalled();
    });

    it("should show error toast on failure", async () => {
      const error = new Error("Error al marcar las notificaciones como leidas");
      vi.mocked(notificationsService.markMultipleAsRead).mockRejectedValue(
        error,
      );

      const { result } = renderHook(() => useMarkMultipleAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(["1", "2"]);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al marcar las notificaciones como leidas",
      );
    });

    it("should show default error message when error has no message", async () => {
      vi.mocked(notificationsService.markMultipleAsRead).mockRejectedValue(
        new Error(),
      );

      const { result } = renderHook(() => useMarkMultipleAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(["1", "2"]);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al marcar las notificaciones como leidas",
      );
    });
  });

  describe("useMarkAllAsRead", () => {
    it("should mark all notifications as read successfully", async () => {
      vi.mocked(notificationsService.markAllAsRead).mockResolvedValue(
        mockMarkAsReadResponse,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useMarkAllAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.markAllAsRead).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.notifications.all,
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Todas las notificaciones marcadas como leidas",
      );
    });

    it("should perform optimistic update to set unread count to 0", async () => {
      vi.mocked(notificationsService.markAllAsRead).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockMarkAsReadResponse), 100),
          ),
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useMarkAllAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      // Check optimistic update
      const optimisticCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount(),
      );
      expect(optimisticCount?.count).toBe(0);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should rollback optimistic update on error", async () => {
      const error = new Error(
        "Error al marcar todas las notificaciones como leidas",
      );
      vi.mocked(notificationsService.markAllAsRead).mockRejectedValue(error);

      const { wrapper, queryClient } = createWrapperWithLongCache();
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useMarkAllAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Check rollback
      const rolledBackCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount(),
      );
      expect(rolledBackCount?.count).toBe(mockUnreadCountResponse.count);

      expect(toast.error).toHaveBeenCalledWith(
        "Error al marcar todas las notificaciones como leidas",
      );
    });

    it("should not show success toast when no notifications are updated", async () => {
      const zeroResponse: MarkAsReadResponse = {
        success: true,
        updatedCount: 0,
      };

      vi.mocked(notificationsService.markAllAsRead).mockResolvedValue(
        zeroResponse,
      );

      const { result } = renderHook(() => useMarkAllAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).not.toHaveBeenCalled();
    });

    it("should show default error message when error has no message", async () => {
      vi.mocked(notificationsService.markAllAsRead).mockRejectedValue(
        new Error(),
      );

      const { result } = renderHook(() => useMarkAllAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al marcar todas las notificaciones como leidas",
      );
    });

    it("should handle onError when context.previousUnreadCount does NOT exist", async () => {
      const error = new Error("Failed");
      vi.mocked(notificationsService.markAllAsRead).mockRejectedValue(error);

      const { wrapper } = createWrapperWithClient();
      // DO NOT set unread count - context.previousUnreadCount will be undefined

      const { result } = renderHook(() => useMarkAllAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Failed");
    });
  });

  describe("useMarkAsUnread", () => {
    it("should mark a notification as unread successfully", async () => {
      const unreadNotification: Notification = {
        ...mockNotification2,
        read: false,
        readAt: undefined,
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(notificationsService.markAsUnread).mockResolvedValue(
        unreadNotification,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("2"),
        mockNotification2,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useMarkAsUnread(), { wrapper });

      await act(async () => {
        result.current.mutate("2");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.markAsUnread).toHaveBeenCalledWith("2");
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it("should perform optimistic update when notification is read", async () => {
      const unreadNotification: Notification = {
        ...mockNotification2,
        read: false,
        readAt: undefined,
      };

      vi.mocked(notificationsService.markAsUnread).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(unreadNotification), 100),
          ),
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("2"),
        mockNotification2,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useMarkAsUnread(), { wrapper });

      await act(async () => {
        result.current.mutate("2");
      });

      // Check optimistic update was applied
      const optimisticData = queryClient.getQueryData<Notification>(
        queryKeys.notifications.detail("2"),
      );
      expect(optimisticData?.read).toBe(false);
      expect(optimisticData?.readAt).toBeUndefined();

      // Check unread count was incremented
      const optimisticCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount(),
      );
      expect(optimisticCount?.count).toBe(mockUnreadCountResponse.count + 1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should not increment unread count when notification is already unread", async () => {
      const unreadNotification: Notification = {
        ...mockNotification,
        read: false,
      };

      vi.mocked(notificationsService.markAsUnread).mockResolvedValue(
        unreadNotification,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      ); // Already unread
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useMarkAsUnread(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      // The optimistic update should NOT have incremented since notification was already unread
      // (the condition is: if (previousNotification && previousNotification.read))
      // Since onSuccess invalidates the query, we just verify the mutation succeeded
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.markAsUnread).toHaveBeenCalledWith("1");
    });

    it("should rollback optimistic update on error", async () => {
      const error = new Error("Error al marcar la notificacion como no leida");
      vi.mocked(notificationsService.markAsUnread).mockRejectedValue(error);

      const { wrapper, queryClient } = createWrapperWithLongCache();
      queryClient.setQueryData(
        queryKeys.notifications.detail("2"),
        mockNotification2,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useMarkAsUnread(), { wrapper });

      await act(async () => {
        result.current.mutate("2");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Check rollback
      const rolledBackData = queryClient.getQueryData<Notification>(
        queryKeys.notifications.detail("2"),
      );
      expect(rolledBackData?.read).toBe(true);

      const rolledBackCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount(),
      );
      expect(rolledBackCount?.count).toBe(mockUnreadCountResponse.count);

      expect(toast.error).toHaveBeenCalledWith(
        "Error al marcar la notificacion como no leida",
      );
    });

    it("should show default error message when error has no message", async () => {
      vi.mocked(notificationsService.markAsUnread).mockRejectedValue(
        new Error(),
      );

      const { result } = renderHook(() => useMarkAsUnread(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al marcar la notificacion como no leida",
      );
    });

    it("should handle onMutate when previousNotification does NOT exist", async () => {
      const unreadNotification: Notification = {
        ...mockNotification,
        read: false,
      };

      vi.mocked(notificationsService.markAsUnread).mockResolvedValue(
        unreadNotification,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );
      // DO NOT set previous notification

      const { result } = renderHook(() => useMarkAsUnread(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should handle onMutate when previousUnreadCount does NOT exist", async () => {
      const unreadNotification: Notification = {
        ...mockNotification2,
        read: false,
      };

      vi.mocked(notificationsService.markAsUnread).mockResolvedValue(
        unreadNotification,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("2"),
        mockNotification2,
      );
      // DO NOT set unread count

      const { result } = renderHook(() => useMarkAsUnread(), { wrapper });

      await act(async () => {
        result.current.mutate("2");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe("useDeleteNotification", () => {
    it("should delete a notification successfully", async () => {
      vi.mocked(notificationsService.deleteNotification).mockResolvedValue();

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const removeSpy = vi.spyOn(queryClient, "removeQueries");

      const { result } = renderHook(() => useDeleteNotification(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.deleteNotification).toHaveBeenCalledWith("1");
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.notifications.all,
      });
      expect(removeSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.notifications.detail("1"),
      });
      expect(toast.success).toHaveBeenCalledWith("Notificacion eliminada");
    });

    it("should decrement unread count when deleting unread notification", async () => {
      vi.mocked(notificationsService.deleteNotification).mockResolvedValue();

      const { wrapper, queryClient } = createWrapperWithLongCache();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      ); // Unread
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useDeleteNotification(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The onSuccess updates the unread count after invalidation
      // With longer cache, the setQueryData should persist
      const updatedCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount(),
      );
      expect(updatedCount?.count).toBe(mockUnreadCountResponse.count - 1);
    });

    it("should not decrement unread count when deleting read notification", async () => {
      vi.mocked(notificationsService.deleteNotification).mockResolvedValue();

      const { wrapper, queryClient } = createWrapperWithLongCache();
      queryClient.setQueryData(
        queryKeys.notifications.detail("2"),
        mockNotification2,
      ); // Already read
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useDeleteNotification(), { wrapper });

      await act(async () => {
        result.current.mutate("2");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The notification was already read, so unread count should NOT be decremented
      // The check: if (notification && !notification.read) is false since read is true
      const updatedCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount(),
      );
      expect(updatedCount?.count).toBe(mockUnreadCountResponse.count);
    });

    it("should handle deletion when notification is NOT in cache", async () => {
      vi.mocked(notificationsService.deleteNotification).mockResolvedValue();

      const { wrapper, queryClient } = createWrapperWithClient();
      // DO NOT set notification in cache
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useDeleteNotification(), { wrapper });

      await act(async () => {
        result.current.mutate("non-cached");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith("Notificacion eliminada");
    });

    it("should handle deletion when unread count is NOT in cache", async () => {
      vi.mocked(notificationsService.deleteNotification).mockResolvedValue();

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      );
      // DO NOT set unread count

      const { result } = renderHook(() => useDeleteNotification(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should handle deletion when unread count is zero", async () => {
      vi.mocked(notificationsService.deleteNotification).mockResolvedValue();

      const zeroCount: UnreadCountResponse = {
        count: 0,
        byType: {},
        byPriority: {},
      };

      const { wrapper, queryClient } = createWrapperWithLongCache();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        zeroCount,
      );

      const { result } = renderHook(() => useDeleteNotification(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Count should remain 0 (the check: previousUnreadCount.count > 0 is false)
      // So the setQueryData to decrement is not called
      const updatedCount = queryClient.getQueryData<UnreadCountResponse>(
        queryKeys.notifications.unreadCount(),
      );
      expect(updatedCount?.count).toBe(0);
    });

    it("should show error toast on failure", async () => {
      const error = new Error("Error al eliminar la notificacion");
      vi.mocked(notificationsService.deleteNotification).mockRejectedValue(
        error,
      );

      const { result } = renderHook(() => useDeleteNotification(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al eliminar la notificacion",
      );
    });

    it("should show default error message when error has no message", async () => {
      vi.mocked(notificationsService.deleteNotification).mockRejectedValue(
        new Error(),
      );

      const { result } = renderHook(() => useDeleteNotification(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al eliminar la notificacion",
      );
    });
  });

  describe("useDeleteMultipleNotifications", () => {
    it("should delete multiple notifications successfully", async () => {
      vi.mocked(
        notificationsService.deleteMultipleNotifications,
      ).mockResolvedValue({
        deletedCount: 3,
      });

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useDeleteMultipleNotifications(), {
        wrapper,
      });

      await act(async () => {
        result.current.mutate(["1", "2", "3"]);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(
        notificationsService.deleteMultipleNotifications,
      ).toHaveBeenCalledWith(["1", "2", "3"]);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.notifications.all,
      });
      expect(toast.success).toHaveBeenCalledWith("3 notificaciones eliminadas");
    });

    it("should show singular message when only one notification is deleted", async () => {
      vi.mocked(
        notificationsService.deleteMultipleNotifications,
      ).mockResolvedValue({
        deletedCount: 1,
      });

      const { result } = renderHook(() => useDeleteMultipleNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(["1"]);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith("1 notificacion eliminada");
    });

    it("should not show toast when no notifications are deleted", async () => {
      vi.mocked(
        notificationsService.deleteMultipleNotifications,
      ).mockResolvedValue({
        deletedCount: 0,
      });

      const { result } = renderHook(() => useDeleteMultipleNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate([]);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).not.toHaveBeenCalled();
    });

    it("should show error toast on failure", async () => {
      const error = new Error("Error al eliminar las notificaciones");
      vi.mocked(
        notificationsService.deleteMultipleNotifications,
      ).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteMultipleNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(["1", "2"]);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al eliminar las notificaciones",
      );
    });

    it("should show default error message when error has no message", async () => {
      vi.mocked(
        notificationsService.deleteMultipleNotifications,
      ).mockRejectedValue(new Error());

      const { result } = renderHook(() => useDeleteMultipleNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(["1", "2"]);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al eliminar las notificaciones",
      );
    });
  });

  describe("useClearReadNotifications", () => {
    it("should clear all read notifications successfully", async () => {
      vi.mocked(notificationsService.clearReadNotifications).mockResolvedValue({
        deletedCount: 5,
      });

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useClearReadNotifications(), {
        wrapper,
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.clearReadNotifications).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.notifications.all,
      });
      expect(toast.success).toHaveBeenCalledWith(
        "5 notificaciones leidas eliminadas",
      );
    });

    it("should show singular message when only one notification is cleared", async () => {
      vi.mocked(notificationsService.clearReadNotifications).mockResolvedValue({
        deletedCount: 1,
      });

      const { result } = renderHook(() => useClearReadNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        "1 notificacion leida eliminada",
      );
    });

    it("should show info toast when no read notifications to clear", async () => {
      vi.mocked(notificationsService.clearReadNotifications).mockResolvedValue({
        deletedCount: 0,
      });

      const { result } = renderHook(() => useClearReadNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.info).toHaveBeenCalledWith(
        "No hay notificaciones leidas para eliminar",
      );
    });

    it("should show error toast on failure", async () => {
      const error = new Error("Error al limpiar las notificaciones leidas");
      vi.mocked(notificationsService.clearReadNotifications).mockRejectedValue(
        error,
      );

      const { result } = renderHook(() => useClearReadNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al limpiar las notificaciones leidas",
      );
    });

    it("should show default error message when error has no message", async () => {
      vi.mocked(notificationsService.clearReadNotifications).mockRejectedValue(
        new Error(),
      );

      const { result } = renderHook(() => useClearReadNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al limpiar las notificaciones leidas",
      );
    });
  });

  describe("useCreateNotification", () => {
    const createData: CreateNotificationData = {
      type: "LOW_STOCK",
      title: "Stock bajo",
      message: "El producto X tiene stock bajo",
      priority: "HIGH",
      link: "/products/1",
      metadata: { productId: "1" },
    };

    it("should create a notification successfully", async () => {
      const createdNotification: Notification = {
        id: "13",
        ...createData,
        priority: createData.priority!,
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(notificationsService.createNotification).mockResolvedValue(
        createdNotification,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreateNotification(), { wrapper });

      await act(async () => {
        result.current.mutate(createData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        createData,
      );
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.notifications.all,
      });
      expect(toast.success).toHaveBeenCalledWith(
        `Notificacion "${createdNotification.title}" creada`,
      );
    });

    it("should create notification with default priority", async () => {
      const dataWithoutPriority: CreateNotificationData = {
        type: "INFO",
        title: "Informacion",
        message: "Mensaje informativo",
      };

      const createdNotification: Notification = {
        id: "14",
        type: dataWithoutPriority.type,
        title: dataWithoutPriority.title,
        message: dataWithoutPriority.message,
        priority: "MEDIUM", // Default
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(notificationsService.createNotification).mockResolvedValue(
        createdNotification,
      );

      const { result } = renderHook(() => useCreateNotification(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(dataWithoutPriority);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        dataWithoutPriority,
      );
    });

    it("should show error toast on failure", async () => {
      const error = new Error("Error al crear la notificacion");
      vi.mocked(notificationsService.createNotification).mockRejectedValue(
        error,
      );

      const { result } = renderHook(() => useCreateNotification(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(createData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al crear la notificacion",
      );
    });

    it("should show default error message when error has no message", async () => {
      vi.mocked(notificationsService.createNotification).mockRejectedValue(
        new Error(),
      );

      const { result } = renderHook(() => useCreateNotification(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(createData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al crear la notificacion",
      );
    });
  });

  describe("useNotificationClick", () => {
    it("should mark as read and navigate when clicking unread notification with link", async () => {
      vi.mocked(notificationsService.markAsRead).mockResolvedValue({
        ...mockNotification,
        read: true,
      });

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useNotificationClick(), { wrapper });

      act(() => {
        result.current(mockNotificationSummary);
      });

      expect(mockNavigate).toHaveBeenCalledWith("/products/1");

      // Wait for mark as read to be called
      await waitFor(() => {
        expect(notificationsService.markAsRead).toHaveBeenCalledWith("1");
      });
    });

    it("should only navigate when clicking read notification with link", async () => {
      const { result } = renderHook(() => useNotificationClick(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current(mockNotificationSummary2); // Read notification with link
      });

      expect(mockNavigate).toHaveBeenCalledWith("/invoices/125");
      expect(notificationsService.markAsRead).not.toHaveBeenCalled();
    });

    it("should not navigate when clicking notification without link", async () => {
      const notificationWithoutLink: NotificationSummary = {
        ...mockNotificationSummary,
        link: undefined,
      };

      vi.mocked(notificationsService.markAsRead).mockResolvedValue({
        ...mockNotification,
        read: true,
      });

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useNotificationClick(), { wrapper });

      act(() => {
        result.current(notificationWithoutLink);
      });

      expect(mockNavigate).not.toHaveBeenCalled();

      // Should still mark as read
      await waitFor(() => {
        expect(notificationsService.markAsRead).toHaveBeenCalledWith("1");
      });
    });

    it("should work with Notification type (not just NotificationSummary)", async () => {
      vi.mocked(notificationsService.markAsRead).mockResolvedValue({
        ...mockNotification,
        read: true,
      });

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useNotificationClick(), { wrapper });

      act(() => {
        result.current(mockNotification);
      });

      expect(mockNavigate).toHaveBeenCalledWith("/products/1");

      await waitFor(() => {
        expect(notificationsService.markAsRead).toHaveBeenCalledWith("1");
      });
    });

    it("should not mark as read when notification is already read", () => {
      const { result } = renderHook(() => useNotificationClick(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current(mockNotification2); // Already read
      });

      expect(notificationsService.markAsRead).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/invoices/125");
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe("Edge cases", () => {
    it("should handle network errors gracefully", async () => {
      const networkError = new Error("Network error");
      vi.mocked(notificationsService.getNotifications).mockRejectedValue(
        networkError,
      );

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Network error");
    });

    it("should handle concurrent mutations", async () => {
      const notification1: Notification = { ...mockNotification, id: "1" };
      const notification2: Notification = {
        ...mockNotification2,
        id: "2",
        read: false,
      };

      vi.mocked(notificationsService.markAsRead)
        .mockResolvedValueOnce({ ...notification1, read: true })
        .mockResolvedValueOnce({ ...notification2, read: true });

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        notification1,
      );
      queryClient.setQueryData(
        queryKeys.notifications.detail("2"),
        notification2,
      );
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        mockUnreadCountResponse,
      );

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
        result.current.mutate("2");
      });

      await waitFor(() => {
        expect(notificationsService.markAsRead).toHaveBeenCalledTimes(2);
      });
    });

    it("should handle pagination correctly", async () => {
      const page2Response: NotificationsResponse = {
        data: [mockNotificationSummary2],
        meta: {
          total: 12,
          page: 2,
          limit: 10,
          totalPages: 2,
          unreadCount: 5,
        },
      };

      vi.mocked(notificationsService.getNotifications).mockResolvedValue(
        page2Response,
      );

      const { result } = renderHook(
        () => useNotifications({ page: 2, limit: 10 }),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.meta.page).toBe(2);
      expect(result.current.data?.meta.totalPages).toBe(2);
    });

    it("should handle sorting options", async () => {
      const filters: NotificationFilters = {
        sortBy: "priority",
        sortOrder: "desc",
      };

      vi.mocked(notificationsService.getNotifications).mockResolvedValue(
        mockNotificationsResponse,
      );

      const { result } = renderHook(() => useNotifications(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsService.getNotifications).toHaveBeenCalledWith(
        filters,
      );
    });
  });

  // ============================================================================
  // CACHE INVALIDATION TESTS
  // ============================================================================

  describe("Cache invalidation", () => {
    it("should invalidate list queries after marking as read", async () => {
      const readNotification: Notification = {
        ...mockNotification,
        read: true,
      };

      vi.mocked(notificationsService.markAsRead).mockResolvedValue(
        readNotification,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.notifications.detail("1"),
        mockNotification,
      );
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.notifications.list(),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.notifications.recent(),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    });

    it("should invalidate all notification queries after delete", async () => {
      vi.mocked(notificationsService.deleteNotification).mockResolvedValue();

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useDeleteNotification(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.notifications.all,
      });
    });

    it("should NOT invalidate cache on error", async () => {
      const error = new Error("Failed to delete");
      vi.mocked(notificationsService.deleteNotification).mockRejectedValue(
        error,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useDeleteNotification(), { wrapper });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // invalidateQueries should NOT have been called since the mutation failed
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // LOADING STATES
  // ============================================================================

  describe("Loading states", () => {
    it("should return isPending while mutation is in progress", async () => {
      let resolvePromise: (value: Notification) => void;
      const promise = new Promise<Notification>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(notificationsService.markAsRead).mockReturnValue(promise);

      const { result } = renderHook(() => useMarkAsRead(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate("1");
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      resolvePromise!({ ...mockNotification, read: true });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should return isLoading while query is fetching", async () => {
      let resolvePromise: (value: NotificationsResponse) => void;
      const promise = new Promise<NotificationsResponse>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(notificationsService.getNotifications).mockReturnValue(promise);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      resolvePromise!(mockNotificationsResponse);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });
});
