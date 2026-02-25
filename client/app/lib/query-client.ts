import { QueryClient } from "@tanstack/react-query";
import { toast } from "~/components/ui/Toast";

function handleError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "An error has occurred";

  toast.error(message);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // For 401 errors: axios interceptor handles token refresh and retries the request
        // We allow ONE retry here to give time for the refresh to complete
        if (error instanceof Error && "status" in error) {
          const status = (error as { status: number }).status;
          if (status === 401) {
            // Allow 1 retry for 401 to give axios interceptor time to refresh
            return failureCount < 1;
          }
          // Other 4xx errors should not be retried
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
      // Add a small delay between retries to allow token refresh to complete
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
      refetchOnWindowFocus: false,
      // Don't throw errors to error boundary - let components handle them via isError
      throwOnError: false,
    },
    mutations: {
      onError: handleError,
    },
  },
});

// Query keys factory
export const queryKeys = {
  // Auth
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },

  // Users
  users: {
    all: ["users"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.users.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.users.all, id] as const,
  },

  // Products
  products: {
    all: ["products"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.products.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.products.all, id] as const,
    lowStock: () => [...queryKeys.products.all, "low-stock"] as const,
  },

  // Categories
  categories: {
    all: ["categories"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.categories.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.categories.all, id] as const,
  },

  // Warehouses
  warehouses: {
    all: ["warehouses"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.warehouses.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.warehouses.all, id] as const,
  },

  // Customers
  customers: {
    all: ["customers"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.customers.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.customers.all, id] as const,
  },

  // Invoices
  invoices: {
    all: ["invoices"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.invoices.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.invoices.all, id] as const,
    recent: (limit?: number) =>
      [...queryKeys.invoices.all, "recent", limit] as const,
    byCustomer: (customerId: string) =>
      [...queryKeys.invoices.all, "customer", customerId] as const,
    stats: () => [...queryKeys.invoices.all, "stats"] as const,
  },

  // Payments
  payments: {
    all: ["payments"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.payments.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.payments.all, id] as const,
    byInvoice: (invoiceId: string) =>
      [...queryKeys.payments.all, "invoice", invoiceId] as const,
    byCustomer: (customerId: string) =>
      [...queryKeys.payments.all, "customer", customerId] as const,
    recent: (limit?: number) =>
      [...queryKeys.payments.all, "recent", limit] as const,
    stats: () => [...queryKeys.payments.all, "stats"] as const,
  },

  // Dashboard
  dashboard: {
    all: ["dashboard"] as const,
    stats: (days?: number) =>
      [...queryKeys.dashboard.all, "stats", days] as const,
    charts: (days?: number) =>
      [...queryKeys.dashboard.all, "charts", days] as const,
    activity: () => [...queryKeys.dashboard.all, "activity"] as const,
  },

  // Reports
  reports: {
    all: ["reports"] as const,
    recent: (limit?: number) =>
      [...queryKeys.reports.all, "recent", limit] as const,
    sales: (params?: Record<string, unknown>) =>
      [...queryKeys.reports.all, "sales", params] as const,
    inventory: (params?: Record<string, unknown>) =>
      [...queryKeys.reports.all, "inventory", params] as const,
    customers: (params?: Record<string, unknown>) =>
      [...queryKeys.reports.all, "customers", params] as const,
  },

  // Notifications
  notifications: {
    all: ["notifications"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.notifications.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.notifications.all, id] as const,
    recent: (limit?: number) =>
      [...queryKeys.notifications.all, "recent", limit] as const,
    unreadCount: () =>
      [...queryKeys.notifications.all, "unread-count"] as const,
  },

  // Tenants
  tenants: {
    all: ["tenants"] as const,
    current: () => [...queryKeys.tenants.all, "current"] as const,
  },

  // Settings
  settings: {
    all: ["settings"] as const,
    preferences: () => [...queryKeys.settings.all, "preferences"] as const,
  },

  // Invitations
  invitations: {
    all: ["invitations"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.invitations.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.invitations.all, id] as const,
  },

  // Cash Registers
  cashRegisters: {
    all: ["cashRegisters"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.cashRegisters.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.cashRegisters.all, id] as const,
  },

  // POS Sessions
  posSessions: {
    all: ["posSessions"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.posSessions.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.posSessions.all, id] as const,
    current: () => [...queryKeys.posSessions.all, "current"] as const,
    movements: (id: string) =>
      [...queryKeys.posSessions.all, id, "movements"] as const,
    xReport: (id: string) =>
      [...queryKeys.posSessions.all, id, "x-report"] as const,
    zReport: (id: string) =>
      [...queryKeys.posSessions.all, id, "z-report"] as const,
  },

  // POS Sales
  posSales: {
    all: ["posSales"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.posSales.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.posSales.all, id] as const,
  },

  // Stock Movements
  stockMovements: {
    all: ["stockMovements"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.stockMovements.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.stockMovements.all, id] as const,
    byProduct: (productId: string) =>
      [...queryKeys.stockMovements.all, "product", productId] as const,
    byWarehouse: (warehouseId: string) =>
      [...queryKeys.stockMovements.all, "warehouse", warehouseId] as const,
  },

  // Quotations
  quotations: {
    all: ["quotations"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.quotations.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.quotations.all, id] as const,
    stats: () => [...queryKeys.quotations.all, "stats"] as const,
  },

  // Suppliers
  suppliers: {
    all: ["suppliers"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.suppliers.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.suppliers.all, id] as const,
    stats: () => [...queryKeys.suppliers.all, "stats"] as const,
  },

  // Purchase Orders
  purchaseOrders: {
    all: ["purchaseOrders"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.purchaseOrders.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.purchaseOrders.all, id] as const,
    stats: () => [...queryKeys.purchaseOrders.all, "stats"] as const,
  },

  // Billing
  billing: {
    all: ["billing"] as const,
    status: () => [...queryKeys.billing.all, "status"] as const,
    plans: () => [...queryKeys.billing.all, "plans"] as const,
    history: () => [...queryKeys.billing.all, "history"] as const,
  },

  // Accounting
  accounting: {
    all: ["accounting"] as const,
    config: () => ["accounting", "config"] as const,
    accounts: () => ["accounting", "accounts"] as const,
    accountTree: () => ["accounting", "account-tree"] as const,
    accountDetail: (id: string) => ["accounting", "account", id] as const,
    journalEntries: (filters?: Record<string, unknown>) =>
      ["accounting", "journal-entries", "list", filters] as const,
    journalEntry: (id: string) =>
      ["accounting", "journal-entries", id] as const,
    periods: () => ["accounting", "periods"] as const,
    trialBalance: (params?: Record<string, unknown>) =>
      ["accounting", "reports", "trial-balance", params] as const,
    generalJournal: (params?: Record<string, unknown>) =>
      ["accounting", "reports", "general-journal", params] as const,
    generalLedger: (params?: Record<string, unknown>) =>
      ["accounting", "reports", "general-ledger", params] as const,
    balanceSheet: (params?: Record<string, unknown>) =>
      ["accounting", "reports", "balance-sheet", params] as const,
    incomeStatement: (params?: Record<string, unknown>) =>
      ["accounting", "reports", "income-statement", params] as const,
    cashFlow: (params?: Record<string, unknown>) =>
      ["accounting", "reports", "cash-flow", params] as const,
    costCenterBalance: (params?: Record<string, unknown>) =>
      ["accounting", "reports", "cost-center-balance", params] as const,
  },

  // Bank
  bank: {
    all: ["bank"] as const,
    accounts: (filters?: Record<string, unknown>) =>
      ["bank", "accounts", "list", filters] as const,
    account: (id: string) => ["bank", "accounts", id] as const,
    statements: (bankAccountId: string) =>
      ["bank", "statements", "account", bankAccountId] as const,
    statement: (id: string) => ["bank", "statements", id] as const,
  },

  // Payroll - Employees
  payrollEmployees: {
    all: ["payrollEmployees"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.payrollEmployees.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.payrollEmployees.all, id] as const,
  },

  // Payroll - Config
  payrollConfig: {
    all: ["payrollConfig"] as const,
    detail: () => [...queryKeys.payrollConfig.all, "detail"] as const,
  },

  // Payroll - Periods
  payrollPeriods: {
    all: ["payrollPeriods"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.payrollPeriods.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.payrollPeriods.all, id] as const,
  },

  // Payroll - Entries
  payrollEntries: {
    all: ["payrollEntries"] as const,
    detail: (id: string) => [...queryKeys.payrollEntries.all, id] as const,
  },

  // Cost Centers
  costCenters: {
    all: ["costCenters"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.costCenters.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.costCenters.all, id] as const,
    options: () => [...queryKeys.costCenters.all, "options"] as const,
  },

  // Remissions
  remissions: {
    all: ["remissions"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.remissions.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.remissions.all, id] as const,
    stats: () => [...queryKeys.remissions.all, "stats"] as const,
  },

  // Support Documents
  supportDocuments: {
    all: ["supportDocuments"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.supportDocuments.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.supportDocuments.all, id] as const,
    stats: () => [...queryKeys.supportDocuments.all, "stats"] as const,
  },

  // Collection
  collection: {
    all: ["collection"] as const,
    reminders: (filters?: Record<string, unknown>) =>
      [...queryKeys.collection.all, "reminders", filters] as const,
    reminder: (id: string) => [...queryKeys.collection.all, "reminder", id] as const,
    stats: () => [...queryKeys.collection.all, "stats"] as const,
    dashboard: () => [...queryKeys.collection.all, "dashboard"] as const,
    overdueInvoices: () =>
      [...queryKeys.collection.all, "overdue-invoices"] as const,
  },

  // Withholding Certificates
  withholdingCertificates: {
    all: ["withholdingCertificates"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.withholdingCertificates.all, "list", filters] as const,
    detail: (id: string) =>
      [...queryKeys.withholdingCertificates.all, id] as const,
    stats: (year?: number) =>
      [...queryKeys.withholdingCertificates.all, "stats", year] as const,
  },

  // Kardex
  kardex: {
    all: ["kardex"] as const,
    byProduct: (
      productId: string,
      params?: Record<string, unknown>,
    ) => [...queryKeys.kardex.all, "product", productId, params] as const,
  },
};
