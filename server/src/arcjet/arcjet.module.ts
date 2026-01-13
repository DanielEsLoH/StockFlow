import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArcjetService } from './arcjet.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { BotProtectionGuard } from './guards/bot-protection.guard';

/**
 * ArcjetModule provides security features including:
 * - Rate limiting (fixed window, sliding window, token bucket)
 * - Bot protection and detection
 * - Shield protection against common attacks
 *
 * This module is marked as @Global() so its providers are available
 * throughout the application without needing to import the module.
 *
 * Configuration:
 * - ARCJET_KEY: API key from https://app.arcjet.com
 * - ARCJET_ENABLED: Set to 'false' to disable (default: 'true')
 *
 * Usage:
 * The module exports ArcjetService for direct usage and guards
 * for declarative security.
 *
 * @example
 * // Using guards with decorators
 * @Controller('api')
 * @UseGuards(RateLimitGuard)
 * export class ApiController {
 *   @Get('data')
 *   @RateLimit({ requests: 100, window: '1m' })
 *   getData() {}
 *
 *   @Post('submit')
 *   @UseGuards(BotProtectionGuard)
 *   @BotProtect({ mode: 'LIVE' })
 *   submit() {}
 * }
 *
 * @example
 * // Using service directly
 * @Injectable()
 * export class MyService {
 *   constructor(private arcjet: ArcjetService) {}
 *
 *   async processRequest(req: Request) {
 *     const decision = await this.arcjet.checkRateLimit(req, {
 *       requests: 10,
 *       window: '1h',
 *     });
 *     if (!decision.allowed) {
 *       throw new TooManyRequestsException();
 *     }
 *   }
 * }
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [ArcjetService, RateLimitGuard, BotProtectionGuard],
  exports: [ArcjetService, RateLimitGuard, BotProtectionGuard],
})
export class ArcjetModule {}
