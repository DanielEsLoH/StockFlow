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
        // Don't retry on 4xx errors
        if (error instanceof Error && "status" in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
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
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
    charts: () => [...queryKeys.dashboard.all, "charts"] as const,
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
};
