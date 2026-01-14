import { SkipThrottle as NestSkipThrottle } from '@nestjs/throttler';

/**
 * Decorator to skip all throttling for a controller or route.
 *
 * Use sparingly - only for routes that must never be rate limited,
 * such as internal health checks or webhook endpoints.
 *
 * @example
 * ```typescript
 * @SkipThrottle()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const SkipThrottle = () => NestSkipThrottle();