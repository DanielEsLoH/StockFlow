import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import arcjet, {
  ArcjetDecision as SdkDecision,
  ArcjetReason,
  detectBot,
  fixedWindow,
  shield,
  slidingWindow,
  tokenBucket,
} from '@arcjet/node';
import { Request } from 'express';
import { SubscriptionPlan } from '@prisma/client';
import {
  ArcjetDecision,
  BotProtectOptions,
  RateLimitOptions,
  SecurityEvent,
  getRateLimitForPlan,
} from './types';

/**
 * ArcjetService provides rate limiting, bot protection, and API security
 * using the Arcjet security platform.
 *
 * Features:
 * - Configurable rate limiting per route
 * - Subscription-based rate limits (FREE, BASIC, PRO, ENTERPRISE)
 * - Bot detection and blocking
 * - Shield protection against common attacks
 * - Security event logging for audit trail
 *
 * The service gracefully degrades when Arcjet is disabled or unavailable,
 * logging warnings and allowing requests through.
 */
@Injectable()
export class ArcjetService implements OnModuleInit {
  private readonly logger = new Logger(ArcjetService.name);
  private client: ReturnType<typeof arcjet> | null = null;
  private isEnabled = false;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize the Arcjet client on module initialization.
   */
  onModuleInit(): void {
    const key = this.configService.get<string>('arcjet.key');
    const enabled = this.configService.get<boolean>('arcjet.enabled', true);
    const environment = this.configService.get<string>(
      'arcjet.environment',
      'development',
    );

    if (!enabled) {
      this.logger.warn('Arcjet is disabled via configuration');
      return;
    }

    if (!key) {
      this.logger.warn(
        'Arcjet API key not configured. Security features will be disabled. ' +
          'Get your free API key at https://app.arcjet.com',
      );
      return;
    }

    try {
      // Initialize Arcjet client with base configuration
      this.client = arcjet({
        key,
        characteristics: ['ip.src'],
        rules: [
          // Base shield protection against common attacks
          shield({ mode: environment === 'production' ? 'LIVE' : 'DRY_RUN' }),
        ],
      });

      this.isEnabled = true;
      this.logger.log(`Arcjet initialized successfully in ${environment} mode`);
    } catch (error) {
      this.logger.error('Failed to initialize Arcjet:', error);
    }
  }

  /**
   * Check if Arcjet protection is enabled and available.
   */
  isProtectionEnabled(): boolean {
    return this.isEnabled && this.client !== null;
  }

