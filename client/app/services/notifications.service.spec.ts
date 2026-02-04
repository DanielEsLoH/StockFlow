import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notificationsService } from "./notifications.service";
import { api } from "~/lib/api";
import type {
  NotificationFilters,
  CreateNotificationData,
  Notification,
  NotificationsResponse,
  UnreadCountResponse,
  MarkAsReadResponse,
} from "~/types/notification";

// Mock the api module
vi.mock("~/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockNotification: Notification = {
  id: "notif-1",
  type: "LOW_STOCK",
  title: "Stock bajo",
  message: "El producto Laptop HP Pavilion tiene solo 3 unidades en inventario",
  priority: "HIGH",
  read: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  link: "/products/1",
  metadata: { productId: "1", currentStock: 3, minStock: 10 },
};

const mockNotificationRead: Notification = {
  ...mockNotification,
  id: "notif-2",
  read: true,
  readAt: new Date().toISOString(),
};

const mockNotificationsResponse: NotificationsResponse = {
  data: [mockNotification, mockNotificationRead],
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
    PAYMENT_RECEIVED: 1,
    INVOICE_OVERDUE: 1,
  },
  byPriority: {
    URGENT: 1,
    HIGH: 2,
    MEDIUM: 1,
    LOW: 1,
  },
};

const mockMarkAsReadResponse: MarkAsReadResponse = {
  success: true,
  updatedCount: 1,
};

