import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import Stripe from 'stripe';
import {
  SubscriptionsService,
  STRIPE_PLAN_LIMITS,
} from './subscriptions.service';
import { PLAN_LIMITS } from './plan-limits';
import { PrismaService } from '../prisma';

// Type for mocked Stripe client
interface MockStripeClient {
  checkout: {
    sessions: {
      create: jest.Mock;
    };
  };
  billingPortal: {
    sessions: {
      create: jest.Mock;
    };
  };
  subscriptions: {
    retrieve: jest.Mock;
  };
  customers: {
    create: jest.Mock;
  };
  webhooks: {
    constructEvent: jest.Mock;
  };
}

// Helper to get typed stripe instance from service
function getStripeInstance(service: SubscriptionsService): MockStripeClient {
  return (service as unknown as { stripe: MockStripeClient }).stripe;
}

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
    subscriptions: {
      retrieve: jest.fn(),
    },
    customers: {
      create: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  // Test data
  const mockTenantId = 'tenant-123';
  const mockStripeCustomerId = 'cus_test123';
  const mockStripeSubscriptionId = 'sub_test123';

  const mockTenant = {
    id: mockTenantId,
    name: 'Acme Corp',
    slug: 'acme-corp',
    email: 'acme@example.com',
    phone: '+57 300 123 4567',
    status: 'ACTIVE',
    plan: 'EMPRENDEDOR' as SubscriptionPlan,
    stripeCustomerId: null as string | null,
    stripeSubscriptionId: null as string | null,
    maxUsers: 2,
    maxProducts: 100,
    maxInvoices: 50,
    maxWarehouses: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTenantWithStripe = {
    ...mockTenant,
    stripeCustomerId: mockStripeCustomerId,
    stripeSubscriptionId: mockStripeSubscriptionId,
    plan: 'PYME' as SubscriptionPlan,
  };

  const mockCheckoutSession = {
    id: 'cs_test123',
    url: 'https://checkout.stripe.com/pay/cs_test123',
    subscription: mockStripeSubscriptionId,
  };

  const mockPortalSession = {
    url: 'https://billing.stripe.com/p/session/test123',
  };

  const mockStripeSubscription = {
    id: mockStripeSubscriptionId,
    status: 'active' as Stripe.Subscription.Status,
    cancel_at_period_end: false,
    metadata: {
      tenantId: mockTenantId,
      plan: 'PYME',
    },
    customer: mockStripeCustomerId,
    // In Clover API (2025-12-15), current_period_end is on subscription items
    items: {
      data: [
        {
          id: 'si_test123',
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          current_period_start: Math.floor(Date.now() / 1000),
        },
      ],
    },
  };

  const mockPrismaTenant = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  };

  const mockExecuteInTransaction = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      tenant: mockPrismaTenant,
      executeInTransaction: mockExecuteInTransaction,
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          STRIPE_SECRET_KEY: 'sk_test_123',
          STRIPE_WEBHOOK_SECRET: 'whsec_test123',
          STRIPE_PRICE_PYME: 'price_pyme123',
          STRIPE_PRICE_PRO: 'price_pro123',
          STRIPE_PRICE_PLUS: 'price_plus123',
          FRONTEND_URL: 'https://app.stockflow.com',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);

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
      expect(service).toBeDefined();
    });

    it('should warn when STRIPE_SECRET_KEY is not configured', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Create a new module with missing STRIPE_SECRET_KEY
      const mockConfigWithoutStripe = {
        get: jest.fn().mockImplementation((key: string) => {
          const config: Record<string, string | undefined> = {
            STRIPE_SECRET_KEY: undefined,
            STRIPE_WEBHOOK_SECRET: 'whsec_test123',
            STRIPE_PRICE_BASIC: 'price_basic123',
            STRIPE_PRICE_PRO: 'price_pro123',
            STRIPE_PRICE_ENTERPRISE: 'price_enterprise123',
            FRONTEND_URL: 'https://app.stockflow.com',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SubscriptionsService,
          {
            provide: PrismaService,
            useValue: {
              tenant: mockPrismaTenant,
              executeInTransaction: mockExecuteInTransaction,
            },
          },
          { provide: ConfigService, useValue: mockConfigWithoutStripe },
        ],
      }).compile();

      module.get<SubscriptionsService>(SubscriptionsService);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('STRIPE_SECRET_KEY not configured'),
      );
    });
  });

  describe('PLAN_LIMITS', () => {
    it('should have correct EMPRENDEDOR plan limits', () => {
      expect(PLAN_LIMITS.EMPRENDEDOR).toMatchObject({
        maxUsers: 2, // 1 usuario + 1 contador
        maxProducts: -1, // Ilimitados
        maxInvoices: -1, // Ilimitadas
        maxWarehouses: 1,
      });
    });

    it('should have correct PYME plan limits', () => {
      expect(PLAN_LIMITS.PYME).toMatchObject({
        maxUsers: 3, // 2 usuarios + 1 contador
        maxProducts: -1, // Ilimitados
        maxInvoices: -1, // Ilimitadas
        maxWarehouses: 2,
      });
    });

    it('should have correct PRO plan limits', () => {
      expect(PLAN_LIMITS.PRO).toMatchObject({
        maxUsers: 4, // 3 usuarios + 1 contador
        maxProducts: -1, // Ilimitados
        maxInvoices: -1, // Ilimitadas
        maxWarehouses: 10,
      });
    });

    it('should have correct PLUS plan limits', () => {
      expect(PLAN_LIMITS.PLUS).toMatchObject({
        maxUsers: 9, // 8 usuarios + 1 contador
        maxProducts: -1, // Ilimitados
        maxInvoices: -1, // Ilimitadas
        maxWarehouses: 100,
      });
    });
  });

  // ============================================================================
  // CREATE CHECKOUT SESSION
  // ============================================================================

  describe('createCheckoutSession', () => {
    beforeEach(() => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenant);
      mockPrismaTenant.update.mockResolvedValue({
        ...mockTenant,
        stripeCustomerId: mockStripeCustomerId,
      });

      // Access the mocked Stripe instance
      const stripeInstance = getStripeInstance(service);
      stripeInstance.customers.create.mockResolvedValue({
        id: mockStripeCustomerId,
      });
      stripeInstance.checkout.sessions.create.mockResolvedValue(
        mockCheckoutSession,
      );
    });

    it('should create checkout session for PYME plan', async () => {
      const result = await service.createCheckoutSession(mockTenantId, 'PYME');

      expect(result).toEqual({
        sessionId: mockCheckoutSession.id,
        url: mockCheckoutSession.url,
      });
    });

    it('should create checkout session for PRO plan', async () => {
      const result = await service.createCheckoutSession(mockTenantId, 'PRO');

      expect(result).toEqual({
        sessionId: mockCheckoutSession.id,
        url: mockCheckoutSession.url,
      });
    });

    it('should create checkout session for PLUS plan', async () => {
      const result = await service.createCheckoutSession(mockTenantId, 'PLUS');

      expect(result).toEqual({
        sessionId: mockCheckoutSession.id,
        url: mockCheckoutSession.url,
      });
    });

    it('should throw BadRequestException for EMPRENDEDOR plan', async () => {
      await expect(
        service.createCheckoutSession(mockTenantId, 'EMPRENDEDOR'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createCheckoutSession(mockTenantId, 'EMPRENDEDOR'),
      ).rejects.toThrow(
        'Cannot create checkout session for EMPRENDEDOR plan - it is the base plan',
      );
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession(mockTenantId, 'PYME'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use existing Stripe customer ID if present', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenantWithStripe);

      const stripeInstance = getStripeInstance(service);
      await service.createCheckoutSession(mockTenantId, 'PRO');

      expect(stripeInstance.customers.create).not.toHaveBeenCalled();
      expect(stripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: mockStripeCustomerId,
        }),
      );
    });

    it('should create new Stripe customer if not present', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenant);

      const stripeInstance = getStripeInstance(service);
      await service.createCheckoutSession(mockTenantId, 'PYME');

      expect(stripeInstance.customers.create).toHaveBeenCalledWith({
        email: mockTenant.email,
        name: mockTenant.name,
        metadata: {
          tenantId: mockTenantId,
          slug: mockTenant.slug,
        },
      });
    });

    it('should update tenant with new Stripe customer ID', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenant);

      const stripeInstance = getStripeInstance(service);
      stripeInstance.customers.create.mockResolvedValue({
        id: mockStripeCustomerId,
      });

      await service.createCheckoutSession(mockTenantId, 'PYME');

      expect(mockPrismaTenant.update).toHaveBeenCalledWith({
        where: { id: mockTenantId },
        data: { stripeCustomerId: mockStripeCustomerId },
      });
    });

    it('should include correct metadata in checkout session', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenantWithStripe);

      const stripeInstance = getStripeInstance(service);
      await service.createCheckoutSession(mockTenantId, 'PYME');

      expect(stripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            tenantId: mockTenantId,
            plan: 'PYME',
          },
          subscription_data: {
            metadata: {
              tenantId: mockTenantId,
              plan: 'PYME',
            },
          },
        }),
      );
    });

    it('should include success and cancel URLs', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenantWithStripe);

      const stripeInstance = getStripeInstance(service);
      await service.createCheckoutSession(mockTenantId, 'PYME');

      expect(stripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining('/settings/billing'),
          cancel_url: expect.stringContaining('/settings/billing'),
        }),
      );
    });

    it('should throw InternalServerErrorException on Stripe error', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenantWithStripe);

      const stripeInstance = getStripeInstance(service);
      stripeInstance.checkout.sessions.create.mockRejectedValue(
        new Error('Stripe error'),
      );

      await expect(
        service.createCheckoutSession(mockTenantId, 'PYME'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should log checkout session creation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.createCheckoutSession(mockTenantId, 'PYME');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Creating checkout session'),
      );
    });

    it('should throw BadRequestException when price not configured for plan', async () => {
      // Create a new service instance with missing price configuration
      const mockConfigWithoutPrice = {
        get: jest.fn().mockImplementation((key: string) => {
          const config: Record<string, string | undefined> = {
            STRIPE_SECRET_KEY: 'sk_test_123',
            STRIPE_WEBHOOK_SECRET: 'whsec_test123',
            STRIPE_PRICE_PYME: '', // Empty price
            STRIPE_PRICE_PRO: 'price_pro123',
            STRIPE_PRICE_PLUS: 'price_plus123',
            FRONTEND_URL: 'https://app.stockflow.com',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SubscriptionsService,
          {
            provide: PrismaService,
            useValue: {
              tenant: mockPrismaTenant,
              executeInTransaction: mockExecuteInTransaction,
            },
          },
          { provide: ConfigService, useValue: mockConfigWithoutPrice },
        ],
      }).compile();

      const serviceWithoutPrice =
        module.get<SubscriptionsService>(SubscriptionsService);
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenantWithStripe);

      await expect(
        serviceWithoutPrice.createCheckoutSession(mockTenantId, 'PYME'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        serviceWithoutPrice.createCheckoutSession(mockTenantId, 'PYME'),
      ).rejects.toThrow('Price not configured for plan: PYME');
    });

    it('should throw InternalServerErrorException when Stripe customer creation fails', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenant);

      const stripeInstance = getStripeInstance(service);
      stripeInstance.customers.create.mockRejectedValue(
        new Error('Stripe customer creation failed'),
      );

      await expect(
        service.createCheckoutSession(mockTenantId, 'PYME'),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.createCheckoutSession(mockTenantId, 'PYME'),
      ).rejects.toThrow('Failed to create Stripe customer');
    });

    it('should handle checkout session with null URL', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenantWithStripe);

      const stripeInstance = getStripeInstance(service);
      stripeInstance.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test123',
        url: null, // URL can be null in some cases
        subscription: mockStripeSubscriptionId,
      });

      const result = await service.createCheckoutSession(mockTenantId, 'PYME');

      expect(result).toEqual({
        sessionId: 'cs_test123',
        url: '', // Should fallback to empty string
      });
    });

    it('should handle non-Error object thrown in checkout session creation', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenantWithStripe);

      const stripeInstance = getStripeInstance(service);
      stripeInstance.checkout.sessions.create.mockRejectedValue('String error');

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await expect(
        service.createCheckoutSession(mockTenantId, 'PYME'),
      ).rejects.toThrow(InternalServerErrorException);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown error'),
      );
    });
  });

  // ============================================================================
  // CREATE PORTAL SESSION
  // ============================================================================

  describe('createPortalSession', () => {
    beforeEach(() => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenantWithStripe);

      const stripeInstance = getStripeInstance(service);
      stripeInstance.billingPortal.sessions.create.mockResolvedValue(
        mockPortalSession,
      );
    });

    it('should create portal session successfully', async () => {
      const result = await service.createPortalSession(mockTenantId);

      expect(result).toEqual({
        url: mockPortalSession.url,
      });
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(null);

      await expect(service.createPortalSession(mockTenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when no Stripe customer', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenant);

      await expect(service.createPortalSession(mockTenantId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createPortalSession(mockTenantId)).rejects.toThrow(
        'No Stripe customer found',
      );
    });

    it('should use custom return URL if provided', async () => {
      const customUrl = 'https://app.stockflow.com/custom/billing';

      const stripeInstance = getStripeInstance(service);
      await service.createPortalSession(mockTenantId, customUrl);

      expect(stripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: customUrl,
        }),
      );
    });

    it('should use default return URL if not provided', async () => {
      const stripeInstance = getStripeInstance(service);
      await service.createPortalSession(mockTenantId);

      expect(stripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: expect.stringContaining('/settings/billing'),
        }),
      );
    });

    it('should throw InternalServerErrorException on Stripe error', async () => {
      const stripeInstance = getStripeInstance(service);
      stripeInstance.billingPortal.sessions.create.mockRejectedValue(
        new Error('Stripe error'),
      );

      await expect(service.createPortalSession(mockTenantId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should log portal session creation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.createPortalSession(mockTenantId);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Creating portal session'),
      );
    });
  });

  // ============================================================================
  // GET SUBSCRIPTION STATUS
  // ============================================================================

  describe('getSubscriptionStatus', () => {
    beforeEach(() => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenantWithStripe);

      const stripeInstance = getStripeInstance(service);
      stripeInstance.subscriptions.retrieve.mockResolvedValue(
        mockStripeSubscription,
      );
    });

    it('should return subscription status', async () => {
      const result = await service.getSubscriptionStatus(mockTenantId);

      expect(result).toMatchObject({
        tenantId: mockTenantId,
        plan: 'PYME',
        stripeCustomerId: mockStripeCustomerId,
        stripeSubscriptionId: mockStripeSubscriptionId,
      });
    });

    it('should include plan limits', async () => {
      const result = await service.getSubscriptionStatus(mockTenantId);

      expect(result.limits).toBeDefined();
      expect(result.limits.maxUsers).toBeDefined();
      expect(result.limits.maxProducts).toBeDefined();
    });

    it('should include Stripe subscription details', async () => {
      const result = await service.getSubscriptionStatus(mockTenantId);

      expect(result.stripeSubscriptionStatus).toBe('active');
      expect(result.currentPeriodEnd).toBeInstanceOf(Date);
      expect(result.cancelAtPeriodEnd).toBe(false);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(null);

      await expect(service.getSubscriptionStatus(mockTenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return status without Stripe details for FREE tenant', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.getSubscriptionStatus(mockTenantId);

      expect(result.stripeSubscriptionStatus).toBeUndefined();
      expect(result.currentPeriodEnd).toBeUndefined();
    });

    it('should handle Stripe API error gracefully', async () => {
      const stripeInstance = getStripeInstance(service);
      stripeInstance.subscriptions.retrieve.mockRejectedValue(
        new Error('Stripe error'),
      );

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const result = await service.getSubscriptionStatus(mockTenantId);

      expect(result).toBeDefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not fetch Stripe subscription'),
      );
    });

    it('should log status request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.getSubscriptionStatus(mockTenantId);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Getting subscription status'),
      );
    });

    it('should handle subscription without items array', async () => {
      const subscriptionWithoutItems = {
        ...mockStripeSubscription,
        items: undefined,
      };

      const stripeInstance = getStripeInstance(service);
      stripeInstance.subscriptions.retrieve.mockResolvedValue(
        subscriptionWithoutItems,
      );

      const result = await service.getSubscriptionStatus(mockTenantId);

      expect(result).toBeDefined();
      expect(result.currentPeriodEnd).toBeUndefined();
    });

    it('should handle subscription with empty items array', async () => {
      const subscriptionWithEmptyItems = {
        ...mockStripeSubscription,
        items: { data: [] },
      };

      const stripeInstance = getStripeInstance(service);
      stripeInstance.subscriptions.retrieve.mockResolvedValue(
        subscriptionWithEmptyItems,
      );

      const result = await service.getSubscriptionStatus(mockTenantId);

      expect(result).toBeDefined();
      expect(result.currentPeriodEnd).toBeUndefined();
    });

    it('should handle subscription item without current_period_end', async () => {
      const subscriptionWithoutPeriodEnd = {
        ...mockStripeSubscription,
        items: {
          data: [
            {
              id: 'si_test123',
              // No current_period_end
            },
          ],
        },
      };

      const stripeInstance = getStripeInstance(service);
      stripeInstance.subscriptions.retrieve.mockResolvedValue(
        subscriptionWithoutPeriodEnd,
      );

      const result = await service.getSubscriptionStatus(mockTenantId);

      expect(result).toBeDefined();
      expect(result.currentPeriodEnd).toBeUndefined();
    });
  });

  // ============================================================================
  // HANDLE WEBHOOK
  // ============================================================================

  describe('handleWebhook', () => {
    const mockSignature = 'test_signature';
    const mockRawBody = Buffer.from('test body');

    beforeEach(() => {
      mockPrismaTenant.findFirst.mockResolvedValue(mockTenantWithStripe);
      mockExecuteInTransaction.mockImplementation(
        (fn: (prisma: { tenant: { update: jest.Mock } }) => unknown) => {
          return fn({
            tenant: {
              update: jest.fn(),
            },
          });
        },
      );
    });

    describe('checkout.session.completed', () => {
      const checkoutEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test123',
            metadata: {
              tenantId: mockTenantId,
              plan: 'PRO',
            },
            subscription: mockStripeSubscriptionId,
          },
        },
      } as unknown as Stripe.Event;

      it('should update tenant plan on checkout completion', async () => {
        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(checkoutEvent);

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(mockExecuteInTransaction).toHaveBeenCalled();
      });

      it('should log plan upgrade', async () => {
        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(checkoutEvent);
        const logSpy = jest.spyOn(Logger.prototype, 'log');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('upgraded to'),
        );
      });

      it('should handle missing tenantId in metadata', async () => {
        const eventWithoutTenant = {
          ...checkoutEvent,
          data: {
            object: {
              ...checkoutEvent.data.object,
              metadata: {},
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithoutTenant,
        );
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('without tenantId'),
        );
      });

      it('should handle missing subscription ID in checkout session', async () => {
        const eventWithoutSubscription = {
          ...checkoutEvent,
          data: {
            object: {
              id: 'cs_test123',
              metadata: {
                tenantId: mockTenantId,
                plan: 'PRO',
              },
              subscription: undefined,
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithoutSubscription,
        );
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('without subscription ID'),
        );
      });

      it('should fetch plan from subscription metadata when not in session metadata', async () => {
        const eventWithoutPlan = {
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test123',
              metadata: {
                tenantId: mockTenantId,
                // No plan in session metadata
              },
              subscription: mockStripeSubscriptionId,
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithoutPlan,
        );
        stripeInstance.subscriptions.retrieve.mockResolvedValue({
          id: mockStripeSubscriptionId,
          metadata: {
            plan: 'PRO',
          },
        });

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(stripeInstance.subscriptions.retrieve).toHaveBeenCalledWith(
          mockStripeSubscriptionId,
        );
        expect(mockExecuteInTransaction).toHaveBeenCalled();
      });

      it('should use BASIC as default when plan not found in subscription metadata', async () => {
        const eventWithoutPlan = {
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test123',
              metadata: {
                tenantId: mockTenantId,
              },
              subscription: mockStripeSubscriptionId,
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithoutPlan,
        );
        stripeInstance.subscriptions.retrieve.mockResolvedValue({
          id: mockStripeSubscriptionId,
          metadata: {
            // No plan in subscription metadata either
          },
        });

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(mockExecuteInTransaction).toHaveBeenCalled();
      });

      it('should handle error when fetching subscription for plan details', async () => {
        const eventWithoutPlan = {
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test123',
              metadata: {
                tenantId: mockTenantId,
              },
              subscription: mockStripeSubscriptionId,
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithoutPlan,
        );
        stripeInstance.subscriptions.retrieve.mockRejectedValue(
          new Error('Stripe API error'),
        );
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Could not fetch subscription'),
        );
        // Should still proceed with default BASIC plan
        expect(mockExecuteInTransaction).toHaveBeenCalled();
      });

      it('should handle subscription as object instead of string', async () => {
        const eventWithSubscriptionObject = {
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test123',
              metadata: {
                tenantId: mockTenantId,
                plan: 'PRO',
              },
              subscription: {
                id: mockStripeSubscriptionId,
              },
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithSubscriptionObject,
        );

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(mockExecuteInTransaction).toHaveBeenCalled();
      });
    });

    describe('customer.subscription.updated', () => {
      const subscriptionUpdatedEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: mockStripeSubscriptionId,
            status: 'active',
            metadata: {
              tenantId: mockTenantId,
              plan: 'PRO',
            },
            customer: mockStripeCustomerId,
          },
        },
      } as unknown as Stripe.Event;

      it('should update tenant on subscription update', async () => {
        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          subscriptionUpdatedEvent,
        );

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(mockPrismaTenant.update).toHaveBeenCalled();
      });

      it('should find tenant by customer ID if no tenantId in metadata', async () => {
        const eventWithoutTenantId = {
          ...subscriptionUpdatedEvent,
          data: {
            object: {
              ...subscriptionUpdatedEvent.data.object,
              metadata: { plan: 'PRO' },
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithoutTenantId,
        );

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(mockPrismaTenant.findFirst).toHaveBeenCalledWith({
          where: { stripeCustomerId: mockStripeCustomerId },
        });
      });

      it('should log warning for past_due status', async () => {
        const pastDueEvent = {
          ...subscriptionUpdatedEvent,
          data: {
            object: {
              ...subscriptionUpdatedEvent.data.object,
              status: 'past_due',
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(pastDueEvent);
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('past_due'),
        );
      });

      it('should log warning for unpaid status', async () => {
        const unpaidEvent = {
          ...subscriptionUpdatedEvent,
          data: {
            object: {
              ...subscriptionUpdatedEvent.data.object,
              status: 'unpaid',
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(unpaidEvent);
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unpaid'));
      });

      it('should warn when subscription updated without tenantId or customer ID', async () => {
        const eventWithoutIds = {
          type: 'customer.subscription.updated',
          data: {
            object: {
              id: mockStripeSubscriptionId,
              status: 'active',
              metadata: { plan: 'PRO' },
              customer: undefined, // No customer ID
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(eventWithoutIds);
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('without tenantId or customer'),
        );
      });

      it('should warn when no tenant found for Stripe customer in subscription update', async () => {
        const eventWithoutTenantId = {
          ...subscriptionUpdatedEvent,
          data: {
            object: {
              ...subscriptionUpdatedEvent.data.object,
              metadata: { plan: 'PRO' },
            },
          },
        };

        mockPrismaTenant.findFirst.mockResolvedValue(null); // No tenant found

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithoutTenantId,
        );
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('No tenant found for Stripe customer'),
        );
      });

      it('should handle customer as object instead of string', async () => {
        const eventWithCustomerObject = {
          type: 'customer.subscription.updated',
          data: {
            object: {
              id: mockStripeSubscriptionId,
              status: 'active',
              metadata: { plan: 'PRO' },
              customer: {
                id: mockStripeCustomerId,
              },
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithCustomerObject,
        );

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(mockPrismaTenant.findFirst).toHaveBeenCalledWith({
          where: { stripeCustomerId: mockStripeCustomerId },
        });
      });
    });

    describe('customer.subscription.deleted', () => {
      const subscriptionDeletedEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: mockStripeSubscriptionId,
            metadata: {
              tenantId: mockTenantId,
            },
            customer: mockStripeCustomerId,
          },
        },
      } as unknown as Stripe.Event;

      it('should remove tenant plan when subscription deleted', async () => {
        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          subscriptionDeletedEvent,
        );

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(mockExecuteInTransaction).toHaveBeenCalled();
      });

      it('should log subscription cancellation', async () => {
        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          subscriptionDeletedEvent,
        );
        const logSpy = jest.spyOn(Logger.prototype, 'log');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('subscription cancelled'),
        );
      });

      it('should find tenant by customer ID if no tenantId in metadata', async () => {
        const eventWithoutTenantId = {
          ...subscriptionDeletedEvent,
          data: {
            object: {
              ...subscriptionDeletedEvent.data.object,
              metadata: {},
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithoutTenantId,
        );

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(mockPrismaTenant.findFirst).toHaveBeenCalledWith({
          where: { stripeCustomerId: mockStripeCustomerId },
        });
      });

      it('should warn when subscription deleted without tenantId or customer ID', async () => {
        const eventWithoutIds = {
          type: 'customer.subscription.deleted',
          data: {
            object: {
              id: mockStripeSubscriptionId,
              metadata: {},
              customer: undefined, // No customer ID
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(eventWithoutIds);
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('without tenantId or customer'),
        );
      });

      it('should warn when no tenant found for Stripe customer in subscription deleted', async () => {
        const eventWithoutTenantId = {
          ...subscriptionDeletedEvent,
          data: {
            object: {
              ...subscriptionDeletedEvent.data.object,
              metadata: {},
            },
          },
        };

        mockPrismaTenant.findFirst.mockResolvedValue(null); // No tenant found

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithoutTenantId,
        );
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('No tenant found for Stripe customer'),
        );
      });

      it('should handle customer as object instead of string in deleted event', async () => {
        const eventWithCustomerObject = {
          type: 'customer.subscription.deleted',
          data: {
            object: {
              id: mockStripeSubscriptionId,
              metadata: {},
              customer: {
                id: mockStripeCustomerId,
              },
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithCustomerObject,
        );

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(mockPrismaTenant.findFirst).toHaveBeenCalledWith({
          where: { stripeCustomerId: mockStripeCustomerId },
        });
      });
    });

    describe('invoice.payment_failed', () => {
      const paymentFailedEvent = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test123',
            customer: mockStripeCustomerId,
          },
        },
      } as unknown as Stripe.Event;

      it('should log payment failure', async () => {
        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          paymentFailedEvent,
        );
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Payment failed'),
        );
      });

      it('should handle unknown customer', async () => {
        mockPrismaTenant.findFirst.mockResolvedValue(null);

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          paymentFailedEvent,
        );
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('unknown customer'),
        );
      });

      it('should warn when invoice payment failed without customer ID', async () => {
        const eventWithoutCustomer = {
          type: 'invoice.payment_failed',
          data: {
            object: {
              id: 'in_test123',
              customer: undefined, // No customer ID
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithoutCustomer,
        );
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('without customer ID'),
        );
      });

      it('should handle customer as object instead of string in payment failed', async () => {
        const eventWithCustomerObject = {
          type: 'invoice.payment_failed',
          data: {
            object: {
              id: 'in_test123',
              customer: {
                id: mockStripeCustomerId,
              },
            },
          },
        };

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(
          eventWithCustomerObject,
        );
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Payment failed'),
        );
        expect(mockPrismaTenant.findFirst).toHaveBeenCalledWith({
          where: { stripeCustomerId: mockStripeCustomerId },
        });
      });
    });

    describe('signature verification', () => {
      it('should throw BadRequestException on invalid signature', async () => {
        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        await expect(
          service.handleWebhook(mockSignature, mockRawBody),
        ).rejects.toThrow(BadRequestException);
      });

      it('should log signature verification failure', async () => {
        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockImplementation(() => {
          throw new Error('Invalid signature');
        });
        const errorSpy = jest.spyOn(Logger.prototype, 'error');

        await expect(
          service.handleWebhook(mockSignature, mockRawBody),
        ).rejects.toThrow();

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Webhook signature verification failed'),
        );
      });
    });

    describe('unhandled event types', () => {
      it('should log unhandled event types', async () => {
        const unknownEvent = {
          type: 'unknown.event',
          data: {
            object: {},
          },
        } as unknown as Stripe.Event;

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(unknownEvent);
        const logSpy = jest.spyOn(Logger.prototype, 'log');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Unhandled webhook event type'),
        );
      });
    });

    describe('error handling', () => {
      it('should not throw on webhook processing error', async () => {
        const checkoutEvent = {
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test123',
              metadata: {
                tenantId: mockTenantId,
                plan: 'PRO',
              },
              subscription: mockStripeSubscriptionId,
            },
          },
        } as unknown as Stripe.Event;

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(checkoutEvent);
        mockExecuteInTransaction.mockRejectedValue(new Error('Database error'));

        // Should not throw - errors are logged but not re-thrown
        await expect(
          service.handleWebhook(mockSignature, mockRawBody),
        ).resolves.not.toThrow();
      });

      it('should log processing errors', async () => {
        const checkoutEvent = {
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test123',
              metadata: {
                tenantId: mockTenantId,
                plan: 'PRO',
              },
              subscription: mockStripeSubscriptionId,
            },
          },
        } as unknown as Stripe.Event;

        const stripeInstance = getStripeInstance(service);
        stripeInstance.webhooks.constructEvent.mockReturnValue(checkoutEvent);
        mockExecuteInTransaction.mockRejectedValue(new Error('Database error'));
        const errorSpy = jest.spyOn(Logger.prototype, 'error');

        await service.handleWebhook(mockSignature, mockRawBody);

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error processing webhook'),
        );
      });
    });
  });
});
