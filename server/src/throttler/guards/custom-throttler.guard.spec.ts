import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ThrottlerStorage,
  ThrottlerModule,
  ThrottlerException,
} from '@nestjs/throttler';
import { CustomThrottlerGuard } from './custom-throttler.guard';

describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;

  const mockThrottlerStorage = {
    increment: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 10 }],
        }),
      ],
      providers: [
        CustomThrottlerGuard,
        Reflector,
        {
          provide: ThrottlerStorage,
          useValue: mockThrottlerStorage,
        },
      ],
    }).compile();

    guard = module.get<CustomThrottlerGuard>(CustomThrottlerGuard);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getTracker', () => {
    const createMockRequest = (overrides: Record<string, unknown> = {}) => ({
      headers: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      ...overrides,
    });

    it('should return user-based tracker for authenticated requests', async () => {
      const req = createMockRequest({
        user: { userId: 'user-123', tenantId: 'tenant-456' },
      });

      const tracker = await (
        guard as unknown as { getTracker: (req: unknown) => Promise<string> }
      ).getTracker(req);

      expect(tracker).toBe('user:user-123');
    });

    it('should return tenant+IP tracker for tenant context without userId', async () => {
      const req = createMockRequest({
        user: { tenantId: 'tenant-456' },
        ip: '192.168.1.1',
      });

      const tracker = await (
        guard as unknown as { getTracker: (req: unknown) => Promise<string> }
      ).getTracker(req);

      expect(tracker).toBe('tenant:tenant-456:192.168.1.1');
    });

    it('should return IP-based tracker for anonymous requests', async () => {
      const req = createMockRequest({ ip: '192.168.1.100' });

      const tracker = await (
        guard as unknown as { getTracker: (req: unknown) => Promise<string> }
      ).getTracker(req);

      expect(tracker).toBe('ip:192.168.1.100');
    });

    it('should extract IP from CF-Connecting-IP header', async () => {
      const req = createMockRequest({
        headers: { 'cf-connecting-ip': '1.2.3.4' },
        ip: '127.0.0.1',
      });

      const tracker = await (
        guard as unknown as { getTracker: (req: unknown) => Promise<string> }
      ).getTracker(req);

      expect(tracker).toBe('ip:1.2.3.4');
    });

    it('should extract IP from X-Real-IP header', async () => {
      const req = createMockRequest({
        headers: { 'x-real-ip': '5.6.7.8' },
        ip: '127.0.0.1',
      });

      const tracker = await (
        guard as unknown as { getTracker: (req: unknown) => Promise<string> }
      ).getTracker(req);

      expect(tracker).toBe('ip:5.6.7.8');
    });

    it('should extract first IP from X-Forwarded-For header', async () => {
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' },
        ip: '127.0.0.1',
      });

      const tracker = await (
        guard as unknown as { getTracker: (req: unknown) => Promise<string> }
      ).getTracker(req);

      expect(tracker).toBe('ip:10.0.0.1');
    });

    it('should prioritize CF-Connecting-IP over other headers', async () => {
      const req = createMockRequest({
        headers: {
          'cf-connecting-ip': '1.1.1.1',
          'x-real-ip': '2.2.2.2',
          'x-forwarded-for': '3.3.3.3',
        },
        ip: '127.0.0.1',
      });

      const tracker = await (
        guard as unknown as { getTracker: (req: unknown) => Promise<string> }
      ).getTracker(req);

      expect(tracker).toBe('ip:1.1.1.1');
    });

    it('should fall back to socket.remoteAddress when ip is not available', async () => {
      const req = createMockRequest({
        ip: undefined,
        socket: { remoteAddress: '192.168.0.100' },
      });

      const tracker = await (
        guard as unknown as { getTracker: (req: unknown) => Promise<string> }
      ).getTracker(req);

      expect(tracker).toBe('ip:192.168.0.100');
    });
  });

  describe('shouldSkip', () => {
    const createMockContext = (path: string): ExecutionContext =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ path }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      }) as unknown as ExecutionContext;

    it('should skip health check endpoint', async () => {
      const context = createMockContext('/health');

      const shouldSkip = await (
        guard as unknown as {
          shouldSkip: (ctx: ExecutionContext) => Promise<boolean>;
        }
      ).shouldSkip(context);

      expect(shouldSkip).toBe(true);
    });

    it('should skip swagger documentation endpoints', async () => {
      const context = createMockContext('/api/docs');

      const shouldSkip = await (
        guard as unknown as {
          shouldSkip: (ctx: ExecutionContext) => Promise<boolean>;
        }
      ).shouldSkip(context);

      expect(shouldSkip).toBe(true);
    });

    it('should skip nested swagger documentation endpoints', async () => {
      const context = createMockContext('/api/docs/swagger-ui.css');

      const shouldSkip = await (
        guard as unknown as {
          shouldSkip: (ctx: ExecutionContext) => Promise<boolean>;
        }
      ).shouldSkip(context);

      expect(shouldSkip).toBe(true);
    });

    it('should not skip regular API endpoints', async () => {
      const context = createMockContext('/api/products');

      const shouldSkip = await (
        guard as unknown as {
          shouldSkip: (ctx: ExecutionContext) => Promise<boolean>;
        }
      ).shouldSkip(context);

      expect(shouldSkip).toBe(false);
    });

    it('should not skip auth endpoints', async () => {
      const context = createMockContext('/auth/login');

      const shouldSkip = await (
        guard as unknown as {
          shouldSkip: (ctx: ExecutionContext) => Promise<boolean>;
        }
      ).shouldSkip(context);

      expect(shouldSkip).toBe(false);
    });
  });

  describe('throwThrottlingException', () => {
    const createMockContext = (): ExecutionContext =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/products',
            method: 'GET',
            ip: '127.0.0.1',
            headers: {},
            socket: { remoteAddress: '127.0.0.1' },
            user: { userId: 'user-123' },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      }) as unknown as ExecutionContext;

    it('should throw ThrottlerException with retry information', async () => {
      const context = createMockContext();
      const throttlerDetail = {
        limit: 10,
        ttl: 60000,
        key: 'test-key',
        tracker: 'ip:127.0.0.1',
        totalHits: 11,
        timeToExpire: 30000,
        isBlocked: false,
        timeToBlockExpire: 0,
      };

      await expect(
        (
          guard as unknown as {
            throwThrottlingException: (
              ctx: ExecutionContext,
              detail: typeof throttlerDetail,
            ) => Promise<void>;
          }
        ).throwThrottlingException(context, throttlerDetail),
      ).rejects.toThrow(ThrottlerException);
    });

    it('should include retry time in error message', async () => {
      const context = createMockContext();
      const throttlerDetail = {
        limit: 10,
        ttl: 60000,
        key: 'test-key',
        tracker: 'ip:127.0.0.1',
        totalHits: 11,
        timeToExpire: 45000,
        isBlocked: false,
        timeToBlockExpire: 0,
      };

      try {
        await (
          guard as unknown as {
            throwThrottlingException: (
              ctx: ExecutionContext,
              detail: typeof throttlerDetail,
            ) => Promise<void>;
          }
        ).throwThrottlingException(context, throttlerDetail);
        fail('Expected ThrottlerException to be thrown');
      } catch (error) {
        expect((error as Error).message).toContain('45 seconds');
      }
    });
  });
});
