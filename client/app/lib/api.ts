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

// Auth initialization state - requests will wait for this to complete
let authInitPromise: Promise<void> | null = null;
let authInitResolver: (() => void) | null = null;

/**
 * Creates a promise that requests will wait for before proceeding.
 * Call this at app startup to ensure requests wait for auth initialization.
 */
export function startAuthInit(): void {
  if (!authInitPromise) {
    authInitPromise = new Promise((resolve) => {
      authInitResolver = resolve;
    });
  }
}

/**
 * Signals that auth initialization is complete.
 * Requests waiting on authInitPromise will proceed.
 */
export function completeAuthInit(): void {
  if (authInitResolver) {
    authInitResolver();
    authInitResolver = null;
  }
  // Clear the promise so future requests don't wait
  authInitPromise = null;
}

/**
 * Returns true if auth initialization is in progress
 */
export function isAuthInitializing(): boolean {
  return authInitPromise !== null;
}

const REFRESH_TOKEN_KEY = "refreshToken";

// Auto-start auth init on module load if we have a refresh token but no access token
// This ensures requests are blocked BEFORE any React component mounts
if (typeof window !== "undefined") {
  try {
    const hasRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (hasRefreshToken && !accessToken) {
      startAuthInit();
    }
  } catch {
    // localStorage might not be available
  }
}
const AUTH_STORAGE_KEY = "auth-storage";

// List of all auth-related storage keys to clear on logout
const AUTH_STORAGE_KEYS = [REFRESH_TOKEN_KEY, AUTH_STORAGE_KEY] as const;

// List of all auth-related cookie names to clear on logout
const AUTH_COOKIE_NAMES = [REFRESH_TOKEN_KEY] as const;

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

/**
 * Clears a cookie by name by setting it to expire immediately
 */
function clearCookie(name: string) {
  // Clear cookie for all possible path combinations
  const paths = ["/", ""];
  paths.forEach((path) => {
    document.cookie = `${name}=; path=${path}; max-age=0; SameSite=Lax`;
    document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  });
}

/**
 * Clears ALL authentication data from the application.
 * This includes:
 * - In-memory access token
 * - localStorage items (refreshToken, auth-storage from Zustand)
 * - sessionStorage items
 * - Cookies related to authentication
 *
 * Call this function on logout or when a 401 error cannot be recovered.
 */
export function clearAllAuthData(): void {
  // 1. Clear in-memory access token
  accessToken = null;

  // 2. Clear localStorage items
  AUTH_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // localStorage might not be available in some contexts
    }
  });

  // 3. Clear sessionStorage items (in case any auth data is stored there)
  AUTH_STORAGE_KEYS.forEach((key) => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // sessionStorage might not be available in some contexts
    }
  });

  // 4. Clear all auth-related cookies
  AUTH_COOKIE_NAMES.forEach(clearCookie);
}

// Request interceptor - Add auth header and wait for auth init
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Wait for auth initialization to complete before sending any request
    // This prevents race conditions where requests are sent before tokens are loaded
    if (authInitPromise) {
      await authInitPromise;
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Flag to prevent multiple simultaneous redirect attempts
let isRedirectingToLogin = false;

// Flag to track if a token refresh is in progress
let isRefreshing = false;

// Queue of requests waiting for token refresh
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

/**
 * Resets the redirect flag. Used for testing purposes.
 * @internal
 */
export function _resetRedirectFlag(): void {
  isRedirectingToLogin = false;
}

/**
 * Resets the refresh state. Used for testing purposes.
 * @internal
 */
export function _resetRefreshState(): void {
  isRefreshing = false;
  failedQueue = [];
}

/**
 * Process the queue of failed requests after token refresh
 */
function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Handles authentication failure by clearing all auth data and redirecting to login.
 * Uses a flag to prevent multiple simultaneous redirects.
 */
function handleAuthFailure(): void {
  // Clear ALL auth data (tokens, localStorage, sessionStorage, cookies)
  clearAllAuthData();

  // Only redirect if not already redirecting and not on auth pages
  if (!isRedirectingToLogin) {
    const currentPath = window.location.pathname;
    const authPages = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
    ];
    const isOnAuthPage = authPages.some((page) => currentPath.startsWith(page));

    if (!isOnAuthPage) {
      isRedirectingToLogin = true;
      // Use replace to prevent back button from returning to protected page
      window.location.replace("/login");
    }
  }
}

// Response interceptor - Handle token refresh with request queuing
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject: (err: unknown) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

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

        // Process queued requests with new token
        processQueue(null, newToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Process queued requests with error
        processQueue(refreshError, null);
        // Refresh failed - clear ALL auth data and redirect to login
        handleAuthFailure();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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
