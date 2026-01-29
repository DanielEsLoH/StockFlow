import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import type {
  SubscriptionStatus,
  CheckoutSessionResponse,
  PortalSessionResponse,
} from './subscriptions.service';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let service: jest.Mocked<SubscriptionsService>;

  // Test data
  const mockTenantId = 'tenant-123';

  const mockSubscriptionStatus: SubscriptionStatus = {
    tenantId: mockTenantId,
    plan: 'PYME' as SubscriptionPlan,
    stripeCustomerId: 'cus_test123',
    stripeSubscriptionId: 'sub_test123',
    limits: {
      maxUsers: 5,
      maxProducts: 1000,
      maxInvoices: -1,
      maxWarehouses: 3,
    },
    stripeSubscriptionStatus: 'active',
    currentPeriodEnd: new Date('2024-02-15'),
    cancelAtPeriodEnd: false,
  };

  const mockCheckoutResponse: CheckoutSessionResponse = {
    sessionId: 'cs_test123',
    url: 'https://checkout.stripe.com/pay/cs_test123',
  };

  const mockPortalResponse: PortalSessionResponse = {
    url: 'https://billing.stripe.com/p/session/test123',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockSubscriptionsService = {
      getSubscriptionStatus: jest
        .fn()
        .mockResolvedValue(mockSubscriptionStatus),
      createCheckoutSession: jest.fn().mockResolvedValue(mockCheckoutResponse),
      createPortalSession: jest.fn().mockResolvedValue(mockPortalResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
      ],
    }).compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
    service = module.get(SubscriptionsService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ============================================================================
  // GET STATUS
  // ============================================================================

  describe('getStatus', () => {
    it('should return subscription status', async () => {
      const result = await controller.getStatus(mockTenantId);

      expect(result).toEqual(mockSubscriptionStatus);
      expect(service.getSubscriptionStatus).toHaveBeenCalledWith(mockTenantId);
    });

    it('should log the request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await controller.getStatus(mockTenantId);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Getting subscription status'),
      );
    });

    it('should pass through service errors', async () => {
      const error = new Error('Service error');
      service.getSubscriptionStatus.mockRejectedValue(error);

      await expect(controller.getStatus(mockTenantId)).rejects.toThrow(error);
    });
  });

  // ============================================================================
  // CREATE CHECKOUT
  // ============================================================================

  describe('createCheckout', () => {
    it('should create checkout session for BASIC plan', async () => {
      const dto = { plan: 'PYME' as SubscriptionPlan };

      const result = await controller.createCheckout(mockTenantId, dto);

      expect(result).toEqual(mockCheckoutResponse);
      expect(service.createCheckoutSession).toHaveBeenCalledWith(
        mockTenantId,
        'PYME',
      );
    });

    it('should create checkout session for PRO plan', async () => {
      const dto = { plan: 'PRO' as SubscriptionPlan };

      const result = await controller.createCheckout(mockTenantId, dto);

      expect(result).toEqual(mockCheckoutResponse);
      expect(service.createCheckoutSession).toHaveBeenCalledWith(
        mockTenantId,
        'PRO',
      );
    });

    it('should create checkout session for ENTERPRISE plan', async () => {
      const dto = { plan: 'PLUS' as SubscriptionPlan };

      const result = await controller.createCheckout(mockTenantId, dto);

      expect(result).toEqual(mockCheckoutResponse);
      expect(service.createCheckoutSession).toHaveBeenCalledWith(
        mockTenantId,
        'PLUS',
      );
    });

    it('should log the request with plan', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const dto = { plan: 'PRO' as SubscriptionPlan };

      await controller.createCheckout(mockTenantId, dto);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('PRO'));
    });

    it('should pass through service errors', async () => {
      const error = new Error('Service error');
      service.createCheckoutSession.mockRejectedValue(error);
      const dto = { plan: 'PYME' as SubscriptionPlan };

      await expect(
        controller.createCheckout(mockTenantId, dto),
      ).rejects.toThrow(error);
    });
  });

  // ============================================================================
  // CREATE PORTAL
  // ============================================================================

  describe('createPortal', () => {
    it('should create portal session without return URL', async () => {
      const dto = {};

      const result = await controller.createPortal(mockTenantId, dto);

      expect(result).toEqual(mockPortalResponse);
      expect(service.createPortalSession).toHaveBeenCalledWith(
        mockTenantId,
        undefined,
      );
    });

    it('should create portal session with custom return URL', async () => {
      const customUrl = 'https://app.stockflow.com/settings';
      const dto = { returnUrl: customUrl };

      const result = await controller.createPortal(mockTenantId, dto);

      expect(result).toEqual(mockPortalResponse);
      expect(service.createPortalSession).toHaveBeenCalledWith(
        mockTenantId,
        customUrl,
      );
    });

    it('should log the request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const dto = {};

      await controller.createPortal(mockTenantId, dto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Creating portal session'),
      );
    });

    it('should pass through service errors', async () => {
      const error = new Error('Service error');
      service.createPortalSession.mockRejectedValue(error);
      const dto = {};

      await expect(controller.createPortal(mockTenantId, dto)).rejects.toThrow(
        error,
      );
    });
  });
});
