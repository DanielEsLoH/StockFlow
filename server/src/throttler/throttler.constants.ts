/**
 * Throttler configuration constants.
 *
 * These values define rate limiting tiers for different types of operations
 * and subscription plans.
 */

/**
 * Default rate limiting configuration for different endpoint types.
 * TTL is in seconds, limit is the number of requests allowed within TTL.
 */
export const THROTTLE_CONFIG = {
  /**
   * Default global rate limit for all endpoints.
   * 100 requests per minute per IP.
   */
  DEFAULT: {
    ttl: 60,
    limit: 100,
  },

  /**
   * Strict rate limit for authentication endpoints.
   * Prevents brute force and credential stuffing attacks.
   */
  AUTH: {
    /** Login: 5 attempts per 15 minutes */
    LOGIN: {
      ttl: 900,
      limit: 5,
    },
    /** Register: 3 attempts per hour */
    REGISTER: {
      ttl: 3600,
      limit: 3,
    },
    /** Refresh token: 10 requests per 15 minutes */
    REFRESH: {
      ttl: 900,
      limit: 10,
    },
    /** Password reset: 3 requests per hour */
    PASSWORD_RESET: {
      ttl: 3600,
      limit: 3,
    },
  },

  /**
   * Rate limits for heavy operations like file uploads and reports.
   */
  HEAVY: {
    /** File uploads: 20 per hour */
    UPLOAD: {
      ttl: 3600,
      limit: 20,
    },
    /** Report generation: 30 per hour */
    REPORT: {
      ttl: 3600,
      limit: 30,
    },
    /** Bulk operations: 10 per hour */
    BULK: {
      ttl: 3600,
      limit: 10,
    },
  },

  /**
   * API rate limits by subscription plan.
   * Applied globally per tenant/user.
   */
  SUBSCRIPTION: {
    FREE: {
      ttl: 60,
      limit: 30,
    },
    BASIC: {
      ttl: 60,
      limit: 60,
    },
    PRO: {
      ttl: 60,
      limit: 200,
    },
    ENTERPRISE: {
      ttl: 60,
      limit: 1000,
    },
  },
} as const;

/**
 * Rate limit names for different throttler configurations.
 */
export const THROTTLE_NAMES = {
  DEFAULT: 'default',
  AUTH: 'auth',
  HEAVY: 'heavy',
} as const;
