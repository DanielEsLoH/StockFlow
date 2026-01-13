import { SubscriptionPlan } from '@prisma/client';
import type { ArcjetWellKnownBot, ArcjetBotCategory } from '@arcjet/node';

/**
 * Rate limit configuration options for the @RateLimit decorator.
 * Used to configure per-route rate limiting rules.
 */
export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window */
  requests: number;
  /** Time window for rate limiting (e.g., '1m', '15m', '1h', '1d') */
  window: string;
  /** Apply rate limit per authenticated user (requires JWT) */
  byUser?: boolean;
  /** Apply rate limit per tenant (requires JWT with tenantId) */
  byTenant?: boolean;
}

/**
 * Bot protection configuration options for the @BotProtect decorator.
 */
export interface BotProtectOptions {
  /** Mode of operation: LIVE blocks bots, DRY_RUN only logs */
  mode?: 'LIVE' | 'DRY_RUN';
  /**
   * List of bots to allow. Use specific bot names (e.g., 'GOOGLE_CRAWLER')
   * or categories (e.g., 'CATEGORY:SEARCH_ENGINE').
   * See https://docs.arcjet.com/bot-protection/identifying-bots for full list.
   */
  allowedBots?: Array<ArcjetWellKnownBot | ArcjetBotCategory>;
}

/**
 * Rate limit tier configuration based on subscription plan.
 * Defines different rate limits for each subscription tier.
 */
export interface RateLimitTier {
  /** Subscription plan level */
  plan: SubscriptionPlan;
  /** Requests per hour allowed */
  requestsPerHour: number;
}

/**
 * Rate limit tiers for subscription-based rate limiting.
 * Enterprise tier has unlimited requests (Infinity).
 */
export const SUBSCRIPTION_RATE_LIMITS: RateLimitTier[] = [
  { plan: 'FREE', requestsPerHour: 500 },
  { plan: 'BASIC', requestsPerHour: 2000 },
  { plan: 'PRO', requestsPerHour: 10000 },
  { plan: 'ENTERPRISE', requestsPerHour: Infinity },
];

/**
 * Get rate limit for a specific subscription plan.
 */
export function getRateLimitForPlan(plan: SubscriptionPlan): number {
  const tier = SUBSCRIPTION_RATE_LIMITS.find((t) => t.plan === plan);
  return tier?.requestsPerHour ?? 500;
}

/**
 * Arcjet decision result indicating whether a request should be allowed.
 */
export interface ArcjetDecision {
  /** Whether the request should be allowed */
  allowed: boolean;
  /** Reason for the decision */
  reason: 'ALLOWED' | 'RATE_LIMITED' | 'BOT_DETECTED' | 'DISABLED' | 'ERROR';
  /** Seconds until rate limit resets (for 429 responses) */
  retryAfter?: number;
  /** Additional details about the decision */
  details?: string;
}

/**
 * Security event log entry for audit trail.
 */
export interface SecurityEvent {
  /** Event type */
  type: 'RATE_LIMIT' | 'BOT_DETECTION' | 'BLOCKED_REQUEST';
  /** Client IP address */
  ip: string;
  /** Request path */
  path: string;
  /** HTTP method */
  method: string;
  /** User ID if authenticated */
  userId?: string;
  /** Tenant ID if authenticated */
  tenantId?: string;
  /** Event timestamp */
  timestamp: Date;
  /** Additional event details */
  details?: Record<string, unknown>;
}

/**
 * Metadata key constants for decorators.
 */
export const RATE_LIMIT_KEY = 'arcjet:rate-limit';
export const BOT_PROTECT_KEY = 'arcjet:bot-protect';