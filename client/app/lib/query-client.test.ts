import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryClient, queryKeys } from "./query-client";

// Mock toast
vi.mock("~/components/ui/Toast", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from "~/components/ui/Toast";

describe("Query Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  describe("default options", () => {
    it("has correct stale time (5 minutes)", () => {
      const options = queryClient.getDefaultOptions();
      expect(options.queries?.staleTime).toBe(5 * 60 * 1000);
    });

    it("has correct gc time (30 minutes)", () => {
      const options = queryClient.getDefaultOptions();
      expect(options.queries?.gcTime).toBe(30 * 60 * 1000);
    });

    it("does not refetch on window focus", () => {
      const options = queryClient.getDefaultOptions();
      expect(options.queries?.refetchOnWindowFocus).toBe(false);
    });

    it("has retry function defined", () => {
      const options = queryClient.getDefaultOptions();
      expect(typeof options.queries?.retry).toBe("function");
    });

    it("has mutation onError handler", () => {
      const options = queryClient.getDefaultOptions();
      expect(typeof options.mutations?.onError).toBe("function");
    });
  });

  describe("mutation error handling", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockContext = {} as any;

    it("calls toast.error with error message", () => {
      const options = queryClient.getDefaultOptions();
      const error = new Error("Mutation failed");

      options.mutations?.onError?.(error, undefined, undefined, mockContext);

      expect(toast.error).toHaveBeenCalledWith("Mutation failed");
    });

    it("handles non-Error objects with default message", () => {
      const options = queryClient.getDefaultOptions();

      options.mutations?.onError?.(
        "string error" as unknown as Error,
        undefined,
        undefined,
        mockContext,
      );

      expect(toast.error).toHaveBeenCalledWith("An error has occurred");
    });

    it("handles null error", () => {
      const options = queryClient.getDefaultOptions();

      options.mutations?.onError?.(
        null as unknown as Error,
        undefined,
        undefined,
        mockContext,
      );

      expect(toast.error).toHaveBeenCalledWith("An error has occurred");
    });

    it("handles undefined error", () => {
      const options = queryClient.getDefaultOptions();

      options.mutations?.onError?.(
        undefined as unknown as Error,
        undefined,
        undefined,
        mockContext,
      );

      expect(toast.error).toHaveBeenCalledWith("An error has occurred");
    });
  });

  describe("retry logic", () => {
    it("does not retry on 4xx errors", () => {
      const options = queryClient.getDefaultOptions();
      const retry = options.queries?.retry as (
        failureCount: number,
        error: Error,
      ) => boolean;

      const error = Object.assign(new Error("Bad Request"), { status: 400 });
      expect(retry(1, error)).toBe(false);
    });

    it("does not retry on 404 errors", () => {
      const options = queryClient.getDefaultOptions();
      const retry = options.queries?.retry as (
        failureCount: number,
        error: Error,
      ) => boolean;

      const error = Object.assign(new Error("Not Found"), { status: 404 });
      expect(retry(1, error)).toBe(false);
    });

    it("retries on 5xx errors up to 3 times", () => {
      const options = queryClient.getDefaultOptions();
      const retry = options.queries?.retry as (
        failureCount: number,
        error: Error,
      ) => boolean;

      const error = Object.assign(new Error("Server Error"), { status: 500 });
      expect(retry(1, error)).toBe(true);
      expect(retry(2, error)).toBe(true);
      expect(retry(3, error)).toBe(false);
    });

    it("retries on network errors up to 3 times", () => {
      const options = queryClient.getDefaultOptions();
      const retry = options.queries?.retry as (
        failureCount: number,
        error: Error,
      ) => boolean;

      const error = new Error("Network Error");
      expect(retry(1, error)).toBe(true);
      expect(retry(2, error)).toBe(true);
      expect(retry(3, error)).toBe(false);
    });
  });
});

