import { useAuthStore } from '~/stores/auth.store';

/**
 * Custom hook to check if queries should be enabled.
 * Waits for Zustand to rehydrate from localStorage and AuthInitializer to complete.
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
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // Only enable queries after:
  // 1. Zustand has rehydrated from localStorage (hasHydrated)
  // 2. Auth initialization is complete (isInitialized) - persisted in localStorage
  // 3. User is authenticated (isAuthenticated) - persisted in localStorage
  return hasHydrated && isInitialized && isAuthenticated;
}
