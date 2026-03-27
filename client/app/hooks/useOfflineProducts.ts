import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/auth.store";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import {
  getOfflineProducts,
  searchOfflineProducts,
} from "~/lib/offline/data-provider";
import { productsService } from "~/services/products.service";
import { queryKeys } from "~/lib/query-client";
import type { ProductFilters } from "~/types/product";

/**
 * useOfflineProducts — fetches products from API when online,
 * falls back to IndexedDB when offline or slow.
 *
 * vercel-react-best-practices:
 * - js-early-exit: guard clauses
 * - rerender-derived-state: derive isOffline from hook
 */
export function useOfflineProducts(filters?: ProductFilters) {
  const tenant = useAuthStore((s) => s.tenant);
  const { isEffectivelyOffline } = useNetworkStatus();
  const tenantId = tenant?.id ?? "";

  return useQuery({
    queryKey: [...queryKeys.products.list((filters ?? {}) as Record<string, unknown>), { offline: isEffectivelyOffline }],
    queryFn: async () => {
      // Offline path: read from IndexedDB
      if (isEffectivelyOffline) {
        const products = await getOfflineProducts(tenantId, filters);
        return {
          data: products,
          total: products.length,
          page: 1,
          limit: products.length,
          isOffline: true,
        };
      }

      // Online path: use API
      const response = await productsService.getProducts(filters ?? {});
      return { ...response, isOffline: false };
    },
    enabled: !!tenantId,
    staleTime: isEffectivelyOffline ? Infinity : 2 * 60 * 1000,
  });
}

/**
 * useOfflineProductSearch — searches products from API or IndexedDB.
 */
export function useOfflineProductSearch(query: string) {
  const tenant = useAuthStore((s) => s.tenant);
  const { isEffectivelyOffline } = useNetworkStatus();
  const tenantId = tenant?.id ?? "";

  return useQuery({
    queryKey: ["products", "search", query, { offline: isEffectivelyOffline }],
    queryFn: async () => {
      if (isEffectivelyOffline) {
        return searchOfflineProducts(tenantId, query);
      }
      return productsService.searchProducts(query);
    },
    enabled: !!tenantId && query.length >= 2,
    staleTime: isEffectivelyOffline ? Infinity : 30 * 1000,
  });
}