describe("notificationsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getNotifications", () => {
    it("should call api.get with correct endpoint and return data", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotificationsResponse });

      const result = await notificationsService.getNotifications();

      expect(api.get).toHaveBeenCalledWith("/notifications?");
      expect(result).toEqual(mockNotificationsResponse);
    });

    it("should pass filters as query params", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotificationsResponse });

      const filters: NotificationFilters = {
        page: 2,
        limit: 20,
        type: "LOW_STOCK",
        priority: "HIGH",
        read: false,
        search: "laptop",
      };

      await notificationsService.getNotifications(filters);

      expect(api.get).toHaveBeenCalledWith(
        "/notifications?page=2&limit=20&type=LOW_STOCK&priority=HIGH&read=false&search=laptop",
      );
    });

    it("should exclude undefined filter values", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotificationsResponse });

      const filters: NotificationFilters = {
        page: 1,
        type: undefined,
        read: undefined,
      };

      await notificationsService.getNotifications(filters);

      expect(api.get).toHaveBeenCalledWith("/notifications?page=1");
    });

    it("should exclude null filter values", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotificationsResponse });

      const filters: NotificationFilters = {
        page: 1,
        limit: null as unknown as number,
      };

      await notificationsService.getNotifications(filters);

      expect(api.get).toHaveBeenCalledWith("/notifications?page=1");
    });

    it("should handle empty filters", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotificationsResponse });

      await notificationsService.getNotifications({});

      expect(api.get).toHaveBeenCalledWith("/notifications?");
    });

    it("should handle api errors", async () => {
      const error = new Error("Network error");
      vi.mocked(api.get).mockRejectedValue(error);

      await expect(notificationsService.getNotifications()).rejects.toThrow(
        "Network error",
      );
    });
  });

  describe("getNotification", () => {
    it("should call api.get with correct endpoint", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotification });

      const result = await notificationsService.getNotification("notif-1");

      expect(api.get).toHaveBeenCalledWith("/notifications/notif-1");
      expect(result).toEqual(mockNotification);
    });

    it("should handle api errors", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Not found"));

      await expect(
        notificationsService.getNotification("invalid-id"),
      ).rejects.toThrow("Not found");
    });
  });

  describe("getUnreadCount", () => {
    it("should call api.get with correct endpoint", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockUnreadCountResponse });

      const result = await notificationsService.getUnreadCount();

      expect(api.get).toHaveBeenCalledWith("/notifications/unread/count");
      expect(result).toEqual(mockUnreadCountResponse);
    });

    it("should return count structure with byType and byPriority", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockUnreadCountResponse });

      const result = await notificationsService.getUnreadCount();

      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("byType");
      expect(result).toHaveProperty("byPriority");
      expect(typeof result.count).toBe("number");
    });
  });

  describe("getRecentNotifications", () => {
    it("should call api.get with default limit", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [mockNotification] });

      const result = await notificationsService.getRecentNotifications();

      expect(api.get).toHaveBeenCalledWith("/notifications/recent?limit=5");
      expect(result).toEqual([mockNotification]);
    });

    it("should call api.get with custom limit", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [mockNotification] });

      await notificationsService.getRecentNotifications(10);

      expect(api.get).toHaveBeenCalledWith("/notifications/recent?limit=10");
    });

    it("should return array of notifications", async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [mockNotification, mockNotificationRead],
      });

      const result = await notificationsService.getRecentNotifications();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe("markAsRead", () => {
    it("should call api.patch with correct endpoint", async () => {
      const readNotification = {
        ...mockNotification,
        read: true,
        readAt: new Date().toISOString(),
      };
      vi.mocked(api.patch).mockResolvedValue({ data: readNotification });

      const result = await notificationsService.markAsRead("notif-1");

      expect(api.patch).toHaveBeenCalledWith("/notifications/notif-1/read");
      expect(result.read).toBe(true);
      expect(result.readAt).toBeDefined();
    });

    it("should handle api errors", async () => {
      vi.mocked(api.patch).mockRejectedValue(new Error("Not found"));

      await expect(
        notificationsService.markAsRead("invalid-id"),
      ).rejects.toThrow("Not found");
    });
  });

  describe("markMultipleAsRead", () => {
    it("should call api.patch with correct endpoint and body", async () => {
      vi.mocked(api.patch).mockResolvedValue({ data: mockMarkAsReadResponse });

      const ids = ["notif-1", "notif-2"];
      const result = await notificationsService.markMultipleAsRead(ids);

      expect(api.patch).toHaveBeenCalledWith("/notifications/read", { ids });
      expect(result).toEqual(mockMarkAsReadResponse);
    });

    it("should handle empty array", async () => {
      vi.mocked(api.patch).mockResolvedValue({
        data: { success: true, updatedCount: 0 },
      });

      const result = await notificationsService.markMultipleAsRead([]);

      expect(api.patch).toHaveBeenCalledWith("/notifications/read", {
        ids: [],
      });
      expect(result.updatedCount).toBe(0);
    });
  });

  describe("markAllAsRead", () => {
    it("should call api.patch with correct endpoint", async () => {
      vi.mocked(api.patch).mockResolvedValue({
        data: { success: true, updatedCount: 5 },
      });

      const result = await notificationsService.markAllAsRead();

      expect(api.patch).toHaveBeenCalledWith("/notifications/read-all");
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(5);
    });
  });

  describe("markAsUnread", () => {
    it("should call api.patch with correct endpoint", async () => {
      const unreadNotification = {
        ...mockNotification,
        read: false,
        readAt: undefined,
      };
      vi.mocked(api.patch).mockResolvedValue({ data: unreadNotification });

      const result = await notificationsService.markAsUnread("notif-1");

      expect(api.patch).toHaveBeenCalledWith("/notifications/notif-1/unread");
      expect(result.read).toBe(false);
    });
  });

  describe("deleteNotification", () => {
    it("should call api.delete with correct endpoint", async () => {
      vi.mocked(api.delete).mockResolvedValue({});

      await notificationsService.deleteNotification("notif-1");

      expect(api.delete).toHaveBeenCalledWith("/notifications/notif-1");
    });

    it("should handle api errors", async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error("Not found"));

      await expect(
        notificationsService.deleteNotification("invalid-id"),
      ).rejects.toThrow("Not found");
    });
  });

  describe("deleteMultipleNotifications", () => {
    it("should call api.delete with correct endpoint and body", async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: { deletedCount: 2 } });

      const ids = ["notif-1", "notif-2"];
      const result =
        await notificationsService.deleteMultipleNotifications(ids);

      expect(api.delete).toHaveBeenCalledWith("/notifications", {
        data: { ids },
      });
      expect(result.deletedCount).toBe(2);
    });

    it("should handle empty array", async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: { deletedCount: 0 } });

      const result = await notificationsService.deleteMultipleNotifications([]);

      expect(api.delete).toHaveBeenCalledWith("/notifications", {
        data: { ids: [] },
      });
      expect(result.deletedCount).toBe(0);
    });
  });

  describe("clearReadNotifications", () => {
    it("should call api.delete with correct endpoint", async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: { deletedCount: 3 } });

      const result = await notificationsService.clearReadNotifications();

      expect(api.delete).toHaveBeenCalledWith("/notifications/clear-read");
      expect(result.deletedCount).toBe(3);
    });
  });

  describe("createNotification", () => {
    it("should call api.post with correct endpoint and body", async () => {
      const newNotification: CreateNotificationData = {
        type: "LOW_STOCK",
        title: "Test notification",
        message: "Test message",
        priority: "HIGH",
        link: "/test",
        metadata: { key: "value" },
      };
      vi.mocked(api.post).mockResolvedValue({
        data: { ...mockNotification, ...newNotification },
      });

      const result =
        await notificationsService.createNotification(newNotification);

      expect(api.post).toHaveBeenCalledWith("/notifications", newNotification);
      expect(result.title).toBe("Test notification");
      expect(result.type).toBe("LOW_STOCK");
    });

    it("should create notification with required fields only", async () => {
      const newNotification: CreateNotificationData = {
        type: "INFO",
        title: "Minimal notification",
        message: "Test message",
      };
      vi.mocked(api.post).mockResolvedValue({
        data: {
          id: "new-id",
          ...newNotification,
          priority: "MEDIUM",
          read: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      const result =
        await notificationsService.createNotification(newNotification);

      expect(api.post).toHaveBeenCalledWith("/notifications", newNotification);
      expect(result.id).toBeDefined();
      expect(result.priority).toBe("MEDIUM");
      expect(result.read).toBe(false);
    });

    it("should handle api errors", async () => {
      vi.mocked(api.post).mockRejectedValue(new Error("Validation error"));

      await expect(
        notificationsService.createNotification({
          type: "INFO",
          title: "Test",
          message: "Test",
        }),
      ).rejects.toThrow("Validation error");
    });
  });

  describe("edge cases", () => {
    it("should handle network timeout", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("timeout"));

      await expect(notificationsService.getNotifications()).rejects.toThrow(
        "timeout",
      );
    });

    it("should handle 401 unauthorized", async () => {
      const error = {
        response: { status: 401, data: { message: "Unauthorized" } },
      };
      vi.mocked(api.get).mockRejectedValue(error);

      await expect(notificationsService.getNotifications()).rejects.toEqual(
        error,
      );
    });

    it("should handle 500 server error", async () => {
      const error = {
        response: { status: 500, data: { message: "Internal server error" } },
      };
      vi.mocked(api.get).mockRejectedValue(error);

      await expect(notificationsService.getUnreadCount()).rejects.toEqual(
        error,
      );
    });

    it("should handle empty response data", async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0, unreadCount: 0 },
        },
      });

      const result = await notificationsService.getNotifications();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("filter combinations", () => {
    it("should handle all filters combined", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotificationsResponse });

      const filters: NotificationFilters = {
        page: 1,
        limit: 10,
        type: "LOW_STOCK",
        priority: "HIGH",
        read: false,
        search: "test",
        sortBy: "createdAt",
        sortOrder: "desc",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      };

      await notificationsService.getNotifications(filters);

      const expectedParams =
        "page=1&limit=10&type=LOW_STOCK&priority=HIGH&read=false&search=test&sortBy=createdAt&sortOrder=desc&startDate=2024-01-01&endDate=2024-12-31";
      expect(api.get).toHaveBeenCalledWith(`/notifications?${expectedParams}`);
    });

    it("should handle boolean false as string in query params", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotificationsResponse });

      await notificationsService.getNotifications({ read: false });

      expect(api.get).toHaveBeenCalledWith("/notifications?read=false");
    });

    it("should handle boolean true as string in query params", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotificationsResponse });

      await notificationsService.getNotifications({ read: true });

      expect(api.get).toHaveBeenCalledWith("/notifications?read=true");
    });
  });

  describe("response data types", () => {
    it("should return notification with all expected properties", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotification });

      const result = await notificationsService.getNotification("notif-1");

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("priority");
      expect(result).toHaveProperty("read");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");
    });

    it("should return paginated response with meta", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotificationsResponse });

      const result = await notificationsService.getNotifications();

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("meta");
      expect(result.meta).toHaveProperty("total");
      expect(result.meta).toHaveProperty("page");
      expect(result.meta).toHaveProperty("limit");
      expect(result.meta).toHaveProperty("totalPages");
      expect(result.meta).toHaveProperty("unreadCount");
    });

    it("should return unread count response with breakdown", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockUnreadCountResponse });

      const result = await notificationsService.getUnreadCount();

      expect(typeof result.count).toBe("number");
      expect(typeof result.byType).toBe("object");
      expect(typeof result.byPriority).toBe("object");
    });
  });
});
