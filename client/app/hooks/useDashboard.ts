import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query-client";
import { dashboardService } from "~/services/dashboard.service";
import { useAuthStore } from "~/stores/auth.store";
import type {
  DashboardStats,
  DashboardCharts,
  RecentInvoice,
  LowStockAlert,
  RecentActivity,
} from "~/services/dashboard.service";

/**
 * Custom hook to check if queries should be enabled.
 * Waits for AuthInitializer to complete before enabling queries.
 * This prevents race conditions where queries fire before the token is refreshed.
 */
function useIsQueryEnabled(): boolean {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // On SSR, we can't check tokens - enable if authenticated in store
  if (typeof window === "undefined") {
    return isAuthenticated;
  }

  // Only enable queries after auth initialization is complete AND user is authenticated
  // isInitialized is set to true by AuthInitializer after it finishes (success or failure)
  return isInitialized && isAuthenticated;
}

export function useDashboardStats() {
  const enabled = useIsQueryEnabled();
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: dashboardService.getStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    enabled,
  });
}

export function useDashboardCharts() {
  const enabled = useIsQueryEnabled();
  return useQuery<DashboardCharts>({
    queryKey: queryKeys.dashboard.charts(),
    queryFn: dashboardService.getCharts,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}

export function useRecentInvoices() {
  const enabled = useIsQueryEnabled();
  return useQuery<RecentInvoice[]>({
    queryKey: queryKeys.invoices.recent(),
    queryFn: dashboardService.getRecentInvoices,
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled,
  });
}

export function useLowStockAlerts() {
  const enabled = useIsQueryEnabled();
  return useQuery<LowStockAlert[]>({
    queryKey: queryKeys.products.lowStock(),
    queryFn: dashboardService.getLowStockAlerts,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}

export function useRecentActivity() {
  const enabled = useIsQueryEnabled();
  return useQuery<RecentActivity[]>({
    queryKey: queryKeys.dashboard.activity(),
    queryFn: dashboardService.getRecentActivity,
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled,
  });
}

export function useDashboard() {
  const statsQuery = useDashboardStats();
  const chartsQuery = useDashboardCharts();
  const invoicesQuery = useRecentInvoices();
  const alertsQuery = useLowStockAlerts();
  const activityQuery = useRecentActivity();

  const isLoading =
    statsQuery.isLoading ||
    chartsQuery.isLoading ||
    invoicesQuery.isLoading ||
    alertsQuery.isLoading ||
    activityQuery.isLoading;

  const isError =
    statsQuery.isError ||
    chartsQuery.isError ||
    invoicesQuery.isError ||
    alertsQuery.isError ||
    activityQuery.isError;

  const error =
    statsQuery.error ||
    chartsQuery.error ||
    invoicesQuery.error ||
    alertsQuery.error ||
    activityQuery.error;

  return {
    stats: statsQuery.data,
    charts: chartsQuery.data,
    recentInvoices: invoicesQuery.data,
    lowStockAlerts: alertsQuery.data,
    recentActivity: activityQuery.data,
    isLoading,
    isError,
    error,
    refetch: () => {
      statsQuery.refetch();
      chartsQuery.refetch();
      invoicesQuery.refetch();
      alertsQuery.refetch();
      activityQuery.refetch();
    },
  };
}
