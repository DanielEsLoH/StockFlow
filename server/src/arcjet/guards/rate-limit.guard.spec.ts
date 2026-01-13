import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Request, Response } from 'express';
import { RequestUser } from '../../auth/types';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../types';

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
import { RateLimitGuard } from './rate-limit.guard';
import { ArcjetService } from '../arcjet.service';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: jest.Mocked<Reflector>;
  let arcjetService: jest.Mocked<ArcjetService>;
  let mockResponse: Partial<Response>;

  // Test user
  const testUser: RequestUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    tenantId: 'tenant-123',
  };

  // Helper to create mock execution context
  const createMockContext = (
    user?: RequestUser,
    method = 'GET',
    path = '/api/test',
    headers: Record<string, string> = {},
  ): ExecutionContext => {
    const mockRequest: Partial<Request> = {
      user,
      method,
      path,
      ip: '192.168.1.1',
      headers,
      socket: { remoteAddress: '192.168.1.1' } as never,
    };

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
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

    mockResponse = {
      setHeader: jest.fn(),
    };

    reflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
    } as jest.Mocked<Reflector>;

    arcjetService = {
      isProtectionEnabled: jest.fn(),
      checkRateLimit: jest.fn(),
      getClientIp: jest.fn().mockReturnValue('192.168.1.1'),
    } as unknown as jest.Mocked<ArcjetService>;

    guard = new RateLimitGuard(reflector, arcjetService);

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
    describe('when Arcjet protection is disabled', () => {
      it('should return true and allow all requests', async () => {
        arcjetService.isProtectionEnabled.mockReturnValue(false);
        const context = createMockContext(testUser);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(arcjetService.checkRateLimit).not.toHaveBeenCalled();
      });

      it('should not check for rate limit decorator when disabled', async () => {
        arcjetService.isProtectionEnabled.mockReturnValue(false);
        const context = createMockContext(testUser);

        await guard.canActivate(context);

        // reflector.getAllAndOverride is still called to get options
        // but checkRateLimit is not called since protection is disabled
        expect(arcjetService.checkRateLimit).not.toHaveBeenCalled();
      });
    });

    describe('when Arcjet protection is enabled', () => {
      beforeEach(() => {
        arcjetService.isProtectionEnabled.mockReturnValue(true);
      });

      describe('with @RateLimit decorator', () => {
        it('should use decorator options for rate limiting', async () => {
          const rateLimitOptions: RateLimitOptions = {
            requests: 100,
            window: '1m',
          };
          reflector.getAllAndOverride.mockReturnValue(rateLimitOptions);
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(testUser);
          await guard.canActivate(context);

          expect(arcjetService.checkRateLimit).toHaveBeenCalledWith(
            expect.anything(),
            rateLimitOptions,
            testUser.userId,
            testUser.tenantId,
          );
        });

        it('should pass byUser option to service', async () => {
          const rateLimitOptions: RateLimitOptions = {
            requests: 50,
            window: '1h',
            byUser: true,
          };
          reflector.getAllAndOverride.mockReturnValue(rateLimitOptions);
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(testUser);
          await guard.canActivate(context);

          expect(arcjetService.checkRateLimit).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ byUser: true }),
            testUser.userId,
            testUser.tenantId,
          );
        });

        it('should pass byTenant option to service', async () => {
          const rateLimitOptions: RateLimitOptions = {
            requests: 1000,
            window: '1h',
            byTenant: true,
          };
          reflector.getAllAndOverride.mockReturnValue(rateLimitOptions);
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(testUser);
          await guard.canActivate(context);

          expect(arcjetService.checkRateLimit).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ byTenant: true }),
            testUser.userId,
            testUser.tenantId,
          );
        });

        it('should use reflector with RATE_LIMIT_KEY', async () => {
          reflector.getAllAndOverride.mockReturnValue({
            requests: 100,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(testUser);
          await guard.canActivate(context);

          expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
            RATE_LIMIT_KEY,
            [context.getHandler(), context.getClass()],
          );
        });
      });

      describe('without @RateLimit decorator (default limits)', () => {
        beforeEach(() => {
          reflector.getAllAndOverride.mockReturnValue(undefined);
        });

        it('should apply default 100 req/min limit for GET requests', async () => {
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(testUser, 'GET');
          await guard.canActivate(context);

          expect(arcjetService.checkRateLimit).toHaveBeenCalledWith(
            expect.anything(),
            { requests: 100, window: '1m' },
            testUser.userId,
            testUser.tenantId,
          );
        });

        it('should apply default 30 req/min limit for POST requests', async () => {
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(testUser, 'POST');
          await guard.canActivate(context);

          expect(arcjetService.checkRateLimit).toHaveBeenCalledWith(
            expect.anything(),
            { requests: 30, window: '1m' },
            testUser.userId,
            testUser.tenantId,
          );
        });

        it('should apply default 30 req/min limit for PUT requests', async () => {
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(testUser, 'PUT');
          await guard.canActivate(context);

          expect(arcjetService.checkRateLimit).toHaveBeenCalledWith(
            expect.anything(),
            { requests: 30, window: '1m' },
            testUser.userId,
            testUser.tenantId,
          );
        });

        it('should apply default 30 req/min limit for PATCH requests', async () => {
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(testUser, 'PATCH');
          await guard.canActivate(context);

          expect(arcjetService.checkRateLimit).toHaveBeenCalledWith(
            expect.anything(),
            { requests: 30, window: '1m' },
            testUser.userId,
            testUser.tenantId,
          );
        });

        it('should apply default 30 req/min limit for DELETE requests', async () => {
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(testUser, 'DELETE');
          await guard.canActivate(context);

          expect(arcjetService.checkRateLimit).toHaveBeenCalledWith(
            expect.anything(),
            { requests: 30, window: '1m' },
            testUser.userId,
            testUser.tenantId,
          );
        });

        it('should apply default 60 req/min limit for unknown HTTP methods', async () => {
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(testUser, 'OPTIONS');
          await guard.canActivate(context);

          expect(arcjetService.checkRateLimit).toHaveBeenCalledWith(
            expect.anything(),
            { requests: 60, window: '1m' },
            testUser.userId,
            testUser.tenantId,
          );
        });
      });

      describe('when request is allowed', () => {
        it('should return true when rate limit check passes', async () => {
          reflector.getAllAndOverride.mockReturnValue({
            requests: 100,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(testUser);
          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should not set Retry-After header when allowed', async () => {
          reflector.getAllAndOverride.mockReturnValue({
            requests: 100,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(testUser);
          await guard.canActivate(context);

          expect(mockResponse.setHeader).not.toHaveBeenCalled();
        });
      });

      describe('when rate limit is exceeded', () => {
        it('should throw HttpException with 429 status', async () => {
          reflector.getAllAndOverride.mockReturnValue({
            requests: 10,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: false,
            reason: 'RATE_LIMITED',
            retryAfter: 60,
          });

          const context = createMockContext(testUser);

          await expect(guard.canActivate(context)).rejects.toThrow(
            HttpException,
          );
        });

        it('should throw HttpException with TOO_MANY_REQUESTS status code', async () => {
          reflector.getAllAndOverride.mockReturnValue({
            requests: 10,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: false,
            reason: 'RATE_LIMITED',
            retryAfter: 60,
          });

          const context = createMockContext(testUser);

          try {
            await guard.canActivate(context);
            fail('Expected HttpException to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getStatus()).toBe(
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }
        });

        it('should include error message in response body', async () => {
          reflector.getAllAndOverride.mockReturnValue({
            requests: 10,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: false,
            reason: 'RATE_LIMITED',
            retryAfter: 60,
          });

          const context = createMockContext(testUser);

          try {
            await guard.canActivate(context);
            fail('Expected HttpException to be thrown');
          } catch (error) {
            const response = (error as HttpException).getResponse() as Record<
              string,
              unknown
            >;
            expect(response.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
            expect(response.message).toBe('Too many requests');
            expect(response.error).toBe('Rate limit exceeded');
          }
        });

        it('should include retryAfter in response body', async () => {
          reflector.getAllAndOverride.mockReturnValue({
            requests: 10,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: false,
            reason: 'RATE_LIMITED',
            retryAfter: 120,
          });

          const context = createMockContext(testUser);

          try {
            await guard.canActivate(context);
            fail('Expected HttpException to be thrown');
          } catch (error) {
            const response = (error as HttpException).getResponse() as Record<
              string,
              unknown
            >;
            expect(response.retryAfter).toBe(120);
          }
        });

        it('should set Retry-After header when retryAfter is provided', async () => {
          reflector.getAllAndOverride.mockReturnValue({
            requests: 10,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: false,
            reason: 'RATE_LIMITED',
            retryAfter: 60,
          });

          const context = createMockContext(testUser);

          try {
            await guard.canActivate(context);
          } catch {
            // Expected to throw
          }

          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'Retry-After',
            60,
          );
        });

        it('should use default retryAfter of 60 when not provided', async () => {
          reflector.getAllAndOverride.mockReturnValue({
            requests: 10,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: false,
            reason: 'RATE_LIMITED',
          });

          const context = createMockContext(testUser);

          try {
            await guard.canActivate(context);
            fail('Expected HttpException to be thrown');
          } catch (error) {
            const response = (error as HttpException).getResponse() as Record<
              string,
              unknown
            >;
            expect(response.retryAfter).toBe(60);
          }
        });

        it('should log warning on rate limit violation', async () => {
          const warnSpy = jest.spyOn(Logger.prototype, 'warn');
          reflector.getAllAndOverride.mockReturnValue({
            requests: 10,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: false,
            reason: 'RATE_LIMITED',
            retryAfter: 60,
          });

          const context = createMockContext(testUser, 'POST', '/api/submit');

          try {
            await guard.canActivate(context);
          } catch {
            // Expected to throw
          }

          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Rate limit exceeded'),
          );
        });

        it('should include IP address in log message', async () => {
          const warnSpy = jest.spyOn(Logger.prototype, 'warn');
          reflector.getAllAndOverride.mockReturnValue({
            requests: 10,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: false,
            reason: 'RATE_LIMITED',
          });

          const context = createMockContext(testUser);

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
          reflector.getAllAndOverride.mockReturnValue({
            requests: 10,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: false,
            reason: 'RATE_LIMITED',
          });

          const context = createMockContext(testUser, 'GET', '/api/products');

          try {
            await guard.canActivate(context);
          } catch {
            // Expected to throw
          }

          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Path=/api/products'),
          );
        });

        it('should include method in log message', async () => {
          const warnSpy = jest.spyOn(Logger.prototype, 'warn');
          reflector.getAllAndOverride.mockReturnValue({
            requests: 10,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: false,
            reason: 'RATE_LIMITED',
          });

          const context = createMockContext(testUser, 'POST');

          try {
            await guard.canActivate(context);
          } catch {
            // Expected to throw
          }

          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Method=POST'),
          );
        });

        it('should show "anonymous" when user is not authenticated', async () => {
          const warnSpy = jest.spyOn(Logger.prototype, 'warn');
          reflector.getAllAndOverride.mockReturnValue({
            requests: 10,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: false,
            reason: 'RATE_LIMITED',
          });

          const context = createMockContext(undefined);

          try {
            await guard.canActivate(context);
          } catch {
            // Expected to throw
          }

          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('User=anonymous'),
          );
        });
      });

      describe('with unauthenticated requests', () => {
        it('should pass undefined userId when user is not authenticated', async () => {
          reflector.getAllAndOverride.mockReturnValue({
            requests: 100,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: true,
            reason: 'ALLOWED',
          });

          const context = createMockContext(undefined);
          await guard.canActivate(context);

          expect(arcjetService.checkRateLimit).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            undefined,
            undefined,
          );
        });

        it('should still apply rate limiting for anonymous users', async () => {
          reflector.getAllAndOverride.mockReturnValue({
            requests: 5,
            window: '1m',
          });
          arcjetService.checkRateLimit.mockResolvedValue({
            allowed: false,
            reason: 'RATE_LIMITED',
            retryAfter: 60,
          });

          const context = createMockContext(undefined);

          await expect(guard.canActivate(context)).rejects.toThrow(
            HttpException,
          );
        });
      });
    });

    describe('rate limit decision scenarios', () => {
      beforeEach(() => {
        arcjetService.isProtectionEnabled.mockReturnValue(true);
        reflector.getAllAndOverride.mockReturnValue({
          requests: 100,
          window: '1m',
        });
      });

      it('should handle ALLOWED decision', async () => {
        arcjetService.checkRateLimit.mockResolvedValue({
          allowed: true,
          reason: 'ALLOWED',
        });

        const context = createMockContext(testUser);
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should handle DISABLED decision (pass through)', async () => {
        arcjetService.checkRateLimit.mockResolvedValue({
          allowed: true,
          reason: 'DISABLED',
        });

        const context = createMockContext(testUser);
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should handle ERROR decision (graceful degradation)', async () => {
        arcjetService.checkRateLimit.mockResolvedValue({
          allowed: true,
          reason: 'ERROR',
          details: 'Network timeout',
        });

        const context = createMockContext(testUser);
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should handle RATE_LIMITED decision', async () => {
        arcjetService.checkRateLimit.mockResolvedValue({
          allowed: false,
          reason: 'RATE_LIMITED',
          retryAfter: 30,
          details: 'Rate limit exceeded: Fixed window',
        });

        const context = createMockContext(testUser);

        await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      });
    });

    describe('edge cases', () => {
      beforeEach(() => {
        arcjetService.isProtectionEnabled.mockReturnValue(true);
      });

      it('should handle request with no path', async () => {
        reflector.getAllAndOverride.mockReturnValue({
          requests: 100,
          window: '1m',
        });
        arcjetService.checkRateLimit.mockResolvedValue({
          allowed: true,
          reason: 'ALLOWED',
        });

        const context = createMockContext(testUser, 'GET', '');
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should handle lowercase HTTP methods', async () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        arcjetService.checkRateLimit.mockResolvedValue({
          allowed: true,
          reason: 'ALLOWED',
        });

        const context = createMockContext(testUser, 'get');
        await guard.canActivate(context);

        // Default limits are applied based on uppercase method
        expect(arcjetService.checkRateLimit).toHaveBeenCalledWith(
          expect.anything(),
          { requests: 100, window: '1m' },
          testUser.userId,
          testUser.tenantId,
        );
      });

      it('should handle very short rate limit windows', async () => {
        reflector.getAllAndOverride.mockReturnValue({
          requests: 5,
          window: '1s',
        });
        arcjetService.checkRateLimit.mockResolvedValue({
          allowed: true,
          reason: 'ALLOWED',
        });

        const context = createMockContext(testUser);
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(arcjetService.checkRateLimit).toHaveBeenCalledWith(
          expect.anything(),
          { requests: 5, window: '1s' },
          testUser.userId,
          testUser.tenantId,
        );
      });

      it('should handle very long rate limit windows', async () => {
        reflector.getAllAndOverride.mockReturnValue({
          requests: 10000,
          window: '1d',
        });
        arcjetService.checkRateLimit.mockResolvedValue({
          allowed: true,
          reason: 'ALLOWED',
        });

        const context = createMockContext(testUser);
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(arcjetService.checkRateLimit).toHaveBeenCalledWith(
          expect.anything(),
          { requests: 10000, window: '1d' },
          testUser.userId,
          testUser.tenantId,
        );
      });
    });
  });
});
