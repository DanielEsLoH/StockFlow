import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Configuration for parsing URL filters
 */
export interface FilterParserConfig<T> {
  /**
   * Function to parse the current URL search params into filters
   */
  parse: (searchParams: URLSearchParams) => T;
}

/**
 * Options for the useUrlFilters hook
 */
export interface UseUrlFiltersOptions<T> {
  /**
   * Configuration for parsing URL params into filters
   */
  parserConfig: FilterParserConfig<T>;
  /**
   * Values that should be treated as "empty" and removed from the URL
   * Defaults to [undefined, '']
   */
  emptyValues?: unknown[];
}

/**
 * Return type for useUrlFilters hook
 */
export interface UseUrlFiltersReturn<T> {
  /**
   * The current filters parsed from the URL
   */
  filters: T;
  /**
   * Update filters in the URL. Automatically resets page to 1 unless page is explicitly provided.
   */
  updateFilters: (newFilters: Partial<T>) => void;
  /**
   * Clear all filters from the URL
   */
  clearFilters: () => void;
  /**
   * The underlying search params (for advanced use cases)
   */
  searchParams: URLSearchParams;
  /**
   * Set search params directly (for advanced use cases)
   */
  setSearchParams: ReturnType<typeof useSearchParams>[1];
}

/**
 * Custom hook for managing URL-based filters with automatic page reset
 *
 * @example
 * ```tsx
 * interface ProductFilters {
 *   search?: string;
 *   categoryId?: string;
 *   page: number;
 *   limit: number;
 * }
 *
 * const { filters, updateFilters, clearFilters } = useUrlFilters<ProductFilters>({
 *   parserConfig: {
 *     parse: (params) => ({
 *       search: params.get('search') || undefined,
 *       categoryId: params.get('categoryId') || undefined,
 *       page: Number(params.get('page')) || 1,
 *       limit: Number(params.get('limit')) || 10,
 *     }),
 *   },
 * });
 *
 * // Update filters (auto-resets page to 1)
 * updateFilters({ search: 'test' });
 *
 * // Update page without reset
 * updateFilters({ page: 2 });
 *
 * // Clear all filters
 * clearFilters();
 * ```
 */
export function useUrlFilters<T extends object>(
  options: UseUrlFiltersOptions<T>
): UseUrlFiltersReturn<T> {
  const [searchParams, setSearchParams] = useSearchParams();
  const { parserConfig, emptyValues = [undefined, '', false] } = options;

  // Parse current filters from URL
  const filters = useMemo(
    () => parserConfig.parse(searchParams),
    [searchParams, parserConfig]
  );

  // Update filters in URL
  const updateFilters = useCallback(
    (newFilters: Partial<T>) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(newFilters).forEach(([key, value]) => {
        if (emptyValues.includes(value)) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      // Reset to page 1 when filters change (except when page itself is being updated)
      if (!('page' in newFilters)) {
        params.set('page', '1');
      }

      setSearchParams(params);
    },
    [searchParams, setSearchParams, emptyValues]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return {
    filters,
    updateFilters,
    clearFilters,
    searchParams,
    setSearchParams,
  };
}