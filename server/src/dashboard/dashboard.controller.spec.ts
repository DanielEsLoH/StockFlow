import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import {
  DashboardService,
  DashboardResponse,
  DashboardStats,
  DashboardCharts,
  RecentInvoice,
  LowStockAlert,
  RecentActivity,
} from './dashboard.service';
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

  const mockDashboardStats: DashboardStats = {
    totalSales: 35000000,
    salesGrowth: 12.5,
    totalProducts: 234,
    productsGrowth: 5.2,
    totalInvoices: 168,
    invoicesGrowth: 8.3,
    totalCustomers: 89,
    customersGrowth: 15.0,
    overdueInvoicesCount: 3,
  };

  const mockDashboardCharts: DashboardCharts = {
    salesChart: [
      { date: '2024-01-01', sales: 1000, orders: 5, previousPeriod: 800 },
      { date: '2024-01-02', sales: 2000, orders: 10, previousPeriod: 1500 },
    ],
    categoryDistribution: [
      { name: 'Electronics', value: 5000, color: '#3B82F6' },
      { name: 'Clothing', value: 3000, color: '#10B981' },
    ],
    topProducts: [
      {
        id: 'product-1',
        name: 'Product One',
        category: 'Electronics',
        sales: 10000,
        quantity: 100,
      },
    ],
  };

  const mockRecentInvoices: RecentInvoice[] = [
    {
      id: 'invoice-1',
      number: 'INV-001',
      customer: 'Customer One',
      amount: 5000,
      status: 'PAID',
      date: '2024-01-15',
    },
    {
      id: 'invoice-2',
      number: 'INV-002',
      customer: 'Customer Two',
      amount: 3500,
      status: 'PENDING',
      date: '2024-01-14',
    },
  ];

  const mockLowStockAlerts: LowStockAlert[] = [
    {
      id: 'product-1',
      name: 'Low Stock Product',
      sku: 'LSP-001',
      currentStock: 5,
      minStock: 20,
      warehouse: 'Main Warehouse',
    },
    {
      id: 'product-2',
      name: 'Critical Stock Product',
      sku: 'CSP-002',
      currentStock: 2,
      minStock: 15,
      warehouse: 'Secondary Warehouse',
    },
  ];

  const mockRecentActivity: RecentActivity[] = [
    {
      id: 'sale-1',
      type: 'sale',
      title: 'Venta completada',
      description: 'Factura INV-001 pagada por Customer One - $5,000',
      timestamp: '2024-01-15T10:30:00.000Z',
    },
    {
      id: 'customer-1',
      type: 'customer',
      title: 'Nuevo cliente registrado',
      description: 'New Customer',
      timestamp: '2024-01-15T09:00:00.000Z',
    },
    {
      id: 'stock-1',
      type: 'stock',
      title: 'Movimiento de stock (compra)',
      description: '50 unidades de Product One en Main Warehouse',
      timestamp: '2024-01-15T08:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockDashboardService = {
      getDashboard: jest.fn(),
      getStats: jest.fn(),
      getCharts: jest.fn(),
      getRecentInvoices: jest.fn(),
      getLowStockAlerts: jest.fn(),
      getRecentActivity: jest.fn(),
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

  describe('getStats', () => {
    it('should return dashboard stats from service', async () => {
      dashboardService.getStats.mockResolvedValue(mockDashboardStats);

      const result = await controller.getStats(mockUser);

      expect(result).toEqual(mockDashboardStats);
      expect(dashboardService.getStats).toHaveBeenCalledTimes(1);
    });

    it('should log tenant and user information', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      dashboardService.getStats.mockResolvedValue(mockDashboardStats);

      await controller.getStats(mockUser);

      expect(logSpy).toHaveBeenCalledWith(
        `Fetching dashboard stats for tenant ${mockUser.tenantId} by user ${mockUser.userId}`,
      );
    });

    it('should call service.getStats without arguments', async () => {
      dashboardService.getStats.mockResolvedValue(mockDashboardStats);

      await controller.getStats(mockUser);

      expect(dashboardService.getStats).toHaveBeenCalledWith();
    });

    it('should return complete stats structure', async () => {
      dashboardService.getStats.mockResolvedValue(mockDashboardStats);

      const result = await controller.getStats(mockUser);

      expect(result).toHaveProperty('totalSales');
      expect(result).toHaveProperty('salesGrowth');
      expect(result).toHaveProperty('totalProducts');
      expect(result).toHaveProperty('productsGrowth');
      expect(result).toHaveProperty('totalInvoices');
      expect(result).toHaveProperty('invoicesGrowth');
      expect(result).toHaveProperty('totalCustomers');
      expect(result).toHaveProperty('customersGrowth');
      expect(result).toHaveProperty('overdueInvoicesCount');
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      dashboardService.getStats.mockRejectedValue(error);

      await expect(controller.getStats(mockUser)).rejects.toThrow(error);
    });
  });

  describe('getCharts', () => {
    it('should return dashboard charts from service', async () => {
      dashboardService.getCharts.mockResolvedValue(mockDashboardCharts);

      const result = await controller.getCharts(mockUser);

      expect(result).toEqual(mockDashboardCharts);
      expect(dashboardService.getCharts).toHaveBeenCalledTimes(1);
    });

    it('should log tenant and user information', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      dashboardService.getCharts.mockResolvedValue(mockDashboardCharts);

      await controller.getCharts(mockUser);

      expect(logSpy).toHaveBeenCalledWith(
        `Fetching dashboard charts for tenant ${mockUser.tenantId} by user ${mockUser.userId}`,
      );
    });

    it('should call service.getCharts without arguments', async () => {
      dashboardService.getCharts.mockResolvedValue(mockDashboardCharts);

      await controller.getCharts(mockUser);

      expect(dashboardService.getCharts).toHaveBeenCalledWith();
    });

    it('should return complete charts structure', async () => {
      dashboardService.getCharts.mockResolvedValue(mockDashboardCharts);

      const result = await controller.getCharts(mockUser);

      expect(result).toHaveProperty('salesChart');
      expect(result).toHaveProperty('categoryDistribution');
      expect(result).toHaveProperty('topProducts');
      expect(Array.isArray(result.salesChart)).toBe(true);
      expect(Array.isArray(result.categoryDistribution)).toBe(true);
      expect(Array.isArray(result.topProducts)).toBe(true);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      dashboardService.getCharts.mockRejectedValue(error);

      await expect(controller.getCharts(mockUser)).rejects.toThrow(error);
    });
  });

  describe('getRecentInvoices', () => {
    it('should return recent invoices from service', async () => {
      dashboardService.getRecentInvoices.mockResolvedValue(mockRecentInvoices);

      const result = await controller.getRecentInvoices(mockUser);

      expect(result).toEqual(mockRecentInvoices);
      expect(dashboardService.getRecentInvoices).toHaveBeenCalledTimes(1);
    });

    it('should log tenant and user information', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      dashboardService.getRecentInvoices.mockResolvedValue(mockRecentInvoices);

      await controller.getRecentInvoices(mockUser);

      expect(logSpy).toHaveBeenCalledWith(
        `Fetching recent invoices for tenant ${mockUser.tenantId} by user ${mockUser.userId}`,
      );
    });

    it('should call service.getRecentInvoices without arguments', async () => {
      dashboardService.getRecentInvoices.mockResolvedValue(mockRecentInvoices);

      await controller.getRecentInvoices(mockUser);

      expect(dashboardService.getRecentInvoices).toHaveBeenCalledWith();
    });

    it('should return array of invoices with correct structure', async () => {
      dashboardService.getRecentInvoices.mockResolvedValue(mockRecentInvoices);

      const result = await controller.getRecentInvoices(mockUser);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('number');
      expect(result[0]).toHaveProperty('customer');
      expect(result[0]).toHaveProperty('amount');
      expect(result[0]).toHaveProperty('status');
      expect(result[0]).toHaveProperty('date');
    });

    it('should return empty array when no invoices exist', async () => {
      dashboardService.getRecentInvoices.mockResolvedValue([]);

      const result = await controller.getRecentInvoices(mockUser);

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      dashboardService.getRecentInvoices.mockRejectedValue(error);

      await expect(controller.getRecentInvoices(mockUser)).rejects.toThrow(
        error,
      );
    });
  });

  describe('getLowStockAlerts', () => {
    it('should return low stock alerts from service', async () => {
      dashboardService.getLowStockAlerts.mockResolvedValue(mockLowStockAlerts);

      const result = await controller.getLowStockAlerts(mockUser);

      expect(result).toEqual(mockLowStockAlerts);
      expect(dashboardService.getLowStockAlerts).toHaveBeenCalledTimes(1);
    });

    it('should log tenant and user information', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      dashboardService.getLowStockAlerts.mockResolvedValue(mockLowStockAlerts);

      await controller.getLowStockAlerts(mockUser);

      expect(logSpy).toHaveBeenCalledWith(
        `Fetching low stock alerts for tenant ${mockUser.tenantId} by user ${mockUser.userId}`,
      );
    });

    it('should call service.getLowStockAlerts without arguments', async () => {
      dashboardService.getLowStockAlerts.mockResolvedValue(mockLowStockAlerts);

      await controller.getLowStockAlerts(mockUser);

      expect(dashboardService.getLowStockAlerts).toHaveBeenCalledWith();
    });

    it('should return array of alerts with correct structure', async () => {
      dashboardService.getLowStockAlerts.mockResolvedValue(mockLowStockAlerts);

      const result = await controller.getLowStockAlerts(mockUser);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('sku');
      expect(result[0]).toHaveProperty('currentStock');
      expect(result[0]).toHaveProperty('minStock');
      expect(result[0]).toHaveProperty('warehouse');
    });

    it('should return empty array when no low stock products exist', async () => {
      dashboardService.getLowStockAlerts.mockResolvedValue([]);

      const result = await controller.getLowStockAlerts(mockUser);

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      dashboardService.getLowStockAlerts.mockRejectedValue(error);

      await expect(controller.getLowStockAlerts(mockUser)).rejects.toThrow(
        error,
      );
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent activity from service', async () => {
      dashboardService.getRecentActivity.mockResolvedValue(mockRecentActivity);

      const result = await controller.getRecentActivity(mockUser);

      expect(result).toEqual(mockRecentActivity);
      expect(dashboardService.getRecentActivity).toHaveBeenCalledTimes(1);
    });

    it('should log tenant and user information', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      dashboardService.getRecentActivity.mockResolvedValue(mockRecentActivity);

      await controller.getRecentActivity(mockUser);

      expect(logSpy).toHaveBeenCalledWith(
        `Fetching recent activity for tenant ${mockUser.tenantId} by user ${mockUser.userId}`,
      );
    });

    it('should call service.getRecentActivity without arguments', async () => {
      dashboardService.getRecentActivity.mockResolvedValue(mockRecentActivity);

      await controller.getRecentActivity(mockUser);

      expect(dashboardService.getRecentActivity).toHaveBeenCalledWith();
    });

    it('should return array of activities with correct structure', async () => {
      dashboardService.getRecentActivity.mockResolvedValue(mockRecentActivity);

      const result = await controller.getRecentActivity(mockUser);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('timestamp');
    });

    it('should return activities with different types', async () => {
      dashboardService.getRecentActivity.mockResolvedValue(mockRecentActivity);

      const result = await controller.getRecentActivity(mockUser);

      const types = result.map((a) => a.type);
      expect(types).toContain('sale');
      expect(types).toContain('customer');
      expect(types).toContain('stock');
    });

    it('should return empty array when no activity exists', async () => {
      dashboardService.getRecentActivity.mockResolvedValue([]);

      const result = await controller.getRecentActivity(mockUser);

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      dashboardService.getRecentActivity.mockRejectedValue(error);

      await expect(controller.getRecentActivity(mockUser)).rejects.toThrow(
        error,
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
