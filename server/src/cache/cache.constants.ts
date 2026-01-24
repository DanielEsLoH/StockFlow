/**
 * Cache key prefixes for different data types.
 * Using prefixes helps organize cache entries and enables bulk invalidation.
 */
export const CACHE_KEYS = {
  /** Products cache prefix */
  PRODUCTS: 'products',
  /** Single product cache prefix */
  PRODUCT: 'product',
  /** Categories cache prefix */
  CATEGORIES: 'categories',
  /** Single category cache prefix */
  CATEGORY: 'category',
  /** Dashboard metrics cache prefix */
  DASHBOARD: 'dashboard',
  /** Customers cache prefix */
  CUSTOMERS: 'customers',
  /** Single customer cache prefix */
  CUSTOMER: 'customer',
  /** Warehouses cache prefix */
  WAREHOUSES: 'warehouses',
  /** Single warehouse cache prefix */
  WAREHOUSE: 'warehouse',
  /** User cache prefix */
  USER: 'user',
} as const;

/**
 * Cache TTL (Time To Live) values in seconds.
 * Different data types have different cache durations based on how frequently they change.
 */
export const CACHE_TTL = {
  /** Short TTL for frequently changing data (1 minute) */
  SHORT: 60,
  /** Medium TTL for moderately changing data (5 minutes) */
  MEDIUM: 300,
  /** Long TTL for rarely changing data (15 minutes) */
  LONG: 900,
  /** Extended TTL for static data (1 hour) */
  EXTENDED: 3600,
  /** Dashboard metrics (2 minutes) - balances freshness with performance */
  DASHBOARD: 120,
  /** Product lists (5 minutes) */
  PRODUCTS: 300,
  /** Single product (5 minutes) */
  PRODUCT: 300,
  /** Categories (15 minutes) - changes less frequently */
  CATEGORIES: 900,
  /** Warehouses (15 minutes) */
  WAREHOUSES: 900,
  /** Customer data (5 minutes) */
  CUSTOMERS: 300,
} as const;

/**
 * Helper function to generate cache keys with tenant isolation.
 * All cache keys include the tenantId to ensure multi-tenant data isolation.
 *
 * @param prefix - The cache key prefix (e.g., 'products')
 * @param tenantId - The tenant identifier
 * @param suffix - Optional suffix for specific items or queries
 * @returns Formatted cache key string
 *
 * @example
 * // List cache key
 * getCacheKey('products', 'tenant-123') // 'products:tenant-123'
 *
 * // Item cache key
 * getCacheKey('product', 'tenant-123', 'prod-456') // 'product:tenant-123:prod-456'
 *
 * // Query cache key
 * getCacheKey('products', 'tenant-123', 'page:1:limit:10') // 'products:tenant-123:page:1:limit:10'
 */
export function getCacheKey(
  prefix: string,
  tenantId: string,
  suffix?: string,
): string {
  if (suffix) {
    return `${prefix}:${tenantId}:${suffix}`;
  }
  return `${prefix}:${tenantId}`;
}

/**
 * Helper function to generate a hash from query parameters for cache keys.
 * Useful for caching paginated or filtered queries.
 *
 * @param params - Object containing query parameters
 * @returns A deterministic string representation of the parameters
 *
 * @example
 * hashQueryParams({ page: 1, limit: 10, search: 'test' })
 * // Returns: 'limit:10:page:1:search:test'
 */
export function hashQueryParams(params: Record<string, unknown>): string {
  const sortedKeys = Object.keys(params).sort();
  const parts: string[] = [];

  for (const key of sortedKeys) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${key}:${JSON.stringify(value)}`);
    }
  }

  return parts.join(':');
}
