import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SystemAdminRoleGuard,
  SystemAdminRoles,
  SYSTEM_ADMIN_ROLES_KEY,
} from './system-admin-role.guard';
import { SystemAdminRole, SystemAdminRequestUser } from '../types';

describe('SystemAdminRoleGuard', () => {
  let guard: SystemAdminRoleGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockExecutionContext = (
    user: SystemAdminRequestUser | null = null,
  ): ExecutionContext =>
    ({
      getHandler: () => () => {},
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => {},
      }),
      getArgs: () => [],
      getArgByIndex: () => ({}),
      switchToRpc: () => ({
        getData: () => ({}),
        getContext: () => ({}),
      }),
      switchToWs: () => ({
        getData: () => ({}),
        getClient: () => ({}),
        getPattern: () => '',
      }),
      getType: () => 'http',
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemAdminRoleGuard,
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<SystemAdminRoleGuard>(SystemAdminRoleGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });
  });

  describe('canActivate', () => {
    describe('no roles required', () => {
      it('should return true when no roles are specified', () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        const context = createMockExecutionContext();

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should return true when roles array is empty', () => {
        reflector.getAllAndOverride.mockReturnValue([]);
        const context = createMockExecutionContext();

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('SUPER_ADMIN access', () => {
      it('should allow SUPER_ADMIN access to any route', () => {
        reflector.getAllAndOverride.mockReturnValue([SystemAdminRole.BILLING]);
        const superAdmin: SystemAdminRequestUser = {
          adminId: 'admin-1',
          email: 'super@admin.com',
          role: SystemAdminRole.SUPER_ADMIN,
        };
        const context = createMockExecutionContext(superAdmin);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow SUPER_ADMIN access to SUPPORT-only routes', () => {
        reflector.getAllAndOverride.mockReturnValue([SystemAdminRole.SUPPORT]);
        const superAdmin: SystemAdminRequestUser = {
          adminId: 'admin-1',
          email: 'super@admin.com',
          role: SystemAdminRole.SUPER_ADMIN,
        };
        const context = createMockExecutionContext(superAdmin);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('role matching', () => {
      it('should allow access when admin has required role', () => {
        reflector.getAllAndOverride.mockReturnValue([SystemAdminRole.SUPPORT]);
        const supportAdmin: SystemAdminRequestUser = {
          adminId: 'admin-2',
          email: 'support@admin.com',
          role: SystemAdminRole.SUPPORT,
        };
        const context = createMockExecutionContext(supportAdmin);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow access when admin role is in required roles array', () => {
        reflector.getAllAndOverride.mockReturnValue([
          SystemAdminRole.SUPPORT,
          SystemAdminRole.BILLING,
        ]);
        const billingAdmin: SystemAdminRequestUser = {
          adminId: 'admin-3',
          email: 'billing@admin.com',
          role: SystemAdminRole.BILLING,
        };
        const context = createMockExecutionContext(billingAdmin);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should throw ForbiddenException when admin lacks required role', () => {
        reflector.getAllAndOverride.mockReturnValue([
          SystemAdminRole.SUPER_ADMIN,
        ]);
        const supportAdmin: SystemAdminRequestUser = {
          adminId: 'admin-2',
          email: 'support@admin.com',
          role: SystemAdminRole.SUPPORT,
        };
        const context = createMockExecutionContext(supportAdmin);

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow(
          'Access denied. Required role(s): SUPER_ADMIN. Your role: SUPPORT',
        );
      });

      it('should throw ForbiddenException with multiple required roles in message', () => {
        reflector.getAllAndOverride.mockReturnValue([
          SystemAdminRole.SUPER_ADMIN,
          SystemAdminRole.BILLING,
        ]);
        const supportAdmin: SystemAdminRequestUser = {
          adminId: 'admin-2',
          email: 'support@admin.com',
          role: SystemAdminRole.SUPPORT,
        };
        const context = createMockExecutionContext(supportAdmin);

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow(
          'Access denied. Required role(s): SUPER_ADMIN, BILLING. Your role: SUPPORT',
        );
      });
    });

    describe('missing admin', () => {
      it('should throw ForbiddenException when admin is not present', () => {
        reflector.getAllAndOverride.mockReturnValue([SystemAdminRole.SUPPORT]);
        const context = createMockExecutionContext(null);

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow(
          'System admin authentication required before role check',
        );
      });
    });
  });

  describe('SystemAdminRoles decorator', () => {
    it('should set metadata with single role', () => {
      const decorator = SystemAdminRoles(SystemAdminRole.SUPER_ADMIN);
      const target = class TestTarget {};

      decorator(target);

      expect(Reflect.getMetadata(SYSTEM_ADMIN_ROLES_KEY, target)).toEqual([
        SystemAdminRole.SUPER_ADMIN,
      ]);
    });

    it('should set metadata with multiple roles', () => {
      const decorator = SystemAdminRoles(
        SystemAdminRole.SUPER_ADMIN,
        SystemAdminRole.SUPPORT,
      );
      const target = class TestTarget {};

      decorator(target);

      expect(Reflect.getMetadata(SYSTEM_ADMIN_ROLES_KEY, target)).toEqual([
        SystemAdminRole.SUPER_ADMIN,
        SystemAdminRole.SUPPORT,
      ]);
    });
  });
});
