import {
  api,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
} from '~/lib/api';
import type { User, Tenant } from '~/stores/auth.store';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantName?: string;
}

export interface AuthResponse {
  user: User;
  tenant: Tenant;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  message: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
  tenant: {
    name: string;
  };
}

// Service
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    return data;
  },

  async register(userData: RegisterData): Promise<RegisterResponse> {
    const { data } = await api.post<RegisterResponse>('/auth/register', userData);
    // No token returned - registration is pending approval
    return data;
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = getRefreshToken();
      await api.post('/auth/logout', { refreshToken });
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
    }
  },

  async getMe(): Promise<AuthResponse> {
    const { data } = await api.get<AuthResponse>('/auth/me');
    setAccessToken(data.accessToken);
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }
    return data;
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    const { data } = await api.post('/auth/refresh');
    setAccessToken(data.accessToken);
    return data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  async resetPassword(
    token: string,
    password: string
  ): Promise<{ message: string }> {
    const { data } = await api.post('/auth/reset-password', {
      token,
      password,
    });
    return data;
  },

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const { data } = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return data;
  },
};
