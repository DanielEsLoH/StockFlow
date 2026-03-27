import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/auth.store";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import {
  getOfflineCustomers,
  searchOfflineCustomers,
} from "~/lib/offline/data-provider";
import { customersService } from "~/services/customers.service";
import { queryKeys } from "~/lib/query-client";

/**
 * useOfflineCustomers — fetches customers from API when online,
 * falls back to IndexedDB when offline or slow.
 *
 * vercel-react-best-practices:
 * - js-early-exit: guard clauses
 * - rerender-derived-state: derive isOffline from hook
 */
export function useOfflineCustomers(filters?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const tenant = useAuthStore((s) => s.tenant);
  const { isEffectivelyOffline } = useNetworkStatus();
  const tenantId = tenant?.id ?? "";

  return useQuery({
    queryKey: [...queryKeys.customers.list(filters ?? {}), { offline: isEffectivelyOffline }],
    queryFn: async () => {
      // Offline path: read from IndexedDB
      if (isEffectivelyOffline) {
        const customers = await getOfflineCustomers(tenantId, filters);
        return {
          data: customers,
          total: customers.length,
          page: 1,
          limit: customers.length,
          isOffline: true,
        };
      }

      // Online path: use API
      const response = await customersService.getCustomers(filters ?? {});
      return { ...response, isOffline: false };
    },
    enabled: !!tenantId,
    staleTime: isEffectivelyOffline ? Infinity : 2 * 60 * 1000,
  });
}

/**
 * useOfflineCustomerSearch — searches customers from API or IndexedDB.
 */
export function useOfflineCustomerSearch(query: string) {
  const tenant = useAuthStore((s) => s.tenant);
  const { isEffectivelyOffline } = useNetworkStatus();
  const tenantId = tenant?.id ?? "";

  return useQuery({
    queryKey: ["customers", "search", query, { offline: isEffectivelyOffline }],
    queryFn: async () => {
      if (isEffectivelyOffline) {
        return searchOfflineCustomers(tenantId, query);
      }
      return customersService.searchCustomers(query);
    },
    enabled: !!tenantId && query.length >= 2,
    staleTime: isEffectivelyOffline ? Infinity : 30 * 1000,
  });
}
