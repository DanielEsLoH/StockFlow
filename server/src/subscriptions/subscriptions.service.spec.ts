import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  SubscriptionPlan,
  SubscriptionPeriod,
  SubscriptionStatus,
  BillingStatus,
  NotificationType,
  NotificationPriority,
} from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../prisma';
import { WompiService } from './wompi.service';
import { PLAN_LIMITS, calculatePlanPrice } from './plan-limits';

// =============================================================================
// Mock Factories
// =============================================================================

const TENANT_ID = 'tenant-abc-123';
const TRANSACTION_ID = 'wompi-tx-456';
const BILLING_TX_ID = 'billing-tx-789';
const SUBSCRIPTION_ID = 'sub-001';
const FRONTEND_URL = 'https://stockflow.com.co';

function createMockTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: TENANT_ID,
    name: 'Test Company',
    email: 'company@test.com',
    plan: SubscriptionPlan.PRO,
    maxUsers: 4,
    maxProducts: -1,
    maxInvoices: -1,
    maxWarehouses: 10,
    wompiPaymentSourceId: '12345',
    wompiCustomerEmail: 'billing@test.com',
    subscription: null,
    ...overrides,
  };
}

function createMockSubscription(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: SUBSCRIPTION_ID,
    tenantId: TENANT_ID,
    plan: SubscriptionPlan.PRO,
    status: SubscriptionStatus.ACTIVE,
    periodType: SubscriptionPeriod.MONTHLY,
    startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
    suspendedAt: null,
    suspendedReason: null,
    ...overrides,
  };
}

function createMockWompiTransaction(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: TRANSACTION_ID,
    status: 'APPROVED' as const,
    reference: `SF-${TENANT_ID.slice(0, 8)}-1234567890`,
    amount_in_cents: 21990000,
    currency: 'COP',
    payment_method_type: 'CARD',
    customer_email: 'billing@test.com',
    created_at: new Date().toISOString(),
    status_message: null,
    ...overrides,
  };
}

