import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Token storage
let accessToken: string | null = null;

const REFRESH_TOKEN_KEY = "refreshToken";

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const setRefreshToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    // Also set a cookie for SSR auth detection (non-sensitive flag only)
    // The actual token stays in localStorage for security
    document.cookie = `${REFRESH_TOKEN_KEY}=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    // Remove the cookie
    document.cookie = `${REFRESH_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  }
};

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

// Request interceptor - Add auth header
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get stored refresh token
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Try to refresh token
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true },
        );

        const { accessToken: newToken, refreshToken: newRefreshToken } =
          response.data;
        setAccessToken(newToken);
        if (newRefreshToken) {
          setRefreshToken(newRefreshToken);
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear auth and redirect to login
        setAccessToken(null);
        setRefreshToken(null);
        // Only redirect if not already on login/register pages to avoid infinite loop
        const currentPath = window.location.pathname;
        if (currentPath !== "/login" && currentPath !== "/register") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// API error type
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// Generic API response type
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// Paginated response type
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
