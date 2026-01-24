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
      | ((config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig)
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
} from "./api";

describe("API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAccessToken(null);
    setRefreshToken(null);
    // Reset window.location mock
    Object.defineProperty(window, "location", {
      value: { href: "" },
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
    it("adds Authorization header when token is set", () => {
      setAccessToken("my-auth-token");

      const config = {
        headers: {},
      } as InternalAxiosRequestConfig;

      const result = interceptorHandlers.requestSuccess!(config);

      expect(result.headers.Authorization).toBe("Bearer my-auth-token");
    });

    it("does not add Authorization header when no token", () => {
      setAccessToken(null);

      const config = {
        headers: {},
      } as InternalAxiosRequestConfig;

      const result = interceptorHandlers.requestSuccess!(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it("returns config unchanged except for auth header", () => {
      setAccessToken("token");

      const config = {
        headers: { "X-Custom": "value" },
        method: "GET",
        url: "/test",
      } as unknown as InternalAxiosRequestConfig;

      const result = interceptorHandlers.requestSuccess!(config);

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

      expect(window.location.href).toBe("/login");
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
