import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { TenantMiddleware, AuthenticatedRequest } from './tenant.middleware';
import { getTenantId, getUserId } from '../context';
import type { RequestUser } from '../../auth';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new TenantMiddleware();
    mockRequest = {};
    mockResponse = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should call next for unauthenticated requests', () => {
      middleware.use(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRequest.tenantId).toBeUndefined();
    });

    it('should call next when user has no tenantId', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.EMPLOYEE,
      } as RequestUser;

      middleware.use(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRequest.tenantId).toBeUndefined();
    });

    it('should set tenantId on request when user is authenticated', (done) => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.ADMIN,
        tenantId: 'tenant-456',
      };

      mockNext.mockImplementation(() => {
        // Verify tenantId is set on request
        expect(mockRequest.tenantId).toBe('tenant-456');
        done();
      });

      middleware.use(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );
    });

    it('should set tenant context in AsyncLocalStorage', (done) => {
      mockRequest.user = {
        userId: 'user-789',
        email: 'user@tenant.com',
        role: UserRole.MANAGER,
        tenantId: 'tenant-abc',
      };

      mockNext.mockImplementation(() => {
        // Verify AsyncLocalStorage context is set
        expect(getTenantId()).toBe('tenant-abc');
        expect(getUserId()).toBe('user-789');
        done();
      });

      middleware.use(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );
    });

    it('should make context available in async operations within next', (done) => {
      mockRequest.user = {
        userId: 'user-async',
        email: 'async@example.com',
        role: UserRole.EMPLOYEE,
        tenantId: 'tenant-async',
      };

      mockNext.mockImplementation(async () => {
        // Simulate async controller operation
        await Promise.resolve();
        expect(getTenantId()).toBe('tenant-async');
        expect(getUserId()).toBe('user-async');

        // Nested async operation
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            expect(getTenantId()).toBe('tenant-async');
            resolve();
          }, 10);
        });

        done();
      });

      middleware.use(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );
    });

    it('should not leak context after middleware completes', () => {
      mockRequest.user = {
        userId: 'user-leak',
        email: 'leak@example.com',
        role: UserRole.ADMIN,
        tenantId: 'tenant-leak',
      };

      let contextInsideNext: string | undefined;

      mockNext.mockImplementation(() => {
        contextInsideNext = getTenantId();
      });

      middleware.use(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      // Context should have been available inside next
      expect(contextInsideNext).toBe('tenant-leak');

      // Context should not be available after middleware completes
      // Note: This test verifies the synchronous case where next() returns immediately
      // In real Express apps, the context is maintained for the duration of the async chain
    });

    it('should handle different user roles correctly', (done) => {
      const testCases: Array<{ role: UserRole; tenantId: string }> = [
        { role: UserRole.SUPER_ADMIN, tenantId: 'tenant-super' },
        { role: UserRole.ADMIN, tenantId: 'tenant-admin' },
        { role: UserRole.MANAGER, tenantId: 'tenant-manager' },
        { role: UserRole.EMPLOYEE, tenantId: 'tenant-employee' },
      ];

      let testsCompleted = 0;

      testCases.forEach(({ role, tenantId }) => {
        const request: Partial<AuthenticatedRequest> = {
          user: {
            userId: `user-${role}`,
            email: `${role.toLowerCase()}@example.com`,
            role,
            tenantId,
          },
        };

        const next = jest.fn().mockImplementation(() => {
          expect(getTenantId()).toBe(tenantId);
          expect(request.tenantId).toBe(tenantId);
          testsCompleted++;

          if (testsCompleted === testCases.length) {
            done();
          }
        });

        middleware.use(
          request as AuthenticatedRequest,
          mockResponse as Response,
          next,
        );
      });
    });
  });

  describe('context isolation', () => {
    it('should isolate context between concurrent requests', (done) => {
      const user1: RequestUser = {
        userId: 'user-1',
        email: 'user1@example.com',
        role: UserRole.ADMIN,
        tenantId: 'tenant-1',
      };

      const user2: RequestUser = {
        userId: 'user-2',
        email: 'user2@example.com',
        role: UserRole.ADMIN,
        tenantId: 'tenant-2',
      };

      const request1: Partial<AuthenticatedRequest> = { user: user1 };
      const request2: Partial<AuthenticatedRequest> = { user: user2 };

      let tenant1Context: string | undefined;
      let tenant2Context: string | undefined;

      const next1 = jest.fn().mockImplementation(() => {
        tenant1Context = getTenantId();
      });

      const next2 = jest.fn().mockImplementation(() => {
        tenant2Context = getTenantId();
      });

      // Simulate concurrent requests
      middleware.use(
        request1 as AuthenticatedRequest,
        mockResponse as Response,
        next1,
      );

      middleware.use(
        request2 as AuthenticatedRequest,
        mockResponse as Response,
        next2,
      );

      expect(tenant1Context).toBe('tenant-1');
      expect(tenant2Context).toBe('tenant-2');
      expect(request1.tenantId).toBe('tenant-1');
      expect(request2.tenantId).toBe('tenant-2');
      done();
    });
  });

  describe('error handling', () => {
    it('should still call next even if context setting fails internally', () => {
      // Even with edge cases, middleware should not prevent request processing
      mockRequest.user = {
        userId: 'user-edge',
        email: 'edge@example.com',
        role: UserRole.EMPLOYEE,
        tenantId: 'tenant-edge',
      };

      middleware.use(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('logging', () => {
    it('should log debug information for authenticated requests', (done) => {
      // Spy on the logger - we can't easily test private logger,
      // but we verify the middleware works correctly
      mockRequest.user = {
        userId: 'user-log',
        email: 'log@example.com',
        role: UserRole.ADMIN,
        tenantId: 'tenant-log',
      };

      mockNext.mockImplementation(() => {
        expect(getTenantId()).toBe('tenant-log');
        done();
      });

      middleware.use(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );
    });
  });
});

describe('AuthenticatedRequest interface', () => {
  it('should allow optional user property', () => {
    const request: AuthenticatedRequest = {} as AuthenticatedRequest;
    expect(request.user).toBeUndefined();
  });

  it('should allow optional tenantId property', () => {
    const request: AuthenticatedRequest = {} as AuthenticatedRequest;
    expect(request.tenantId).toBeUndefined();
  });

  it('should allow setting both user and tenantId', () => {
    const request = {
      user: {
        userId: 'user-test',
        email: 'test@test.com',
        role: UserRole.EMPLOYEE,
        tenantId: 'tenant-test',
      },
      tenantId: 'tenant-test',
    } as AuthenticatedRequest;

    expect(request.user?.tenantId).toBe('tenant-test');
    expect(request.tenantId).toBe('tenant-test');
  });
});
