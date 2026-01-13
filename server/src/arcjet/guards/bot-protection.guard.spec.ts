import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { ArcjetWellKnownBot } from '@arcjet/node';
import { BOT_PROTECT_KEY, BotProtectOptions } from '../types';

// Mock the @arcjet/node module before importing anything that depends on it
jest.mock('@arcjet/node', () => ({
  __esModule: true,
  default: jest.fn(),
  detectBot: jest.fn(),
  fixedWindow: jest.fn(),
  shield: jest.fn(),
  slidingWindow: jest.fn(),
  tokenBucket: jest.fn(),
}));

// Now import the modules that depend on @arcjet/node
import { BotProtectionGuard } from './bot-protection.guard';
import { ArcjetService } from '../arcjet.service';

describe('BotProtectionGuard', () => {
  let guard: BotProtectionGuard;
  let reflector: jest.Mocked<Reflector>;
  let arcjetService: jest.Mocked<ArcjetService>;

  // Helper to create mock execution context
  const createMockContext = (
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    path = '/api/test',
    method = 'POST',
    headers: Record<string, string> = {},
  ): ExecutionContext => {
    const mockRequest: Partial<Request> = {
      method,
      path,
      ip: '192.168.1.1',
      headers: {
        'user-agent': userAgent,
        ...headers,
      },
      socket: { remoteAddress: '192.168.1.1' } as never,
    };

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as ExecutionContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    reflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
    } as jest.Mocked<Reflector>;

    arcjetService = {
      isProtectionEnabled: jest.fn(),
      checkBot: jest.fn(),
      getClientIp: jest.fn().mockReturnValue('192.168.1.1'),
    } as unknown as jest.Mocked<ArcjetService>;

    guard = new BotProtectionGuard(reflector, arcjetService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });
  });

  describe('canActivate', () => {
    describe('when @BotProtect decorator is not present', () => {
      it('should return true and skip bot checking', async () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        const context = createMockContext();

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(arcjetService.checkBot).not.toHaveBeenCalled();
      });

      it('should not call isProtectionEnabled when no decorator', async () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        const context = createMockContext();

        await guard.canActivate(context);

        expect(arcjetService.isProtectionEnabled).not.toHaveBeenCalled();
      });
    });

    describe('when Arcjet protection is disabled', () => {
      it('should return true and allow all requests', async () => {
        reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
        arcjetService.isProtectionEnabled.mockReturnValue(false);
        const context = createMockContext();

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(arcjetService.checkBot).not.toHaveBeenCalled();
      });
    });

    describe('when Arcjet protection is enabled with @BotProtect decorator', () => {
      beforeEach(() => {
        arcjetService.isProtectionEnabled.mockReturnValue(true);
      });

      describe('reflector usage', () => {
        it('should use reflector with BOT_PROTECT_KEY', async () => {
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext();
          await guard.canActivate(context);

          expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
            BOT_PROTECT_KEY,
            [context.getHandler(), context.getClass()],
          );
        });
      });

      describe('with LIVE mode', () => {
        const liveOptions: BotProtectOptions = { mode: 'LIVE' };

        it('should pass LIVE mode options to arcjetService', async () => {
          reflector.getAllAndOverride.mockReturnValue(liveOptions);
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext();
          await guard.canActivate(context);

          expect(arcjetService.checkBot).toHaveBeenCalledWith(
            expect.anything(),
            liveOptions,
          );
        });

        it('should return true for legitimate traffic', async () => {
          reflector.getAllAndOverride.mockReturnValue(liveOptions);
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext();
          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should throw ForbiddenException when bot is detected', async () => {
          reflector.getAllAndOverride.mockReturnValue(liveOptions);
          arcjetService.checkBot.mockResolvedValue({
            allowed: false,
            reason: 'BOT_DETECTED',
            details: 'Suspicious automation pattern detected',
          });

          const context = createMockContext('curl/7.68.0');

          await expect(guard.canActivate(context)).rejects.toThrow(
            ForbiddenException,
          );
        });

        it('should throw ForbiddenException with 403 status code', async () => {
          reflector.getAllAndOverride.mockReturnValue(liveOptions);
          arcjetService.checkBot.mockResolvedValue({
            allowed: false,
            reason: 'BOT_DETECTED',
          });

          const context = createMockContext('python-requests/2.25.1');

          try {
            await guard.canActivate(context);
            fail('Expected ForbiddenException to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenException);
            const response = (
              error as ForbiddenException
            ).getResponse() as Record<string, unknown>;
            expect(response.statusCode).toBe(403);
          }
        });

        it('should include proper error message in response', async () => {
          reflector.getAllAndOverride.mockReturnValue(liveOptions);
          arcjetService.checkBot.mockResolvedValue({
            allowed: false,
            reason: 'BOT_DETECTED',
          });

          const context = createMockContext('Scrapy/2.5.0');

          try {
            await guard.canActivate(context);
            fail('Expected ForbiddenException to be thrown');
          } catch (error) {
            const response = (
              error as ForbiddenException
            ).getResponse() as Record<string, unknown>;
            expect(response.message).toBe('Request blocked');
            expect(response.error).toBe('Forbidden');
          }
        });
      });

      describe('with DRY_RUN mode', () => {
        const dryRunOptions: BotProtectOptions = { mode: 'DRY_RUN' };

        it('should pass DRY_RUN mode options to arcjetService', async () => {
          reflector.getAllAndOverride.mockReturnValue(dryRunOptions);
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext();
          await guard.canActivate(context);

          expect(arcjetService.checkBot).toHaveBeenCalledWith(
            expect.anything(),
            dryRunOptions,
          );
        });

        it('should return true for legitimate traffic', async () => {
          reflector.getAllAndOverride.mockReturnValue(dryRunOptions);
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext();
          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should allow bot detection result to pass through when allowed is true', async () => {
          reflector.getAllAndOverride.mockReturnValue(dryRunOptions);
          // In DRY_RUN mode, even if bot is detected, service returns allowed: true
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'BOT_DETECTED',
            details: 'Bot detected but allowed in DRY_RUN mode',
          });

          const context = createMockContext('curl/7.68.0');
          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });
      });

      describe('with allowedBots configuration', () => {
        it('should pass allowed bots list to arcjetService', async () => {
          const optionsWithAllowedBots: BotProtectOptions = {
            mode: 'LIVE',
            allowedBots: [
              'GOOGLE_CRAWLER',
              'BING_CRAWLER',
            ] as ArcjetWellKnownBot[],
          };
          reflector.getAllAndOverride.mockReturnValue(optionsWithAllowedBots);
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext('Googlebot/2.1');
          await guard.canActivate(context);

          expect(arcjetService.checkBot).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              allowedBots: [
                'GOOGLE_CRAWLER',
                'BING_CRAWLER',
              ] as ArcjetWellKnownBot[],
            }),
          );
        });

        it('should allow whitelisted search engine bots', async () => {
          const optionsWithAllowedBots: BotProtectOptions = {
            mode: 'LIVE',
            allowedBots: ['GOOGLE_CRAWLER'] as ArcjetWellKnownBot[],
          };
          reflector.getAllAndOverride.mockReturnValue(optionsWithAllowedBots);
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(
            'Mozilla/5.0 (compatible; Googlebot/2.1; +https://www.google.com/bot.html)',
          );
          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should pass empty allowedBots array when not specified', async () => {
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext();
          await guard.canActivate(context);

          expect(arcjetService.checkBot).toHaveBeenCalledWith(
            expect.anything(),
            { mode: 'LIVE' },
          );
        });
      });

      describe('logging behavior', () => {
        it('should log warning when bot is detected and blocked', async () => {
          const warnSpy = jest.spyOn(Logger.prototype, 'warn');
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
          arcjetService.checkBot.mockResolvedValue({
            allowed: false,
            reason: 'BOT_DETECTED',
          });

          const context = createMockContext(
            'malicious-bot/1.0',
            '/api/register',
          );

          try {
            await guard.canActivate(context);
          } catch {
            // Expected to throw
          }

          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Bot detected'),
          );
        });

        it('should include IP address in log message', async () => {
          const warnSpy = jest.spyOn(Logger.prototype, 'warn');
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
          arcjetService.checkBot.mockResolvedValue({
            allowed: false,
            reason: 'BOT_DETECTED',
          });

          const context = createMockContext('bot/1.0');

          try {
            await guard.canActivate(context);
          } catch {
            // Expected to throw
          }

          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('IP=192.168.1.1'),
          );
        });

        it('should include path in log message', async () => {
          const warnSpy = jest.spyOn(Logger.prototype, 'warn');
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
          arcjetService.checkBot.mockResolvedValue({
            allowed: false,
            reason: 'BOT_DETECTED',
          });

          const context = createMockContext('bot/1.0', '/api/auth/login');

          try {
            await guard.canActivate(context);
          } catch {
            // Expected to throw
          }

          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Path=/api/auth/login'),
          );
        });

        it('should include truncated user agent in log message', async () => {
          const warnSpy = jest.spyOn(Logger.prototype, 'warn');
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
          arcjetService.checkBot.mockResolvedValue({
            allowed: false,
            reason: 'BOT_DETECTED',
          });

          const longUserAgent = 'A'.repeat(200);
          const context = createMockContext(longUserAgent);

          try {
            await guard.canActivate(context);
          } catch {
            // Expected to throw
          }

          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('UserAgent=' + 'A'.repeat(100)),
          );
        });

        it('should not log when request is allowed', async () => {
          const warnSpy = jest.spyOn(Logger.prototype, 'warn');
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext();
          await guard.canActivate(context);

          expect(warnSpy).not.toHaveBeenCalled();
        });
      });

      describe('bot decision scenarios', () => {
        it('should handle ALLOWED decision', async () => {
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext();
          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should handle DISABLED decision (pass through)', async () => {
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'DISABLED',
          });

          const context = createMockContext();
          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should handle ERROR decision (graceful degradation)', async () => {
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ERROR',
            details: 'Bot detection service unavailable',
          });

          const context = createMockContext();
          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should handle BOT_DETECTED decision with block', async () => {
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
          arcjetService.checkBot.mockResolvedValue({
            allowed: false,
            reason: 'BOT_DETECTED',
            details: 'Headless browser detected',
          });

          const context = createMockContext('HeadlessChrome/91.0.4472.124');

          await expect(guard.canActivate(context)).rejects.toThrow(
            ForbiddenException,
          );
        });
      });

      describe('edge cases', () => {
        it('should handle missing user-agent header', async () => {
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          // Create context with empty user-agent
          const mockRequest: Partial<Request> = {
            method: 'POST',
            path: '/api/test',
            ip: '192.168.1.1',
            headers: {},
            socket: { remoteAddress: '192.168.1.1' } as never,
          };

          const context = {
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: jest.fn().mockReturnValue({
              getRequest: jest.fn().mockReturnValue(mockRequest),
              getResponse: jest.fn().mockReturnValue({}),
            }),
            getArgs: jest.fn(),
            getArgByIndex: jest.fn(),
            switchToRpc: jest.fn(),
            switchToWs: jest.fn(),
            getType: jest.fn(),
          } as ExecutionContext;

          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should handle log with unknown user-agent when header is missing', async () => {
          const warnSpy = jest.spyOn(Logger.prototype, 'warn');
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
          arcjetService.checkBot.mockResolvedValue({
            allowed: false,
            reason: 'BOT_DETECTED',
          });

          const mockRequest: Partial<Request> = {
            method: 'POST',
            path: '/api/test',
            ip: '192.168.1.1',
            headers: {},
            socket: { remoteAddress: '192.168.1.1' } as never,
          };

          const context = {
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: jest.fn().mockReturnValue({
              getRequest: jest.fn().mockReturnValue(mockRequest),
              getResponse: jest.fn().mockReturnValue({}),
            }),
            getArgs: jest.fn(),
            getArgByIndex: jest.fn(),
            switchToRpc: jest.fn(),
            switchToWs: jest.fn(),
            getType: jest.fn(),
          } as ExecutionContext;

          try {
            await guard.canActivate(context);
          } catch {
            // Expected to throw
          }

          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('UserAgent=unknown'),
          );
        });

        it('should handle empty allowedBots array', async () => {
          reflector.getAllAndOverride.mockReturnValue({
            mode: 'LIVE',
            allowedBots: [],
          });
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext();
          const result = await guard.canActivate(context);

          expect(result).toBe(true);
          expect(arcjetService.checkBot).toHaveBeenCalledWith(
            expect.anything(),
            { mode: 'LIVE', allowedBots: [] },
          );
        });

        it('should handle multiple allowed bots', async () => {
          const manyBots: BotProtectOptions = {
            mode: 'LIVE',
            allowedBots: [
              'GOOGLE_CRAWLER',
              'BING_CRAWLER',
              'SLACK_LINK_UNFURLER',
              'TWITTER_CRAWLER',
              'FACEBOOK_CRAWLER',
            ] as ArcjetWellKnownBot[],
          };
          reflector.getAllAndOverride.mockReturnValue(manyBots);
          arcjetService.checkBot.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext('Slackbot-LinkExpanding 1.0');
          const result = await guard.canActivate(context);

          expect(result).toBe(true);
          expect(arcjetService.checkBot).toHaveBeenCalledWith(
            expect.anything(),
            manyBots,
          );
        });
      });

      describe('common bot user agents', () => {
        beforeEach(() => {
          reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
        });

        it.each([
          [
            'legitimate browser',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
            true,
          ],
          [
            'legitimate mobile',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6) Safari/604.1',
            true,
          ],
        ])('should handle %s user agent', async (_, userAgent, shouldAllow) => {
          arcjetService.checkBot.mockResolvedValue({
            allowed: shouldAllow,
            reason: shouldAllow ? 'ALLOWED' : 'BOT_DETECTED',
          });

          const context = createMockContext(userAgent);

          if (shouldAllow) {
            const result = await guard.canActivate(context);
            expect(result).toBe(true);
          } else {
            await expect(guard.canActivate(context)).rejects.toThrow(
              ForbiddenException,
            );
          }
        });

        it.each([
          ['curl', 'curl/7.68.0'],
          ['python requests', 'python-requests/2.25.1'],
          ['scrapy', 'Scrapy/2.5.0'],
          ['headless chrome', 'HeadlessChrome/91.0.4472.124'],
          ['selenium', 'Selenium/4.0.0'],
        ])('should block %s when detected as bot', async (_, userAgent) => {
          arcjetService.checkBot.mockResolvedValue({
            allowed: false,
            reason: 'BOT_DETECTED',
          });

          const context = createMockContext(userAgent);

          await expect(guard.canActivate(context)).rejects.toThrow(
            ForbiddenException,
          );
        });
      });
    });

    describe('decorator default options', () => {
      it('should work with default BotProtect options (empty object)', async () => {
        // When @BotProtect() is used without arguments, it defaults to { mode: 'LIVE' }
        reflector.getAllAndOverride.mockReturnValue({ mode: 'LIVE' });
        arcjetService.isProtectionEnabled.mockReturnValue(true);
        arcjetService.checkBot.mockResolvedValue({
          allowed: true,
          reason: 'ALLOWED',
        });

        const context = createMockContext();
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(arcjetService.checkBot).toHaveBeenCalledWith(expect.anything(), {
          mode: 'LIVE',
        });
      });
    });
  });
});