describe("Query Keys", () => {
  describe("auth keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.auth.all).toEqual(["auth"]);
    });

    it("generates correct me key", () => {
      expect(queryKeys.auth.me()).toEqual(["auth", "me"]);
    });
  });

  describe("users keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.users.all).toEqual(["users"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.users.list()).toEqual(["users", "list", undefined]);
    });

    it("generates list key with filters", () => {
      expect(queryKeys.users.list({ role: "admin" })).toEqual([
        "users",
        "list",
        { role: "admin" },
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.users.detail("user-123")).toEqual(["users", "user-123"]);
    });
  });

  describe("products keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.products.all).toEqual(["products"]);
    });

    it("generates list key with filters", () => {
      expect(queryKeys.products.list({ category: "electronics" })).toEqual([
        "products",
        "list",
        { category: "electronics" },
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.products.detail("prod-456")).toEqual([
        "products",
        "prod-456",
      ]);
    });

    it("generates low stock key", () => {
      expect(queryKeys.products.lowStock()).toEqual(["products", "low-stock"]);
    });
  });

  describe("categories keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.categories.all).toEqual(["categories"]);
    });

    it("generates list key", () => {
      expect(queryKeys.categories.list()).toEqual([
        "categories",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { search: "test", page: 1 };
      expect(queryKeys.categories.list(filters)).toEqual([
        "categories",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.categories.detail("cat-123")).toEqual([
        "categories",
        "cat-123",
      ]);
    });
  });

  describe("warehouses keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.warehouses.all).toEqual(["warehouses"]);
    });

    it("generates list key", () => {
      expect(queryKeys.warehouses.list()).toEqual([
        "warehouses",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { city: "Bogota", isActive: true };
      expect(queryKeys.warehouses.list(filters)).toEqual([
        "warehouses",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.warehouses.detail("wh-789")).toEqual([
        "warehouses",
        "wh-789",
      ]);
    });
  });

  describe("customers keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.customers.all).toEqual(["customers"]);
    });

    it("generates list key with filters", () => {
      expect(queryKeys.customers.list({ active: true })).toEqual([
        "customers",
        "list",
        { active: true },
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.customers.detail("cust-001")).toEqual([
        "customers",
        "cust-001",
      ]);
    });
  });

  describe("invoices keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.invoices.all).toEqual(["invoices"]);
    });

    it("generates list key with filters", () => {
      expect(queryKeys.invoices.list({ status: "pending" })).toEqual([
        "invoices",
        "list",
        { status: "pending" },
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.invoices.detail("inv-123")).toEqual([
        "invoices",
        "inv-123",
      ]);
    });

    it("generates recent key without limit", () => {
      expect(queryKeys.invoices.recent()).toEqual([
        "invoices",
        "recent",
        undefined,
      ]);
    });

    it("generates recent key with limit", () => {
      expect(queryKeys.invoices.recent(10)).toEqual(["invoices", "recent", 10]);
    });
  });

  describe("payments keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.payments.all).toEqual(["payments"]);
    });

    it("generates byInvoice key", () => {
      expect(queryKeys.payments.byInvoice("inv-456")).toEqual([
        "payments",
        "invoice",
        "inv-456",
      ]);
    });
  });

  describe("dashboard keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.dashboard.all).toEqual(["dashboard"]);
    });

    it("generates stats key", () => {
      expect(queryKeys.dashboard.stats()).toEqual(["dashboard", "stats"]);
    });

    it("generates charts key", () => {
      expect(queryKeys.dashboard.charts()).toEqual(["dashboard", "charts"]);
    });
  });

  describe("reports keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.reports.all).toEqual(["reports"]);
    });

    it("generates sales key with params", () => {
      expect(queryKeys.reports.sales({ year: 2024 })).toEqual([
        "reports",
        "sales",
        { year: 2024 },
      ]);
    });

    it("generates inventory key with params", () => {
      expect(queryKeys.reports.inventory({ warehouse: "main" })).toEqual([
        "reports",
        "inventory",
        { warehouse: "main" },
      ]);
    });

    it("generates customers key with params", () => {
      expect(queryKeys.reports.customers({ segment: "enterprise" })).toEqual([
        "reports",
        "customers",
        { segment: "enterprise" },
      ]);
    });
  });

  describe("notifications keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.notifications.all).toEqual(["notifications"]);
    });

    it("generates list key", () => {
      expect(queryKeys.notifications.list()).toEqual([
        "notifications",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      expect(queryKeys.notifications.list({ read: false })).toEqual([
        "notifications",
        "list",
        { read: false },
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.notifications.detail("123")).toEqual([
        "notifications",
        "123",
      ]);
    });

    it("generates recent key", () => {
      expect(queryKeys.notifications.recent()).toEqual([
        "notifications",
        "recent",
        undefined,
      ]);
    });

    it("generates recent key with limit", () => {
      expect(queryKeys.notifications.recent(5)).toEqual([
        "notifications",
        "recent",
        5,
      ]);
    });

    it("generates unreadCount key", () => {
      expect(queryKeys.notifications.unreadCount()).toEqual([
        "notifications",
        "unread-count",
      ]);
    });
  });

  describe("tenants keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.tenants.all).toEqual(["tenants"]);
    });

    it("generates current key", () => {
      expect(queryKeys.tenants.current()).toEqual(["tenants", "current"]);
    });
  });
});
