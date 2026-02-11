import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { settingsService } from "./settings.service";
import type { UserPreferences } from "./settings.service";

// Mock the api module
vi.mock("~/lib/api", () => ({
  api: {
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from "~/lib/api";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("settingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe("updateProfile", () => {
    it("should call PATCH /users/:userId with data", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "Juan",
        lastName: "Perez",
        role: "ADMIN",
        status: "ACTIVE",
        tenantId: "tenant-1",
      };

      vi.mocked(api.patch).mockResolvedValue({ data: mockUser });

      const result = await settingsService.updateProfile("user-123", {
        firstName: "Juan",
      });

      expect(api.patch).toHaveBeenCalledWith("/users/user-123", {
        firstName: "Juan",
      });
      expect(result).toEqual(mockUser);
    });

    it("should send all provided fields", async () => {
      vi.mocked(api.patch).mockResolvedValue({ data: {} });

      await settingsService.updateProfile("user-123", {
        firstName: "Carlos",
        lastName: "Rodriguez",
        email: "carlos@example.com",
        phone: "+57 310 987 6543",
      });

      expect(api.patch).toHaveBeenCalledWith("/users/user-123", {
        firstName: "Carlos",
        lastName: "Rodriguez",
        email: "carlos@example.com",
        phone: "+57 310 987 6543",
      });
    });
  });

  describe("changePassword", () => {
    it("should call PATCH /users/:userId/change-password", async () => {
      vi.mocked(api.patch).mockResolvedValue({ data: undefined });

      await settingsService.changePassword("user-123", {
        currentPassword: "oldPass123",
        newPassword: "newPass123",
        confirmPassword: "newPass123",
      });

      expect(api.patch).toHaveBeenCalledWith(
        "/users/user-123/change-password",
        {
          currentPassword: "oldPass123",
          newPassword: "newPass123",
        },
      );
    });

    it("should not send confirmPassword to API", async () => {
      vi.mocked(api.patch).mockResolvedValue({ data: undefined });

      await settingsService.changePassword("user-123", {
        currentPassword: "old",
        newPassword: "newPass123",
        confirmPassword: "newPass123",
      });

      const callArgs = vi.mocked(api.patch).mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(callArgs).not.toHaveProperty("confirmPassword");
    });
  });

  describe("getPreferences", () => {
    it("should return preferences from localStorage", () => {
      const storedPreferences: UserPreferences = {
        theme: "dark",
        language: "en",
        currency: "USD",
        dateFormat: "MM/DD/YYYY",
        notifications: {
          email: false,
          push: true,
          lowStock: true,
          invoices: false,
          reports: true,
        },
        dashboard: {
          showSalesChart: false,
          showCategoryDistribution: true,
          showTopProducts: false,
          showLowStockAlerts: true,
        },
      };

      localStorageMock.setItem(
        "user-preferences",
        JSON.stringify(storedPreferences),
      );

      const result = settingsService.getPreferences();

      expect(result.theme).toBe("dark");
      expect(result.language).toBe("en");
      expect(result.currency).toBe("USD");
      expect(result.dateFormat).toBe("MM/DD/YYYY");
    });

    it("should return defaults when localStorage is empty", () => {
      const result = settingsService.getPreferences();

      expect(result.theme).toBe("system");
      expect(result.language).toBe("es");
      expect(result.currency).toBe("COP");
      expect(result.dateFormat).toBe("DD/MM/YYYY");
    });

    it("should return default notifications when localStorage is empty", () => {
      const result = settingsService.getPreferences();

      expect(result.notifications.email).toBe(true);
      expect(result.notifications.push).toBe(true);
      expect(result.notifications.lowStock).toBe(true);
      expect(result.notifications.invoices).toBe(true);
      expect(result.notifications.reports).toBe(false);
    });

    it("should merge partial preferences with defaults", () => {
      localStorageMock.setItem(
        "user-preferences",
        JSON.stringify({ theme: "dark" }),
      );

      const result = settingsService.getPreferences();

      expect(result.theme).toBe("dark");
      expect(result.language).toBe("es");
      expect(result.currency).toBe("COP");
    });

    it("should merge partial notifications with defaults", () => {
      localStorageMock.setItem(
        "user-preferences",
        JSON.stringify({ notifications: { email: false } }),
      );

      const result = settingsService.getPreferences();

      expect(result.notifications.email).toBe(false);
      expect(result.notifications.push).toBe(true);
    });

    it("should handle invalid JSON gracefully", () => {
      localStorageMock.getItem.mockReturnValueOnce("invalid json {");

      const result = settingsService.getPreferences();

      expect(result.theme).toBe("system");
    });
  });

  describe("updatePreferences", () => {
    it("should save preferences to localStorage", () => {
      const preferences: UserPreferences = {
        theme: "dark",
        language: "en",
        currency: "USD",
        dateFormat: "YYYY-MM-DD",
        notifications: {
          email: false,
          push: true,
          lowStock: true,
          invoices: true,
          reports: true,
        },
        dashboard: {
          showSalesChart: true,
          showCategoryDistribution: false,
          showTopProducts: true,
          showLowStockAlerts: false,
        },
      };

      settingsService.updatePreferences(preferences);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "user-preferences",
        JSON.stringify(preferences),
      );
    });

    it("should return updated preferences", () => {
      const preferences: UserPreferences = {
        theme: "light",
        language: "es",
        currency: "EUR",
        dateFormat: "DD/MM/YYYY",
        notifications: {
          email: true,
          push: false,
          lowStock: true,
          invoices: false,
          reports: true,
        },
        dashboard: {
          showSalesChart: false,
          showCategoryDistribution: true,
          showTopProducts: false,
          showLowStockAlerts: true,
        },
      };

      const result = settingsService.updatePreferences(preferences);

      expect(result).toEqual(preferences);
    });

    it("should handle localStorage error gracefully", () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("QuotaExceededError");
      });

      const preferences: UserPreferences = {
        theme: "dark",
        language: "en",
        currency: "USD",
        dateFormat: "YYYY-MM-DD",
        notifications: {
          email: true,
          push: true,
          lowStock: true,
          invoices: true,
          reports: true,
        },
        dashboard: {
          showSalesChart: true,
          showCategoryDistribution: true,
          showTopProducts: true,
          showLowStockAlerts: true,
        },
      };

      const result = settingsService.updatePreferences(preferences);

      expect(result).toEqual(preferences);
    });
  });

  describe("uploadAvatar", () => {
    it("should POST /users/me/avatar with FormData", async () => {
      const mockUser = {
        id: "user-123",
        avatar: "https://r2.dev/avatar.jpg",
      };
      vi.mocked(api.post).mockResolvedValue({ data: mockUser });

      const file = new File(["avatar"], "avatar.jpg", { type: "image/jpeg" });
      const result = await settingsService.uploadAvatar(file);

      expect(api.post).toHaveBeenCalledWith(
        "/users/me/avatar",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      expect(result).toEqual(mockUser);
    });

    it("should append file to FormData", async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });

      const file = new File(["content"], "photo.png", { type: "image/png" });
      await settingsService.uploadAvatar(file);

      const formData = vi.mocked(api.post).mock.calls[0][1] as FormData;
      expect(formData.get("file")).toBe(file);
    });
  });

  describe("deleteAvatar", () => {
    it("should call DELETE /users/me/avatar", async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: undefined });

      await settingsService.deleteAvatar();

      expect(api.delete).toHaveBeenCalledWith("/users/me/avatar");
    });
  });

  describe("SSR environment", () => {
    let originalWindow: typeof globalThis.window;

    beforeEach(() => {
      originalWindow = globalThis.window;
    });

    afterEach(() => {
      globalThis.window = originalWindow;
    });

    it("getPreferences should return defaults when window is undefined", () => {
      // @ts-expect-error - Intentionally setting window to undefined for SSR test
      delete globalThis.window;

      const result = settingsService.getPreferences();

      expect(result.theme).toBe("system");
      expect(result.language).toBe("es");
    });

    it("updatePreferences should return preferences without saving when window is undefined", () => {
      // @ts-expect-error - Intentionally setting window to undefined for SSR test
      delete globalThis.window;

      const preferences: UserPreferences = {
        theme: "dark",
        language: "en",
        currency: "USD",
        dateFormat: "YYYY-MM-DD",
        notifications: {
          email: false,
          push: false,
          lowStock: true,
          invoices: true,
          reports: true,
        },
        dashboard: {
          showSalesChart: false,
          showCategoryDistribution: false,
          showTopProducts: true,
          showLowStockAlerts: true,
        },
      };

      const result = settingsService.updatePreferences(preferences);

      expect(result).toEqual(preferences);
    });
  });
});
