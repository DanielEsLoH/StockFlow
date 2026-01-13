import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { ArcjetService } from '../arcjet.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../types';
import { RequestUser } from '../../auth/types';

/**
 * Interface for request with authenticated user.
 */
interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}

/**
 * Rate limiting guard using Arcjet.
 *
 * This guard checks rate limits for incoming requests based on:
 * 1. Route-specific limits via @RateLimit decorator
 * 2. Default limits based on HTTP method
 *
 * The guard extracts client IP and optionally user/tenant information
 * from the request to apply appropriate rate limits.
 *
 * Usage:
 * - Apply to individual routes: @UseGuards(RateLimitGuard)
 * - Configure limits: @RateLimit({ requests: 100, window: '1m' })
 *
 * Default Limits (when no @RateLimit decorator):
 * - GET: 100 requests per minute per IP
 * - POST/PUT/PATCH/DELETE: 30 requests per minute per IP
 *
 * @example
 * @Controller('api')
 * export class ApiController {
 *   @Get('data')
 *   @UseGuards(RateLimitGuard)
 *   @RateLimit({ requests: 100, window: '1m' })
 *   getData() {}
 *
 *   @Post('submit')
 *   @UseGuards(RateLimitGuard)
 *   @RateLimit({ requests: 10, window: '15m', byUser: true })
 *   submit() {}
 * }
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly arcjetService: ArcjetService,
  ) {}

  /**
   * Determines if the request should be allowed based on rate limits.
   *
   * @param context - The execution context
   * @returns Promise resolving to true if allowed, throws HttpException if rate limited
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get rate limit configuration from decorator
    const rateLimitOptions = this.reflector.getAllAndOverride<
      RateLimitOptions | undefined
    >(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);

    // If Arcjet is not enabled, allow all requests
    if (!this.arcjetService.isProtectionEnabled()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method;
    const path = request.path;

    // Use decorator options or apply default limits based on HTTP method
    const options: RateLimitOptions =
      rateLimitOptions || this.getDefaultLimits(method);

    // Extract user info if available
    const userId = request.user?.userId;
    const tenantId = request.user?.tenantId;

    // Check rate limit
    const decision = await this.arcjetService.checkRateLimit(
      request,
      options,
      userId,
      tenantId,
    );

    if (!decision.allowed) {
      this.logger.warn(
        `Rate limit exceeded: IP=${this.arcjetService.getClientIp(request)} ` +
          `Path=${path} Method=${method} User=${userId || 'anonymous'}`,
      );

      // Set Retry-After header
      if (decision.retryAfter) {
        response.setHeader('Retry-After', decision.retryAfter);
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          error: 'Rate limit exceeded',
          retryAfter: decision.retryAfter || 60,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Get default rate limits based on HTTP method.
   * Read operations (GET) have higher limits than write operations.
   */
  private getDefaultLimits(method: string): RateLimitOptions {
    switch (method.toUpperCase()) {
      case 'GET':
        // Higher limit for read operations
        return { requests: 100, window: '1m' };
      case 'POST':
      case 'PUT':
      case 'PATCH':
      case 'DELETE':
        // Stricter limit for write operations
        return { requests: 30, window: '1m' };
      default:
        return { requests: 60, window: '1m' };
    }
  }
}
