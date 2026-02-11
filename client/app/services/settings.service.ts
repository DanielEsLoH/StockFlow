import { api } from "~/lib/api";
import type { User } from "~/stores/auth.store";

// Types
export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: "es" | "en";
  currency: "COP" | "USD" | "EUR";
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  notifications: {
    email: boolean;
    push: boolean;
    lowStock: boolean;
    invoices: boolean;
    reports: boolean;
  };
  dashboard: {
    showSalesChart: boolean;
    showCategoryDistribution: boolean;
    showTopProducts: boolean;
    showLowStockAlerts: boolean;
  };
}

export type AvatarUploadResponse = User;

// Default preferences
const defaultPreferences: UserPreferences = {
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

// LocalStorage key
const PREFERENCES_STORAGE_KEY = "user-preferences";

// Service
export const settingsService = {
  async updateProfile(
    userId: string,
    data: ProfileUpdateData,
  ): Promise<User> {
    const { data: updatedUser } = await api.patch<User>(
      `/users/${userId}`,
      data,
    );
    return updatedUser;
  },

  async changePassword(
    userId: string,
    data: PasswordChangeData,
  ): Promise<void> {
    await api.patch(`/users/${userId}/change-password`, {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  },

  getPreferences(): UserPreferences {
    if (typeof window === "undefined") {
      return defaultPreferences;
    }

    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserPreferences>;
        return {
          ...defaultPreferences,
          ...parsed,
          notifications: {
            ...defaultPreferences.notifications,
            ...parsed.notifications,
          },
          dashboard: {
            ...defaultPreferences.dashboard,
            ...parsed.dashboard,
          },
        };
      }
    } catch {
      // If localStorage is corrupted or inaccessible, return defaults
    }

    return defaultPreferences;
  },

  updatePreferences(preferences: UserPreferences): UserPreferences {
    if (typeof window === "undefined") {
      return preferences;
    }

    try {
      localStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify(preferences),
      );
    } catch {
      // If localStorage is unavailable, preferences are still returned but not persisted
    }

    return preferences;
  },

  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post<AvatarUploadResponse>(
      "/users/me/avatar",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return data;
  },

  async deleteAvatar(): Promise<void> {
    await api.delete("/users/me/avatar");
  },
};
