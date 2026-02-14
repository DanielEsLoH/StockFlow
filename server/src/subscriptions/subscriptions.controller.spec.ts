import { Test, TestingModule } from '@nestjs/testing';
import { Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionPlan, SubscriptionPeriod } from '@prisma/client';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import type {
  SubscriptionStatusResponse,
  CheckoutConfigResponse,
} from './subscriptions.service';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let subscriptionsService: jest.Mocked<SubscriptionsService>;

  // Test data
  const mockTenantId = 'tenant-abc-123';

  const mockSubscriptionStatus: SubscriptionStatusResponse = {
    tenantId: mockTenantId,
    plan: SubscriptionPlan.PYME,
    status: 'ACTIVE',
    periodType: SubscriptionPeriod.MONTHLY,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-02-01'),
    limits: {
      maxUsers: 5,
      maxProducts: 100,
      maxInvoices: 200,
      maxWarehouses: 2,
    },
    hasPaymentSource: true,
    daysRemaining: 15,
  };

  const mockCheckoutConfig: CheckoutConfigResponse = {
    publicKey: 'pub_test_abc123',
    reference: 'ref-tenant-abc-123-1234567890',
    amountInCents: 5990000,
    currency: 'COP',
    integrityHash: 'sha256-hash-value',
    redirectUrl: 'https://stockflow.com.co/billing',
    acceptanceToken: 'eyJhY2NlcHRhbmNl...',
    personalDataAuthToken: 'eyJwZXJzb25hbA...',
    plan: SubscriptionPlan.PYME,
    period: SubscriptionPeriod.MONTHLY,
    displayName: 'Plan PYME - Mensual',
    priceFormatted: '$59,900 COP',
  };

  const mockPlans = [
    {
      plan: 'EMPRENDEDOR',
      displayName: 'Plan Emprendedor',
      description: 'Plan gratuito para empezar',
      features: ['Funciones básicas'],
      priceMonthly: 0,
      limits: { maxUsers: 2, maxProducts: 50, maxInvoices: 100, maxWarehouses: 1 },
      prices: {
        MONTHLY: { total: 0, totalInCents: 0, monthly: 0, discount: 0 },
        QUARTERLY: { total: 0, totalInCents: 0, monthly: 0, discount: 0 },
        ANNUAL: { total: 0, totalInCents: 0, monthly: 0, discount: 0 },
      },
    },
    {
      plan: 'PYME',
      displayName: 'Plan PYME',
      description: 'Plan para pequeñas empresas',
      features: ['Multi-usuario', 'Reportes'],
      priceMonthly: 59900,
      limits: { maxUsers: 5, maxProducts: 100, maxInvoices: 200, maxWarehouses: 2 },
      prices: {
        MONTHLY: { total: 59900, totalInCents: 5990000, monthly: 59900, discount: 0 },
        QUARTERLY: { total: 161730, totalInCents: 16173000, monthly: 53910, discount: 10 },
        ANNUAL: { total: 575040, totalInCents: 57504000, monthly: 47920, discount: 20 },
      },
    },
  ];

  const mockBillingHistory = [
    {
      id: 'billing-1',
      tenantId: mockTenantId,
      wompiTransactionId: 'txn-001',
      wompiReference: 'ref-001',
      plan: SubscriptionPlan.PYME,
      period: SubscriptionPeriod.MONTHLY,
      amountInCents: 5990000,
      currency: 'COP',
      status: 'APPROVED',
      paymentMethodType: 'CARD',
      failureReason: null,
      isRecurring: false,
      subscriptionId: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 'billing-2',
      tenantId: mockTenantId,
      wompiTransactionId: 'txn-002',
      wompiReference: 'ref-002',
      plan: SubscriptionPlan.PRO,
      period: SubscriptionPeriod.QUARTERLY,
      amountInCents: 16173000,
      currency: 'COP',
      status: 'DECLINED',
      paymentMethodType: 'CARD',
      failureReason: null,
      isRecurring: false,
      subscriptionId: null,
      createdAt: new Date('2024-12-01'),
      updatedAt: new Date('2024-12-01'),
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockSubscriptionsService = {
      getSubscriptionStatus: jest.fn(),
      getPlans: jest.fn(),
      getCheckoutConfig: jest.fn(),
      verifyPayment: jest.fn(),
      createPaymentSource: jest.fn(),
      getBillingHistory: jest.fn(),
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
    subscriptionsService = module.get(SubscriptionsService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
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
  // GET /subscriptions/status
  // ============================================================================

  describe('getStatus', () => {
    it('should return the subscription status for the tenant', async () => {
      subscriptionsService.getSubscriptionStatus.mockResolvedValue(
        mockSubscriptionStatus,
      );

      const result = await controller.getStatus(mockTenantId);

      expect(result).toEqual(mockSubscriptionStatus);
    });

    it('should pass tenantId to the service', async () => {
      subscriptionsService.getSubscriptionStatus.mockResolvedValue(
        mockSubscriptionStatus,
      );

      await controller.getStatus(mockTenantId);

      expect(
        subscriptionsService.getSubscriptionStatus,
      ).toHaveBeenCalledWith(mockTenantId);
    });

    it('should call the service exactly once', async () => {
      subscriptionsService.getSubscriptionStatus.mockResolvedValue(
        mockSubscriptionStatus,
      );

      await controller.getStatus(mockTenantId);

      expect(
        subscriptionsService.getSubscriptionStatus,
      ).toHaveBeenCalledTimes(1);
    });

    it('should log the operation with the tenant ID', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      subscriptionsService.getSubscriptionStatus.mockResolvedValue(
        mockSubscriptionStatus,
      );

      await controller.getStatus(mockTenantId);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockTenantId),
      );
    });

    it('should return response with all expected fields', async () => {
      subscriptionsService.getSubscriptionStatus.mockResolvedValue(
        mockSubscriptionStatus,
      );

      const result = await controller.getStatus(mockTenantId);

      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('plan');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('periodType');
      expect(result).toHaveProperty('startDate');
      expect(result).toHaveProperty('endDate');
      expect(result).toHaveProperty('limits');
      expect(result).toHaveProperty('hasPaymentSource');
      expect(result).toHaveProperty('daysRemaining');
    });

    it('should handle tenant with no active subscription', async () => {
      const noSubscription: SubscriptionStatusResponse = {
        tenantId: mockTenantId,
        plan: null,
        status: null,
        periodType: null,
        startDate: null,
        endDate: null,
        limits: {
          maxUsers: 1,
          maxProducts: 10,
          maxInvoices: 20,
          maxWarehouses: 1,
        },
        hasPaymentSource: false,
        daysRemaining: null,
      };
      subscriptionsService.getSubscriptionStatus.mockResolvedValue(
        noSubscription,
      );

      const result = await controller.getStatus(mockTenantId);

      expect(result.plan).toBeNull();
      expect(result.status).toBeNull();
      expect(result.daysRemaining).toBeNull();
    });

    it('should propagate service errors', async () => {
      const error = new NotFoundException('Tenant not found');
      subscriptionsService.getSubscriptionStatus.mockRejectedValue(error);

      await expect(controller.getStatus(mockTenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate unexpected errors', async () => {
      const error = new Error('Database connection failed');
      subscriptionsService.getSubscriptionStatus.mockRejectedValue(error);

      await expect(controller.getStatus(mockTenantId)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  // ============================================================================
  // GET /subscriptions/plans
  // ============================================================================

  describe('getPlans', () => {
    it('should return the list of available plans', () => {
      subscriptionsService.getPlans.mockReturnValue(mockPlans as any);

      const result = controller.getPlans();

      expect(result).toEqual(mockPlans);
    });

    it('should call the service getPlans method', () => {
      subscriptionsService.getPlans.mockReturnValue(mockPlans as any);

      controller.getPlans();

      expect(subscriptionsService.getPlans).toHaveBeenCalled();
    });

    it('should call the service exactly once', () => {
      subscriptionsService.getPlans.mockReturnValue(mockPlans as any);

      controller.getPlans();

      expect(subscriptionsService.getPlans).toHaveBeenCalledTimes(1);
    });

    it('should log the operation', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      subscriptionsService.getPlans.mockReturnValue(mockPlans as any);

      controller.getPlans();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Getting available plans'),
      );
    });

    it('should return plans with pricing for all periods', () => {
      subscriptionsService.getPlans.mockReturnValue(mockPlans as any);

      const result = controller.getPlans();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return the result synchronously (no async)', () => {
      subscriptionsService.getPlans.mockReturnValue(mockPlans as any);

      const result = controller.getPlans();

      // getPlans is synchronous - not a promise
      expect(result).toBeDefined();
      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  // ============================================================================
  // POST /subscriptions/checkout-config
  // ============================================================================

  describe('getCheckoutConfig', () => {
    const checkoutDto = {
      plan: SubscriptionPlan.PYME,
      period: SubscriptionPeriod.MONTHLY,
    };

    it('should return the checkout configuration', async () => {
      subscriptionsService.getCheckoutConfig.mockResolvedValue(
        mockCheckoutConfig,
      );

      const result = await controller.getCheckoutConfig(
        mockTenantId,
        checkoutDto,
      );

      expect(result).toEqual(mockCheckoutConfig);
    });

    it('should pass tenantId, plan, and period to the service', async () => {
      subscriptionsService.getCheckoutConfig.mockResolvedValue(
        mockCheckoutConfig,
      );

      await controller.getCheckoutConfig(mockTenantId, checkoutDto);

      expect(subscriptionsService.getCheckoutConfig).toHaveBeenCalledWith(
        mockTenantId,
        SubscriptionPlan.PYME,
        SubscriptionPeriod.MONTHLY,
      );
    });

    it('should call the service exactly once', async () => {
      subscriptionsService.getCheckoutConfig.mockResolvedValue(
        mockCheckoutConfig,
      );

      await controller.getCheckoutConfig(mockTenantId, checkoutDto);

      expect(
        subscriptionsService.getCheckoutConfig,
      ).toHaveBeenCalledTimes(1);
    });

    it('should log the operation with plan and period', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      subscriptionsService.getCheckoutConfig.mockResolvedValue(
        mockCheckoutConfig,
      );

      await controller.getCheckoutConfig(mockTenantId, checkoutDto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockTenantId),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('PYME'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('MONTHLY'),
      );
    });

    it('should work with PRO plan and QUARTERLY period', async () => {
      const proQuarterlyDto = {
        plan: SubscriptionPlan.PRO,
        period: SubscriptionPeriod.QUARTERLY,
      };
      const proConfig: CheckoutConfigResponse = {
        ...mockCheckoutConfig,
        plan: SubscriptionPlan.PRO,
        period: SubscriptionPeriod.QUARTERLY,
        amountInCents: 26973000,
      };
      subscriptionsService.getCheckoutConfig.mockResolvedValue(proConfig);

      const result = await controller.getCheckoutConfig(
        mockTenantId,
        proQuarterlyDto,
      );

      expect(result.plan).toBe(SubscriptionPlan.PRO);
      expect(result.period).toBe(SubscriptionPeriod.QUARTERLY);
      expect(subscriptionsService.getCheckoutConfig).toHaveBeenCalledWith(
        mockTenantId,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.QUARTERLY,
      );
    });

    it('should work with PLUS plan and ANNUAL period', async () => {
      const plusAnnualDto = {
        plan: SubscriptionPlan.PLUS,
        period: SubscriptionPeriod.ANNUAL,
      };
      const plusConfig: CheckoutConfigResponse = {
        ...mockCheckoutConfig,
        plan: SubscriptionPlan.PLUS,
        period: SubscriptionPeriod.ANNUAL,
        amountInCents: 143880000,
      };
      subscriptionsService.getCheckoutConfig.mockResolvedValue(plusConfig);

      const result = await controller.getCheckoutConfig(
        mockTenantId,
        plusAnnualDto,
      );

      expect(result.plan).toBe(SubscriptionPlan.PLUS);
      expect(result.period).toBe(SubscriptionPeriod.ANNUAL);
    });

    it('should return response with all checkout config fields', async () => {
      subscriptionsService.getCheckoutConfig.mockResolvedValue(
        mockCheckoutConfig,
      );

      const result = await controller.getCheckoutConfig(
        mockTenantId,
        checkoutDto,
      );

      expect(result).toHaveProperty('publicKey');
      expect(result).toHaveProperty('reference');
      expect(result).toHaveProperty('amountInCents');
      expect(result).toHaveProperty('currency');
      expect(result).toHaveProperty('integrityHash');
      expect(result).toHaveProperty('redirectUrl');
      expect(result).toHaveProperty('acceptanceToken');
      expect(result).toHaveProperty('personalDataAuthToken');
      expect(result).toHaveProperty('plan');
      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('displayName');
      expect(result).toHaveProperty('priceFormatted');
    });

    it('should propagate BadRequestException from service', async () => {
      const error = new BadRequestException(
        'Cannot checkout for EMPRENDEDOR plan',
      );
      subscriptionsService.getCheckoutConfig.mockRejectedValue(error);

      await expect(
        controller.getCheckoutConfig(mockTenantId, checkoutDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new NotFoundException('Tenant not found');
      subscriptionsService.getCheckoutConfig.mockRejectedValue(error);

      await expect(
        controller.getCheckoutConfig(mockTenantId, checkoutDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected errors', async () => {
      const error = new Error('Wompi API unavailable');
      subscriptionsService.getCheckoutConfig.mockRejectedValue(error);

      await expect(
        controller.getCheckoutConfig(mockTenantId, checkoutDto),
      ).rejects.toThrow('Wompi API unavailable');
    });
  });

  // ============================================================================
  // POST /subscriptions/verify-payment
  // ============================================================================

  describe('verifyPayment', () => {
    const verifyDto = {
      transactionId: '12345-1234567890-12345',
      plan: SubscriptionPlan.PYME,
      period: SubscriptionPeriod.MONTHLY,
    };

    it('should return the updated subscription status after verification', async () => {
      subscriptionsService.verifyPayment.mockResolvedValue(
        mockSubscriptionStatus,
      );

      const result = await controller.verifyPayment(
        mockTenantId,
        verifyDto,
      );

      expect(result).toEqual(mockSubscriptionStatus);
    });

    it('should pass tenantId, transactionId, plan, and period to the service', async () => {
      subscriptionsService.verifyPayment.mockResolvedValue(
        mockSubscriptionStatus,
      );

      await controller.verifyPayment(mockTenantId, verifyDto);

      expect(subscriptionsService.verifyPayment).toHaveBeenCalledWith(
        mockTenantId,
        '12345-1234567890-12345',
        SubscriptionPlan.PYME,
        SubscriptionPeriod.MONTHLY,
      );
    });

    it('should call the service exactly once', async () => {
      subscriptionsService.verifyPayment.mockResolvedValue(
        mockSubscriptionStatus,
      );

      await controller.verifyPayment(mockTenantId, verifyDto);

      expect(subscriptionsService.verifyPayment).toHaveBeenCalledTimes(1);
    });

    it('should log the operation with tenant, transaction, plan, and period', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      subscriptionsService.verifyPayment.mockResolvedValue(
        mockSubscriptionStatus,
      );

      await controller.verifyPayment(mockTenantId, verifyDto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockTenantId),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('12345-1234567890-12345'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('PYME'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('MONTHLY'),
      );
    });

    it('should handle verification with PRO plan and ANNUAL period', async () => {
      const proAnnualDto = {
        transactionId: 'txn-pro-annual-001',
        plan: SubscriptionPlan.PRO,
        period: SubscriptionPeriod.ANNUAL,
      };
      const proStatus: SubscriptionStatusResponse = {
        ...mockSubscriptionStatus,
        plan: SubscriptionPlan.PRO,
        periodType: SubscriptionPeriod.ANNUAL,
      };
      subscriptionsService.verifyPayment.mockResolvedValue(proStatus);

      const result = await controller.verifyPayment(
        mockTenantId,
        proAnnualDto,
      );

      expect(result.plan).toBe(SubscriptionPlan.PRO);
      expect(result.periodType).toBe(SubscriptionPeriod.ANNUAL);
      expect(subscriptionsService.verifyPayment).toHaveBeenCalledWith(
        mockTenantId,
        'txn-pro-annual-001',
        SubscriptionPlan.PRO,
        SubscriptionPeriod.ANNUAL,
      );
    });

    it('should return response matching SubscriptionStatusResponse shape', async () => {
      subscriptionsService.verifyPayment.mockResolvedValue(
        mockSubscriptionStatus,
      );

      const result = await controller.verifyPayment(
        mockTenantId,
        verifyDto,
      );

      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('plan');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('limits');
      expect(result).toHaveProperty('hasPaymentSource');
      expect(result).toHaveProperty('daysRemaining');
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new NotFoundException('Tenant not found');
      subscriptionsService.verifyPayment.mockRejectedValue(error);

      await expect(
        controller.verifyPayment(mockTenantId, verifyDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException from service', async () => {
      const error = new BadRequestException('Transaction not approved');
      subscriptionsService.verifyPayment.mockRejectedValue(error);

      await expect(
        controller.verifyPayment(mockTenantId, verifyDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate unexpected errors', async () => {
      const error = new Error('Wompi verification failed');
      subscriptionsService.verifyPayment.mockRejectedValue(error);

      await expect(
        controller.verifyPayment(mockTenantId, verifyDto),
      ).rejects.toThrow('Wompi verification failed');
    });
  });

  // ============================================================================
  // POST /subscriptions/payment-source
  // ============================================================================

  describe('createPaymentSource', () => {
    const paymentSourceDto = {
      token: 'tok_test_1234567890_abcdef',
      acceptanceToken: 'eyJhY2NlcHRhbmNl...',
      personalAuthToken: 'eyJwZXJzb25hbA...',
    };

    const mockPaymentSourceResult = {
      paymentSourceId: 'ps-12345',
    };

    it('should return the created payment source ID', async () => {
      subscriptionsService.createPaymentSource.mockResolvedValue(
        mockPaymentSourceResult,
      );

      const result = await controller.createPaymentSource(
        mockTenantId,
        paymentSourceDto,
      );

      expect(result).toEqual(mockPaymentSourceResult);
    });

    it('should pass tenantId, token, acceptanceToken, and personalAuthToken to the service', async () => {
      subscriptionsService.createPaymentSource.mockResolvedValue(
        mockPaymentSourceResult,
      );

      await controller.createPaymentSource(mockTenantId, paymentSourceDto);

      expect(
        subscriptionsService.createPaymentSource,
      ).toHaveBeenCalledWith(
        mockTenantId,
        'tok_test_1234567890_abcdef',
        'eyJhY2NlcHRhbmNl...',
        'eyJwZXJzb25hbA...',
      );
    });

    it('should call the service exactly once', async () => {
      subscriptionsService.createPaymentSource.mockResolvedValue(
        mockPaymentSourceResult,
      );

      await controller.createPaymentSource(mockTenantId, paymentSourceDto);

      expect(
        subscriptionsService.createPaymentSource,
      ).toHaveBeenCalledTimes(1);
    });

    it('should log the operation with the tenant ID', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      subscriptionsService.createPaymentSource.mockResolvedValue(
        mockPaymentSourceResult,
      );

      await controller.createPaymentSource(mockTenantId, paymentSourceDto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockTenantId),
      );
    });

    it('should handle dto without optional personalAuthToken', async () => {
      const dtoWithoutPersonalAuth = {
        token: 'tok_test_1234567890_abcdef',
        acceptanceToken: 'eyJhY2NlcHRhbmNl...',
      };
      subscriptionsService.createPaymentSource.mockResolvedValue(
        mockPaymentSourceResult,
      );

      await controller.createPaymentSource(
        mockTenantId,
        dtoWithoutPersonalAuth as any,
      );

      expect(
        subscriptionsService.createPaymentSource,
      ).toHaveBeenCalledWith(
        mockTenantId,
        'tok_test_1234567890_abcdef',
        'eyJhY2NlcHRhbmNl...',
        undefined,
      );
    });

    it('should return response with paymentSourceId', async () => {
      subscriptionsService.createPaymentSource.mockResolvedValue(
        mockPaymentSourceResult,
      );

      const result = await controller.createPaymentSource(
        mockTenantId,
        paymentSourceDto,
      );

      expect(result).toHaveProperty('paymentSourceId');
      expect(typeof result.paymentSourceId).toBe('string');
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new NotFoundException('Tenant not found');
      subscriptionsService.createPaymentSource.mockRejectedValue(error);

      await expect(
        controller.createPaymentSource(mockTenantId, paymentSourceDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException from service', async () => {
      const error = new BadRequestException('Invalid card token');
      subscriptionsService.createPaymentSource.mockRejectedValue(error);

      await expect(
        controller.createPaymentSource(mockTenantId, paymentSourceDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate unexpected errors', async () => {
      const error = new Error('Wompi payment source creation failed');
      subscriptionsService.createPaymentSource.mockRejectedValue(error);

      await expect(
        controller.createPaymentSource(mockTenantId, paymentSourceDto),
      ).rejects.toThrow('Wompi payment source creation failed');
    });
  });

  // ============================================================================
  // GET /subscriptions/billing-history
  // ============================================================================

  describe('getBillingHistory', () => {
    it('should return the billing history for the tenant', async () => {
      subscriptionsService.getBillingHistory.mockResolvedValue(
        mockBillingHistory as any,
      );

      const result = await controller.getBillingHistory(mockTenantId);

      expect(result).toEqual(mockBillingHistory);
    });

    it('should pass tenantId to the service', async () => {
      subscriptionsService.getBillingHistory.mockResolvedValue(
        mockBillingHistory as any,
      );

      await controller.getBillingHistory(mockTenantId);

      expect(
        subscriptionsService.getBillingHistory,
      ).toHaveBeenCalledWith(mockTenantId);
    });

    it('should call the service exactly once', async () => {
      subscriptionsService.getBillingHistory.mockResolvedValue(
        mockBillingHistory as any,
      );

      await controller.getBillingHistory(mockTenantId);

      expect(
        subscriptionsService.getBillingHistory,
      ).toHaveBeenCalledTimes(1);
    });

    it('should log the operation with the tenant ID', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      subscriptionsService.getBillingHistory.mockResolvedValue(
        mockBillingHistory as any,
      );

      await controller.getBillingHistory(mockTenantId);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockTenantId),
      );
    });

    it('should return an empty array when no billing history exists', async () => {
      subscriptionsService.getBillingHistory.mockResolvedValue([]);

      const result = await controller.getBillingHistory(mockTenantId);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return transactions in the order provided by the service', async () => {
      subscriptionsService.getBillingHistory.mockResolvedValue(
        mockBillingHistory as any,
      );

      const result = await controller.getBillingHistory(mockTenantId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('billing-1');
      expect(result[1].id).toBe('billing-2');
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      subscriptionsService.getBillingHistory.mockRejectedValue(error);

      await expect(
        controller.getBillingHistory(mockTenantId),
      ).rejects.toThrow('Database error');
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new NotFoundException('Tenant not found');
      subscriptionsService.getBillingHistory.mockRejectedValue(error);

      await expect(
        controller.getBillingHistory(mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // GUARD & DECORATOR VERIFICATION
  // ============================================================================

  describe('guard application', () => {
    it('should have JwtAuthGuard and RolesGuard at controller level', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        SubscriptionsController,
      );

      expect(guards).toBeDefined();
      expect(guards.length).toBe(2);
    });
  });

  describe('controller methods', () => {
    it('should have all expected methods defined', () => {
      expect(controller.getStatus).toBeDefined();
      expect(controller.getPlans).toBeDefined();
      expect(controller.getCheckoutConfig).toBeDefined();
      expect(controller.verifyPayment).toBeDefined();
      expect(controller.createPaymentSource).toBeDefined();
      expect(controller.getBillingHistory).toBeDefined();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('edge cases', () => {
    it('should handle different tenant IDs correctly for getStatus', async () => {
      const differentTenantId = 'tenant-xyz-999';
      const differentStatus: SubscriptionStatusResponse = {
        ...mockSubscriptionStatus,
        tenantId: differentTenantId,
      };
      subscriptionsService.getSubscriptionStatus.mockResolvedValue(
        differentStatus,
      );

      const result = await controller.getStatus(differentTenantId);

      expect(result.tenantId).toBe(differentTenantId);
      expect(
        subscriptionsService.getSubscriptionStatus,
      ).toHaveBeenCalledWith(differentTenantId);
    });

    it('should handle EMPRENDEDOR plan in checkout config dto', async () => {
      const emprendedorDto = {
        plan: SubscriptionPlan.EMPRENDEDOR,
        period: SubscriptionPeriod.MONTHLY,
      };
      const error = new BadRequestException(
        'Cannot checkout for EMPRENDEDOR plan',
      );
      subscriptionsService.getCheckoutConfig.mockRejectedValue(error);

      await expect(
        controller.getCheckoutConfig(mockTenantId, emprendedorDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle long transaction IDs in verify-payment', async () => {
      const longTxnDto = {
        transactionId:
          'abcdef-1234567890123456789-ghijklmnopqrstuvwxyz-1234567890',
        plan: SubscriptionPlan.PYME,
        period: SubscriptionPeriod.MONTHLY,
      };
      subscriptionsService.verifyPayment.mockResolvedValue(
        mockSubscriptionStatus,
      );

      await controller.verifyPayment(mockTenantId, longTxnDto);

      expect(subscriptionsService.verifyPayment).toHaveBeenCalledWith(
        mockTenantId,
        longTxnDto.transactionId,
        SubscriptionPlan.PYME,
        SubscriptionPeriod.MONTHLY,
      );
    });

    it('should handle large billing history', async () => {
      const largeBillingHistory = Array.from({ length: 500 }, (_, i) => ({
        id: `billing-${i}`,
        tenantId: mockTenantId,
        wompiTransactionId: `txn-${i}`,
        wompiReference: `ref-${i}`,
        plan: SubscriptionPlan.PYME,
        period: SubscriptionPeriod.MONTHLY,
        amountInCents: 5990000,
        currency: 'COP',
        status: 'APPROVED',
        paymentMethodType: 'CARD',
        failureReason: null,
        isRecurring: false,
        subscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      subscriptionsService.getBillingHistory.mockResolvedValue(
        largeBillingHistory as any,
      );

      const result = await controller.getBillingHistory(mockTenantId);

      expect(result).toHaveLength(500);
    });

    it('should handle concurrent calls to different endpoints', async () => {
      subscriptionsService.getSubscriptionStatus.mockResolvedValue(
        mockSubscriptionStatus,
      );
      subscriptionsService.getPlans.mockReturnValue(mockPlans as any);
      subscriptionsService.getBillingHistory.mockResolvedValue(
        mockBillingHistory as any,
      );

      const [statusResult, plansResult, historyResult] =
        await Promise.all([
          controller.getStatus(mockTenantId),
          Promise.resolve(controller.getPlans()),
          controller.getBillingHistory(mockTenantId),
        ]);

      expect(statusResult).toEqual(mockSubscriptionStatus);
      expect(plansResult).toEqual(mockPlans);
      expect(historyResult).toEqual(mockBillingHistory);
    });
  });
});
