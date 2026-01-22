import type { User } from '~/stores/auth.store';

// Types
export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'es' | 'en';
  currency: 'COP' | 'USD' | 'EUR';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
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

export interface AvatarUploadResponse {
  url: string;
  filename: string;
}

// Default preferences
const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'es',
  currency: 'COP',
  dateFormat: 'DD/MM/YYYY',
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
const PREFERENCES_STORAGE_KEY = 'user-preferences';

// Mock current password for validation
const MOCK_CURRENT_PASSWORD = 'currentPassword123';

// Service
export const settingsService = {
  async updateProfile(userId: string, data: ProfileUpdateData): Promise<User> {
    // In production, uncomment this:
    // const { data: updatedUser } = await api.patch<User>(`/users/${userId}/profile`, data);
    // return updatedUser;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 500));

    const updatedUser: User = {
      id: userId,
      email: data.email || 'usuario@example.com',
      firstName: data.firstName || 'Usuario',
      lastName: data.lastName || 'Ejemplo',
      role: 'ADMIN',
      status: 'ACTIVE',
      tenantId: 'tenant-1',
      avatarUrl: data.avatarUrl,
    };

    return updatedUser;
  },

  async changePassword(
    userId: string,
    data: PasswordChangeData
  ): Promise<{ message: string }> {
    // In production, uncomment this:
    // const { data: response } = await api.post(`/users/${userId}/change-password`, {
    //   currentPassword: data.currentPassword,
    //   newPassword: data.newPassword,
    // });
    // return response;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Validate current password
    if (data.currentPassword !== MOCK_CURRENT_PASSWORD) {
      throw new Error('La contrasena actual es incorrecta');
    }

    // Validate password confirmation
    if (data.newPassword !== data.confirmPassword) {
      throw new Error('Las contrasenas no coinciden');
    }

    // Validate password strength (basic check)
    if (data.newPassword.length < 8) {
      throw new Error('La nueva contrasena debe tener al menos 8 caracteres');
    }

    return { message: 'Contrasena actualizada exitosamente' };
  },

  getPreferences(): UserPreferences {
    // Check if running in browser environment
    if (typeof window === 'undefined') {
      return defaultPreferences;
    }

    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserPreferences>;
        // Merge with defaults to ensure all fields exist
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
      // This can happen with quota exceeded, private browsing, or invalid JSON
    }

    return defaultPreferences;
  },

  updatePreferences(preferences: UserPreferences): UserPreferences {
    // Check if running in browser environment
    if (typeof window === 'undefined') {
      return preferences;
    }

    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // If localStorage is unavailable (quota exceeded, private browsing, etc.)
      // preferences are still returned but not persisted
    }

    return preferences;
  },

  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    // In production, uncomment this:
    // const formData = new FormData();
    // formData.append('avatar', file);
    // const { data } = await api.post<AvatarUploadResponse>('/users/avatar', formData, {
    //   headers: { 'Content-Type': 'multipart/form-data' },
    // });
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create object URL for the uploaded file
    const url = URL.createObjectURL(file);

    return {
      url,
      filename: file.name,
    };
  },

  async deleteAvatar(userId: string): Promise<{ message: string }> {
    // In production, uncomment this:
    // const { data } = await api.delete(`/users/${userId}/avatar`);
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 300));

    return { message: 'Avatar eliminado exitosamente' };
  },
};
