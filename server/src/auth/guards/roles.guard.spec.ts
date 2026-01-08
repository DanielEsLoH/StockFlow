import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { RequestUser } from '../types';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  // Helper to create mock execution context with a user
  const createMockContext = (user?: RequestUser): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as ExecutionContext;
  };

  // Test users with different roles
  const createTestUser = (role: UserRole): RequestUser => ({
    userId: 'user-123',
    email: 'test@example.com',
    role,
    tenantId: 'tenant-123',
  });

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
    } as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });
  });

  describe('canActivate', () => {
    describe('when no roles are required', () => {
      it('should return true when requiredRoles is undefined', () => {
        const context = createMockContext(createTestUser(UserRole.EMPLOYEE));
        reflector.getAllAndOverride.mockReturnValue(undefined);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should return true when requiredRoles is null', () => {
        const context = createMockContext(createTestUser(UserRole.EMPLOYEE));
        reflector.getAllAndOverride.mockReturnValue(null);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should return true when requiredRoles is empty array', () => {
        const context = createMockContext(createTestUser(UserRole.EMPLOYEE));
        reflector.getAllAndOverride.mockReturnValue([]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('when roles are required', () => {
      it('should return true when user has the required role', () => {
        const context = createMockContext(createTestUser(UserRole.ADMIN));
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should return true when user has one of multiple allowed roles', () => {
        const context = createMockContext(createTestUser(UserRole.MANAGER));
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.ADMIN,
          UserRole.MANAGER,
        ]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should return false when user does not have any required role', () => {
        const context = createMockContext(createTestUser(UserRole.EMPLOYEE));
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.ADMIN,
          UserRole.MANAGER,
        ]);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });

      it('should return false when user is undefined', () => {
        const context = createMockContext(undefined);
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });
    });

    describe('role-specific tests', () => {
      it('should allow SUPER_ADMIN when SUPER_ADMIN is required', () => {
        const context = createMockContext(createTestUser(UserRole.SUPER_ADMIN));
        reflector.getAllAndOverride.mockReturnValue([UserRole.SUPER_ADMIN]);

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should deny ADMIN when only SUPER_ADMIN is required', () => {
        const context = createMockContext(createTestUser(UserRole.ADMIN));
        reflector.getAllAndOverride.mockReturnValue([UserRole.SUPER_ADMIN]);

        expect(guard.canActivate(context)).toBe(false);
      });

      it('should allow ADMIN when ADMIN is required', () => {
        const context = createMockContext(createTestUser(UserRole.ADMIN));
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should allow MANAGER when MANAGER is required', () => {
        const context = createMockContext(createTestUser(UserRole.MANAGER));
        reflector.getAllAndOverride.mockReturnValue([UserRole.MANAGER]);

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should allow EMPLOYEE when EMPLOYEE is required', () => {
        const context = createMockContext(createTestUser(UserRole.EMPLOYEE));
        reflector.getAllAndOverride.mockReturnValue([UserRole.EMPLOYEE]);

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should deny EMPLOYEE when only ADMIN and MANAGER are allowed', () => {
        const context = createMockContext(createTestUser(UserRole.EMPLOYEE));
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.ADMIN,
          UserRole.MANAGER,
        ]);

        expect(guard.canActivate(context)).toBe(false);
      });
    });

    describe('reflector usage', () => {
      it('should check roles from both handler and class', () => {
        const context = createMockContext(createTestUser(UserRole.ADMIN));
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        guard.canActivate(context);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
          context.getHandler(),
          context.getClass(),
        ]);
      });

      it('should use handler-level roles when both handler and class have roles', () => {
        // getAllAndOverride returns the first found (handler takes precedence)
        const context = createMockContext(createTestUser(UserRole.MANAGER));
        reflector.getAllAndOverride.mockReturnValue([UserRole.MANAGER]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle single role requirement', () => {
        const context = createMockContext(createTestUser(UserRole.SUPER_ADMIN));
        reflector.getAllAndOverride.mockReturnValue([UserRole.SUPER_ADMIN]);

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should handle all roles being allowed', () => {
        const context = createMockContext(createTestUser(UserRole.EMPLOYEE));
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.MANAGER,
          UserRole.EMPLOYEE,
        ]);

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should handle user with null role', () => {
        const userWithNullRole = {
          userId: 'user-123',
          email: 'test@example.com',
          role: null as unknown as UserRole,
          tenantId: 'tenant-123',
        };
        const context = createMockContext(userWithNullRole);
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        expect(guard.canActivate(context)).toBe(false);
      });
    });
  });
});