function createMockBillingTransaction(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: BILLING_TX_ID,
    tenantId: TENANT_ID,
    subscriptionId: null,
    wompiTransactionId: TRANSACTION_ID,
    wompiReference: `SF-${TENANT_ID.slice(0, 8)}-1234567890`,
    plan: SubscriptionPlan.PRO,
    period: SubscriptionPeriod.MONTHLY,
    amountInCents: 21990000,
    currency: 'COP',
    status: BillingStatus.APPROVED,
    paymentMethodType: 'CARD',
    failureReason: null,
    isRecurring: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  // Prisma mock (top-level, used directly in tests)
  let prisma: {
    tenant: { findUnique: jest.Mock; update: jest.Mock };
    user: { count: jest.Mock };
    invitation: { count: jest.Mock };
    warehouse: { count: jest.Mock };
    billingTransaction: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    subscription: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    notification: { create: jest.Mock };
    executeInTransaction: jest.Mock;
  };

  // Prisma transaction mock (used inside executeInTransaction callback)
  let prismaTx: {
    subscription: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    tenant: { update: jest.Mock };
    billingTransaction: { update: jest.Mock };
    notification: { create: jest.Mock };
  };

  // WompiService mock
  let wompiService: {
    generateIntegrityHash: jest.Mock;
    getMerchantInfo: jest.Mock;
    getPublicKey: jest.Mock;
    getTransaction: jest.Mock;
    createPaymentSource: jest.Mock;
    createTransaction: jest.Mock;
    verifyWebhookSignature: jest.Mock;
  };

  // ConfigService mock
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    prismaTx = {
      subscription: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      tenant: { update: jest.fn() },
      billingTransaction: { update: jest.fn() },
      notification: { create: jest.fn() },
    };

    prisma = {
      tenant: { findUnique: jest.fn(), update: jest.fn() },
      user: { count: jest.fn().mockResolvedValue(0) },
      invitation: { count: jest.fn().mockResolvedValue(0) },
      warehouse: { count: jest.fn().mockResolvedValue(0) },
      billingTransaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      subscription: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      notification: { create: jest.fn() },
      executeInTransaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prismaTx);
      }),
    };

    wompiService = {
      generateIntegrityHash: jest.fn().mockReturnValue('mock-hash-abc123'),
      getMerchantInfo: jest.fn().mockResolvedValue({
        id: 1,
        name: 'StockFlow',
        legal_name: 'StockFlow SAS',
        presigned_acceptance: {
          acceptance_token: 'accept-token-123',
          permalink: 'https://wompi.co/acceptance',
          type: 'END_USER_POLICY',
        },
        presigned_personal_data_auth: {
          acceptance_token: 'personal-auth-token-456',
          permalink: 'https://wompi.co/personal',
          type: 'PERSONAL_DATA_AUTH',
        },
      }),
      getPublicKey: jest.fn().mockReturnValue('pub_test_key_123'),
      getTransaction: jest.fn(),
      createPaymentSource: jest.fn(),
      createTransaction: jest.fn(),
      verifyWebhookSignature: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue(FRONTEND_URL),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        { provide: WompiService, useValue: wompiService },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===========================================================================
  // getSubscriptionStatus
  // ===========================================================================

  describe('getSubscriptionStatus', () => {
    it('should return subscription status for a tenant with an active subscription', async () => {
      const subscription = createMockSubscription();
      const tenant = createMockTenant({ subscription });

      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.getSubscriptionStatus(TENANT_ID);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        include: { subscription: true },
      });
      expect(result.tenantId).toBe(TENANT_ID);
      expect(result.plan).toBe(SubscriptionPlan.PRO);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.periodType).toBe(SubscriptionPeriod.MONTHLY);
      expect(result.startDate).toBe(subscription.startDate);
      expect(result.endDate).toBe(subscription.endDate);
      expect(result.hasPaymentSource).toBe(true);
      expect(result.limits).toEqual({
        maxUsers: 4,
        maxProducts: -1,
        maxInvoices: -1,
        maxWarehouses: 10,
      });
      expect(result.usage).toEqual({
        users: { current: 0, limit: 3 },
        contadores: { current: 0, limit: 1 },
        warehouses: { current: 0, limit: 10 },
      });
      expect(typeof result.daysRemaining).toBe('number');
      expect(result.daysRemaining).toBeGreaterThan(0);
    });

    it('should return null fields when tenant has no subscription', async () => {
      const tenant = createMockTenant({
        subscription: null,
        wompiPaymentSourceId: null,
      });

      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.getSubscriptionStatus(TENANT_ID);

      expect(result.status).toBeNull();
      expect(result.periodType).toBeNull();
      expect(result.startDate).toBeNull();
      expect(result.endDate).toBeNull();
      expect(result.daysRemaining).toBeNull();
      expect(result.hasPaymentSource).toBe(false);
      expect(result.usage).toEqual({
        users: { current: 0, limit: 3 },
        contadores: { current: 0, limit: 1 },
        warehouses: { current: 0, limit: 10 },
      });
    });

    it('should calculate daysRemaining correctly for a future endDate', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      const subscription = createMockSubscription({ endDate: futureDate });
      const tenant = createMockTenant({ subscription });

      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.getSubscriptionStatus(TENANT_ID);

      // Should be 15 or 16 depending on time of day (Math.ceil)
      expect(result.daysRemaining).toBeGreaterThanOrEqual(14);
      expect(result.daysRemaining).toBeLessThanOrEqual(16);
    });

    it('should return daysRemaining as 0 when subscription has expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const subscription = createMockSubscription({ endDate: pastDate });
      const tenant = createMockTenant({ subscription });

      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.getSubscriptionStatus(TENANT_ID);

      expect(result.daysRemaining).toBe(0);
    });

    it('should return daysRemaining as null when subscription has no endDate', async () => {
      const subscription = createMockSubscription({ endDate: null });
      const tenant = createMockTenant({ subscription });

      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.getSubscriptionStatus(TENANT_ID);

      expect(result.daysRemaining).toBeNull();
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.getSubscriptionStatus('nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================================================
  // getPlans
  // ===========================================================================

  describe('getPlans', () => {
    it('should return all plans from PLAN_LIMITS', () => {
      const plans = service.getPlans();

      expect(plans).toHaveLength(Object.keys(PLAN_LIMITS).length);
    });

    it('should include plan metadata for each plan', () => {
      const plans = service.getPlans();

      for (const planInfo of plans) {
        expect(planInfo).toHaveProperty('plan');
        expect(planInfo).toHaveProperty('displayName');
        expect(planInfo).toHaveProperty('description');
        expect(planInfo).toHaveProperty('features');
        expect(planInfo).toHaveProperty('priceMonthly');
        expect(planInfo).toHaveProperty('limits');
        expect(planInfo).toHaveProperty('prices');
      }
    });

    it('should include prices for all periods in each plan', () => {
      const plans = service.getPlans();
      const periods = Object.values(SubscriptionPeriod);

      for (const planInfo of plans) {
        for (const period of periods) {
          expect(planInfo.prices[period]).toBeDefined();
          expect(planInfo.prices[period]).toHaveProperty('total');
          expect(planInfo.prices[period]).toHaveProperty('totalInCents');
          expect(planInfo.prices[period]).toHaveProperty('monthly');
          expect(planInfo.prices[period]).toHaveProperty('discount');
        }
      }
    });

    it('should calculate totalInCents as total * 100', () => {
      const plans = service.getPlans();

      for (const planInfo of plans) {
        for (const period of Object.values(SubscriptionPeriod)) {
          expect(planInfo.prices[period].totalInCents).toBe(
            planInfo.prices[period].total * 100,
          );
        }
      }
    });

    it('should apply discounts for quarterly and annual periods', () => {
      const plans = service.getPlans();

      for (const planInfo of plans) {
        expect(planInfo.prices.MONTHLY.discount).toBe(0);
        expect(planInfo.prices.QUARTERLY.discount).toBe(0.1);
        expect(planInfo.prices.ANNUAL.discount).toBe(0.2);
      }
    });

    it('should include correct limits for the PRO plan', () => {
      const plans = service.getPlans();
      const proPlan = plans.find((p) => p.plan === SubscriptionPlan.PRO);

      expect(proPlan).toBeDefined();
      expect(proPlan!.limits).toEqual({
        maxUsers: 4,
        maxWarehouses: 10,
        maxProducts: -1,
        maxInvoices: -1,
      });
    });
  });

  // ===========================================================================
  // getCheckoutConfig
  // ===========================================================================

  describe('getCheckoutConfig', () => {
    it('should return a complete checkout configuration', async () => {
      const tenant = createMockTenant();
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.getCheckoutConfig(
        TENANT_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      expect(result.publicKey).toBe('pub_test_key_123');
      expect(result.reference).toMatch(
        new RegExp(`^SF-${TENANT_ID.slice(0, 8)}-\\d+$`),
      );
      expect(result.amountInCents).toBe(
        calculatePlanPrice(SubscriptionPlan.PRO, SubscriptionPeriod.MONTHLY) *
          100,
      );
      expect(result.currency).toBe('COP');
      expect(result.integrityHash).toBe('mock-hash-abc123');
      expect(result.redirectUrl).toBe(`${FRONTEND_URL}/billing?success=true`);
      expect(result.acceptanceToken).toBe('accept-token-123');
      expect(result.personalDataAuthToken).toBe('personal-auth-token-456');
      expect(result.plan).toBe(SubscriptionPlan.PRO);
      expect(result.period).toBe(SubscriptionPeriod.MONTHLY);
      expect(result.displayName).toBe('Pro');
      expect(typeof result.priceFormatted).toBe('string');
    });

    it('should call wompiService methods with correct arguments', async () => {
      const tenant = createMockTenant();
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      await service.getCheckoutConfig(
        TENANT_ID,
        SubscriptionPlan.PYME,
        SubscriptionPeriod.QUARTERLY,
      );

      const expectedPrice =
        calculatePlanPrice(SubscriptionPlan.PYME, SubscriptionPeriod.QUARTERLY) *
        100;

      expect(wompiService.generateIntegrityHash).toHaveBeenCalledWith(
        expect.stringMatching(/^SF-/),
        expectedPrice,
        'COP',
      );
      expect(wompiService.getMerchantInfo).toHaveBeenCalled();
      expect(wompiService.getPublicKey).toHaveBeenCalled();
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.getCheckoutConfig(
          'nonexistent-id',
          SubscriptionPlan.PRO,
          SubscriptionPeriod.MONTHLY,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use FRONTEND_URL from config for redirectUrl', async () => {
      const tenant = createMockTenant();
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.getCheckoutConfig(
        TENANT_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      expect(result.redirectUrl).toContain(FRONTEND_URL);
    });
  });

  // ===========================================================================
  // verifyPayment
  // ===========================================================================

  describe('verifyPayment', () => {
    it('should activate subscription when APPROVED and different plan', async () => {
      const tenant = createMockTenant({ plan: SubscriptionPlan.PYME });
      // First call: verifyPayment lookup. Second call: getSubscriptionStatus at end.
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({
          ...tenant,
          plan: SubscriptionPlan.PRO,
          subscription: createMockSubscription(),
        });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(
        createMockSubscription(),
      );

      const result = await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      // Should have called activateSubscription (via executeInTransaction)
      expect(prisma.executeInTransaction).toHaveBeenCalled();
      expect(prismaTx.subscription.upsert).toHaveBeenCalled();
      expect(prismaTx.tenant.update).toHaveBeenCalled();
      expect(prismaTx.notification.create).toHaveBeenCalled();
      expect(result.tenantId).toBe(TENANT_ID);
    });

    it('should extend subscription when APPROVED and same plan (renewal)', async () => {
      const tenant = createMockTenant({ plan: SubscriptionPlan.PRO });
      const subscription = createMockSubscription();
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({
          ...tenant,
          subscription,
        });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(subscription);

      const result = await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      // Should have called extendSubscription (via executeInTransaction)
      expect(prisma.executeInTransaction).toHaveBeenCalled();
      expect(prismaTx.subscription.update).toHaveBeenCalled();
      expect(prismaTx.notification.create).toHaveBeenCalled();
      expect(result.tenantId).toBe(TENANT_ID);
    });

    it('should activate subscription when APPROVED and tenant has null plan', async () => {
      const tenant = createMockTenant({ plan: null });
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({
          ...tenant,
          plan: SubscriptionPlan.PRO,
          subscription: createMockSubscription(),
        });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(
        createMockSubscription(),
      );

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      // tenant.plan is null, so hasActiveSubscription is false -> activateSubscription
      expect(prismaTx.subscription.upsert).toHaveBeenCalled();
    });

    it('should create billing transaction but NOT activate when DECLINED', async () => {
      const tenant = createMockTenant();
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({
          ...tenant,
          subscription: createMockSubscription(),
        });

      const wompiTx = createMockWompiTransaction({ status: 'DECLINED' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction({
        status: BillingStatus.DECLINED,
      });
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      expect(prisma.billingTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: BillingStatus.DECLINED }),
        }),
      );
      expect(prisma.executeInTransaction).not.toHaveBeenCalled();
    });

    it('should create billing transaction but NOT activate when ERROR', async () => {
      const tenant = createMockTenant();
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({
          ...tenant,
          subscription: createMockSubscription(),
        });

      const wompiTx = createMockWompiTransaction({ status: 'ERROR' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction({
        status: BillingStatus.ERROR,
      });
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      expect(prisma.billingTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: BillingStatus.ERROR }),
        }),
      );
      expect(prisma.executeInTransaction).not.toHaveBeenCalled();
    });

    it('should map unknown Wompi status to ERROR', async () => {
      const tenant = createMockTenant();
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({
          ...tenant,
          subscription: createMockSubscription(),
        });

      const wompiTx = createMockWompiTransaction({
        status: 'UNKNOWN_STATUS',
      });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction({
        status: BillingStatus.ERROR,
      });
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      expect(prisma.billingTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: BillingStatus.ERROR }),
        }),
      );
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyPayment(
          'nonexistent-id',
          TRANSACTION_ID,
          SubscriptionPlan.PRO,
          SubscriptionPeriod.MONTHLY,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException when Wompi getTransaction fails', async () => {
      const tenant = createMockTenant();
      prisma.tenant.findUnique.mockResolvedValue(tenant);
      wompiService.getTransaction.mockRejectedValue(
        new Error('Wompi API timeout'),
      );

      await expect(
        service.verifyPayment(
          TENANT_ID,
          TRANSACTION_ID,
          SubscriptionPlan.PRO,
          SubscriptionPeriod.MONTHLY,
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should store correct billing transaction data', async () => {
      const tenant = createMockTenant();
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({
          ...tenant,
          subscription: createMockSubscription(),
        });

      const wompiTx = createMockWompiTransaction({
        status: 'APPROVED',
        payment_method_type: 'NEQUI',
        status_message: null,
      });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(
        createMockSubscription(),
      );

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PYME,
        SubscriptionPeriod.QUARTERLY,
      );

      expect(prisma.billingTransaction.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          wompiTransactionId: wompiTx.id,
          wompiReference: wompiTx.reference,
          plan: SubscriptionPlan.PYME,
          period: SubscriptionPeriod.QUARTERLY,
          amountInCents: wompiTx.amount_in_cents,
          currency: wompiTx.currency,
          status: BillingStatus.APPROVED,
          paymentMethodType: 'NEQUI',
          failureReason: null,
          isRecurring: false,
        },
      });
    });

    it('should pass customer_email to activateSubscription from Wompi transaction', async () => {
      const tenant = createMockTenant({ plan: SubscriptionPlan.PYME });
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({
          ...tenant,
          plan: SubscriptionPlan.PRO,
          subscription: createMockSubscription(),
        });

      const wompiTx = createMockWompiTransaction({
        status: 'APPROVED',
        customer_email: 'new-email@test.com',
      });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(
        createMockSubscription(),
      );

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      // activateSubscription should update tenant with customerEmail
      expect(prismaTx.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            wompiCustomerEmail: 'new-email@test.com',
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // createPaymentSource
  // ===========================================================================

  describe('createPaymentSource', () => {
    it('should create a payment source and store it on the tenant', async () => {
      const tenant = createMockTenant();
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      wompiService.createPaymentSource.mockResolvedValue({
        id: 98765,
        type: 'CARD',
        status: 'AVAILABLE',
        customer_email: 'billing@test.com',
      });

      const result = await service.createPaymentSource(
        TENANT_ID,
        'card-token-abc',
        'accept-token',
      );

      expect(wompiService.createPaymentSource).toHaveBeenCalledWith(
        'card-token-abc',
        'billing@test.com', // wompiCustomerEmail takes priority
        'accept-token',
        undefined,
      );

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { wompiPaymentSourceId: '98765' },
      });

      expect(result).toEqual({ paymentSourceId: '98765' });
    });

    it('should use tenant email when wompiCustomerEmail is null', async () => {
      const tenant = createMockTenant({ wompiCustomerEmail: null });
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      wompiService.createPaymentSource.mockResolvedValue({
        id: 11111,
        type: 'CARD',
        status: 'AVAILABLE',
        customer_email: 'company@test.com',
      });

      await service.createPaymentSource(
        TENANT_ID,
        'token',
        'accept',
      );

      expect(wompiService.createPaymentSource).toHaveBeenCalledWith(
        'token',
        'company@test.com', // falls back to tenant.email
        'accept',
        undefined,
      );
    });

    it('should pass personalAuthToken to WompiService when provided', async () => {
      const tenant = createMockTenant();
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      wompiService.createPaymentSource.mockResolvedValue({
        id: 22222,
        type: 'CARD',
        status: 'AVAILABLE',
        customer_email: 'billing@test.com',
      });

      await service.createPaymentSource(
        TENANT_ID,
        'token',
        'accept',
        'personal-auth',
      );

      expect(wompiService.createPaymentSource).toHaveBeenCalledWith(
        'token',
        'billing@test.com',
        'accept',
        'personal-auth',
      );
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentSource('nonexistent', 'token', 'accept'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException when Wompi fails', async () => {
      const tenant = createMockTenant();
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      wompiService.createPaymentSource.mockRejectedValue(
        new Error('Wompi API error: 422 Unprocessable Entity'),
      );

      await expect(
        service.createPaymentSource(TENANT_ID, 'bad-token', 'accept'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle non-Error exceptions from Wompi', async () => {
      const tenant = createMockTenant();
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      wompiService.createPaymentSource.mockRejectedValue('string error');

      await expect(
        service.createPaymentSource(TENANT_ID, 'token', 'accept'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ===========================================================================
  // chargeRecurring
  // ===========================================================================

  describe('chargeRecurring', () => {
    it('should charge and extend subscription when APPROVED', async () => {
      const subscription = createMockSubscription();
      const tenant = createMockTenant({ subscription });

      // First call: chargeRecurring lookup. Second call: getSubscriptionStatus at end.
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({ ...tenant, subscription });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.createTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction({ isRecurring: true });
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(subscription);

      const result = await service.chargeRecurring(TENANT_ID);

      expect(wompiService.getMerchantInfo).toHaveBeenCalled();
      expect(wompiService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amountInCents: expect.any(Number),
          currency: 'COP',
          customerEmail: 'billing@test.com',
          reference: expect.stringMatching(/^SF-/),
          paymentSourceId: 12345,
          acceptanceToken: 'accept-token-123',
          recurrent: true,
        }),
      );

      expect(prisma.billingTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isRecurring: true,
          subscriptionId: subscription.id,
        }),
      });

      // extendSubscription should have been called
      expect(prisma.executeInTransaction).toHaveBeenCalled();
      expect(result.tenantId).toBe(TENANT_ID);
    });

    it('should create billing transaction but NOT extend when DECLINED', async () => {
      const subscription = createMockSubscription();
      const tenant = createMockTenant({ subscription });

      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({ ...tenant, subscription });

      const wompiTx = createMockWompiTransaction({ status: 'DECLINED' });
      wompiService.createTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction({
        status: BillingStatus.DECLINED,
        isRecurring: true,
      });
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      await service.chargeRecurring(TENANT_ID);

      expect(prisma.billingTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: BillingStatus.DECLINED }),
      });
      expect(prisma.executeInTransaction).not.toHaveBeenCalled();
    });

    it('should use tenant email when wompiCustomerEmail is null', async () => {
      const subscription = createMockSubscription();
      const tenant = createMockTenant({
        subscription,
        wompiCustomerEmail: null,
      });

      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({ ...tenant, subscription });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.createTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction({ isRecurring: true });
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(subscription);

      await service.chargeRecurring(TENANT_ID);

      expect(wompiService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          customerEmail: 'company@test.com',
        }),
      );
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.chargeRecurring('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when tenant has no subscription', async () => {
      const tenant = createMockTenant({ subscription: null });
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      await expect(service.chargeRecurring(TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when tenant has no payment source', async () => {
      const subscription = createMockSubscription();
      const tenant = createMockTenant({
        subscription,
        wompiPaymentSourceId: null,
      });
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      await expect(service.chargeRecurring(TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException when Wompi createTransaction fails', async () => {
      const subscription = createMockSubscription();
      const tenant = createMockTenant({ subscription });
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      wompiService.createTransaction.mockRejectedValue(
        new Error('Wompi timeout'),
      );

      await expect(service.chargeRecurring(TENANT_ID)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should calculate correct amount based on subscription plan and period', async () => {
      const subscription = createMockSubscription({
        plan: SubscriptionPlan.PYME,
        periodType: SubscriptionPeriod.ANNUAL,
      });
      const tenant = createMockTenant({ subscription });

      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({ ...tenant, subscription });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.createTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction({ isRecurring: true });
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(subscription);

      await service.chargeRecurring(TENANT_ID);

      const expectedPrice = calculatePlanPrice(
        SubscriptionPlan.PYME,
        SubscriptionPeriod.ANNUAL,
      );

      expect(wompiService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amountInCents: expectedPrice * 100,
        }),
      );
    });
  });

  // ===========================================================================
  // handleWebhook
  // ===========================================================================

  describe('handleWebhook', () => {
    it('should throw BadRequestException for invalid signature', async () => {
      wompiService.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleWebhook({ event: 'transaction.updated', data: {} }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process transaction.updated event with APPROVED status (newly approved)', async () => {
      wompiService.verifyWebhookSignature.mockReturnValue(true);

      const existingBillingTx = createMockBillingTransaction({
        status: BillingStatus.PENDING,
      });
      prisma.billingTransaction.findUnique.mockResolvedValue(existingBillingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(
        createMockSubscription(),
      );

      const webhookBody = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: TRANSACTION_ID,
            status: 'APPROVED',
            payment_method_type: 'CARD',
            status_message: null,
            customer_email: 'buyer@test.com',
          },
        },
        timestamp: Date.now(),
        signature: { properties: [], checksum: 'valid' },
      };

      await service.handleWebhook(webhookBody);

      // Should update the billing transaction status
      expect(prisma.billingTransaction.update).toHaveBeenCalledWith({
        where: { wompiTransactionId: TRANSACTION_ID },
        data: expect.objectContaining({ status: BillingStatus.APPROVED }),
      });

      // Should activate subscription (newly APPROVED)
      expect(prisma.executeInTransaction).toHaveBeenCalled();
      expect(prismaTx.subscription.upsert).toHaveBeenCalled();
    });

    it('should update billing transaction but NOT activate when status is DECLINED', async () => {
      wompiService.verifyWebhookSignature.mockReturnValue(true);

      const existingBillingTx = createMockBillingTransaction({
        status: BillingStatus.PENDING,
      });
      prisma.billingTransaction.findUnique.mockResolvedValue(existingBillingTx);

      const webhookBody = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: TRANSACTION_ID,
            status: 'DECLINED',
            payment_method_type: 'CARD',
            status_message: 'Insufficient funds',
          },
        },
        timestamp: Date.now(),
        signature: { properties: [], checksum: 'valid' },
      };

      await service.handleWebhook(webhookBody);

      expect(prisma.billingTransaction.update).toHaveBeenCalledWith({
        where: { wompiTransactionId: TRANSACTION_ID },
        data: expect.objectContaining({
          status: BillingStatus.DECLINED,
          failureReason: 'Insufficient funds',
        }),
      });
      expect(prisma.executeInTransaction).not.toHaveBeenCalled();
    });

    it('should NOT re-activate when transaction was already APPROVED', async () => {
      wompiService.verifyWebhookSignature.mockReturnValue(true);

      const existingBillingTx = createMockBillingTransaction({
        status: BillingStatus.APPROVED,
      });
      prisma.billingTransaction.findUnique.mockResolvedValue(existingBillingTx);

      const webhookBody = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: TRANSACTION_ID,
            status: 'APPROVED',
            payment_method_type: 'CARD',
            status_message: null,
          },
        },
        timestamp: Date.now(),
        signature: { properties: [], checksum: 'valid' },
      };

      await service.handleWebhook(webhookBody);

      expect(prisma.billingTransaction.update).toHaveBeenCalled();
      // Should NOT activate because previousStatus was already APPROVED
      expect(prisma.executeInTransaction).not.toHaveBeenCalled();
    });

    it('should handle transaction.updated when no billing transaction found', async () => {
      wompiService.verifyWebhookSignature.mockReturnValue(true);

      prisma.billingTransaction.findUnique.mockResolvedValue(null);

      const webhookBody = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'unknown-tx-id',
            status: 'APPROVED',
          },
        },
        timestamp: Date.now(),
        signature: { properties: [], checksum: 'valid' },
      };

      // Should not throw
      await service.handleWebhook(webhookBody);

      expect(prisma.billingTransaction.update).not.toHaveBeenCalled();
      expect(prisma.executeInTransaction).not.toHaveBeenCalled();
    });

    it('should handle transaction.updated without transaction data', async () => {
      wompiService.verifyWebhookSignature.mockReturnValue(true);

      const webhookBody = {
        event: 'transaction.updated',
        data: {},
        timestamp: Date.now(),
        signature: { properties: [], checksum: 'valid' },
      };

      // Should not throw
      await service.handleWebhook(webhookBody);

      expect(prisma.billingTransaction.findUnique).not.toHaveBeenCalled();
    });

    it('should handle transaction.updated with null data.transaction', async () => {
      wompiService.verifyWebhookSignature.mockReturnValue(true);

      const webhookBody = {
        event: 'transaction.updated',
        data: { transaction: null },
        timestamp: Date.now(),
        signature: { properties: [], checksum: 'valid' },
      };

      await service.handleWebhook(webhookBody);

      expect(prisma.billingTransaction.findUnique).not.toHaveBeenCalled();
    });

    it('should log and ignore unhandled webhook events', async () => {
      wompiService.verifyWebhookSignature.mockReturnValue(true);

      const webhookBody = {
        event: 'nequi_token.updated',
        data: { something: 'irrelevant' },
        timestamp: Date.now(),
        signature: { properties: [], checksum: 'valid' },
      };

      // Should not throw
      await service.handleWebhook(webhookBody);

      expect(prisma.billingTransaction.findUnique).not.toHaveBeenCalled();
      expect(prisma.billingTransaction.update).not.toHaveBeenCalled();
    });

    it('should swallow errors from handleTransactionUpdated and not rethrow', async () => {
      wompiService.verifyWebhookSignature.mockReturnValue(true);

      prisma.billingTransaction.findUnique.mockRejectedValue(
        new Error('Database connection lost'),
      );

      const webhookBody = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: TRANSACTION_ID,
            status: 'APPROVED',
          },
        },
        timestamp: Date.now(),
        signature: { properties: [], checksum: 'valid' },
      };

      // Should NOT throw -- errors are caught and logged
      await expect(service.handleWebhook(webhookBody)).resolves.toBeUndefined();
    });

    it('should use customer_data.email as fallback when customer_email is missing', async () => {
      wompiService.verifyWebhookSignature.mockReturnValue(true);

      const existingBillingTx = createMockBillingTransaction({
        status: BillingStatus.PENDING,
      });
      prisma.billingTransaction.findUnique.mockResolvedValue(existingBillingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(
        createMockSubscription(),
      );

      const webhookBody = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: TRANSACTION_ID,
            status: 'APPROVED',
            customer_data: { email: 'fallback@test.com' },
          },
        },
        timestamp: Date.now(),
        signature: { properties: [], checksum: 'valid' },
      };

      await service.handleWebhook(webhookBody);

      // activateSubscription called with fallback email
      expect(prismaTx.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            wompiCustomerEmail: 'fallback@test.com',
          }),
        }),
      );
    });

    it('should pass null customerEmail when neither customer_email nor customer_data.email exist', async () => {
      wompiService.verifyWebhookSignature.mockReturnValue(true);

      const existingBillingTx = createMockBillingTransaction({
        status: BillingStatus.PENDING,
      });
      prisma.billingTransaction.findUnique.mockResolvedValue(existingBillingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(
        createMockSubscription(),
      );

      const webhookBody = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: TRANSACTION_ID,
            status: 'APPROVED',
            // no customer_email, no customer_data
          },
        },
        timestamp: Date.now(),
        signature: { properties: [], checksum: 'valid' },
      };

      await service.handleWebhook(webhookBody);

      // activateSubscription called; tenant.update should NOT have wompiCustomerEmail
      expect(prismaTx.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            wompiCustomerEmail: expect.anything(),
          }),
        }),
      );
    });

    it('should preserve existing paymentMethodType when webhook does not provide one', async () => {
      wompiService.verifyWebhookSignature.mockReturnValue(true);

      const existingBillingTx = createMockBillingTransaction({
        status: BillingStatus.PENDING,
        paymentMethodType: 'PSE',
      });
      prisma.billingTransaction.findUnique.mockResolvedValue(existingBillingTx);

      const webhookBody = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: TRANSACTION_ID,
            status: 'DECLINED',
            // no payment_method_type
          },
        },
        timestamp: Date.now(),
        signature: { properties: [], checksum: 'valid' },
      };

      await service.handleWebhook(webhookBody);

      expect(prisma.billingTransaction.update).toHaveBeenCalledWith({
        where: { wompiTransactionId: TRANSACTION_ID },
        data: expect.objectContaining({
          paymentMethodType: 'PSE', // preserved from existing record
        }),
      });
    });
  });

  // ===========================================================================
  // getBillingHistory
  // ===========================================================================

  describe('getBillingHistory', () => {
    it('should return billing transactions ordered by createdAt desc', async () => {
      const transactions = [
        createMockBillingTransaction({
          id: 'tx-1',
          createdAt: new Date('2025-03-01'),
        }),
        createMockBillingTransaction({
          id: 'tx-2',
          createdAt: new Date('2025-02-01'),
        }),
      ];

      prisma.billingTransaction.findMany.mockResolvedValue(transactions);

      const result = await service.getBillingHistory(TENANT_ID);

      expect(prisma.billingTransaction.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(transactions);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when tenant has no billing history', async () => {
      prisma.billingTransaction.findMany.mockResolvedValue([]);

      const result = await service.getBillingHistory(TENANT_ID);

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // Private method coverage via public methods
  // ===========================================================================

  describe('activateSubscription (via verifyPayment)', () => {
    it('should upsert subscription with correct plan limits', async () => {
      const tenant = createMockTenant({ plan: SubscriptionPlan.PYME });
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({
          ...tenant,
          plan: SubscriptionPlan.PLUS,
          subscription: createMockSubscription({
            plan: SubscriptionPlan.PLUS,
          }),
        });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(
        createMockSubscription(),
      );

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PLUS,
        SubscriptionPeriod.ANNUAL,
      );

      // Check subscription upsert
      expect(prismaTx.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          create: expect.objectContaining({
            plan: SubscriptionPlan.PLUS,
            status: SubscriptionStatus.ACTIVE,
            periodType: SubscriptionPeriod.ANNUAL,
          }),
          update: expect.objectContaining({
            plan: SubscriptionPlan.PLUS,
            status: SubscriptionStatus.ACTIVE,
            periodType: SubscriptionPeriod.ANNUAL,
            suspendedAt: null,
            suspendedReason: null,
          }),
        }),
      );

      // Check tenant limits updated to PLUS plan limits
      expect(prismaTx.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TENANT_ID },
          data: expect.objectContaining({
            plan: SubscriptionPlan.PLUS,
            maxUsers: 9,
            maxProducts: -1,
            maxInvoices: -1,
            maxWarehouses: 100,
          }),
        }),
      );
    });

    it('should create activation notification with correct period label', async () => {
      const tenant = createMockTenant({ plan: null });
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({
          ...tenant,
          plan: SubscriptionPlan.PRO,
          subscription: createMockSubscription(),
        });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(
        createMockSubscription(),
      );

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.QUARTERLY,
      );

      expect(prismaTx.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          type: NotificationType.SUBSCRIPTION_ACTIVATED,
          title: 'Plan Pro activado',
          priority: NotificationPriority.HIGH,
          link: '/billing',
          metadata: expect.objectContaining({
            plan: SubscriptionPlan.PRO,
            period: SubscriptionPeriod.QUARTERLY,
          }),
        }),
      });

      // Verify message contains 'trimestral'
      const notifCall = prismaTx.notification.create.mock.calls[0][0];
      expect(notifCall.data.message).toContain('trimestral');
    });

    it('should link billing transaction to subscription', async () => {
      const tenant = createMockTenant({ plan: null });
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({
          ...tenant,
          plan: SubscriptionPlan.PRO,
          subscription: createMockSubscription(),
        });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      const subscription = createMockSubscription();
      prismaTx.subscription.findUnique.mockResolvedValue(subscription);

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      expect(prismaTx.billingTransaction.update).toHaveBeenCalledWith({
        where: { id: BILLING_TX_ID },
        data: { subscriptionId: subscription.id },
      });
    });

    it('should not link billing transaction when subscription findUnique returns null', async () => {
      const tenant = createMockTenant({ plan: null });
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({
          ...tenant,
          plan: SubscriptionPlan.PRO,
          subscription: createMockSubscription(),
        });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      // subscription.findUnique returns null inside the transaction
      prismaTx.subscription.findUnique.mockResolvedValue(null);

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      // billingTransaction.update should NOT be called to link subscription
      expect(prismaTx.billingTransaction.update).not.toHaveBeenCalled();
    });

    it('should not set wompiCustomerEmail when customer_email is null', async () => {
      const tenant = createMockTenant({ plan: null });
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({
          ...tenant,
          plan: SubscriptionPlan.PRO,
          subscription: createMockSubscription(),
        });

      const wompiTx = createMockWompiTransaction({
        status: 'APPROVED',
        customer_email: null,
      });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(
        createMockSubscription(),
      );

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      // customerEmail is null, so wompiCustomerEmail should NOT be in the update
      const tenantUpdateCall = prismaTx.tenant.update.mock.calls[0][0];
      expect(tenantUpdateCall.data).not.toHaveProperty('wompiCustomerEmail');
    });
  });

  describe('extendSubscription (via verifyPayment)', () => {
    it('should extend from current endDate when subscription is still active', async () => {
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 10);
      const subscription = createMockSubscription({ endDate: futureEnd });
      const tenant = createMockTenant({
        plan: SubscriptionPlan.PRO,
        subscription,
      });

      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({ ...tenant, subscription });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(subscription);

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      const updateCall = prismaTx.subscription.update.mock.calls[0][0];
      const newEndDate = updateCall.data.endDate as Date;

      // Should extend 30 days from the future endDate, not from now
      const expectedMinEnd = new Date(
        futureEnd.getTime() + 29 * 24 * 60 * 60 * 1000,
      );
      expect(newEndDate.getTime()).toBeGreaterThanOrEqual(
        expectedMinEnd.getTime(),
      );
    });

    it('should extend from now when subscription is expired', async () => {
      const pastEnd = new Date();
      pastEnd.setDate(pastEnd.getDate() - 5);
      const subscription = createMockSubscription({ endDate: pastEnd });
      const tenant = createMockTenant({
        plan: SubscriptionPlan.PRO,
        subscription,
      });

      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({ ...tenant, subscription });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(subscription);

      const beforeCall = new Date();

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      const updateCall = prismaTx.subscription.update.mock.calls[0][0];
      const newEndDate = updateCall.data.endDate as Date;

      // Should extend 30 days from ~now, NOT from the past endDate
      const expectedMinEnd = new Date(
        beforeCall.getTime() + 29 * 24 * 60 * 60 * 1000,
      );
      expect(newEndDate.getTime()).toBeGreaterThanOrEqual(
        expectedMinEnd.getTime(),
      );
      // Should be much later than the old end date
      expect(newEndDate.getTime()).toBeGreaterThan(pastEnd.getTime());
    });

    it('should set status to ACTIVE when extending', async () => {
      const subscription = createMockSubscription();
      const tenant = createMockTenant({
        plan: SubscriptionPlan.PRO,
        subscription,
      });

      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({ ...tenant, subscription });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(subscription);

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      expect(prismaTx.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SubscriptionStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should not update subscription when no subscription found in tx', async () => {
      const subscription = createMockSubscription();
      const tenant = createMockTenant({
        plan: SubscriptionPlan.PRO,
        subscription,
      });

      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({ ...tenant, subscription });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      // No subscription found inside the transaction
      prismaTx.subscription.findUnique.mockResolvedValue(null);

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      expect(prismaTx.subscription.update).not.toHaveBeenCalled();
      expect(prismaTx.notification.create).not.toHaveBeenCalled();
    });

    it('should create renewal notification with correct period labels', async () => {
      // Test ANNUAL period label = 'anual'
      const subscription = createMockSubscription({
        plan: SubscriptionPlan.PYME,
      });
      const tenant = createMockTenant({
        plan: SubscriptionPlan.PYME,
        subscription,
      });

      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce({ ...tenant, subscription });

      const wompiTx = createMockWompiTransaction({ status: 'APPROVED' });
      wompiService.getTransaction.mockResolvedValue(wompiTx);

      const billingTx = createMockBillingTransaction();
      prisma.billingTransaction.create.mockResolvedValue(billingTx);

      prismaTx.subscription.findUnique.mockResolvedValue(subscription);

      await service.verifyPayment(
        TENANT_ID,
        TRANSACTION_ID,
        SubscriptionPlan.PYME,
        SubscriptionPeriod.ANNUAL,
      );

      expect(prismaTx.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.SUBSCRIPTION_ACTIVATED,
          title: 'Plan PYME renovado',
          priority: NotificationPriority.HIGH,
          link: '/billing',
          metadata: expect.objectContaining({
            plan: SubscriptionPlan.PYME,
            period: SubscriptionPeriod.ANNUAL,
            isRenewal: true,
          }),
        }),
      });

      const notifCall = prismaTx.notification.create.mock.calls[0][0];
      expect(notifCall.data.message).toContain('anual');
      expect(notifCall.data.message).toContain('renovada');
    });
  });

  // ===========================================================================
  // Constructor / Config
  // ===========================================================================

  describe('constructor', () => {
    it('should default to localhost when FRONTEND_URL is not configured', async () => {
      configService.get.mockReturnValue(undefined);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SubscriptionsService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: configService },
          { provide: WompiService, useValue: wompiService },
        ],
      }).compile();

      const svc = module.get<SubscriptionsService>(SubscriptionsService);

      // Verify via getCheckoutConfig that redirectUrl uses default
      const tenant = createMockTenant();
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await svc.getCheckoutConfig(
        TENANT_ID,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
      );

      expect(result.redirectUrl).toBe(
        'http://localhost:5173/billing?success=true',
      );
    });
  });
});
