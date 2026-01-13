import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ArcjetService } from '../arcjet.service';
import { BOT_PROTECT_KEY, BotProtectOptions } from '../types';

/**
 * Bot protection guard using Arcjet.
 *
 * This guard analyzes incoming requests to detect and block automated
 * bot traffic. It uses the Arcjet SDK's bot detection capabilities
 * which analyze request patterns, headers, and behavior.
 *
 * The guard only activates when the @BotProtect decorator is applied.
 * Without the decorator, requests pass through without bot checking.
 *
 * Modes:
 * - LIVE: Blocks detected bots (default)
 * - DRY_RUN: Logs bot detections but allows requests through
 *
 * @example
 * @Controller('auth')
 * export class AuthController {
 *   @Post('register')
 *   @UseGuards(BotProtectionGuard)
 *   @BotProtect({ mode: 'LIVE' })
 *   register() {}
 *
 *   @Post('login')
 *   @UseGuards(BotProtectionGuard)
 *   @BotProtect({ allowedBots: ['GOOGLE_CRAWLER'] })
 *   login() {}
 * }
 */
@Injectable()
export class BotProtectionGuard implements CanActivate {
  private readonly logger = new Logger(BotProtectionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly arcjetService: ArcjetService,
  ) {}

  /**
   * Determines if the request should be allowed based on bot detection.
   *
   * @param context - The execution context
   * @returns Promise resolving to true if allowed, throws ForbiddenException if bot detected
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get bot protection options from decorator
    const botOptions = this.reflector.getAllAndOverride<
      BotProtectOptions | undefined
    >(BOT_PROTECT_KEY, [context.getHandler(), context.getClass()]);

    // If no @BotProtect decorator, skip bot checking
    if (!botOptions) {
      return true;
    }

    // If Arcjet is not enabled, allow all requests
    if (!this.arcjetService.isProtectionEnabled()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.arcjetService.getClientIp(request);
    const userAgent = request.headers['user-agent'] || 'unknown';

    // Check for bot activity
    const decision = await this.arcjetService.checkBot(request, botOptions);

    if (!decision.allowed) {
      this.logger.warn(
        `Bot detected: IP=${ip} Path=${request.path} ` +
          `UserAgent=${userAgent.substring(0, 100)}`,
      );

      throw new ForbiddenException({
        statusCode: 403,
        message: 'Request blocked',
        error: 'Forbidden',
      });
    }

    return true;
  }
}
