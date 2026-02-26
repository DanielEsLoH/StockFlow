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

    it("allows 1 retry for 401 errors to give time for token refresh", () => {
      const options = queryClient.getDefaultOptions();
      const retry = options.queries?.retry as (
        failureCount: number,
        error: Error,
      ) => boolean;

      const error = Object.assign(new Error("Unauthorized"), { status: 401 });
      expect(retry(0, error)).toBe(true); // First attempt, allow retry
      expect(retry(1, error)).toBe(false); // After 1 failure, don't retry
    });

    it("does not retry on 403 forbidden errors", () => {
      const options = queryClient.getDefaultOptions();
      const retry = options.queries?.retry as (
        failureCount: number,
        error: Error,
      ) => boolean;

      const error = Object.assign(new Error("Forbidden"), { status: 403 });
      expect(retry(0, error)).toBe(false);
    });

    it("does not retry on 422 validation errors", () => {
      const options = queryClient.getDefaultOptions();
      const retry = options.queries?.retry as (
        failureCount: number,
        error: Error,
      ) => boolean;

      const error = Object.assign(new Error("Unprocessable Entity"), {
        status: 422,
      });
      expect(retry(0, error)).toBe(false);
    });

    it("does not retry on 499 client closed request", () => {
      const options = queryClient.getDefaultOptions();
      const retry = options.queries?.retry as (
        failureCount: number,
        error: Error,
      ) => boolean;

      const error = Object.assign(new Error("Client Closed Request"), {
        status: 499,
      });
      expect(retry(0, error)).toBe(false);
    });
  });

  describe("retryDelay logic", () => {
    it("has retryDelay function defined", () => {
      const options = queryClient.getDefaultOptions();
      expect(typeof options.queries?.retryDelay).toBe("function");
    });

    it("calculates exponential backoff with cap at 3000ms", () => {
      const options = queryClient.getDefaultOptions();
      const retryDelay = options.queries?.retryDelay as (
        attemptIndex: number,
      ) => number;

      // First attempt: min(1000 * 2^0, 3000) = min(1000, 3000) = 1000
      expect(retryDelay(0)).toBe(1000);

      // Second attempt: min(1000 * 2^1, 3000) = min(2000, 3000) = 2000
      expect(retryDelay(1)).toBe(2000);

      // Third attempt: min(1000 * 2^2, 3000) = min(4000, 3000) = 3000
      expect(retryDelay(2)).toBe(3000);

      // Fourth attempt: min(1000 * 2^3, 3000) = min(8000, 3000) = 3000
      expect(retryDelay(3)).toBe(3000);

      // Fifth attempt: should still be capped at 3000
      expect(retryDelay(4)).toBe(3000);
    });
  });

  describe("throwOnError option", () => {
    it("has throwOnError set to false", () => {
      const options = queryClient.getDefaultOptions();
      expect(options.queries?.throwOnError).toBe(false);
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
      expect(queryKeys.dashboard.stats()).toEqual([
        "dashboard",
        "stats",
        undefined,
      ]);
      expect(queryKeys.dashboard.stats(7)).toEqual([
        "dashboard",
        "stats",
        7,
      ]);
    });

    it("generates charts key", () => {
      expect(queryKeys.dashboard.charts()).toEqual([
        "dashboard",
        "charts",
        undefined,
      ]);
      expect(queryKeys.dashboard.charts(30)).toEqual([
        "dashboard",
        "charts",
        30,
      ]);
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

  describe("settings keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.settings.all).toEqual(["settings"]);
    });

    it("generates preferences key", () => {
      expect(queryKeys.settings.preferences()).toEqual([
        "settings",
        "preferences",
      ]);
    });
  });

  describe("invitations keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.invitations.all).toEqual(["invitations"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.invitations.list()).toEqual([
        "invitations",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { status: "pending", email: "test@example.com" };
      expect(queryKeys.invitations.list(filters)).toEqual([
        "invitations",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.invitations.detail("inv-123")).toEqual([
        "invitations",
        "inv-123",
      ]);
    });
  });

  describe("cashRegisters keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.cashRegisters.all).toEqual(["cashRegisters"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.cashRegisters.list()).toEqual([
        "cashRegisters",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { isActive: true, location: "main-store" };
      expect(queryKeys.cashRegisters.list(filters)).toEqual([
        "cashRegisters",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.cashRegisters.detail("cr-456")).toEqual([
        "cashRegisters",
        "cr-456",
      ]);
    });
  });

  describe("posSessions keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.posSessions.all).toEqual(["posSessions"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.posSessions.list()).toEqual([
        "posSessions",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { status: "ACTIVE", cashRegisterId: "cr-123" };
      expect(queryKeys.posSessions.list(filters)).toEqual([
        "posSessions",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.posSessions.detail("session-789")).toEqual([
        "posSessions",
        "session-789",
      ]);
    });

    it("generates current key", () => {
      expect(queryKeys.posSessions.current()).toEqual([
        "posSessions",
        "current",
      ]);
    });

    it("generates movements key", () => {
      expect(queryKeys.posSessions.movements("session-123")).toEqual([
        "posSessions",
        "session-123",
        "movements",
      ]);
    });

    it("generates xReport key", () => {
      expect(queryKeys.posSessions.xReport("session-456")).toEqual([
        "posSessions",
        "session-456",
        "x-report",
      ]);
    });

    it("generates zReport key", () => {
      expect(queryKeys.posSessions.zReport("session-789")).toEqual([
        "posSessions",
        "session-789",
        "z-report",
      ]);
    });
  });

  describe("posSales keys", () => {
    it("generates correct base key", () => {
      expect(queryKeys.posSales.all).toEqual(["posSales"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.posSales.list()).toEqual([
        "posSales",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { sessionId: "session-123", fromDate: "2024-01-01" };
      expect(queryKeys.posSales.list(filters)).toEqual([
        "posSales",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.posSales.detail("sale-001")).toEqual([
        "posSales",
        "sale-001",
      ]);
    });
  });

  describe("invoices additional keys", () => {
    it("generates byCustomer key", () => {
      expect(queryKeys.invoices.byCustomer("cust-123")).toEqual([
        "invoices",
        "customer",
        "cust-123",
      ]);
    });

    it("generates stats key", () => {
      expect(queryKeys.invoices.stats()).toEqual(["invoices", "stats"]);
    });
  });

  describe("payments additional keys", () => {
    it("generates list key without filters", () => {
      expect(queryKeys.payments.list()).toEqual([
        "payments",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { method: "CASH", status: "completed" };
      expect(queryKeys.payments.list(filters)).toEqual([
        "payments",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.payments.detail("pay-123")).toEqual([
        "payments",
        "pay-123",
      ]);
    });

    it("generates byCustomer key", () => {
      expect(queryKeys.payments.byCustomer("cust-456")).toEqual([
        "payments",
        "customer",
        "cust-456",
      ]);
    });

    it("generates recent key without limit", () => {
      expect(queryKeys.payments.recent()).toEqual([
        "payments",
        "recent",
        undefined,
      ]);
    });

    it("generates recent key with limit", () => {
      expect(queryKeys.payments.recent(20)).toEqual(["payments", "recent", 20]);
    });

    it("generates stats key", () => {
      expect(queryKeys.payments.stats()).toEqual(["payments", "stats"]);
    });
  });

  describe("dashboard additional keys", () => {
    it("generates activity key", () => {
      expect(queryKeys.dashboard.activity()).toEqual(["dashboard", "activity"]);
    });
  });

  describe("reports additional keys", () => {
    it("generates recent key without limit", () => {
      expect(queryKeys.reports.recent()).toEqual([
        "reports",
        "recent",
        undefined,
      ]);
    });

    it("generates recent key with limit", () => {
      expect(queryKeys.reports.recent(15)).toEqual(["reports", "recent", 15]);
    });

    it("generates sales key without params", () => {
      expect(queryKeys.reports.sales()).toEqual([
        "reports",
        "sales",
        undefined,
      ]);
    });

    it("generates inventory key without params", () => {
      expect(queryKeys.reports.inventory()).toEqual([
        "reports",
        "inventory",
        undefined,
      ]);
    });

    it("generates customers key without params", () => {
      expect(queryKeys.reports.customers()).toEqual([
        "reports",
        "customers",
        undefined,
      ]);
    });
  });

  describe("stockMovements keys", () => {
    it("generates all key", () => {
      expect(queryKeys.stockMovements.all).toEqual(["stockMovements"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.stockMovements.list()).toEqual([
        "stockMovements",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { type: "IN", warehouseId: "wh-1" };
      expect(queryKeys.stockMovements.list(filters)).toEqual([
        "stockMovements",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.stockMovements.detail("sm-001")).toEqual([
        "stockMovements",
        "sm-001",
      ]);
    });

    it("generates byProduct key", () => {
      expect(queryKeys.stockMovements.byProduct("prod-001")).toEqual([
        "stockMovements",
        "product",
        "prod-001",
      ]);
    });

    it("generates byWarehouse key", () => {
      expect(queryKeys.stockMovements.byWarehouse("wh-001")).toEqual([
        "stockMovements",
        "warehouse",
        "wh-001",
      ]);
    });
  });

  describe("billing keys", () => {
    it("generates all key", () => {
      expect(queryKeys.billing.all).toEqual(["billing"]);
    });

    it("generates status key", () => {
      expect(queryKeys.billing.status()).toEqual(["billing", "status"]);
    });

    it("generates plans key", () => {
      expect(queryKeys.billing.plans()).toEqual(["billing", "plans"]);
    });

    it("generates history key", () => {
      expect(queryKeys.billing.history()).toEqual(["billing", "history"]);
    });
  });

  describe("quotations keys", () => {
    it("generates all key", () => {
      expect(queryKeys.quotations.all).toEqual(["quotations"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.quotations.list()).toEqual([
        "quotations",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { status: "DRAFT", customerId: "cust-1" };
      expect(queryKeys.quotations.list(filters)).toEqual([
        "quotations",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.quotations.detail("quot-123")).toEqual([
        "quotations",
        "quot-123",
      ]);
    });

    it("generates stats key", () => {
      expect(queryKeys.quotations.stats()).toEqual(["quotations", "stats"]);
    });
  });

  describe("suppliers keys", () => {
    it("generates all key", () => {
      expect(queryKeys.suppliers.all).toEqual(["suppliers"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.suppliers.list()).toEqual([
        "suppliers",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { search: "Acme", isActive: true };
      expect(queryKeys.suppliers.list(filters)).toEqual([
        "suppliers",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.suppliers.detail("sup-456")).toEqual([
        "suppliers",
        "sup-456",
      ]);
    });

    it("generates stats key", () => {
      expect(queryKeys.suppliers.stats()).toEqual(["suppliers", "stats"]);
    });
  });

  describe("purchaseOrders keys", () => {
    it("generates all key", () => {
      expect(queryKeys.purchaseOrders.all).toEqual(["purchaseOrders"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.purchaseOrders.list()).toEqual([
        "purchaseOrders",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { status: "PENDING", supplierId: "sup-1" };
      expect(queryKeys.purchaseOrders.list(filters)).toEqual([
        "purchaseOrders",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.purchaseOrders.detail("po-789")).toEqual([
        "purchaseOrders",
        "po-789",
      ]);
    });

    it("generates stats key", () => {
      expect(queryKeys.purchaseOrders.stats()).toEqual([
        "purchaseOrders",
        "stats",
      ]);
    });

    it("generates payments key", () => {
      expect(queryKeys.purchaseOrders.payments("po-123")).toEqual([
        "purchaseOrders",
        "po-123",
        "payments",
      ]);
    });
  });

  describe("accounting keys", () => {
    it("generates all key", () => {
      expect(queryKeys.accounting.all).toEqual(["accounting"]);
    });

    it("generates config key", () => {
      expect(queryKeys.accounting.config()).toEqual(["accounting", "config"]);
    });

    it("generates accounts key", () => {
      expect(queryKeys.accounting.accounts()).toEqual([
        "accounting",
        "accounts",
      ]);
    });

    it("generates accountTree key", () => {
      expect(queryKeys.accounting.accountTree()).toEqual([
        "accounting",
        "account-tree",
      ]);
    });

    it("generates accountDetail key", () => {
      expect(queryKeys.accounting.accountDetail("acc-1")).toEqual([
        "accounting",
        "account",
        "acc-1",
      ]);
    });

    it("generates journalEntries key without filters", () => {
      expect(queryKeys.accounting.journalEntries()).toEqual([
        "accounting",
        "journal-entries",
        "list",
        undefined,
      ]);
    });

    it("generates journalEntries key with filters", () => {
      const filters = { periodId: "p-1" };
      expect(queryKeys.accounting.journalEntries(filters)).toEqual([
        "accounting",
        "journal-entries",
        "list",
        filters,
      ]);
    });

    it("generates journalEntry key", () => {
      expect(queryKeys.accounting.journalEntry("je-1")).toEqual([
        "accounting",
        "journal-entries",
        "je-1",
      ]);
    });

    it("generates periods key", () => {
      expect(queryKeys.accounting.periods()).toEqual([
        "accounting",
        "periods",
      ]);
    });

    it("generates trialBalance key", () => {
      const params = { periodId: "p-1" };
      expect(queryKeys.accounting.trialBalance(params)).toEqual([
        "accounting",
        "reports",
        "trial-balance",
        params,
      ]);
    });

    it("generates generalJournal key", () => {
      expect(queryKeys.accounting.generalJournal()).toEqual([
        "accounting",
        "reports",
        "general-journal",
        undefined,
      ]);
    });

    it("generates generalLedger key", () => {
      expect(queryKeys.accounting.generalLedger({ accountId: "a-1" })).toEqual([
        "accounting",
        "reports",
        "general-ledger",
        { accountId: "a-1" },
      ]);
    });

    it("generates balanceSheet key", () => {
      expect(queryKeys.accounting.balanceSheet()).toEqual([
        "accounting",
        "reports",
        "balance-sheet",
        undefined,
      ]);
    });

    it("generates incomeStatement key", () => {
      expect(queryKeys.accounting.incomeStatement()).toEqual([
        "accounting",
        "reports",
        "income-statement",
        undefined,
      ]);
    });

    it("generates cashFlow key", () => {
      expect(queryKeys.accounting.cashFlow()).toEqual([
        "accounting",
        "reports",
        "cash-flow",
        undefined,
      ]);
    });

    it("generates costCenterBalance key", () => {
      expect(
        queryKeys.accounting.costCenterBalance({ costCenterId: "cc-1" }),
      ).toEqual([
        "accounting",
        "reports",
        "cost-center-balance",
        { costCenterId: "cc-1" },
      ]);
    });

    it("generates arAging key", () => {
      expect(queryKeys.accounting.arAging()).toEqual([
        "accounting",
        "reports",
        "ar-aging",
        undefined,
      ]);
    });

    it("generates apAging key", () => {
      expect(queryKeys.accounting.apAging()).toEqual([
        "accounting",
        "reports",
        "ap-aging",
        undefined,
      ]);
    });

    it("generates ivaDeclaration key", () => {
      expect(queryKeys.accounting.ivaDeclaration({ year: 2024 })).toEqual([
        "accounting",
        "reports",
        "iva-declaration",
        { year: 2024 },
      ]);
    });

    it("generates reteFuenteSummary key", () => {
      expect(queryKeys.accounting.reteFuenteSummary()).toEqual([
        "accounting",
        "reports",
        "retefuente-summary",
        undefined,
      ]);
    });

    it("generates ytdTaxSummary key", () => {
      expect(queryKeys.accounting.ytdTaxSummary({ year: 2024 })).toEqual([
        "accounting",
        "reports",
        "tax-summary",
        { year: 2024 },
      ]);
    });
  });

  describe("bank keys", () => {
    it("generates all key", () => {
      expect(queryKeys.bank.all).toEqual(["bank"]);
    });

    it("generates accounts key without filters", () => {
      expect(queryKeys.bank.accounts()).toEqual([
        "bank",
        "accounts",
        "list",
        undefined,
      ]);
    });

    it("generates accounts key with filters", () => {
      const filters = { currency: "COP" };
      expect(queryKeys.bank.accounts(filters)).toEqual([
        "bank",
        "accounts",
        "list",
        filters,
      ]);
    });

    it("generates account detail key", () => {
      expect(queryKeys.bank.account("ba-1")).toEqual([
        "bank",
        "accounts",
        "ba-1",
      ]);
    });

    it("generates statements key", () => {
      expect(queryKeys.bank.statements("ba-1")).toEqual([
        "bank",
        "statements",
        "account",
        "ba-1",
      ]);
    });

    it("generates statement detail key", () => {
      expect(queryKeys.bank.statement("stmt-1")).toEqual([
        "bank",
        "statements",
        "stmt-1",
      ]);
    });
  });

  describe("payrollEmployees keys", () => {
    it("generates all key", () => {
      expect(queryKeys.payrollEmployees.all).toEqual(["payrollEmployees"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.payrollEmployees.list()).toEqual([
        "payrollEmployees",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { department: "Engineering" };
      expect(queryKeys.payrollEmployees.list(filters)).toEqual([
        "payrollEmployees",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.payrollEmployees.detail("emp-1")).toEqual([
        "payrollEmployees",
        "emp-1",
      ]);
    });
  });

  describe("payrollConfig keys", () => {
    it("generates all key", () => {
      expect(queryKeys.payrollConfig.all).toEqual(["payrollConfig"]);
    });

    it("generates detail key", () => {
      expect(queryKeys.payrollConfig.detail()).toEqual([
        "payrollConfig",
        "detail",
      ]);
    });
  });

  describe("payrollPeriods keys", () => {
    it("generates all key", () => {
      expect(queryKeys.payrollPeriods.all).toEqual(["payrollPeriods"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.payrollPeriods.list()).toEqual([
        "payrollPeriods",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { year: 2024, month: 6 };
      expect(queryKeys.payrollPeriods.list(filters)).toEqual([
        "payrollPeriods",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.payrollPeriods.detail("pp-1")).toEqual([
        "payrollPeriods",
        "pp-1",
      ]);
    });
  });

  describe("payrollEntries keys", () => {
    it("generates all key", () => {
      expect(queryKeys.payrollEntries.all).toEqual(["payrollEntries"]);
    });

    it("generates detail key", () => {
      expect(queryKeys.payrollEntries.detail("pe-1")).toEqual([
        "payrollEntries",
        "pe-1",
      ]);
    });
  });

  describe("costCenters keys", () => {
    it("generates all key", () => {
      expect(queryKeys.costCenters.all).toEqual(["costCenters"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.costCenters.list()).toEqual([
        "costCenters",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { isActive: true };
      expect(queryKeys.costCenters.list(filters)).toEqual([
        "costCenters",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.costCenters.detail("cc-1")).toEqual([
        "costCenters",
        "cc-1",
      ]);
    });

    it("generates options key", () => {
      expect(queryKeys.costCenters.options()).toEqual([
        "costCenters",
        "options",
      ]);
    });
  });

  describe("remissions keys", () => {
    it("generates all key", () => {
      expect(queryKeys.remissions.all).toEqual(["remissions"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.remissions.list()).toEqual([
        "remissions",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { status: "DELIVERED" };
      expect(queryKeys.remissions.list(filters)).toEqual([
        "remissions",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.remissions.detail("rem-1")).toEqual([
        "remissions",
        "rem-1",
      ]);
    });

    it("generates stats key", () => {
      expect(queryKeys.remissions.stats()).toEqual(["remissions", "stats"]);
    });
  });

  describe("supportDocuments keys", () => {
    it("generates all key", () => {
      expect(queryKeys.supportDocuments.all).toEqual(["supportDocuments"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.supportDocuments.list()).toEqual([
        "supportDocuments",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { supplierId: "sup-1" };
      expect(queryKeys.supportDocuments.list(filters)).toEqual([
        "supportDocuments",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.supportDocuments.detail("sd-1")).toEqual([
        "supportDocuments",
        "sd-1",
      ]);
    });

    it("generates stats key", () => {
      expect(queryKeys.supportDocuments.stats()).toEqual([
        "supportDocuments",
        "stats",
      ]);
    });
  });

  describe("collection keys", () => {
    it("generates all key", () => {
      expect(queryKeys.collection.all).toEqual(["collection"]);
    });

    it("generates reminders key without filters", () => {
      expect(queryKeys.collection.reminders()).toEqual([
        "collection",
        "reminders",
        undefined,
      ]);
    });

    it("generates reminders key with filters", () => {
      const filters = { status: "PENDING" };
      expect(queryKeys.collection.reminders(filters)).toEqual([
        "collection",
        "reminders",
        filters,
      ]);
    });

    it("generates reminder detail key", () => {
      expect(queryKeys.collection.reminder("r-1")).toEqual([
        "collection",
        "reminder",
        "r-1",
      ]);
    });

    it("generates stats key", () => {
      expect(queryKeys.collection.stats()).toEqual(["collection", "stats"]);
    });

    it("generates dashboard key", () => {
      expect(queryKeys.collection.dashboard()).toEqual([
        "collection",
        "dashboard",
      ]);
    });

    it("generates overdueInvoices key", () => {
      expect(queryKeys.collection.overdueInvoices()).toEqual([
        "collection",
        "overdue-invoices",
      ]);
    });
  });

  describe("withholdingCertificates keys", () => {
    it("generates all key", () => {
      expect(queryKeys.withholdingCertificates.all).toEqual([
        "withholdingCertificates",
      ]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.withholdingCertificates.list()).toEqual([
        "withholdingCertificates",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { year: 2024, supplierId: "sup-1" };
      expect(queryKeys.withholdingCertificates.list(filters)).toEqual([
        "withholdingCertificates",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(queryKeys.withholdingCertificates.detail("wc-1")).toEqual([
        "withholdingCertificates",
        "wc-1",
      ]);
    });

    it("generates stats key without year", () => {
      expect(queryKeys.withholdingCertificates.stats()).toEqual([
        "withholdingCertificates",
        "stats",
        undefined,
      ]);
    });

    it("generates stats key with year", () => {
      expect(queryKeys.withholdingCertificates.stats(2024)).toEqual([
        "withholdingCertificates",
        "stats",
        2024,
      ]);
    });
  });

  describe("kardex keys", () => {
    it("generates all key", () => {
      expect(queryKeys.kardex.all).toEqual(["kardex"]);
    });

    it("generates byProduct key without params", () => {
      expect(queryKeys.kardex.byProduct("prod-1")).toEqual([
        "kardex",
        "product",
        "prod-1",
        undefined,
      ]);
    });

    it("generates byProduct key with params", () => {
      const params = { warehouseId: "wh-1", startDate: "2024-01-01" };
      expect(queryKeys.kardex.byProduct("prod-1", params)).toEqual([
        "kardex",
        "product",
        "prod-1",
        params,
      ]);
    });
  });

  describe("auditLogs keys", () => {
    it("generates all key", () => {
      expect(queryKeys.auditLogs.all).toEqual(["auditLogs"]);
    });

    it("generates list key without filters", () => {
      expect(queryKeys.auditLogs.list()).toEqual([
        "auditLogs",
        "list",
        undefined,
      ]);
    });

    it("generates list key with filters", () => {
      const filters = { action: "CREATE", entity: "Invoice" };
      expect(queryKeys.auditLogs.list(filters)).toEqual([
        "auditLogs",
        "list",
        filters,
      ]);
    });

    it("generates stats key without params", () => {
      expect(queryKeys.auditLogs.stats()).toEqual([
        "auditLogs",
        "stats",
        undefined,
      ]);
    });

    it("generates stats key with params", () => {
      const params = { period: "monthly" };
      expect(queryKeys.auditLogs.stats(params)).toEqual([
        "auditLogs",
        "stats",
        params,
      ]);
    });
  });
});
