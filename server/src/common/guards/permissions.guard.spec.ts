import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { Permission } from '../permissions/permission.enum';
import { UserRole } from '@prisma/client';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let permissionsService: jest.Mocked<PermissionsService>;

  const mockEmployee = {
    id: 'user-123',
    userId: 'user-123',
    tenantId: 'tenant-123',
    role: UserRole.EMPLOYEE,
  };

  const _mockAdmin = {
    id: 'admin-123',
    userId: 'admin-123',
    tenantId: 'tenant-123',
    role: UserRole.ADMIN,
  };
  void _mockAdmin;

  const mockSuperAdmin = {
    id: 'super-admin-123',
    userId: 'super-admin-123',
    tenantId: 'tenant-123',
    role: UserRole.SUPER_ADMIN,
  };

  interface MockUser {
    id: string;
    userId: string;
    tenantId: string;
    role: UserRole;
  }

  const createMockExecutionContext = (user: MockUser | null): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockPermissionsService = {
      getUserPermissions: jest.fn(),
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasAllPermissions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get(Reflector);
    permissionsService = module.get(PermissionsService);
  });

  describe('canActivate', () => {
    it('should return true when no permissions are required', async () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(null);
      const context = createMockExecutionContext(mockEmployee);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user is SUPER_ADMIN', async () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue({
        permissions: [Permission.USERS_MANAGE],
        mode: 'ANY',
      });
      permissionsService.hasAnyPermission = jest.fn().mockResolvedValue(true);
      const context = createMockExecutionContext(mockSuperAdmin);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', async () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue({
        permissions: [Permission.POS_SELL],
        mode: 'ANY',
      });
      const context = createMockExecutionContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should return true when user has the required permission (any mode)', async () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue({
        permissions: [Permission.POS_SELL, Permission.POS_REFUND],
        mode: 'ANY',
      });
      permissionsService.hasAnyPermission = jest.fn().mockResolvedValue(true);
      const context = createMockExecutionContext(mockEmployee);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(permissionsService.hasAnyPermission).toHaveBeenCalledWith(
        mockEmployee.userId,
        mockEmployee.role,
        mockEmployee.tenantId,
        [Permission.POS_SELL, Permission.POS_REFUND],
      );
    });

    it('should throw ForbiddenException when user lacks all permissions (any mode)', async () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue({
        permissions: [Permission.POS_REFUND, Permission.USERS_MANAGE],
        mode: 'ANY',
      });
      permissionsService.hasAnyPermission = jest.fn().mockResolvedValue(false);
      const context = createMockExecutionContext(mockEmployee);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should return true when user has all required permissions (all mode)', async () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue({
        permissions: [Permission.POS_SELL, Permission.INVENTORY_VIEW],
        mode: 'ALL',
      });
      permissionsService.hasAllPermissions = jest.fn().mockResolvedValue(true);
      const context = createMockExecutionContext(mockEmployee);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(permissionsService.hasAllPermissions).toHaveBeenCalledWith(
        mockEmployee.userId,
        mockEmployee.role,
        mockEmployee.tenantId,
        [Permission.POS_SELL, Permission.INVENTORY_VIEW],
      );
    });

    it('should throw ForbiddenException when user lacks any permission (all mode)', async () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue({
        permissions: [Permission.POS_SELL, Permission.POS_REFUND],
        mode: 'ALL',
      });
      permissionsService.hasAllPermissions = jest.fn().mockResolvedValue(false);
      const context = createMockExecutionContext(mockEmployee);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should use userId from user object', async () => {
      const userWithUserId = {
        ...mockEmployee,
        userId: 'actual-user-id',
      };
      reflector.getAllAndOverride = jest.fn().mockReturnValue({
        permissions: [Permission.POS_SELL],
        mode: 'ANY',
      });
      permissionsService.hasAnyPermission = jest.fn().mockResolvedValue(true);
      const context = createMockExecutionContext(userWithUserId);

      await guard.canActivate(context);

      expect(permissionsService.hasAnyPermission).toHaveBeenCalledWith(
        'actual-user-id',
        userWithUserId.role,
        userWithUserId.tenantId,
        [Permission.POS_SELL],
      );
    });

    it('should use default ANY mode when mode is not specified', async () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue({
        permissions: [Permission.POS_SELL],
      });
      permissionsService.hasAnyPermission = jest.fn().mockResolvedValue(true);
      const context = createMockExecutionContext(mockEmployee);

      await guard.canActivate(context);

      expect(permissionsService.hasAnyPermission).toHaveBeenCalled();
      expect(permissionsService.hasAllPermissions).not.toHaveBeenCalled();
    });
  });
});
