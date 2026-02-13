/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { LimitCheckInterceptor } from './limit-check.interceptor';
import { PrismaService } from '../../prisma/prisma.service';
import { CHECK_LIMIT_KEY } from '../decorators/check-limit.decorator';
import { LimitType } from '../services';

describe('LimitCheckInterceptor', () => {
  let interceptor: LimitCheckInterceptor;
  let reflector: jest.Mocked<Reflector>;
  let prismaService: jest.Mocked<PrismaService>;

  // Mock data
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockTenant = {
    id: mockTenantId,
    name: 'Test Tenant',
    slug: 'test-tenant',
    email: 'test@example.com',
    phone: '+1234567890',
    status: 'ACTIVE',
    plan: 'PYME',
    wompiPaymentSourceId: null,
    wompiCustomerEmail: null,
    maxUsers: 5,
    maxProducts: 100,
    maxInvoices: 50,
    maxWarehouses: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUnlimitedTenant = {
    ...mockTenant,
    plan: 'PLUS',
    maxUsers: -1,
    maxProducts: -1,
    maxInvoices: -1,
    maxWarehouses: -1,
  };

  const mockUser = {
    sub: mockUserId,
    tenantId: mockTenantId,
    email: 'user@example.com',
    role: 'USER',
  };

  const mockCallHandler: CallHandler = {
    handle: jest.fn().mockReturnValue(of({ success: true })),
  };

  // Helper to create mock execution context
  const createMockContext = (options: {
    type?: string;
    user?: object | null;
    handler?: () => void;
  }): ExecutionContext => {
    const { type = 'http', user = mockUser, handler = () => {} } = options;

    return {
      getType: jest.fn().mockReturnValue(type),
      getHandler: jest.fn().mockReturnValue(handler),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockReflector = {
      get: jest.fn(),
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LimitCheckInterceptor,
        { provide: Reflector, useValue: mockReflector },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    interceptor = module.get<LimitCheckInterceptor>(LimitCheckInterceptor);
    reflector = module.get(Reflector);
    prismaService = module.get(PrismaService);

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
      expect(interceptor).toBeDefined();
    });
  });

  describe('intercept - pass through scenarios', () => {
    it('should pass through for non-HTTP requests', async () => {
      const context = createMockContext({ type: 'rpc' });

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(reflector.get).not.toHaveBeenCalled();
    });

    it('should pass through for WebSocket requests', async () => {
      const context = createMockContext({ type: 'ws' });

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should pass through when no @CheckLimit decorator is present', async () => {
      const context = createMockContext({});
      reflector.get.mockReturnValue(undefined);

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(reflector.get).toHaveBeenCalledWith(
        CHECK_LIMIT_KEY,
        expect.any(Function),
      );
    });
  });

  describe('intercept - authentication errors', () => {
    it('should throw ForbiddenException when user is not authenticated', async () => {
      const context = createMockContext({ user: null });
      reflector.get.mockReturnValue('products' as LimitType);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow('Authentication required to perform this action');

      expect(warnSpy).toHaveBeenCalledWith(
        'LimitCheckInterceptor called without authenticated user',
      );
    });

    it('should throw ForbiddenException when user is undefined', async () => {
      const context = createMockContext({ user: undefined });
      reflector.get.mockReturnValue('products' as LimitType);

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when tenantId is missing', async () => {
      const userWithoutTenant = { ...mockUser, tenantId: undefined };
      const context = createMockContext({ user: userWithoutTenant });
      reflector.get.mockReturnValue('products' as LimitType);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow('Tenant context required to perform this action');

      expect(warnSpy).toHaveBeenCalledWith(
        'LimitCheckInterceptor called without tenant context',
      );
    });

    it('should throw ForbiddenException when tenantId is null', async () => {
      const userWithNullTenant = { ...mockUser, tenantId: null };
      const context = createMockContext({ user: userWithNullTenant });
      reflector.get.mockReturnValue('products' as LimitType);

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('intercept - tenant not found', () => {
    it('should throw ForbiddenException when tenant is not found', async () => {
      const context = createMockContext({});
      reflector.get.mockReturnValue('products' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow('Tenant not found');

      expect(errorSpy).toHaveBeenCalledWith(
        `Tenant not found: ${mockTenantId}`,
      );
    });
  });

  describe('intercept - unlimited resources', () => {
    it('should pass through when users limit is unlimited (-1)', async () => {
      const context = createMockContext({});
      reflector.get.mockReturnValue('users' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockUnlimitedTenant,
      );
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unlimited users'),
      );
    });

    it('should pass through when products limit is unlimited (-1)', async () => {
      const context = createMockContext({});
      reflector.get.mockReturnValue('products' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockUnlimitedTenant,
      );

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should pass through when invoices limit is unlimited (-1)', async () => {
      const context = createMockContext({});
      reflector.get.mockReturnValue('invoices' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockUnlimitedTenant,
      );

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should pass through when warehouses limit is unlimited (-1)', async () => {
      const context = createMockContext({});
      reflector.get.mockReturnValue('warehouses' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockUnlimitedTenant,
      );

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('intercept - users limit check', () => {
    beforeEach(() => {
      reflector.get.mockReturnValue('users' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
    });

    it('should proceed when under users limit', async () => {
      const context = createMockContext({});
      (prismaService.user.count as jest.Mock).mockResolvedValue(3); // 3/5 users

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(prismaService.user.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
    });

    it('should throw ForbiddenException when users limit is reached', async () => {
      const context = createMockContext({});
      (prismaService.user.count as jest.Mock).mockResolvedValue(5); // 5/5 users

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow('Users limit reached (5). Upgrade your plan.');
    });

    it('should throw ForbiddenException when users limit is exceeded', async () => {
      const context = createMockContext({});
      (prismaService.user.count as jest.Mock).mockResolvedValue(6); // 6/5 users

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('intercept - products limit check', () => {
    beforeEach(() => {
      reflector.get.mockReturnValue('products' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
    });

    it('should proceed when under products limit', async () => {
      const context = createMockContext({});
      (prismaService.product.count as jest.Mock).mockResolvedValue(50); // 50/100 products

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(prismaService.product.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
    });

    it('should throw ForbiddenException when products limit is reached', async () => {
      const context = createMockContext({});
      (prismaService.product.count as jest.Mock).mockResolvedValue(100); // 100/100 products

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow('Products limit reached (100). Upgrade your plan.');
    });
  });

  describe('intercept - invoices limit check', () => {
    beforeEach(() => {
      reflector.get.mockReturnValue('invoices' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
    });

    it('should proceed when under invoices limit', async () => {
      const context = createMockContext({});
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(25); // 25/50 invoices

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should count invoices for current month only', async () => {
      const context = createMockContext({});
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(25);

      await interceptor.intercept(context, mockCallHandler);

      expect(prismaService.invoice.count).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          createdAt: { gte: expect.any(Date) },
        },
      });

      // Verify the date is the start of the current month
      const callArgs = (prismaService.invoice.count as jest.Mock).mock
        .calls[0][0];
      const startOfMonthDate = callArgs.where.createdAt.gte;
      expect(startOfMonthDate.getDate()).toBe(1);
      expect(startOfMonthDate.getHours()).toBe(0);
      expect(startOfMonthDate.getMinutes()).toBe(0);
      expect(startOfMonthDate.getSeconds()).toBe(0);
    });

    it('should throw ForbiddenException when invoices limit is reached', async () => {
      const context = createMockContext({});
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(50); // 50/50 invoices

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow('Invoices limit reached (50). Upgrade your plan.');
    });
  });

  describe('intercept - warehouses limit check', () => {
    beforeEach(() => {
      reflector.get.mockReturnValue('warehouses' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
    });

    it('should proceed when under warehouses limit', async () => {
      const context = createMockContext({});
      (prismaService.warehouse.count as jest.Mock).mockResolvedValue(2); // 2/3 warehouses

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(prismaService.warehouse.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
    });

    it('should throw ForbiddenException when warehouses limit is reached', async () => {
      const context = createMockContext({});
      (prismaService.warehouse.count as jest.Mock).mockResolvedValue(3); // 3/3 warehouses

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow('Warehouses limit reached (3). Upgrade your plan.');
    });
  });

  describe('intercept - logging', () => {
    it('should log debug message when checking limits', async () => {
      const context = createMockContext({});
      reflector.get.mockReturnValue('products' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
      (prismaService.product.count as jest.Mock).mockResolvedValue(50);
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      await interceptor.intercept(context, mockCallHandler);

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Checking products limit'),
      );
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('50/100'));
    });

    it('should log debug message when limit is reached', async () => {
      const context = createMockContext({});
      reflector.get.mockReturnValue('products' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
      (prismaService.product.count as jest.Mock).mockResolvedValue(100);
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      try {
        await interceptor.intercept(context, mockCallHandler);
      } catch {
        // Expected to throw
      }

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Products limit reached'),
      );
    });
  });

  describe('intercept - edge cases', () => {
    it('should handle zero count', async () => {
      const context = createMockContext({});
      reflector.get.mockReturnValue('products' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle limit of 1', async () => {
      const tenantWithMinLimit = { ...mockTenant, maxProducts: 1 };
      const context = createMockContext({});
      reflector.get.mockReturnValue('products' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        tenantWithMinLimit,
      );
      (prismaService.product.count as jest.Mock).mockResolvedValue(1);

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow('Products limit reached (1). Upgrade your plan.');
    });

    it('should handle limit of 0 (effectively disabled)', async () => {
      const tenantWithZeroLimit = { ...mockTenant, maxProducts: 0 };
      const context = createMockContext({});
      reflector.get.mockReturnValue('products' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        tenantWithZeroLimit,
      );
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow('Products limit reached (0). Upgrade your plan.');
    });

    it('should allow request when count is exactly one below limit', async () => {
      const context = createMockContext({});
      reflector.get.mockReturnValue('users' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
      (prismaService.user.count as jest.Mock).mockResolvedValue(4); // 4/5, one below limit

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('intercept - handler returns value', () => {
    it('should return the handler result when limit check passes', async () => {
      const context = createMockContext({});
      reflector.get.mockReturnValue('products' as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
      (prismaService.product.count as jest.Mock).mockResolvedValue(10);

      const expectedResult = { id: '123', name: 'New Product' };
      const handlerMock = {
        handle: jest.fn().mockReturnValue(of(expectedResult)),
      };

      const result = await interceptor.intercept(context, handlerMock);

      expect(result).toBeDefined();
      // The result is an Observable, so we can subscribe to verify the value
      let receivedValue: unknown;
      result.subscribe((value) => {
        receivedValue = value;
      });
      expect(receivedValue).toEqual(expectedResult);
    });
  });

  describe('intercept - unknown limit type handling', () => {
    it('should throw error for unknown limit type in getLimitValue', async () => {
      const context = createMockContext({});
      // Force an invalid limit type to test the default case in getLimitValue
      reflector.get.mockReturnValue('unknownType' as unknown as LimitType);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );

      // getLimitValue throws an error for unknown limit types
      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow('Unknown limit type');
    });
  });
});