  /**
   * Extract client IP address from request.
   * Handles proxy forwarding headers (X-Forwarded-For, X-Real-IP).
   */
  getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string') {
      return realIp;
    }
    return req.ip || req.socket?.remoteAddress || '0.0.0.0';
  }

  /**
   * Parse rate limit window string to seconds.
   * Supports: 's' (seconds), 'm' (minutes), 'h' (hours), 'd' (days)
   */
  parseWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) {
      this.logger.warn(`Invalid window format: ${window}, defaulting to 60s`);
      return 60;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 60;
    }
  }

  /**
   * Check rate limit for a request.
   *
   * @param req - Express request object
   * @param options - Rate limit configuration
   * @param userId - Optional user ID for user-based limits
   * @param tenantId - Optional tenant ID for tenant-based limits
   */
  async checkRateLimit(
    req: Request,
    options: RateLimitOptions,
    userId?: string,
    tenantId?: string,
  ): Promise<ArcjetDecision> {
    if (!this.isProtectionEnabled()) {
      return { allowed: true, reason: 'DISABLED' };
    }

    const ip = this.getClientIp(req);
    const windowSeconds = this.parseWindow(options.window);

    try {
      // Build characteristics and create appropriate client based on options
      if (options.byUser && userId && options.byTenant && tenantId) {
        // Rate limit by both user and tenant
        const rateLimitClient = arcjet({
          key: this.configService.get<string>('arcjet.key')!,
          characteristics: ['ip.src', 'userId', 'tenantId'],
          rules: [
            fixedWindow({
              mode: 'LIVE',
              max: options.requests,
              window: `${windowSeconds}s`,
            }),
          ],
        });
        const decision = await rateLimitClient.protect(req, {
          userId,
          tenantId,
        });
        return this.mapDecision(decision, ip, req.path);
      } else if (options.byUser && userId) {
        // Rate limit by user only
        const rateLimitClient = arcjet({
          key: this.configService.get<string>('arcjet.key')!,
          characteristics: ['ip.src', 'userId'],
          rules: [
            fixedWindow({
              mode: 'LIVE',
              max: options.requests,
              window: `${windowSeconds}s`,
            }),
          ],
        });
        const decision = await rateLimitClient.protect(req, { userId });
        return this.mapDecision(decision, ip, req.path);
      } else if (options.byTenant && tenantId) {
        // Rate limit by tenant only
        const rateLimitClient = arcjet({
          key: this.configService.get<string>('arcjet.key')!,
          characteristics: ['ip.src', 'tenantId'],
          rules: [
            fixedWindow({
              mode: 'LIVE',
              max: options.requests,
              window: `${windowSeconds}s`,
            }),
          ],
        });
        const decision = await rateLimitClient.protect(req, { tenantId });
        return this.mapDecision(decision, ip, req.path);
      } else {
        // Rate limit by IP only (default)
        const rateLimitClient = arcjet({
          key: this.configService.get<string>('arcjet.key')!,
          characteristics: ['ip.src'],
          rules: [
            fixedWindow({
              mode: 'LIVE',
              max: options.requests,
              window: `${windowSeconds}s`,
            }),
          ],
        });
        const decision = await rateLimitClient.protect(req);
        return this.mapDecision(decision, ip, req.path);
      }
    } catch (error) {
      this.logger.error('Rate limit check failed:', error);
      // Graceful degradation: allow request on error
      return { allowed: true, reason: 'ERROR', details: String(error) };
    }
  }

  /**
   * Check subscription-based rate limit for authenticated users.
   * Different subscription tiers have different rate limits.
   *
   * @param req - Express request object
   * @param plan - User's subscription plan
   * @param _userId - User ID (unused, rate limiting is per-tenant)
   * @param tenantId - Tenant ID
   */
  async checkSubscriptionRateLimit(
    req: Request,
    plan: SubscriptionPlan,
    _userId: string,
    tenantId: string,
  ): Promise<ArcjetDecision> {
    if (!this.isProtectionEnabled()) {
      return { allowed: true, reason: 'DISABLED' };
    }

    const requestsPerHour = getRateLimitForPlan(plan);

    // Enterprise tier has unlimited requests
    if (requestsPerHour === Infinity) {
      return { allowed: true, reason: 'ALLOWED', details: 'ENTERPRISE_TIER' };
    }

    const ip = this.getClientIp(req);

    try {
      // Use sliding window for smoother rate limiting over an hour
      const rateLimitClient = arcjet({
        key: this.configService.get<string>('arcjet.key')!,
        characteristics: ['tenantId'],
        rules: [
          slidingWindow({
            mode: 'LIVE',
            max: requestsPerHour,
            interval: '1h',
          }),
        ],
      });

      const decision = await rateLimitClient.protect(req, { tenantId });
      return this.mapDecision(decision, ip, req.path);
    } catch (error) {
      this.logger.error('Subscription rate limit check failed:', error);
      return { allowed: true, reason: 'ERROR', details: String(error) };
    }
  }

  /**
   * Check for heavy operations rate limit.
   * Used for file uploads, report generation, bulk operations.
   *
   * @param req - Express request object
   * @param operation - Type of operation ('upload', 'report', 'bulk')
   * @param userId - User ID
   */
  async checkHeavyOperationLimit(
    req: Request,
    operation: 'upload' | 'report' | 'bulk',
    userId: string,
  ): Promise<ArcjetDecision> {
    if (!this.isProtectionEnabled()) {
      return { allowed: true, reason: 'DISABLED' };
    }

    const limits: Record<string, { max: number; interval: string }> = {
      upload: { max: 20, interval: '1h' },
      report: { max: 50, interval: '1h' },
      bulk: { max: 10, interval: '1h' },
    };

    const { max, interval } = limits[operation];
    const ip = this.getClientIp(req);

    try {
      const rateLimitClient = arcjet({
        key: this.configService.get<string>('arcjet.key')!,
        characteristics: ['userId', 'operation'],
        rules: [
          slidingWindow({
            mode: 'LIVE',
            max,
            interval: interval as `${number} ${'s' | 'm' | 'h'}`,
          }),
        ],
      });

      const decision = await rateLimitClient.protect(req, {
        userId,
        operation,
      });
      return this.mapDecision(decision, ip, req.path);
    } catch (error) {
      this.logger.error('Heavy operation limit check failed:', error);
      return { allowed: true, reason: 'ERROR', details: String(error) };
    }
  }

  /**
   * Check for bot activity in a request.
   *
   * @param req - Express request object
   * @param options - Bot protection options
   */
  async checkBot(
    req: Request,
    options: BotProtectOptions,
  ): Promise<ArcjetDecision> {
    if (!this.isProtectionEnabled()) {
      return { allowed: true, reason: 'DISABLED' };
    }

    const ip = this.getClientIp(req);
    const mode = options.mode || 'LIVE';

    try {
      const botClient = arcjet({
        key: this.configService.get<string>('arcjet.key')!,
        characteristics: ['ip.src'],
        rules: [
          detectBot({
            mode,
            allow: options.allowedBots || [],
          }),
        ],
      });

      const decision = await botClient.protect(req);

      if (decision.isDenied()) {
        const reasonString = this.serializeReason(decision.reason);

        this.logSecurityEvent({
          type: 'BOT_DETECTION',
          ip,
          path: req.path,
          method: req.method,
          timestamp: new Date(),
          details: {
            userAgent: req.headers['user-agent'],
            reasonType: decision.reason.type,
            reasonDetails: reasonString,
          },
        });

        return {
          allowed: mode === 'DRY_RUN',
          reason: 'BOT_DETECTED',
          details: `Bot detected: ${reasonString}`,
        };
      }

      return { allowed: true, reason: 'ALLOWED' };
    } catch (error) {
      this.logger.error('Bot check failed:', error);
      return { allowed: true, reason: 'ERROR', details: String(error) };
    }
  }

  /**
   * Apply token bucket rate limiting for API access.
   * Allows burst traffic while maintaining average rate.
   *
   * @param req - Express request object
   * @param refillRate - Tokens added per interval
   * @param interval - Refill interval (e.g., '10s')
   * @param capacity - Maximum tokens (bucket size)
   * @param identifier - Unique identifier for the bucket
   * @param requested - Number of tokens to consume (defaults to 1)
   */
  async checkTokenBucket(
    req: Request,
    refillRate: number,
    interval: string,
    capacity: number,
    identifier: string,
    requested: number = 1,
  ): Promise<ArcjetDecision> {
    if (!this.isProtectionEnabled()) {
      return { allowed: true, reason: 'DISABLED' };
    }

    const ip = this.getClientIp(req);

    try {
      const tokenClient = arcjet({
        key: this.configService.get<string>('arcjet.key')!,
        characteristics: ['identifier'],
        rules: [
          tokenBucket({
            mode: 'LIVE',
            refillRate,
            interval: interval as `${number} ${'s' | 'm' | 'h'}`,
            capacity,
          }),
        ],
      });

      const decision = await tokenClient.protect(req, {
        identifier,
        requested,
      });
      return this.mapDecision(decision, ip, req.path);
    } catch (error) {
      this.logger.error('Token bucket check failed:', error);
      return { allowed: true, reason: 'ERROR', details: String(error) };
    }
  }

  /**
   * Serialize an ArcjetReason object to a human-readable string.
   */
  private serializeReason(reason: ArcjetReason): string {
    if (reason.isRateLimit()) {
      return `RATE_LIMIT(remaining: ${reason.remaining}, reset: ${reason.reset}s)`;
    }
    if (reason.isBot()) {
      return `BOT(denied: ${reason.denied.join(', ')})`;
    }
    if (reason.isShield()) {
      return `SHIELD(triggered: ${reason.shieldTriggered})`;
    }
    if (reason.isError()) {
      return `ERROR(${reason.message})`;
    }
    return reason.type ?? 'UNKNOWN';
  }

  /**
   * Map Arcjet SDK decision to our internal decision format.
   */
  private mapDecision(
    decision: SdkDecision,
    ip: string,
    path: string,
  ): ArcjetDecision {
    if (decision.isAllowed()) {
      return { allowed: true, reason: 'ALLOWED' };
    }

    const reasonString = this.serializeReason(decision.reason);

    // Log rate limit event
    this.logSecurityEvent({
      type: 'RATE_LIMIT',
      ip,
      path,
      method: 'UNKNOWN',
      timestamp: new Date(),
      details: {
        reasonType: decision.reason.type,
        reasonDetails: reasonString,
      },
    });

    // Calculate retry-after based on the decision
    // Use reset time from rate limit reason if available
    let retryAfter = 60; // Default to 60 seconds
    if (decision.reason.isRateLimit()) {
      retryAfter = decision.reason.reset;
    }

    return {
      allowed: false,
      reason: 'RATE_LIMITED',
      retryAfter,
      details: `Rate limit exceeded: ${reasonString}`,
    };
  }

  /**
   * Log security events for audit trail and monitoring.
   */
  logSecurityEvent(event: SecurityEvent): void {
    const logData = {
      type: event.type,
      ip: event.ip,
      path: event.path,
      method: event.method,
      userId: event.userId,
      tenantId: event.tenantId,
      timestamp: event.timestamp.toISOString(),
      ...event.details,
    };

    switch (event.type) {
      case 'RATE_LIMIT':
        this.logger.warn(`Rate limit violation: ${JSON.stringify(logData)}`);
        break;
      case 'BOT_DETECTION':
        this.logger.warn(`Bot detected: ${JSON.stringify(logData)}`);
        break;
      case 'BLOCKED_REQUEST':
        this.logger.warn(`Request blocked: ${JSON.stringify(logData)}`);
        break;
      default:
        this.logger.log(`Security event: ${JSON.stringify(logData)}`);
    }
  }
}
