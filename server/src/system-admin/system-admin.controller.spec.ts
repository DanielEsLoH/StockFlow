import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SystemAdminController } from './system-admin.controller';
import { SystemAdminService } from './system-admin.service';
import {
  SystemAdminRole,
  SystemAdminStatus,
  SystemAdminRequestUser,
  SystemAdminAuthResponse,
  SystemAdminLogoutResponse,
  SystemAdminAuthUser,
  PaginatedResponse,
  UserListItem,
  TenantListItem,
  UserActionResult,
  TenantActionResult,
} from './types';
import { SubscriptionPlan, SubscriptionPeriod } from '@prisma/client';

describe('SystemAdminController', () => {
  let controller: SystemAdminController;
  let service: jest.Mocked<SystemAdminService>;

  const mockAdmin: SystemAdminRequestUser = {
    adminId: 'admin-1',
    email: 'admin@stockflow.com',
    role: SystemAdminRole.SUPER_ADMIN,
  };

  const mockAuthUser: SystemAdminAuthUser = {
    id: 'admin-1',
    email: 'admin@stockflow.com',
    firstName: 'System',
    lastName: 'Admin',
    role: SystemAdminRole.SUPER_ADMIN,
    status: SystemAdminStatus.ACTIVE,
  };

  const mockAuthResponse: SystemAdminAuthResponse = {
    admin: mockAuthUser,
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  const mockUserListItem: UserListItem = {
    id: 'user-1',
    email: 'user@company.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'EMPLOYEE',
    status: 'PENDING',
    emailVerified: false,
    tenantId: 'tenant-1',
    tenantName: 'Acme Corp',
    createdAt: new Date(),
    lastLoginAt: null,
    approvedAt: null,
  };

  const mockTenantListItem: TenantListItem = {
    id: 'tenant-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    email: 'contact@acme.com',
    phone: null,
    status: 'ACTIVE',
    plan: 'PYME',
    userCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      login: jest.fn(),
      logout: jest.fn(),
      getMe: jest.fn(),
      getAllUsers: jest.fn(),
      getPendingUsers: jest.fn(),
      approveUser: jest.fn(),
      suspendUser: jest.fn(),
      deleteUser: jest.fn(),
      getAllTenants: jest.fn(),
      changeTenantPlan: jest.fn(),
      activateTenantPlan: jest.fn(),
      suspendTenantPlan: jest.fn(),
      reactivateTenantPlan: jest.fn(),
      getTenantSubscription: jest.fn(),
      getAllPlanLimits: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemAdminController],
      providers: [{ provide: SystemAdminService, useValue: mockService }],
    }).compile();

    controller = module.get<SystemAdminController>(SystemAdminController);
    service = module.get(SystemAdminService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  describe('login', () => {
    it('should return auth response with tokens on successful login', async () => {
      service.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login({
        email: 'admin@stockflow.com',
        password: 'password123',
      });

      expect(result).toEqual(mockAuthResponse);
      expect(service.login).toHaveBeenCalledWith(
        'admin@stockflow.com',
        'password123',
      );
    });

    it('should log the login request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.login.mockResolvedValue(mockAuthResponse);

      await controller.login({
        email: 'admin@stockflow.com',
        password: 'password123',
      });

      expect(logSpy).toHaveBeenCalledWith(
        'System admin login request: admin@stockflow.com',
      );
    });
  });

  describe('logout', () => {
    it('should return logout confirmation message', async () => {
      const logoutResponse: SystemAdminLogoutResponse = {
        message: 'Logged out successfully',
      };
      service.logout.mockResolvedValue(logoutResponse);

      const result = await controller.logout(mockAdmin);

      expect(result).toEqual(logoutResponse);
      expect(service.logout).toHaveBeenCalledWith(mockAdmin.adminId);
    });

    it('should log the logout request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.logout.mockResolvedValue({ message: 'Logged out successfully' });

      await controller.logout(mockAdmin);

      expect(logSpy).toHaveBeenCalledWith(
        'System admin logout request: admin@stockflow.com',
      );
    });
  });

  describe('getMe', () => {
    it('should return current admin information', async () => {
      service.getMe.mockResolvedValue(mockAuthUser);

      const result = await controller.getMe(mockAdmin);

      expect(result).toEqual(mockAuthUser);
      expect(service.getMe).toHaveBeenCalledWith(mockAdmin.adminId);
    });

    it('should log the get me request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.getMe.mockResolvedValue(mockAuthUser);

      await controller.getMe(mockAdmin);

      expect(logSpy).toHaveBeenCalledWith(
        'Get me request for system admin: admin@stockflow.com',
      );
    });
  });

  // ============================================================================
  // USER MANAGEMENT ENDPOINTS
  // ============================================================================

  describe('getAllUsers', () => {
    it('should return paginated list of users', async () => {
      const paginatedResponse: PaginatedResponse<UserListItem> = {
        data: [mockUserListItem],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      service.getAllUsers.mockResolvedValue(paginatedResponse);

      const result = await controller.getAllUsers({ page: 1, limit: 10 });

      expect(result).toEqual(paginatedResponse);
      expect(service.getAllUsers).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('should log the get all users request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.getAllUsers.mockResolvedValue({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      await controller.getAllUsers({ page: 1, limit: 10 });

      expect(logSpy).toHaveBeenCalledWith('Get all users request');
    });

    it('should pass filters to service', async () => {
      service.getAllUsers.mockResolvedValue({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      await controller.getAllUsers({
        page: 2,
        limit: 20,
        status: 'ACTIVE',
        search: 'john',
      });

      expect(service.getAllUsers).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        status: 'ACTIVE',
        search: 'john',
      });
    });
  });

  describe('getPendingUsers', () => {
    it('should return paginated list of pending users', async () => {
      const paginatedResponse: PaginatedResponse<UserListItem> = {
        data: [mockUserListItem],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      service.getPendingUsers.mockResolvedValue(paginatedResponse);

      const result = await controller.getPendingUsers({ page: 1, limit: 10 });

      expect(result).toEqual(paginatedResponse);
      expect(service.getPendingUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('should log the get pending users request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.getPendingUsers.mockResolvedValue({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      await controller.getPendingUsers({ page: 1, limit: 10 });

      expect(logSpy).toHaveBeenCalledWith('Get pending users request');
    });
  });

  describe('approveUser', () => {
    it('should approve a pending user', async () => {
      const actionResult: UserActionResult = {
        success: true,
        message: 'User approved successfully',
        userId: 'user-1',
        action: 'approve',
      };
      service.approveUser.mockResolvedValue(actionResult);

      const result = await controller.approveUser({ id: 'user-1' }, mockAdmin);

      expect(result).toEqual(actionResult);
      expect(service.approveUser).toHaveBeenCalledWith(
        'user-1',
        mockAdmin.adminId,
      );
    });

    it('should log the approve user request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.approveUser.mockResolvedValue({
        success: true,
        message: 'User approved successfully',
        userId: 'user-1',
        action: 'approve',
      });

      await controller.approveUser({ id: 'user-1' }, mockAdmin);

      expect(logSpy).toHaveBeenCalledWith(
        'Approve user request: user-1 by admin: admin@stockflow.com',
      );
    });
  });

  describe('suspendUser', () => {
    it('should suspend an active user', async () => {
      const actionResult: UserActionResult = {
        success: true,
        message: 'User suspended successfully',
        userId: 'user-1',
        action: 'suspend',
      };
      service.suspendUser.mockResolvedValue(actionResult);

      const result = await controller.suspendUser(
        { id: 'user-1' },
        { reason: 'Violation of terms' },
        mockAdmin,
      );

      expect(result).toEqual(actionResult);
      expect(service.suspendUser).toHaveBeenCalledWith(
        'user-1',
        mockAdmin.adminId,
        'Violation of terms',
      );
    });

    it('should suspend user without reason', async () => {
      service.suspendUser.mockResolvedValue({
        success: true,
        message: 'User suspended successfully',
        userId: 'user-1',
        action: 'suspend',
      });

      await controller.suspendUser({ id: 'user-1' }, {}, mockAdmin);

      expect(service.suspendUser).toHaveBeenCalledWith(
        'user-1',
        mockAdmin.adminId,
        undefined,
      );
    });

    it('should log the suspend user request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.suspendUser.mockResolvedValue({
        success: true,
        message: 'User suspended successfully',
        userId: 'user-1',
        action: 'suspend',
      });

      await controller.suspendUser({ id: 'user-1' }, {}, mockAdmin);

      expect(logSpy).toHaveBeenCalledWith(
        'Suspend user request: user-1 by admin: admin@stockflow.com',
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const actionResult: UserActionResult = {
        success: true,
        message: 'User deleted successfully',
        userId: 'user-1',
        action: 'delete',
      };
      service.deleteUser.mockResolvedValue(actionResult);

      const result = await controller.deleteUser(
        { id: 'user-1' },
        { reason: 'Account requested deletion' },
        mockAdmin,
      );

      expect(result).toEqual(actionResult);
      expect(service.deleteUser).toHaveBeenCalledWith(
        'user-1',
        mockAdmin.adminId,
        'Account requested deletion',
      );
    });

    it('should delete user without reason', async () => {
      service.deleteUser.mockResolvedValue({
        success: true,
        message: 'User deleted successfully',
        userId: 'user-1',
        action: 'delete',
      });

      await controller.deleteUser({ id: 'user-1' }, {}, mockAdmin);

      expect(service.deleteUser).toHaveBeenCalledWith(
        'user-1',
        mockAdmin.adminId,
        undefined,
      );
    });

    it('should log the delete user request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.deleteUser.mockResolvedValue({
        success: true,
        message: 'User deleted successfully',
        userId: 'user-1',
        action: 'delete',
      });

      await controller.deleteUser({ id: 'user-1' }, {}, mockAdmin);

      expect(logSpy).toHaveBeenCalledWith(
        'Delete user request: user-1 by admin: admin@stockflow.com',
      );
    });
  });

  // ============================================================================
  // TENANT MANAGEMENT ENDPOINTS
  // ============================================================================

  describe('getAllTenants', () => {
    it('should return paginated list of tenants', async () => {
      const paginatedResponse: PaginatedResponse<TenantListItem> = {
        data: [mockTenantListItem],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      service.getAllTenants.mockResolvedValue(paginatedResponse);

      const result = await controller.getAllTenants({ page: 1, limit: 10 });

      expect(result).toEqual(paginatedResponse);
      expect(service.getAllTenants).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('should log the get all tenants request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.getAllTenants.mockResolvedValue({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      await controller.getAllTenants({ page: 1, limit: 10 });

      expect(logSpy).toHaveBeenCalledWith('Get all tenants request');
    });

    it('should pass filters to service', async () => {
      service.getAllTenants.mockResolvedValue({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      await controller.getAllTenants({
        page: 2,
        limit: 20,
        status: 'ACTIVE',
        plan: 'PRO',
        search: 'acme',
      });

      expect(service.getAllTenants).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        status: 'ACTIVE',
        plan: 'PRO',
        search: 'acme',
      });
    });
  });

  describe('changeTenantPlan', () => {
    it('should change tenant subscription plan', async () => {
      const actionResult: TenantActionResult = {
        success: true,
        message: 'Plan changed from BASIC to PRO',
        tenantId: 'tenant-1',
        action: 'change_plan',
        previousPlan: 'PYME',
        newPlan: 'PRO',
      };
      service.changeTenantPlan.mockResolvedValue(actionResult);

      const result = await controller.changeTenantPlan(
        { id: 'tenant-1' },
        { plan: SubscriptionPlan.PRO },
        mockAdmin,
      );

      expect(result).toEqual(actionResult);
      expect(service.changeTenantPlan).toHaveBeenCalledWith(
        'tenant-1',
        SubscriptionPlan.PRO,
        mockAdmin.adminId,
      );
    });

    it('should log the change tenant plan request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.changeTenantPlan.mockResolvedValue({
        success: true,
        message: 'Plan changed',
        tenantId: 'tenant-1',
        action: 'change_plan',
      });

      await controller.changeTenantPlan(
        { id: 'tenant-1' },
        { plan: SubscriptionPlan.PRO },
        mockAdmin,
      );

      expect(logSpy).toHaveBeenCalledWith(
        'Change tenant plan request: tenant-1 to PRO by admin: admin@stockflow.com',
      );
    });
  });

  describe('activateTenantPlan', () => {
    it('should activate a tenant subscription plan with period', async () => {
      const actionResult: TenantActionResult = {
        success: true,
        message: 'Plan activated successfully',
        tenantId: 'tenant-1',
        action: 'activate_plan',
        newPlan: 'PYME',
        endDate: new Date('2026-05-13'),
      };
      service.activateTenantPlan.mockResolvedValue(actionResult);

      const result = await controller.activateTenantPlan(
        { id: 'tenant-1' },
        { plan: SubscriptionPlan.PYME, period: SubscriptionPeriod.QUARTERLY },
        mockAdmin,
      );

      expect(result).toEqual(actionResult);
      expect(service.activateTenantPlan).toHaveBeenCalledWith(
        'tenant-1',
        SubscriptionPlan.PYME,
        SubscriptionPeriod.QUARTERLY,
        mockAdmin.adminId,
      );
    });

    it('should log the activate tenant plan request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.activateTenantPlan.mockResolvedValue({
        success: true,
        message: 'Plan activated',
        tenantId: 'tenant-1',
        action: 'activate_plan',
      });

      await controller.activateTenantPlan(
        { id: 'tenant-1' },
        { plan: SubscriptionPlan.PRO, period: SubscriptionPeriod.ANNUAL },
        mockAdmin,
      );

      expect(logSpy).toHaveBeenCalledWith(
        'Activate tenant plan request: tenant-1 - PRO for ANNUAL by admin: admin@stockflow.com',
      );
    });
  });

  describe('suspendTenantPlan', () => {
    it('should suspend a tenant subscription plan', async () => {
      const actionResult: TenantActionResult = {
        success: true,
        message: 'Plan suspended successfully',
        tenantId: 'tenant-1',
        action: 'suspend_plan',
      };
      service.suspendTenantPlan.mockResolvedValue(actionResult);

      const result = await controller.suspendTenantPlan(
        { id: 'tenant-1' },
        { reason: 'Violation of terms of service' },
        mockAdmin,
      );

      expect(result).toEqual(actionResult);
      expect(service.suspendTenantPlan).toHaveBeenCalledWith(
        'tenant-1',
        'Violation of terms of service',
        mockAdmin.adminId,
      );
    });

    it('should log the suspend tenant plan request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.suspendTenantPlan.mockResolvedValue({
        success: true,
        message: 'Plan suspended',
        tenantId: 'tenant-1',
        action: 'suspend_plan',
      });

      await controller.suspendTenantPlan(
        { id: 'tenant-1' },
        { reason: 'Non-payment' },
        mockAdmin,
      );

      expect(logSpy).toHaveBeenCalledWith(
        'Suspend tenant plan request: tenant-1 by admin: admin@stockflow.com',
      );
    });
  });

  describe('reactivateTenantPlan', () => {
    it('should reactivate a suspended tenant subscription', async () => {
      const actionResult: TenantActionResult = {
        success: true,
        message: 'Plan reactivated successfully',
        tenantId: 'tenant-1',
        action: 'reactivate_plan',
      };
      service.reactivateTenantPlan.mockResolvedValue(actionResult);

      const result = await controller.reactivateTenantPlan(
        { id: 'tenant-1' },
        mockAdmin,
      );

      expect(result).toEqual(actionResult);
      expect(service.reactivateTenantPlan).toHaveBeenCalledWith(
        'tenant-1',
        mockAdmin.adminId,
      );
    });

    it('should log the reactivate tenant plan request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.reactivateTenantPlan.mockResolvedValue({
        success: true,
        message: 'Plan reactivated',
        tenantId: 'tenant-1',
        action: 'reactivate_plan',
      });

      await controller.reactivateTenantPlan({ id: 'tenant-1' }, mockAdmin);

      expect(logSpy).toHaveBeenCalledWith(
        'Reactivate tenant plan request: tenant-1 by admin: admin@stockflow.com',
      );
    });
  });

  describe('getTenantSubscription', () => {
    it('should return subscription details for a tenant', async () => {
      const subscriptionData = {
        id: 'sub-1',
        tenantId: 'tenant-1',
        plan: 'PYME',
        period: 'QUARTERLY',
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-04-01'),
      };
      service.getTenantSubscription.mockResolvedValue(subscriptionData);

      const result = await controller.getTenantSubscription({
        id: 'tenant-1',
      });

      expect(result).toEqual(subscriptionData);
      expect(service.getTenantSubscription).toHaveBeenCalledWith('tenant-1');
    });

    it('should log the get tenant subscription request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.getTenantSubscription.mockResolvedValue(null);

      await controller.getTenantSubscription({ id: 'tenant-1' });

      expect(logSpy).toHaveBeenCalledWith(
        'Get tenant subscription request: tenant-1',
      );
    });
  });

  describe('getAllPlanLimits', () => {
    it('should return plan limits for all plans', () => {
      const planLimits = {
        EMPRENDEDOR: { maxProducts: 50, maxWarehouses: 1, maxUsers: 2 },
        PYME: { maxProducts: 500, maxWarehouses: 3, maxUsers: 10 },
        PRO: { maxProducts: 5000, maxWarehouses: 10, maxUsers: 50 },
        PLUS: { maxProducts: -1, maxWarehouses: -1, maxUsers: -1 },
      };
      service.getAllPlanLimits.mockReturnValue(planLimits);

      const result = controller.getAllPlanLimits();

      expect(result).toEqual(planLimits);
      expect(service.getAllPlanLimits).toHaveBeenCalled();
    });

    it('should log the get all plan limits request', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      service.getAllPlanLimits.mockReturnValue({});

      controller.getAllPlanLimits();

      expect(logSpy).toHaveBeenCalledWith('Get all plan limits request');
    });
  });
});
