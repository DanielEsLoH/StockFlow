/**
 * Health check constants and thresholds.
 */

/**
 * Memory usage thresholds in bytes.
 */
export const MEMORY_THRESHOLDS = {
  /** Heap usage threshold (512MB) */
  HEAP_USED: 512 * 1024 * 1024,
  /** RSS threshold (1GB) */
  RSS: 1024 * 1024 * 1024,
} as const;

/**
 * Disk usage thresholds.
 */
export const DISK_THRESHOLDS = {
  /** Minimum free space percentage (10%) */
  MIN_FREE_PERCENT: 0.1,
  /** Minimum free space in bytes (1GB) */
  MIN_FREE_BYTES: 1024 * 1024 * 1024,
} as const;

/**
 * Health check timeouts in milliseconds.
 */
export const HEALTH_TIMEOUTS = {
  /** Database ping timeout */
  DATABASE: 5000,
  /** Redis ping timeout */
  REDIS: 3000,
} as const;

/**
 * Health check keys for identifying indicators.
 */
export const HEALTH_KEYS = {
  DATABASE: 'database',
  REDIS: 'redis',
  MEMORY: 'memory',
  DISK: 'disk',
} as const;