import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { settingsService } from "./settings.service";
import type {
  ProfileUpdateData,
  PasswordChangeData,
  UserPreferences,
} from "./settings.service";

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

// Mock URL.createObjectURL
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(window, "URL", {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
});

describe("settingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorageMock.clear();
    // Reset mock return value for URL.createObjectURL
    mockCreateObjectURL.mockReturnValue("blob:mock-avatar-url");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("updateProfile", () => {
    it("should update profile with firstName", async () => {
      const userId = "user-123";
      const data: ProfileUpdateData = {
        firstName: "Juan",
      };

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty("id", userId);
      expect(result).toHaveProperty("firstName", "Juan");
    });

    it("should update profile with lastName", async () => {
      const userId = "user-123";
      const data: ProfileUpdateData = {
        lastName: "Perez",
      };

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty("id", userId);
      expect(result).toHaveProperty("lastName", "Perez");
    });

    it("should update profile with email", async () => {
      const userId = "user-123";
      const data: ProfileUpdateData = {
        email: "juan.perez@example.com",
      };

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty("id", userId);
      expect(result).toHaveProperty("email", "juan.perez@example.com");
    });

    it("should update profile with phone", async () => {
      const userId = "user-123";
      const data: ProfileUpdateData = {
        phone: "+57 300 123 4567",
      };

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty("id", userId);
      // Phone is not included in the mock return, but service accepts it
      expect(result).toBeDefined();
    });

    it("should update profile with partial data (firstName and lastName)", async () => {
      const userId = "user-456";
      const data: ProfileUpdateData = {
        firstName: "Maria",
        lastName: "Garcia",
      };

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.id).toBe(userId);
      expect(result.firstName).toBe("Maria");
      expect(result.lastName).toBe("Garcia");
    });

    it("should update profile with all fields", async () => {
      const userId = "user-789";
      const data: ProfileUpdateData = {
        firstName: "Carlos",
        lastName: "Rodriguez",
        email: "carlos@example.com",
        phone: "+57 310 987 6543",
        avatarUrl: "https://example.com/avatar.jpg",
      };

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.id).toBe(userId);
      expect(result.firstName).toBe("Carlos");
      expect(result.lastName).toBe("Rodriguez");
      expect(result.email).toBe("carlos@example.com");
      expect(result.avatarUrl).toBe("https://example.com/avatar.jpg");
    });

    it("should return updated user object", async () => {
      const userId = "user-123";
      const data: ProfileUpdateData = {
        firstName: "Test",
      };

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("firstName");
      expect(result).toHaveProperty("lastName");
      expect(result).toHaveProperty("role");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("tenantId");
    });

    it("should return user with correct role", async () => {
      const userId = "user-123";
      const data: ProfileUpdateData = {};

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.role).toBe("ADMIN");
    });

    it("should return user with correct status", async () => {
      const userId = "user-123";
      const data: ProfileUpdateData = {};

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.status).toBe("ACTIVE");
    });

    it("should use default values when fields not provided", async () => {
      const userId = "user-empty";
      const data: ProfileUpdateData = {};

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.email).toBe("usuario@example.com");
      expect(result.firstName).toBe("Usuario");
      expect(result.lastName).toBe("Ejemplo");
    });

    it("should handle avatarUrl update", async () => {
      const userId = "user-123";
      const data: ProfileUpdateData = {
        avatarUrl: "blob:new-avatar-url",
      };

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.avatarUrl).toBe("blob:new-avatar-url");
    });
  });

  describe("changePassword", () => {
    it("should change password with correct current password", async () => {
      const userId = "user-123";
      const data: PasswordChangeData = {
        currentPassword: "currentPassword123",
        newPassword: "newSecurePassword123",
        confirmPassword: "newSecurePassword123",
      };

      const promise = settingsService.changePassword(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty("message");
      expect(result.message).toBe("Contrasena actualizada exitosamente");
    });

    it("should throw error with incorrect current password", async () => {
      const userId = "user-123";
      const data: PasswordChangeData = {
        currentPassword: "wrongPassword",
        newPassword: "newSecurePassword123",
        confirmPassword: "newSecurePassword123",
      };

      const promise = settingsService.changePassword(userId, data);
      vi.advanceTimersByTime(500);

      await expect(promise).rejects.toThrow(
        "La contrasena actual es incorrecta",
      );
    });

    it("should throw error when password is too short", async () => {
      const userId = "user-123";
      const data: PasswordChangeData = {
        currentPassword: "currentPassword123",
        newPassword: "short",
        confirmPassword: "short",
      };

      const promise = settingsService.changePassword(userId, data);
      vi.advanceTimersByTime(500);

      await expect(promise).rejects.toThrow(
        "La nueva contrasena debe tener al menos 8 caracteres",
      );
    });

    it("should throw error when passwords do not match", async () => {
      const userId = "user-123";
      const data: PasswordChangeData = {
        currentPassword: "currentPassword123",
        newPassword: "newSecurePassword123",
        confirmPassword: "differentPassword123",
      };

      const promise = settingsService.changePassword(userId, data);
      vi.advanceTimersByTime(500);

      await expect(promise).rejects.toThrow("Las contrasenas no coinciden");
    });

    it("should validate current password before checking password match", async () => {
      const userId = "user-123";
      const data: PasswordChangeData = {
        currentPassword: "wrongPassword",
        newPassword: "newPassword123",
        confirmPassword: "differentPassword123",
      };

      const promise = settingsService.changePassword(userId, data);
      vi.advanceTimersByTime(500);

      // Should fail on current password first
      await expect(promise).rejects.toThrow(
        "La contrasena actual es incorrecta",
      );
    });

    it("should accept password with exactly 8 characters", async () => {
      const userId = "user-123";
      const data: PasswordChangeData = {
        currentPassword: "currentPassword123",
        newPassword: "12345678",
        confirmPassword: "12345678",
      };

      const promise = settingsService.changePassword(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.message).toBe("Contrasena actualizada exitosamente");
    });

    it("should accept password longer than 8 characters", async () => {
      const userId = "user-123";
      const data: PasswordChangeData = {
        currentPassword: "currentPassword123",
        newPassword: "aVeryLongAndSecurePasswordWith123",
        confirmPassword: "aVeryLongAndSecurePasswordWith123",
      };

      const promise = settingsService.changePassword(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.message).toBe("Contrasena actualizada exitosamente");
    });

    it("should reject password with 7 characters", async () => {
      const userId = "user-123";
      const data: PasswordChangeData = {
        currentPassword: "currentPassword123",
        newPassword: "1234567",
        confirmPassword: "1234567",
      };

      const promise = settingsService.changePassword(userId, data);
      vi.advanceTimersByTime(500);

      await expect(promise).rejects.toThrow(
        "La nueva contrasena debe tener al menos 8 caracteres",
      );
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

    it("should return default dashboard settings when localStorage is empty", () => {
      const result = settingsService.getPreferences();

      expect(result.dashboard.showSalesChart).toBe(true);
      expect(result.dashboard.showCategoryDistribution).toBe(true);
      expect(result.dashboard.showTopProducts).toBe(true);
      expect(result.dashboard.showLowStockAlerts).toBe(true);
    });

    it("should merge partial preferences with defaults", () => {
      const partialPreferences = {
        theme: "dark",
      };

      localStorageMock.setItem(
        "user-preferences",
        JSON.stringify(partialPreferences),
      );

      const result = settingsService.getPreferences();

      // Custom value
      expect(result.theme).toBe("dark");
      // Default values
      expect(result.language).toBe("es");
      expect(result.currency).toBe("COP");
      expect(result.dateFormat).toBe("DD/MM/YYYY");
    });

    it("should merge partial notifications with defaults", () => {
      const partialPreferences = {
        notifications: {
          email: false,
        },
      };

      localStorageMock.setItem(
        "user-preferences",
        JSON.stringify(partialPreferences),
      );

      const result = settingsService.getPreferences();

      // Custom value
      expect(result.notifications.email).toBe(false);
      // Default values
      expect(result.notifications.push).toBe(true);
      expect(result.notifications.lowStock).toBe(true);
      expect(result.notifications.invoices).toBe(true);
      expect(result.notifications.reports).toBe(false);
    });

    it("should merge partial dashboard settings with defaults", () => {
      const partialPreferences = {
        dashboard: {
          showSalesChart: false,
        },
      };

      localStorageMock.setItem(
        "user-preferences",
        JSON.stringify(partialPreferences),
      );

      const result = settingsService.getPreferences();

      // Custom value
      expect(result.dashboard.showSalesChart).toBe(false);
      // Default values
      expect(result.dashboard.showCategoryDistribution).toBe(true);
      expect(result.dashboard.showTopProducts).toBe(true);
      expect(result.dashboard.showLowStockAlerts).toBe(true);
    });

    it("should handle invalid JSON in localStorage gracefully", () => {
      localStorageMock.getItem.mockReturnValueOnce("invalid json {");

      const result = settingsService.getPreferences();

      // Should return defaults when JSON is invalid
      expect(result.theme).toBe("system");
      expect(result.language).toBe("es");
    });

    it("should call localStorage.getItem with correct key", () => {
      settingsService.getPreferences();

      expect(localStorageMock.getItem).toHaveBeenCalledWith("user-preferences");
    });

    it("should return complete preferences structure", () => {
      const result = settingsService.getPreferences();

      expect(result).toHaveProperty("theme");
      expect(result).toHaveProperty("language");
      expect(result).toHaveProperty("currency");
      expect(result).toHaveProperty("dateFormat");
      expect(result).toHaveProperty("notifications");
      expect(result).toHaveProperty("dashboard");
      expect(result.notifications).toHaveProperty("email");
      expect(result.notifications).toHaveProperty("push");
      expect(result.notifications).toHaveProperty("lowStock");
      expect(result.notifications).toHaveProperty("invoices");
      expect(result.notifications).toHaveProperty("reports");
      expect(result.dashboard).toHaveProperty("showSalesChart");
      expect(result.dashboard).toHaveProperty("showCategoryDistribution");
      expect(result.dashboard).toHaveProperty("showTopProducts");
      expect(result.dashboard).toHaveProperty("showLowStockAlerts");
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

    it("should handle partial updates by saving full object", () => {
      const fullPreferences: UserPreferences = {
        theme: "dark",
        language: "en",
        currency: "USD",
        dateFormat: "MM/DD/YYYY",
        notifications: {
          email: true,
          push: true,
          lowStock: false,
          invoices: true,
          reports: false,
        },
        dashboard: {
          showSalesChart: true,
          showCategoryDistribution: true,
          showTopProducts: true,
          showLowStockAlerts: true,
        },
      };

      const result = settingsService.updatePreferences(fullPreferences);

      expect(result.theme).toBe("dark");
      expect(result.notifications.lowStock).toBe(false);
    });

    it("should call localStorage.setItem with correct key", () => {
      const preferences: UserPreferences = {
        theme: "system",
        language: "es",
        currency: "COP",
        dateFormat: "DD/MM/YYYY",
        notifications: {
          email: true,
          push: true,
          lowStock: true,
          invoices: true,
          reports: false,
        },
        dashboard: {
          showSalesChart: true,
          showCategoryDistribution: true,
          showTopProducts: true,
          showLowStockAlerts: true,
        },
      };

      settingsService.updatePreferences(preferences);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "user-preferences",
        expect.any(String),
      );
    });

    it("should save theme preference correctly", () => {
      const preferences: UserPreferences = {
        theme: "dark",
        language: "es",
        currency: "COP",
        dateFormat: "DD/MM/YYYY",
        notifications: {
          email: true,
          push: true,
          lowStock: true,
          invoices: true,
          reports: false,
        },
        dashboard: {
          showSalesChart: true,
          showCategoryDistribution: true,
          showTopProducts: true,
          showLowStockAlerts: true,
        },
      };

      settingsService.updatePreferences(preferences);

      const savedValue = localStorageMock.store["user-preferences"];
      const parsed = JSON.parse(savedValue);
      expect(parsed.theme).toBe("dark");
    });

    it("should save notification preferences correctly", () => {
      const preferences: UserPreferences = {
        theme: "system",
        language: "es",
        currency: "COP",
        dateFormat: "DD/MM/YYYY",
        notifications: {
          email: false,
          push: false,
          lowStock: false,
          invoices: false,
          reports: true,
        },
        dashboard: {
          showSalesChart: true,
          showCategoryDistribution: true,
          showTopProducts: true,
          showLowStockAlerts: true,
        },
      };

      settingsService.updatePreferences(preferences);

      const savedValue = localStorageMock.store["user-preferences"];
      const parsed = JSON.parse(savedValue);
      expect(parsed.notifications.email).toBe(false);
      expect(parsed.notifications.reports).toBe(true);
    });

    it("should save dashboard preferences correctly", () => {
      const preferences: UserPreferences = {
        theme: "system",
        language: "es",
        currency: "COP",
        dateFormat: "DD/MM/YYYY",
        notifications: {
          email: true,
          push: true,
          lowStock: true,
          invoices: true,
          reports: false,
        },
        dashboard: {
          showSalesChart: false,
          showCategoryDistribution: false,
          showTopProducts: false,
          showLowStockAlerts: false,
        },
      };

      settingsService.updatePreferences(preferences);

      const savedValue = localStorageMock.store["user-preferences"];
      const parsed = JSON.parse(savedValue);
      expect(parsed.dashboard.showSalesChart).toBe(false);
      expect(parsed.dashboard.showLowStockAlerts).toBe(false);
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

      // Should still return preferences even if localStorage fails
      expect(result).toEqual(preferences);
    });
  });

  describe("uploadAvatar", () => {
    it("should return URL and filename", async () => {
      const file = new File(["avatar content"], "avatar.png", {
        type: "image/png",
      });

      const promise = settingsService.uploadAvatar(file);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("filename");
    });

    it("should return correct filename", async () => {
      const file = new File(["avatar content"], "my-avatar.jpg", {
        type: "image/jpeg",
      });

      const promise = settingsService.uploadAvatar(file);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.filename).toBe("my-avatar.jpg");
    });

    it("should handle PNG file type", async () => {
      const file = new File(["png content"], "profile.png", {
        type: "image/png",
      });

      const promise = settingsService.uploadAvatar(file);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.filename).toBe("profile.png");
      expect(result.url).toBeDefined();
    });

    it("should handle JPEG file type", async () => {
      const file = new File(["jpeg content"], "photo.jpeg", {
        type: "image/jpeg",
      });

      const promise = settingsService.uploadAvatar(file);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.filename).toBe("photo.jpeg");
      expect(result.url).toBeDefined();
    });

    it("should handle JPG file type", async () => {
      const file = new File(["jpg content"], "image.jpg", {
        type: "image/jpeg",
      });

      const promise = settingsService.uploadAvatar(file);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.filename).toBe("image.jpg");
    });

    it("should handle GIF file type", async () => {
      const file = new File(["gif content"], "animated.gif", {
        type: "image/gif",
      });

      const promise = settingsService.uploadAvatar(file);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.filename).toBe("animated.gif");
    });

    it("should handle WebP file type", async () => {
      const file = new File(["webp content"], "modern.webp", {
        type: "image/webp",
      });

      const promise = settingsService.uploadAvatar(file);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.filename).toBe("modern.webp");
    });

    it("should call URL.createObjectURL with the file", async () => {
      const file = new File(["avatar content"], "avatar.png", {
        type: "image/png",
      });

      const promise = settingsService.uploadAvatar(file);
      vi.advanceTimersByTime(1000);
      await promise;

      expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
    });

    it("should return blob URL", async () => {
      const file = new File(["avatar content"], "avatar.png", {
        type: "image/png",
      });

      const promise = settingsService.uploadAvatar(file);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.url).toBe("blob:mock-avatar-url");
    });

    it("should handle filename with spaces", async () => {
      const file = new File(["content"], "my profile avatar.png", {
        type: "image/png",
      });

      const promise = settingsService.uploadAvatar(file);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.filename).toBe("my profile avatar.png");
    });

    it("should handle filename with special characters", async () => {
      const file = new File(["content"], "avatar_2024-01-15.png", {
        type: "image/png",
      });

      const promise = settingsService.uploadAvatar(file);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.filename).toBe("avatar_2024-01-15.png");
    });
  });

  describe("deleteAvatar", () => {
    it("should return success message", async () => {
      const userId = "user-123";

      const promise = settingsService.deleteAvatar(userId);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result).toHaveProperty("message");
      expect(result.message).toBe("Avatar eliminado exitosamente");
    });

    it("should work with valid userId", async () => {
      const userId = "valid-user-id";

      const promise = settingsService.deleteAvatar(userId);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.message).toBe("Avatar eliminado exitosamente");
    });

    it("should handle different userId formats", async () => {
      const userId = "user-abc-123-xyz";

      const promise = settingsService.deleteAvatar(userId);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.message).toBe("Avatar eliminado exitosamente");
    });

    it("should handle numeric userId", async () => {
      const userId = "12345";

      const promise = settingsService.deleteAvatar(userId);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.message).toBe("Avatar eliminado exitosamente");
    });

    it("should handle UUID format userId", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";

      const promise = settingsService.deleteAvatar(userId);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.message).toBe("Avatar eliminado exitosamente");
    });

    it("should complete within expected timeout", async () => {
      const userId = "user-123";

      const promise = settingsService.deleteAvatar(userId);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result).toBeDefined();
    });
  });

  describe("timing", () => {
    it("should complete updateProfile within timeout", async () => {
      const promise = settingsService.updateProfile("user-1", {
        firstName: "Test",
      });
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toBeDefined();
    });

    it("should complete changePassword within timeout", async () => {
      const promise = settingsService.changePassword("user-1", {
        currentPassword: "currentPassword123",
        newPassword: "newPassword123",
        confirmPassword: "newPassword123",
      });
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toBeDefined();
    });

    it("should complete uploadAvatar within timeout", async () => {
      const file = new File(["content"], "avatar.png", { type: "image/png" });
      const promise = settingsService.uploadAvatar(file);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result).toBeDefined();
    });

    it("should complete deleteAvatar within timeout", async () => {
      const promise = settingsService.deleteAvatar("user-1");
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty profile update data", async () => {
      const userId = "user-123";
      const data: ProfileUpdateData = {};

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.id).toBe(userId);
    });

    it("should handle very long firstName", async () => {
      const userId = "user-123";
      const longName = "A".repeat(100);
      const data: ProfileUpdateData = {
        firstName: longName,
      };

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.firstName).toBe(longName);
    });

    it("should handle email with special format", async () => {
      const userId = "user-123";
      const data: ProfileUpdateData = {
        email: "user.name+tag@example.co.uk",
      };

      const promise = settingsService.updateProfile(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.email).toBe("user.name+tag@example.co.uk");
    });

    it("should handle password with special characters", async () => {
      const userId = "user-123";
      const data: PasswordChangeData = {
        currentPassword: "currentPassword123",
        newPassword: "P@ssw0rd!#$%^&*()",
        confirmPassword: "P@ssw0rd!#$%^&*()",
      };

      const promise = settingsService.changePassword(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.message).toBe("Contrasena actualizada exitosamente");
    });

    it("should handle password with unicode characters", async () => {
      const userId = "user-123";
      const data: PasswordChangeData = {
        currentPassword: "currentPassword123",
        newPassword: "contraseña123",
        confirmPassword: "contraseña123",
      };

      const promise = settingsService.changePassword(userId, data);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.message).toBe("Contrasena actualizada exitosamente");
    });

    it("should handle all theme options", () => {
      const themes: Array<"light" | "dark" | "system"> = [
        "light",
        "dark",
        "system",
      ];

      themes.forEach((theme) => {
        const preferences: UserPreferences = {
          theme,
          language: "es",
          currency: "COP",
          dateFormat: "DD/MM/YYYY",
          notifications: {
            email: true,
            push: true,
            lowStock: true,
            invoices: true,
            reports: false,
          },
          dashboard: {
            showSalesChart: true,
            showCategoryDistribution: true,
            showTopProducts: true,
            showLowStockAlerts: true,
          },
        };

        const result = settingsService.updatePreferences(preferences);
        expect(result.theme).toBe(theme);
      });
    });

    it("should handle all language options", () => {
      const languages: Array<"es" | "en"> = ["es", "en"];

      languages.forEach((language) => {
        const preferences: UserPreferences = {
          theme: "system",
          language,
          currency: "COP",
          dateFormat: "DD/MM/YYYY",
          notifications: {
            email: true,
            push: true,
            lowStock: true,
            invoices: true,
            reports: false,
          },
          dashboard: {
            showSalesChart: true,
            showCategoryDistribution: true,
            showTopProducts: true,
            showLowStockAlerts: true,
          },
        };

        const result = settingsService.updatePreferences(preferences);
        expect(result.language).toBe(language);
      });
    });

    it("should handle all currency options", () => {
      const currencies: Array<"COP" | "USD" | "EUR"> = ["COP", "USD", "EUR"];

      currencies.forEach((currency) => {
        const preferences: UserPreferences = {
          theme: "system",
          language: "es",
          currency,
          dateFormat: "DD/MM/YYYY",
          notifications: {
            email: true,
            push: true,
            lowStock: true,
            invoices: true,
            reports: false,
          },
          dashboard: {
            showSalesChart: true,
            showCategoryDistribution: true,
            showTopProducts: true,
            showLowStockAlerts: true,
          },
        };

        const result = settingsService.updatePreferences(preferences);
        expect(result.currency).toBe(currency);
      });
    });

    it("should handle all date format options", () => {
      const dateFormats: Array<"DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD"> = [
        "DD/MM/YYYY",
        "MM/DD/YYYY",
        "YYYY-MM-DD",
      ];

      dateFormats.forEach((dateFormat) => {
        const preferences: UserPreferences = {
          theme: "system",
          language: "es",
          currency: "COP",
          dateFormat,
          notifications: {
            email: true,
            push: true,
            lowStock: true,
            invoices: true,
            reports: false,
          },
          dashboard: {
            showSalesChart: true,
            showCategoryDistribution: true,
            showTopProducts: true,
            showLowStockAlerts: true,
          },
        };

        const result = settingsService.updatePreferences(preferences);
        expect(result.dateFormat).toBe(dateFormat);
      });
    });

    it("should handle large file upload", async () => {
      // Create a file with larger content
      const largeContent = "x".repeat(1024 * 1024); // 1MB
      const file = new File([largeContent], "large-avatar.png", {
        type: "image/png",
      });

      const promise = settingsService.uploadAvatar(file);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.filename).toBe("large-avatar.png");
      expect(result.url).toBeDefined();
    });
  });

  describe("SSR environment (window undefined)", () => {
    let originalWindow: typeof globalThis.window;

    beforeEach(() => {
      originalWindow = globalThis.window;
    });

    afterEach(() => {
      // Restore window
      globalThis.window = originalWindow;
    });

    it("getPreferences should return default preferences when window is undefined", () => {
      // @ts-expect-error - Intentionally setting window to undefined for SSR test
      delete globalThis.window;

      const result = settingsService.getPreferences();

      expect(result.theme).toBe("system");
      expect(result.language).toBe("es");
      expect(result.currency).toBe("COP");
      expect(result.dateFormat).toBe("DD/MM/YYYY");
      expect(result.notifications.email).toBe(true);
      expect(result.notifications.push).toBe(true);
      expect(result.notifications.lowStock).toBe(true);
      expect(result.notifications.invoices).toBe(true);
      expect(result.notifications.reports).toBe(false);
      expect(result.dashboard.showSalesChart).toBe(true);
      expect(result.dashboard.showCategoryDistribution).toBe(true);
      expect(result.dashboard.showTopProducts).toBe(true);
      expect(result.dashboard.showLowStockAlerts).toBe(true);
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

      // Should return the same preferences passed in
      expect(result).toEqual(preferences);
      expect(result.theme).toBe("dark");
      expect(result.language).toBe("en");
    });
  });
});
