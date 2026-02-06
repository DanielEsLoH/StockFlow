import { useAuthStore } from '~/stores/auth.store';

/**
 * Custom hook to check if queries should be enabled.
 * Waits for AuthInitializer to complete before enabling queries.
 * This prevents race conditions where queries fire before the token is refreshed.
 *
 * Use this in any hook that makes authenticated API calls to ensure
 * the auth initialization is complete before making requests.
 *
 * @example
 * ```tsx
 * export function useCustomers(filters: CustomerFilters = {}) {
 *   const enabled = useIsQueryEnabled();
 *   return useQuery({
 *     queryKey: queryKeys.customers.list(filters),
 *     queryFn: () => customersService.getCustomers(filters),
 *     enabled,
 *   });
 * }
 * ```
 */
export function useIsQueryEnabled(): boolean {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // On SSR, we can't check tokens - enable if authenticated in store
  if (typeof window === 'undefined') {
    return isAuthenticated;
  }

  // Only enable queries after auth initialization is complete AND user is authenticated
  // isInitialized is set to true by AuthInitializer after it finishes (success or failure)
  return isInitialized && isAuthenticated;
}
