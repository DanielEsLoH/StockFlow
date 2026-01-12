import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService, DashboardResponse } from './dashboard.service';
import type { RequestUser } from '../auth';
import { UserRole } from '@prisma/client';

describe('DashboardController', () => {
  let controller: DashboardController;
  let dashboardService: jest.Mocked<DashboardService>;

  // Test data
  const mockUser: RequestUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    tenantId: 'tenant-123',
  };

  const mockDashboardResponse: DashboardResponse = {
    sales: {
      today: 1250000,
      thisWeek: 8500000,
      thisMonth: 35000000,
      growth: 12.5,
    },
    products: {
      total: 234,
      lowStock: 12,
      outOfStock: 3,
      topSelling: [
        {
          id: 'product-1',
          name: 'Product One',
          sku: 'SKU-001',
          quantitySold: 100,
          revenue: 10000,
        },
      ],
    },
    invoices: {
      pending: 15,
      overdue: 3,
      paid: 145,
      draft: 5,
    },
    customers: {
      total: 89,
      newThisMonth: 12,
    },
    charts: {
      salesByDay: [
        { date: '2024-01-01', amount: 1000 },
        { date: '2024-01-02', amount: 2000 },
      ],
      topProducts: [
        { id: 'product-1', name: 'Product One', quantity: 100, revenue: 10000 },
      ],
      salesByCategory: [
        {
          categoryId: 'category-1',
          categoryName: 'Electronics',
          amount: 5000,
          percentage: 50,
        },
      ],
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockDashboardService = {
      getDashboard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    dashboardService = module.get(DashboardService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard data from service', async () => {
      dashboardService.getDashboard.mockResolvedValue(mockDashboardResponse);

      const result = await controller.getDashboard(mockUser);

      expect(result).toEqual(mockDashboardResponse);
      expect(dashboardService.getDashboard).toHaveBeenCalledTimes(1);
    });

    it('should log tenant and user information', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      dashboardService.getDashboard.mockResolvedValue(mockDashboardResponse);

      await controller.getDashboard(mockUser);

      expect(logSpy).toHaveBeenCalledWith(
        `Fetching dashboard for tenant ${mockUser.tenantId} by user ${mockUser.userId}`,
      );
    });

    it('should call service.getDashboard without arguments', async () => {
      dashboardService.getDashboard.mockResolvedValue(mockDashboardResponse);

      await controller.getDashboard(mockUser);

      expect(dashboardService.getDashboard).toHaveBeenCalledWith();
    });

    it('should return complete dashboard structure with sales metrics', async () => {
      dashboardService.getDashboard.mockResolvedValue(mockDashboardResponse);

      const result = await controller.getDashboard(mockUser);

      expect(result.sales).toEqual({
        today: 1250000,
        thisWeek: 8500000,
        thisMonth: 35000000,
        growth: 12.5,
      });
    });

    it('should return complete dashboard structure with product metrics', async () => {
      dashboardService.getDashboard.mockResolvedValue(mockDashboardResponse);

      const result = await controller.getDashboard(mockUser);

      expect(result.products).toHaveProperty('total');
      expect(result.products).toHaveProperty('lowStock');
      expect(result.products).toHaveProperty('outOfStock');
      expect(result.products).toHaveProperty('topSelling');
    });

    it('should return complete dashboard structure with invoice metrics', async () => {
      dashboardService.getDashboard.mockResolvedValue(mockDashboardResponse);

      const result = await controller.getDashboard(mockUser);

      expect(result.invoices).toEqual({
        pending: 15,
        overdue: 3,
        paid: 145,
        draft: 5,
      });
    });

    it('should return complete dashboard structure with customer metrics', async () => {
      dashboardService.getDashboard.mockResolvedValue(mockDashboardResponse);

      const result = await controller.getDashboard(mockUser);

      expect(result.customers).toEqual({
        total: 89,
        newThisMonth: 12,
      });
    });

    it('should return complete dashboard structure with chart data', async () => {
      dashboardService.getDashboard.mockResolvedValue(mockDashboardResponse);

      const result = await controller.getDashboard(mockUser);

      expect(result.charts).toHaveProperty('salesByDay');
      expect(result.charts).toHaveProperty('topProducts');
      expect(result.charts).toHaveProperty('salesByCategory');
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      dashboardService.getDashboard.mockRejectedValue(error);

      await expect(controller.getDashboard(mockUser)).rejects.toThrow(error);
    });

    it('should propagate service errors with specific message', async () => {
      const error = new Error('Tenant not found');
      dashboardService.getDashboard.mockRejectedValue(error);

      await expect(controller.getDashboard(mockUser)).rejects.toThrow(
        'Tenant not found',
      );
    });

    it('should work with different user roles', async () => {
      dashboardService.getDashboard.mockResolvedValue(mockDashboardResponse);

      const employeeUser: RequestUser = {
        ...mockUser,
        role: UserRole.EMPLOYEE,
      };

      const result = await controller.getDashboard(employeeUser);

      expect(result).toEqual(mockDashboardResponse);
    });

    it('should work with different tenant IDs', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      dashboardService.getDashboard.mockResolvedValue(mockDashboardResponse);

      const differentTenantUser: RequestUser = {
        ...mockUser,
        tenantId: 'tenant-456',
      };

      await controller.getDashboard(differentTenantUser);

      expect(logSpy).toHaveBeenCalledWith(
        `Fetching dashboard for tenant tenant-456 by user ${mockUser.userId}`,
      );
    });
  });

  describe('guard application', () => {
    it('should have JwtAuthGuard applied at class level', () => {
      // The guard is applied via decorator, we verify it's defined in the controller metadata
      const guards = Reflect.getMetadata('__guards__', DashboardController);
      expect(guards).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(guards.length).toBeGreaterThan(0);
    });

    it('should be decorated as a controller with dashboard route', () => {
      const controllerPath = Reflect.getMetadata('path', DashboardController);
      expect(controllerPath).toBe('dashboard');
    });
  });
});
