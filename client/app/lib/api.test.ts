import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

// Use vi.hoisted to create variables that will be hoisted alongside vi.mock
const {
  interceptorHandlers,
  mockAxiosInstance,
  mockAxiosCreate,
  mockAxiosPost,
} = vi.hoisted(() => {
  const handlers = {
    requestSuccess: null as
      | ((config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig>)
      | null,
    requestError: null as ((error: unknown) => Promise<never>) | null,
    responseSuccess: null as ((response: unknown) => unknown) | null,
    responseError: null as ((error: AxiosError) => Promise<unknown>) | null,
  };

  // Create a callable function that also has axios instance properties
  const instanceFn = vi.fn();
  const instance = Object.assign(instanceFn, {
    interceptors: {
      request: {
        use: vi.fn(
          (
            success: (
              config: InternalAxiosRequestConfig,
            ) => InternalAxiosRequestConfig,
            error: (error: unknown) => Promise<never>,
          ) => {
            handlers.requestSuccess = success;
            handlers.requestError = error;
            return 0;
          },
        ),
      },
      response: {
        use: vi.fn(
          (
            success: (response: unknown) => unknown,
            error: (error: AxiosError) => Promise<unknown>,
          ) => {
            handlers.responseSuccess = success;
            handlers.responseError = error;
            return 0;
          },
        ),
      },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  });

  const axiosCreate = vi.fn(() => instance);
  const axiosPost = vi.fn();

  return {
    interceptorHandlers: handlers,
    mockAxiosInstance: instance,
    mockAxiosCreate: axiosCreate,
    mockAxiosPost: axiosPost,
  };
});

// Mock axios using the hoisted variables
vi.mock("axios", () => ({
  default: {
    create: mockAxiosCreate,
    post: mockAxiosPost,
  },
}));

// Import api after mocking
import {
  api,
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearAllAuthData,
  _resetRedirectFlag,
  _resetRefreshState,
  startAuthInit,
  completeAuthInit,
} from "./api";

describe("API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAccessToken(null);
    setRefreshToken(null);
    // Reset the redirect flag between tests
    _resetRedirectFlag();
    // Reset the refresh state (isRefreshing flag and queue)
    _resetRefreshState();
    // Ensure no pending auth init
    completeAuthInit();
    // Reset window.location mock with replace function
    Object.defineProperty(window, "location", {
      value: {
        href: "",
        pathname: "/dashboard",
        replace: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("token management", () => {
    it("initially has no access token", () => {
      expect(getAccessToken()).toBeNull();
    });

    it("stores access token", () => {
      setAccessToken("test-token-123");
      expect(getAccessToken()).toBe("test-token-123");
    });

    it("retrieves stored access token", () => {
      setAccessToken("my-jwt-token");
      const token = getAccessToken();
      expect(token).toBe("my-jwt-token");
    });

    it("clears access token when set to null", () => {
      setAccessToken("existing-token");
      expect(getAccessToken()).toBe("existing-token");

      setAccessToken(null);
      expect(getAccessToken()).toBeNull();
    });

    it("overwrites existing token", () => {
      setAccessToken("first-token");
      expect(getAccessToken()).toBe("first-token");

      setAccessToken("second-token");
      expect(getAccessToken()).toBe("second-token");
    });

    it("handles empty string token", () => {
      setAccessToken("");
      expect(getAccessToken()).toBe("");
    });
  });

  describe("clearAllAuthData", () => {
    it("clears access token", () => {
      setAccessToken("test-token");
      expect(getAccessToken()).toBe("test-token");

      clearAllAuthData();

      expect(getAccessToken()).toBeNull();
    });

    it("clears refresh token from localStorage", () => {
      setRefreshToken("refresh-token");
      expect(getRefreshToken()).toBe("refresh-token");

      clearAllAuthData();

      expect(getRefreshToken()).toBeNull();
    });

    it("clears auth-storage from localStorage (Zustand persist)", () => {
      localStorage.setItem("auth-storage", JSON.stringify({ user: { id: 1 } }));

      clearAllAuthData();

      expect(localStorage.getItem("auth-storage")).toBeNull();
    });

    it("clears auth cookies", () => {
      // Set a cookie
      document.cookie = "refreshToken=true; path=/";

      clearAllAuthData();

      // Cookie should be cleared (expired)
      expect(document.cookie).not.toContain("refreshToken=true");
    });

    it("handles errors gracefully when localStorage is not available", () => {
      // Temporarily make localStorage throw
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = () => {
        throw new Error("localStorage not available");
      };

      // Should not throw
      expect(() => clearAllAuthData()).not.toThrow();

      // Restore
      localStorage.removeItem = originalRemoveItem;
    });
  });

  describe("axios instance creation", () => {
    it("creates axios instance with correct configuration", () => {
      // The api instance should be the mock we created
      expect(api).toBe(mockAxiosInstance);
    });

    it("has request interceptor handlers set up", () => {
      // Verify interceptor handlers were captured during module initialization
      expect(interceptorHandlers.requestSuccess).toBeTypeOf("function");
      expect(interceptorHandlers.requestError).toBeTypeOf("function");
    });

    it("has response interceptor handlers set up", () => {
      // Verify interceptor handlers were captured during module initialization
      expect(interceptorHandlers.responseSuccess).toBeTypeOf("function");
      expect(interceptorHandlers.responseError).toBeTypeOf("function");
    });
  });

  describe("request interceptor", () => {
    it("adds Authorization header when token is set", async () => {
      setAccessToken("my-auth-token");

      const config = {
        headers: {},
      } as InternalAxiosRequestConfig;

      const result = await interceptorHandlers.requestSuccess!(config);

      expect(result.headers.Authorization).toBe("Bearer my-auth-token");
    });

    it("does not add Authorization header when no token", async () => {
      setAccessToken(null);

      const config = {
        headers: {},
      } as InternalAxiosRequestConfig;

      const result = await interceptorHandlers.requestSuccess!(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it("returns config unchanged except for auth header", async () => {
      setAccessToken("token");

      const config = {
        headers: { "X-Custom": "value" },
        method: "GET",
        url: "/test",
      } as unknown as InternalAxiosRequestConfig;

      const result = await interceptorHandlers.requestSuccess!(config);

      expect(result.method).toBe("GET");
      expect(result.url).toBe("/test");
      expect(result.headers["X-Custom"]).toBe("value");
    });

    it("rejects errors in request interceptor", async () => {
      const error = new Error("Request error");

      await expect(interceptorHandlers.requestError!(error)).rejects.toThrow(
        "Request error",
      );
    });

    it("waits for auth init before proceeding", async () => {
      setAccessToken(null);
      startAuthInit();

      const config = {
        headers: {},
      } as InternalAxiosRequestConfig;

      // Start the request (it will wait)
      const requestPromise = interceptorHandlers.requestSuccess!(config);

      // Set token and complete init
      setAccessToken("delayed-token");
      completeAuthInit();

      const result = await requestPromise;
      expect(result.headers.Authorization).toBe("Bearer delayed-token");
    });
  });

  describe("response interceptor - success", () => {
    it("passes through successful responses unchanged", () => {
      const response = { data: { id: 1 }, status: 200 };
      const result = interceptorHandlers.responseSuccess!(response);
      expect(result).toBe(response);
    });

    it("passes through any response object", () => {
      const response = { data: "test", headers: {}, status: 201 };
      const result = interceptorHandlers.responseSuccess!(response);
      expect(result).toEqual(response);
    });
  });

  describe("response interceptor - error handling", () => {
    it("rejects non-401 errors immediately", async () => {
      const error = {
        response: { status: 500 },
        config: { headers: {} },
        isAxiosError: true,
        message: "Server error",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      await expect(interceptorHandlers.responseError!(error)).rejects.toBe(
        error,
      );
    });

    it("rejects 403 errors without retry", async () => {
      const error = {
        response: { status: 403 },
        config: { headers: {} },
        isAxiosError: true,
        message: "Forbidden",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      await expect(interceptorHandlers.responseError!(error)).rejects.toBe(
        error,
      );
    });

    it("rejects 404 errors without retry", async () => {
      const error = {
        response: { status: 404 },
        config: { headers: {} },
        isAxiosError: true,
        message: "Not found",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      await expect(interceptorHandlers.responseError!(error)).rejects.toBe(
        error,
      );
    });

    it("does not retry if already retrying (_retry = true)", async () => {
      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: true },
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError & { config: { _retry: boolean } };

      await expect(interceptorHandlers.responseError!(error)).rejects.toBe(
        error,
      );
    });

    it("attempts token refresh on 401 error when refresh token exists", async () => {
      setRefreshToken("stored-refresh-token");
      const newToken = "new-refreshed-token";
      mockAxiosPost.mockResolvedValueOnce({
        data: { accessToken: newToken },
      });

      // Mock the api instance to return success on retry
      mockAxiosInstance.mockResolvedValueOnce({ data: { success: true } });

      const error = {
        response: { status: 401 },
        config: { headers: {}, url: "/protected" },
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      await interceptorHandlers.responseError!(error);

      expect(mockAxiosPost).toHaveBeenCalledWith(
        "http://localhost:3000/auth/refresh",
        { refreshToken: "stored-refresh-token" },
        { withCredentials: true },
      );
    });

    it("rejects 401 error when no refresh token available", async () => {
      // No refresh token set
      const error = {
        response: { status: 401 },
        config: { headers: {}, url: "/protected" },
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      await expect(interceptorHandlers.responseError!(error)).rejects.toThrow(
        "No refresh token available",
      );
    });

    it("sets new token after successful refresh", async () => {
      setRefreshToken("stored-refresh-token");
      const newToken = "fresh-token-abc";
      mockAxiosPost.mockResolvedValueOnce({
        data: { accessToken: newToken },
      });

      mockAxiosInstance.mockResolvedValueOnce({ data: { result: "ok" } });

      const error = {
        response: { status: 401 },
        config: { headers: {}, url: "/api/data" },
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      await interceptorHandlers.responseError!(error);

      expect(getAccessToken()).toBe(newToken);
    });

    it("redirects to login when refresh fails", async () => {
      setRefreshToken("stored-refresh-token");
      mockAxiosPost.mockRejectedValueOnce(new Error("Refresh failed"));

      const error = {
        response: { status: 401 },
        config: { headers: {} },
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      await expect(interceptorHandlers.responseError!(error)).rejects.toThrow(
        "Refresh failed",
      );

      expect(window.location.replace).toHaveBeenCalledWith("/login");
    });

    it("does not redirect when already on login page", async () => {
      setRefreshToken("stored-refresh-token");
      mockAxiosPost.mockRejectedValueOnce(new Error("Refresh failed"));

      // Set current path to login
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/login",
          replace: vi.fn(),
        },
        writable: true,
      });

      const error = {
        response: { status: 401 },
        config: { headers: {} },
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      await expect(interceptorHandlers.responseError!(error)).rejects.toThrow(
        "Refresh failed",
      );

      expect(window.location.replace).not.toHaveBeenCalled();
    });

    it("does not redirect when on auth-related pages", async () => {
      setRefreshToken("stored-refresh-token");
      mockAxiosPost.mockRejectedValueOnce(new Error("Refresh failed"));

      // Set current path to forgot-password
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/forgot-password",
          replace: vi.fn(),
        },
        writable: true,
      });

      const error = {
        response: { status: 401 },
        config: { headers: {} },
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      await expect(interceptorHandlers.responseError!(error)).rejects.toThrow(
        "Refresh failed",
      );

      expect(window.location.replace).not.toHaveBeenCalled();
    });

    it("clears tokens when refresh fails", async () => {
      setAccessToken("old-token");
      setRefreshToken("stored-refresh-token");
      mockAxiosPost.mockRejectedValueOnce(new Error("Refresh failed"));

      const error = {
        response: { status: 401 },
        config: { headers: {} },
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      await expect(interceptorHandlers.responseError!(error)).rejects.toThrow(
        "Refresh failed",
      );

      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });

    it("updates Authorization header on retry request", async () => {
      setRefreshToken("stored-refresh-token");
      const newToken = "retry-token";
      mockAxiosPost.mockResolvedValueOnce({
        data: { accessToken: newToken },
      });

      const mockRetryResponse = { data: { retried: true } };
      mockAxiosInstance.mockResolvedValueOnce(mockRetryResponse);

      const originalConfig = {
        headers: {},
        url: "/protected-resource",
      } as InternalAxiosRequestConfig & { _retry?: boolean };
      const error = {
        response: { status: 401 },
        config: originalConfig,
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      const result = await interceptorHandlers.responseError!(error);

      expect(originalConfig.headers.Authorization).toBe(`Bearer ${newToken}`);
      expect(result).toBe(mockRetryResponse);
    });

    it("marks request as retry to prevent infinite loop", async () => {
      setRefreshToken("stored-refresh-token");
      const newToken = "new-token";
      mockAxiosPost.mockResolvedValueOnce({
        data: { accessToken: newToken },
      });

      mockAxiosInstance.mockResolvedValueOnce({ data: {} });

      const originalConfig = { headers: {} } as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };
      const error = {
        response: { status: 401 },
        config: originalConfig,
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      await interceptorHandlers.responseError!(error);

      expect(originalConfig._retry).toBe(true);
    });

    it("handles errors without response object", async () => {
      const error = {
        config: { headers: {} },
        isAxiosError: true,
        message: "Network error",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      await expect(interceptorHandlers.responseError!(error)).rejects.toBe(
        error,
      );
    });

    it("retries the original request after successful token refresh", async () => {
      setRefreshToken("stored-refresh-token");
      const newToken = "new-token-xyz";
      mockAxiosPost.mockResolvedValueOnce({
        data: { accessToken: newToken },
      });

      const expectedResponse = { data: { items: [1, 2, 3] } };
      mockAxiosInstance.mockResolvedValueOnce(expectedResponse);

      const originalConfig = {
        headers: {},
        url: "/api/items",
        method: "GET",
      } as InternalAxiosRequestConfig & { _retry?: boolean };

      const error = {
        response: { status: 401 },
        config: originalConfig,
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      const result = await interceptorHandlers.responseError!(error);

      expect(result).toBe(expectedResponse);
      expect(mockAxiosInstance).toHaveBeenCalledWith(originalConfig);
    });
  });

  describe("request queuing during token refresh", () => {
    it("queues requests when token refresh is in progress", async () => {
      setRefreshToken("stored-refresh-token");
      const newToken = "new-token-from-refresh";

      // Create a delayed promise for the refresh call
      let resolveRefresh: (value: unknown) => void;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });
      mockAxiosPost.mockReturnValueOnce(refreshPromise);

      // First request config
      const firstConfig = {
        headers: {},
        url: "/first-request",
      } as InternalAxiosRequestConfig & { _retry?: boolean };

      const firstError = {
        response: { status: 401 },
        config: firstConfig,
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      // Second request config
      const secondConfig = {
        headers: {},
        url: "/second-request",
      } as InternalAxiosRequestConfig & { _retry?: boolean };

      const secondError = {
        response: { status: 401 },
        config: secondConfig,
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      // Start first request (triggers refresh)
      const firstPromise = interceptorHandlers.responseError!(firstError);

      // Start second request while refresh is in progress (should be queued)
      const secondPromise = interceptorHandlers.responseError!(secondError);

      // Mock the retry responses - both will get resolved
      mockAxiosInstance
        .mockResolvedValueOnce({ data: { success: 1 } })
        .mockResolvedValueOnce({ data: { success: 2 } });

      // Now resolve the refresh
      resolveRefresh!({ data: { accessToken: newToken } });

      // Both requests should complete successfully
      const results = await Promise.all([firstPromise, secondPromise]);

      // Both should complete (order doesn't matter)
      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect((result as { data: { success: number } }).data.success).toBeGreaterThan(0);
      });

      // Only one refresh call should have been made
      expect(mockAxiosPost).toHaveBeenCalledTimes(1);

      // Both requests should have the new token
      expect(firstConfig.headers.Authorization).toBe(`Bearer ${newToken}`);
      expect(secondConfig.headers.Authorization).toBe(`Bearer ${newToken}`);
    });

    it("rejects queued requests when token refresh fails", async () => {
      setRefreshToken("stored-refresh-token");

      // Create a delayed promise for the refresh call
      let rejectRefresh: (reason: unknown) => void;
      const refreshPromise = new Promise((_, reject) => {
        rejectRefresh = reject;
      });
      mockAxiosPost.mockReturnValueOnce(refreshPromise);

      // First request config
      const firstConfig = {
        headers: {},
        url: "/first-request",
      } as InternalAxiosRequestConfig & { _retry?: boolean };

      const firstError = {
        response: { status: 401 },
        config: firstConfig,
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      // Second request config (will be queued)
      const secondConfig = {
        headers: {},
        url: "/second-request",
      } as InternalAxiosRequestConfig & { _retry?: boolean };

      const secondError = {
        response: { status: 401 },
        config: secondConfig,
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      // Start first request (triggers refresh)
      const firstPromise = interceptorHandlers.responseError!(firstError);

      // Start second request while refresh is in progress (should be queued)
      const secondPromise = interceptorHandlers.responseError!(secondError);

      // Now reject the refresh
      const refreshError = new Error("Refresh token expired");
      rejectRefresh!(refreshError);

      // Both requests should be rejected with the same error
      await expect(firstPromise).rejects.toThrow("Refresh token expired");
      await expect(secondPromise).rejects.toBe(refreshError);
    });

    it("sets new refresh token when provided in response", async () => {
      setRefreshToken("old-refresh-token");
      const newAccessToken = "new-access-token";
      const newRefreshToken = "new-refresh-token";

      mockAxiosPost.mockResolvedValueOnce({
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });

      mockAxiosInstance.mockResolvedValueOnce({ data: { success: true } });

      const config = {
        headers: {},
        url: "/protected",
      } as InternalAxiosRequestConfig & { _retry?: boolean };

      const error = {
        response: { status: 401 },
        config,
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      } as AxiosError;

      await interceptorHandlers.responseError!(error);

      expect(getAccessToken()).toBe(newAccessToken);
      expect(getRefreshToken()).toBe(newRefreshToken);
    });

    it("processes queue with new token after successful refresh", async () => {
      setRefreshToken("stored-refresh-token");
      const newToken = "queue-processed-token";

      // Create a delayed promise for the refresh call
      let resolveRefresh: (value: unknown) => void;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });
      mockAxiosPost.mockReturnValueOnce(refreshPromise);

      // Start three simultaneous 401 requests
      const configs = [1, 2, 3].map((i) => ({
        headers: {},
        url: `/request-${i}`,
      })) as (InternalAxiosRequestConfig & { _retry?: boolean })[];

      const errors = configs.map((config) => ({
        response: { status: 401 },
        config,
        isAxiosError: true,
        message: "Unauthorized",
        name: "AxiosError",
        toJSON: () => ({}),
      })) as AxiosError[];

      // Start all requests
      const promises = errors.map((error) =>
        interceptorHandlers.responseError!(error),
      );

      // Mock responses for all three retries
      mockAxiosInstance
        .mockResolvedValueOnce({ data: { success: true } })
        .mockResolvedValueOnce({ data: { success: true } })
        .mockResolvedValueOnce({ data: { success: true } });

      // Resolve refresh
      resolveRefresh!({ data: { accessToken: newToken } });

      // Wait for all to complete
      const results = await Promise.all(promises);

      // Verify all completed successfully
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect((result as { data: { success: boolean } }).data.success).toBe(true);
      });

      // Verify all configs have the new token
      configs.forEach((config) => {
        expect(config.headers.Authorization).toBe(`Bearer ${newToken}`);
      });

      // Only one refresh call
      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    });
  });

  describe("API types", () => {
    it("exports ApiError interface", () => {
      // Type check - this is mainly for TypeScript compilation
      const error: import("./api").ApiError = {
        statusCode: 400,
        message: "Bad request",
        error: "Validation failed",
      };
      expect(error.statusCode).toBe(400);
    });

    it("exports ApiResponse interface", () => {
      const response: import("./api").ApiResponse<{ id: number }> = {
        data: { id: 1 },
        message: "Success",
      };
      expect(response.data.id).toBe(1);
    });

    it("exports PaginatedResponse interface", () => {
      const response: import("./api").PaginatedResponse<{ name: string }> = {
        data: [{ name: "Item 1" }, { name: "Item 2" }],
        meta: {
          total: 100,
          page: 1,
          limit: 10,
          totalPages: 10,
        },
      };
      expect(response.data).toHaveLength(2);
      expect(response.meta.total).toBe(100);
    });
  });
});
