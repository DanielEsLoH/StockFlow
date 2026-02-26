import { Test, TestingModule } from '@nestjs/testing';
import { REQUEST } from '@nestjs/core';
import { ForbiddenException, Logger } from '@nestjs/common';
import { TenantStatus, SubscriptionPlan } from '@prisma/client';
import { TenantContextService, LimitType } from './tenant-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as tenantContext from '../context';

// Mock the tenant context module
jest.mock('../context', () => ({
  getTenantId: jest.fn(),
}));

describe('TenantContextService', () => {
  let service: TenantContextService;
  let prismaService: jest.Mocked<PrismaService>;
  let mockRequest: { tenantId?: string; user?: { tenantId?: string } };
  let loggerErrorSpy: jest.SpyInstance;

  const mockTenant = {
    id: 'tenant-123',
    name: 'Test Tenant',
    slug: 'test-tenant',
    email: 'test@tenant.com',
    phone: null,
    status: TenantStatus.ACTIVE,
    plan: SubscriptionPlan.PRO,
    wompiPaymentSourceId: null,
    wompiCustomerEmail: null,
    maxUsers: 10,
    maxProducts: 1000,
    maxInvoices: -1, // unlimited
    maxWarehouses: 5,
    maxContadores: 1,
    maxEmployees: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRequest = {
      tenantId: 'tenant-123',
      user: { tenantId: 'tenant-123' },
    };

    const mockPrismaService = {
      tenant: {
        findUnique: jest.fn(),
      },
      user: {
        count: jest.fn(),
      },
      product: {
        count: jest.fn(),
      },
      invoice: {
        count: jest.fn(),
      },
      warehouse: {
        count: jest.fn(),
      },
      employee: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContextService,
        {
          provide: REQUEST,
          useValue: mockRequest,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = await module.resolve<TenantContextService>(TenantContextService);
    prismaService = module.get(PrismaService);

    // Mock logger to suppress expected error logs during tests
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore logger after each test
    loggerErrorSpy.mockRestore();
  });

  describe('getTenantId', () => {
    it('should return tenantId from request object', () => {
      const result = service.getTenantId();
      expect(result).toBe('tenant-123');
    });

    it('should fallback to user.tenantId if request.tenantId not set', () => {
      mockRequest.tenantId = undefined;
      const result = service.getTenantId();
      expect(result).toBe('tenant-123');
    });

    it('should fallback to AsyncLocalStorage if request has no tenant info', () => {
      mockRequest.tenantId = undefined;
      mockRequest.user = undefined;
      (tenantContext.getTenantId as jest.Mock).mockReturnValue(
        'als-tenant-456',
      );

      const result = service.getTenantId();
      expect(result).toBe('als-tenant-456');
      expect(tenantContext.getTenantId).toHaveBeenCalled();
    });

    it('should return undefined if no tenant context available', () => {
      mockRequest.tenantId = undefined;
      mockRequest.user = undefined;
      (tenantContext.getTenantId as jest.Mock).mockReturnValue(undefined);

      const result = service.getTenantId();
      expect(result).toBeUndefined();
    });
  });

  describe('requireTenantId', () => {
    it('should return tenantId when available', () => {
      const result = service.requireTenantId();
      expect(result).toBe('tenant-123');
    });

    it('should throw ForbiddenException when tenantId not available', () => {
      mockRequest.tenantId = undefined;
      mockRequest.user = undefined;
      (tenantContext.getTenantId as jest.Mock).mockReturnValue(undefined);

      expect(() => service.requireTenantId()).toThrow(ForbiddenException);
      expect(() => service.requireTenantId()).toThrow(
        'Tenant context required',
      );
    });
  });

  describe('getTenant', () => {
    it('should fetch tenant from database', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );

      const result = await service.getTenant();

      expect(result).toEqual(mockTenant);
      expect(prismaService.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
      });
    });

    it('should cache tenant for subsequent calls', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );

      await service.getTenant();
      await service.getTenant();
      await service.getTenant();

      // Should only call database once
      expect(prismaService.tenant.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when tenant not found', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getTenant()).rejects.toThrow(ForbiddenException);
      await expect(service.getTenant()).rejects.toThrow('Tenant not found');
    });
  });

  describe('checkLimit', () => {
    beforeEach(() => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
    });

    it('should return true when under limit', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(5);

      const result = await service.checkLimit('users');

      expect(result).toBe(true);
      expect(prismaService.user.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123', role: { not: 'CONTADOR' } },
      });
    });

    it('should return false when at limit', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(10);

      const result = await service.checkLimit('users');

      expect(result).toBe(false);
    });

    it('should return false when over limit', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(15);

      const result = await service.checkLimit('users');

      expect(result).toBe(false);
    });

    it('should return true for unlimited resources (-1)', async () => {
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(10000);

      const result = await service.checkLimit('invoices');

      expect(result).toBe(true);
    });

    it('should check products limit correctly', async () => {
      (prismaService.product.count as jest.Mock).mockResolvedValue(500);

      const result = await service.checkLimit('products');

      expect(result).toBe(true);
      expect(prismaService.product.count).toHaveBeenCalled();
    });

    it('should check warehouses limit correctly', async () => {
      (prismaService.warehouse.count as jest.Mock).mockResolvedValue(3);

      const result = await service.checkLimit('warehouses');

      expect(result).toBe(true);
      expect(prismaService.warehouse.count).toHaveBeenCalled();
    });
  });

  describe('enforceLimit', () => {
    beforeEach(() => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
    });

    it('should not throw when under limit', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(5);

      await expect(service.enforceLimit('users')).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when limit reached', async () => {
      // PRO plan: maxUsers=10, maxContadores=1 → effective limit = 9
      (prismaService.user.count as jest.Mock).mockResolvedValue(9);

      await expect(service.enforceLimit('users')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.enforceLimit('users')).rejects.toThrow(
        'Users limit reached (9)',
      );
    });
  });

  describe('getCurrentCount', () => {
    it('should count users', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(7);

      const result = await service.getCurrentCount('users');

      expect(result).toBe(7);
    });

    it('should count products', async () => {
      (prismaService.product.count as jest.Mock).mockResolvedValue(150);

      const result = await service.getCurrentCount('products');

      expect(result).toBe(150);
    });

    it('should count invoices for current month only', async () => {
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(25);

      const result = await service.getCurrentCount('invoices');

      expect(result).toBe(25);
      expect(prismaService.invoice.count).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
          }),
        },
      });
    });

    it('should count warehouses', async () => {
      (prismaService.warehouse.count as jest.Mock).mockResolvedValue(3);

      const result = await service.getCurrentCount('warehouses');

      expect(result).toBe(3);
    });

    it('should throw error for unknown limit type', async () => {
      await expect(
        service.getCurrentCount('unknown' as LimitType),
      ).rejects.toThrow('Unknown limit type');
    });
  });

  describe('getRemainingCount', () => {
    beforeEach(() => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
    });

    it('should return remaining count', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(7);

      const result = await service.getRemainingCount('users');

      // PRO plan: maxUsers=10, maxContadores=1 → effective limit = 9; 9 - 7 = 2
      expect(result).toBe(2);
    });

    it('should return -1 for unlimited resources', async () => {
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(100);

      const result = await service.getRemainingCount('invoices');

      expect(result).toBe(-1);
    });

    it('should return 0 when at or over limit', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(15);

      const result = await service.getRemainingCount('users');

      expect(result).toBe(0);
    });
  });

  describe('isActive', () => {
    it('should return true for ACTIVE status', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );

      const result = await service.isActive();

      expect(result).toBe(true);
    });

    it('should return false for non-ACTIVE status', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
        ...mockTenant,
        status: TenantStatus.SUSPENDED,
      });

      const result = await service.isActive();

      expect(result).toBe(false);
    });
  });

  describe('canUseApplication', () => {
    it('should return true for ACTIVE status', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );

      const result = await service.canUseApplication();

      expect(result).toBe(true);
    });

    it('should return true for TRIAL status', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
        ...mockTenant,
        status: TenantStatus.TRIAL,
      });

      const result = await service.canUseApplication();

      expect(result).toBe(true);
    });

    it('should return false for SUSPENDED status', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
        ...mockTenant,
        status: TenantStatus.SUSPENDED,
      });

      const result = await service.canUseApplication();

      expect(result).toBe(false);
    });
  });

  describe('requireActiveStatus', () => {
    it('should not throw for ACTIVE status', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );

      await expect(service.requireActiveStatus()).resolves.not.toThrow();
    });

    it('should throw for SUSPENDED status', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
        ...mockTenant,
        status: TenantStatus.SUSPENDED,
      });

      await expect(service.requireActiveStatus()).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.requireActiveStatus()).rejects.toThrow('suspended');
    });

    it('should throw for INACTIVE status', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
        ...mockTenant,
        status: TenantStatus.INACTIVE,
      });

      await expect(service.requireActiveStatus()).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.requireActiveStatus()).rejects.toThrow('inactive');
    });
  });

  describe('getPlan', () => {
    it('should return the tenant plan', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );

      const result = await service.getPlan();

      expect(result).toBe('PRO');
    });
  });

  describe('getUsageSummary', () => {
    beforeEach(() => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
    });

    it('should return usage summary for all limit types', async () => {
      // user.count is called twice: once for 'users' (non-CONTADOR), once for 'contadores'
      (prismaService.user.count as jest.Mock)
        .mockResolvedValueOnce(5) // users (non-CONTADOR)
        .mockResolvedValueOnce(0); // contadores
      (prismaService.product.count as jest.Mock).mockResolvedValue(500);
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(100);
      (prismaService.warehouse.count as jest.Mock).mockResolvedValue(3);
      ((prismaService as any).employee.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getUsageSummary();

      // PRO plan: maxUsers=10, maxContadores=1 → effective user limit = 9
      expect(result).toEqual({
        users: { current: 5, limit: 9, remaining: 4 },
        contadores: { current: 0, limit: 1, remaining: 1 },
        products: { current: 500, limit: 1000, remaining: 500 },
        invoices: { current: 100, limit: -1, remaining: -1 },
        warehouses: { current: 3, limit: 5, remaining: 2 },
        employees: { current: 2, limit: 10, remaining: 8 },
      });
    });
  });

  describe('getLimit', () => {
    it('should return the limit value from tenant', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );

      const tenant = await service.getTenant();

      // PRO plan: maxUsers=10, maxContadores=1 → effective user limit = 9
      expect(service.getLimit(tenant, 'users')).toBe(9);
      expect(service.getLimit(tenant, 'contadores')).toBe(1);
      expect(service.getLimit(tenant, 'products')).toBe(1000);
      expect(service.getLimit(tenant, 'invoices')).toBe(-1);
      expect(service.getLimit(tenant, 'warehouses')).toBe(5);
    });
  });
});
