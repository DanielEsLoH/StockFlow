import { SetMetadata } from '@nestjs/common';
import { BotProtectOptions, BOT_PROTECT_KEY } from '../types';

/**
 * Bot protection decorator for controller methods.
 *
 * Apply this decorator to endpoints that should be protected from automated
 * bot access. By default, operates in LIVE mode which blocks detected bots.
 * Use DRY_RUN mode to log bot detections without blocking (useful for testing).
 *
 * Common Allowed Bots:
 * - 'GOOGLE_CRAWLER' - Google search crawler
 * - 'BING_CRAWLER' - Microsoft Bing crawler
 * - 'SLACK_LINK_UNFURLER' - Slack link preview
 * - 'TWITTER_CRAWLER' - Twitter card preview
 * - 'FACEBOOK_CRAWLER' - Facebook link preview
 *
 * @example
 * // Basic bot protection
 * @BotProtect()
 * @Post('register')
 * register() {}
 *
 * @example
 * // Allow search engine bots
 * @BotProtect({ allowedBots: ['GOOGLE_CRAWLER', 'BING_CRAWLER'] })
 * @Get('public-page')
 * publicPage() {}
 *
 * @example
 * // Dry run mode for testing
 * @BotProtect({ mode: 'DRY_RUN' })
 * @Post('contact')
 * contact() {}
 *
 * @param options - Bot protection configuration options
 */
export const BotProtect = (options: BotProtectOptions = {}) =>
  SetMetadata(BOT_PROTECT_KEY, { mode: 'LIVE', ...options });
