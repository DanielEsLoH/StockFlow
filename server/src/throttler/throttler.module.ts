import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule as NestThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { CustomThrottlerGuard } from './guards';
import { THROTTLE_CONFIG } from './throttler.constants';

/**
 * ThrottlerModule provides global rate limiting for the application.
 *
 * This module integrates @nestjs/throttler with custom configuration
 * to provide multiple throttling tiers:
 *
 * 1. **Default**: General rate limit for all API endpoints (100 req/min)
 * 2. **Auth**: Stricter limits for authentication endpoints (5 login/15min)
 * 3. **Heavy**: Limits for resource-intensive operations (uploads, reports)
 *
 * The module works alongside Arcjet for comprehensive rate limiting:
 * - @nestjs/throttler: Fast, in-memory rate limiting with Redis support
 * - Arcjet: Advanced protection with bot detection, shield, and analytics
 *
 * Features:
 * - Global guard applied to all routes
 * - Custom tracker supporting user/tenant/IP based limiting
 * - Skip support for health check and documentation endpoints
 * - Detailed logging for security monitoring
 * - Works with Redis when available for distributed systems
 *
 * @see THROTTLE_CONFIG for configuration values
 * @see CustomThrottlerGuard for implementation details
 */
@Global()
@Module({
  imports: [
    NestThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';

        return {
          throttlers: [
            {
              name: 'default',
              ttl: THROTTLE_CONFIG.DEFAULT.ttl * 1000, // Convert to milliseconds
              limit: isProduction
                ? THROTTLE_CONFIG.DEFAULT.limit
                : THROTTLE_CONFIG.DEFAULT.limit * 10, // More lenient in dev
            },
          ],
          // Custom error message
          errorMessage: 'Too many requests. Please try again later.',
          // Skip throttling in certain conditions (handled by guard)
          skipIf: () => false,
          // Ignore user agent for tracking (use our custom tracker)
          ignoreUserAgents: [],
        };
      },
    }),
  ],
  providers: [
    // Apply CustomThrottlerGuard globally to all routes
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
  exports: [NestThrottlerModule],
})
export class ThrottlerModule {}