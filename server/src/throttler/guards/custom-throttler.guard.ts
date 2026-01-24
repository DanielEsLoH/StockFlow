import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * JWT payload user object from authenticated requests.
 */
interface JwtUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

/**
 * Custom throttler guard that extends the default ThrottlerGuard.
 *
 * Provides enhanced functionality:
 * - IP extraction from various headers (for proxied requests)
 * - User-based rate limiting for authenticated requests
 * - Tenant-based rate limiting for multi-tenant isolation
 * - Detailed logging for security monitoring
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  /**
   * Generate a unique tracker key based on request context.
   *
   * Priority:
   * 1. User ID (for authenticated requests)
   * 2. Tenant ID + IP (for tenant-scoped limiting)
   * 3. IP address (fallback for anonymous requests)
   */
  protected getTracker(req: Request): Promise<string> {
    const ip = this.extractIp(req);
    const user = req['user'] as JwtUser | undefined;

    // For authenticated users, use userId as the primary identifier
    if (user?.userId) {
      return Promise.resolve(`user:${user.userId}`);
    }

    // For requests with tenant context, combine tenant + IP
    if (user?.tenantId) {
      return Promise.resolve(`tenant:${user.tenantId}:${ip}`);
    }

    // Fallback to IP for anonymous requests
    return Promise.resolve(`ip:${ip}`);
  }

  /**
   * Extract the real client IP address from the request.
   *
   * Handles common proxy headers in order of reliability:
   * 1. CF-Connecting-IP (Cloudflare)
   * 2. X-Real-IP (nginx)
   * 3. X-Forwarded-For (standard proxy header)
   * 4. req.ip (Express parsed IP)
   * 5. req.socket.remoteAddress (direct connection)
   */
  private extractIp(req: Request): string {
    // Cloudflare
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp && typeof cfIp === 'string') {
      return cfIp;
    }

    // Nginx real IP
    const realIp = req.headers['x-real-ip'];
    if (realIp && typeof realIp === 'string') {
      return realIp;
    }

    // X-Forwarded-For (take first IP in chain)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = (
        typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0]
      )
        .split(',')
        .map((ip) => ip.trim());
      if (ips.length > 0 && ips[0]) {
        return ips[0];
      }
    }

    // Express parsed IP
    if (req.ip) {
      return req.ip;
    }

    // Direct connection
    return req.socket?.remoteAddress ?? 'unknown';
  }

  /**
   * Handle rate limit exceeded error.
   *
   * Logs the violation and throws a throttler exception with
   * helpful error message and retry information.
   */
  protected throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: {
      limit: number;
      ttl: number;
      key: string;
      tracker: string;
      totalHits: number;
      timeToExpire: number;
      isBlocked: boolean;
      timeToBlockExpire: number;
    },
  ): never {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = this.extractIp(req);
    const path = req.path;
    const method = req.method;
    const user = req['user'] as JwtUser | undefined;

    this.logger.warn(
      `Rate limit exceeded: ${method} ${path} - ` +
        `IP: ${ip}, User: ${user?.userId ?? 'anonymous'}, ` +
        `Hits: ${throttlerLimitDetail.totalHits}/${throttlerLimitDetail.limit}, ` +
        `Retry after: ${throttlerLimitDetail.timeToExpire}ms`,
    );

    throw new ThrottlerException(
      `Too many requests. Please try again in ${Math.ceil(throttlerLimitDetail.timeToExpire / 1000)} seconds.`,
    );
  }

  /**
   * Skip throttling for certain routes or conditions.
   *
   * Returns true to skip throttling for:
   * - Health check endpoints
   * - Swagger documentation endpoints
   */
  protected shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const path = req.path;

    // Skip health check and documentation endpoints
    if (path === '/health' || path.startsWith('/api/docs')) {
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  }
}
