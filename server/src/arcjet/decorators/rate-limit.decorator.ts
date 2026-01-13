import { SetMetadata } from '@nestjs/common';
import { RateLimitOptions, RATE_LIMIT_KEY } from '../types';

/**
 * Rate limiting decorator for controller methods.
 *
 * Apply this decorator to endpoints that need rate limiting protection.
 * The rate limit is enforced per IP by default, but can be configured
 * to also consider user ID or tenant ID for authenticated requests.
 *
 * Rate Limit Window Formats:
 * - 's' for seconds (e.g., '30s')
 * - 'm' for minutes (e.g., '15m')
 * - 'h' for hours (e.g., '1h')
 * - 'd' for days (e.g., '1d')
 *
 * @example
 * // Basic rate limit: 100 requests per minute per IP
 * @RateLimit({ requests: 100, window: '1m' })
 * @Get('products')
 * findAll() {}
 *
 * @example
 * // Strict rate limit for auth: 5 requests per 15 minutes per IP
 * @RateLimit({ requests: 5, window: '15m' })
 * @Post('login')
 * login() {}
 *
 * @example
 * // User-based rate limit: 20 requests per hour per user
 * @RateLimit({ requests: 20, window: '1h', byUser: true })
 * @Post('upload')
 * upload() {}
 *
 * @example
 * // Tenant-based rate limit for bulk operations
 * @RateLimit({ requests: 10, window: '1h', byTenant: true })
 * @Post('bulk-import')
 * bulkImport() {}
 *
 * @param options - Rate limiting configuration options
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
