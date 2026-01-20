import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { CACHE_TTL, getCacheKey, hashQueryParams } from './cache.constants';

/**
 * CacheService provides a centralized interface for cache operations.
 * Wraps the cache-manager with tenant-aware key generation and error handling.
 *
 * Features:
 * - Tenant-isolated caching (all keys include tenantId)
 * - Automatic error handling (cache failures don't break the app)
 * - Pattern-based cache invalidation
 * - Query parameter hashing for filtered results
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get a value from cache.
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found/error
   *
   * @example
   * const products = await cacheService.get<Product[]>('products:tenant-123');
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined && value !== null) {
        this.logger.debug(`Cache HIT: ${key}`);
        return value;
      }
      this.logger.debug(`Cache MISS: ${key}`);
      return undefined;
    } catch (error) {
      this.logger.warn(`Cache GET error for key ${key}: ${error}`);
      return undefined;
    }
  }

  /**
   * Set a value in cache with optional TTL.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional, defaults to MEDIUM)
   *
   * @example
   * await cacheService.set('products:tenant-123', products, CACHE_TTL.PRODUCTS);
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = CACHE_TTL.MEDIUM,
  ): Promise<void> {
    try {
      // Convert TTL to milliseconds for cache-manager v5+
      await this.cacheManager.set(key, value, ttl * 1000);
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.warn(`Cache SET error for key ${key}: ${error}`);
    }
  }

  /**
   * Delete a value from cache.
   *
   * @param key - Cache key to delete
   *
   * @example
   * await cacheService.del('product:tenant-123:prod-456');
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.warn(`Cache DEL error for key ${key}: ${error}`);
    }
  }

  /**
   * Delete multiple cache keys matching a pattern.
   * Uses the Redis SCAN command for pattern matching.
   *
   * @param pattern - Pattern to match (e.g., 'products:tenant-123:*')
   *
   * @example
   * // Invalidate all product caches for a tenant
   * await cacheService.delByPattern('products:tenant-123:*');
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      // Access the underlying stores from cache-manager v7
      const stores = (this.cacheManager as unknown as { stores?: unknown[] })
        .stores;

      let keys: string[] = [];

      // Try to get keys from the first store (Redis or memory)
      if (stores && stores.length > 0) {
        const store = stores[0] as {
          opts?: { store?: { keys?: (pattern: string) => Promise<string[]> } };
          keys?: (pattern: string) => Promise<string[]>;
        };

        // Try different methods to get keys based on cache store implementation
        if (store.keys && typeof store.keys === 'function') {
          keys = await store.keys(pattern);
        } else if (store.opts?.store?.keys) {
          keys = await store.opts.store.keys(pattern);
        }
      }

      if (keys.length > 0) {
        await Promise.all(keys.map((key) => this.cacheManager.del(key)));
        this.logger.debug(
          `Cache DEL pattern: ${pattern} (${keys.length} keys)`,
        );
      }
    } catch (error) {
      this.logger.warn(`Cache DEL pattern error for ${pattern}: ${error}`);
    }
  }

  /**
   * Clear all cache entries.
   * Use with caution - this clears the entire cache.
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.clear();
      this.logger.debug('Cache RESET: All entries cleared');
    } catch (error) {
      this.logger.warn(`Cache RESET error: ${error}`);
    }
  }

  /**
   * Get or set a cached value with automatic cache population.
   * If the value is not in cache, the factory function is called to generate it.
   *
   * @param key - Cache key
   * @param factory - Function to generate the value if not cached
   * @param ttl - Time to live in seconds
   * @returns Cached or freshly generated value
   *
   * @example
   * const products = await cacheService.getOrSet(
   *   'products:tenant-123',
   *   () => this.productsRepository.findAll(),
   *   CACHE_TTL.PRODUCTS
   * );
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Generate a tenant-isolated cache key.
   *
   * @param prefix - Cache key prefix
   * @param tenantId - Tenant identifier
   * @param suffix - Optional suffix
   * @returns Formatted cache key
   */
  generateKey(prefix: string, tenantId: string, suffix?: string): string {
    return getCacheKey(prefix, tenantId, suffix);
  }

  /**
   * Generate a cache key suffix from query parameters.
   *
   * @param params - Query parameters object
   * @returns Hash string for use as cache key suffix
   */
  hashParams(params: Record<string, unknown>): string {
    return hashQueryParams(params);
  }

  /**
   * Invalidate all cache entries for a specific tenant and prefix.
   *
   * @param prefix - Cache key prefix (e.g., 'products')
   * @param tenantId - Tenant identifier
   *
   * @example
   * // Invalidate all product caches for tenant after create/update/delete
   * await cacheService.invalidate('products', 'tenant-123');
   * await cacheService.invalidate('product', 'tenant-123');
   */
  async invalidate(prefix: string, tenantId: string): Promise<void> {
    const pattern = `${prefix}:${tenantId}:*`;
    await this.delByPattern(pattern);
    // Also delete the base key without suffix
    await this.del(`${prefix}:${tenantId}`);
  }

  /**
   * Invalidate multiple cache prefixes for a tenant.
   *
   * @param prefixes - Array of cache key prefixes
   * @param tenantId - Tenant identifier
   *
   * @example
   * // After product update, invalidate product and dashboard caches
   * await cacheService.invalidateMultiple(['products', 'product', 'dashboard'], 'tenant-123');
   */
  async invalidateMultiple(
    prefixes: string[],
    tenantId: string,
  ): Promise<void> {
    await Promise.all(
      prefixes.map((prefix) => this.invalidate(prefix, tenantId)),
    );
  }
}
