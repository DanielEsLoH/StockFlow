import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionBillingService } from './subscription-billing.service';
import { PrismaService } from '../prisma';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionStatus } from '@prisma/client';
import { BrevoService } from '../notifications/mail/brevo.service';

describe('SubscriptionBillingService', () => {
  let service: SubscriptionBillingService;
  let prisma: {
    subscription: { findMany: jest.Mock };
    billingTransaction: { findFirst: jest.Mock };
  };
  let subscriptionsService: { chargeRecurring: jest.Mock };
  let brevoService: { sendSubscriptionExpiringEmail: jest.Mock };

  beforeEach(async () => {
    prisma = {
      subscription: { findMany: jest.fn() },
      billingTransaction: { findFirst: jest.fn() },
    };

    subscriptionsService = {
      chargeRecurring: jest.fn(),
    };

    brevoService = {
      sendSubscriptionExpiringEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionBillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionsService, useValue: subscriptionsService },
        { provide: BrevoService, useValue: brevoService },
      ],
    }).compile();

    service = module.get<SubscriptionBillingService>(
      SubscriptionBillingService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleRecurringBilling', () => {
    it('should call processRecurringCharges and log results', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);

      await service.handleRecurringBilling();

      expect(prisma.subscription.findMany).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      prisma.subscription.findMany.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Should not throw
      await expect(service.handleRecurringBilling()).resolves.toBeUndefined();
    });

    it('should handle non-Error exceptions', async () => {
      prisma.subscription.findMany.mockRejectedValue('string error');

      await expect(service.handleRecurringBilling()).resolves.toBeUndefined();
    });
  });

  describe('processRecurringCharges', () => {
    const createMockSubscription = (overrides?: Partial<any>) => ({
      id: 'sub-1',
      tenantId: 'tenant-1',
      plan: 'PRO',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date('2024-01-01'),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      tenant: {
        name: 'Test Company',
        wompiPaymentSourceId: 'ps-123',
        users: [
          { email: 'admin@test.com', firstName: 'Carlos' },
        ],
      },
      ...overrides,
    });

    it('should return zeros when no expiring subscriptions', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);

      const result = await service.processRecurringCharges();

      expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0 });
    });

    it('should process a successful recurring charge', async () => {
      const sub = createMockSubscription();
      prisma.subscription.findMany.mockResolvedValue([sub]);
      prisma.billingTransaction.findFirst.mockResolvedValue(null);
      subscriptionsService.chargeRecurring.mockResolvedValue({
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await service.processRecurringCharges();

      expect(result).toEqual({ attempted: 1, succeeded: 1, failed: 0 });
      expect(subscriptionsService.chargeRecurring).toHaveBeenCalledWith(
        'tenant-1',
      );
    });

    it('should skip subscriptions with existing recurring transactions', async () => {
      const sub = createMockSubscription();
      prisma.subscription.findMany.mockResolvedValue([sub]);
      prisma.billingTransaction.findFirst.mockResolvedValue({
        id: 'existing-tx',
        isRecurring: true,
      });

      const result = await service.processRecurringCharges();

      expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0 });
      expect(subscriptionsService.chargeRecurring).not.toHaveBeenCalled();
    });

    it('should handle failed recurring charge (non-active result)', async () => {
      const sub = createMockSubscription();
      prisma.subscription.findMany.mockResolvedValue([sub]);
      prisma.billingTransaction.findFirst.mockResolvedValue(null);
      subscriptionsService.chargeRecurring.mockResolvedValue({
        status: SubscriptionStatus.EXPIRED,
      });
      brevoService.sendSubscriptionExpiringEmail.mockResolvedValue({
        success: true,
      });

      const result = await service.processRecurringCharges();

      expect(result).toEqual({ attempted: 1, succeeded: 0, failed: 1 });
      expect(brevoService.sendSubscriptionExpiringEmail).toHaveBeenCalled();
    });

    it('should handle charge throwing an error', async () => {
      const sub = createMockSubscription();
      prisma.subscription.findMany.mockResolvedValue([sub]);
      prisma.billingTransaction.findFirst.mockResolvedValue(null);
      subscriptionsService.chargeRecurring.mockRejectedValue(
        new Error('Payment gateway timeout'),
      );
      brevoService.sendSubscriptionExpiringEmail.mockResolvedValue({
        success: true,
      });

      const result = await service.processRecurringCharges();

      expect(result).toEqual({ attempted: 1, succeeded: 0, failed: 1 });
      expect(brevoService.sendSubscriptionExpiringEmail).toHaveBeenCalled();
    });

    it('should handle charge throwing a non-Error exception', async () => {
      const sub = createMockSubscription();
      prisma.subscription.findMany.mockResolvedValue([sub]);
      prisma.billingTransaction.findFirst.mockResolvedValue(null);
      subscriptionsService.chargeRecurring.mockRejectedValue('unknown');
      brevoService.sendSubscriptionExpiringEmail.mockResolvedValue({
        success: true,
      });

      const result = await service.processRecurringCharges();

      expect(result).toEqual({ attempted: 1, succeeded: 0, failed: 1 });
    });

    it('should process multiple subscriptions', async () => {
      const sub1 = createMockSubscription({ id: 'sub-1', tenantId: 'tenant-1' });
      const sub2 = createMockSubscription({ id: 'sub-2', tenantId: 'tenant-2' });
      const sub3 = createMockSubscription({ id: 'sub-3', tenantId: 'tenant-3' });

      prisma.subscription.findMany.mockResolvedValue([sub1, sub2, sub3]);
      prisma.billingTransaction.findFirst
        .mockResolvedValueOnce(null) // sub1 - no existing
        .mockResolvedValueOnce({ id: 'existing' }) // sub2 - already billed
        .mockResolvedValueOnce(null); // sub3 - no existing

      subscriptionsService.chargeRecurring
        .mockResolvedValueOnce({ status: SubscriptionStatus.ACTIVE })
        .mockRejectedValueOnce(new Error('Failed'));

      brevoService.sendSubscriptionExpiringEmail.mockResolvedValue({
        success: true,
      });

      const result = await service.processRecurringCharges();

      expect(result).toEqual({ attempted: 2, succeeded: 1, failed: 1 });
    });

    it('should query for subscriptions expiring within 3 days', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);

      await service.processRecurringCharges();

      const findManyArgs = prisma.subscription.findMany.mock.calls[0][0];
      expect(findManyArgs.where.status).toBe(SubscriptionStatus.ACTIVE);
      expect(findManyArgs.where.endDate).toHaveProperty('gte');
      expect(findManyArgs.where.endDate).toHaveProperty('lte');
      expect(findManyArgs.where.tenant.wompiPaymentSourceId).toEqual({
        not: null,
      });
    });
  });

  describe('notifyChargeFailed (via processRecurringCharges)', () => {
    const createSubForNotification = (users: any[]) => ({
      id: 'sub-1',
      tenantId: 'tenant-1',
      plan: 'PRO',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date('2024-01-01'),
      endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      tenant: {
        name: 'Test Company',
        wompiPaymentSourceId: 'ps-123',
        users,
      },
    });

    it('should send email to all admin users on failure', async () => {
      const sub = createSubForNotification([
        { email: 'admin1@test.com', firstName: 'Admin1' },
        { email: 'admin2@test.com', firstName: 'Admin2' },
      ]);

      prisma.subscription.findMany.mockResolvedValue([sub]);
      prisma.billingTransaction.findFirst.mockResolvedValue(null);
      subscriptionsService.chargeRecurring.mockRejectedValue(
        new Error('Failed'),
      );
      brevoService.sendSubscriptionExpiringEmail.mockResolvedValue({
        success: true,
      });

      await service.processRecurringCharges();

      expect(brevoService.sendSubscriptionExpiringEmail).toHaveBeenCalledTimes(
        2,
      );
      expect(
        brevoService.sendSubscriptionExpiringEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin1@test.com',
          firstName: 'Admin1',
          planName: 'Pro',
          tenantName: 'Test Company',
        }),
      );
    });

    it('should handle email send failure gracefully', async () => {
      const sub = createSubForNotification([
        { email: 'admin@test.com', firstName: 'Admin' },
      ]);

      prisma.subscription.findMany.mockResolvedValue([sub]);
      prisma.billingTransaction.findFirst.mockResolvedValue(null);
      subscriptionsService.chargeRecurring.mockRejectedValue(
        new Error('Failed'),
      );
      brevoService.sendSubscriptionExpiringEmail.mockResolvedValue({
        success: false,
        error: 'SMTP error',
      });

      // Should not throw
      const result = await service.processRecurringCharges();
      expect(result.failed).toBe(1);
    });

    it('should handle email send throwing error gracefully', async () => {
      const sub = createSubForNotification([
        { email: 'admin@test.com', firstName: 'Admin' },
      ]);

      prisma.subscription.findMany.mockResolvedValue([sub]);
      prisma.billingTransaction.findFirst.mockResolvedValue(null);
      subscriptionsService.chargeRecurring.mockRejectedValue(
        new Error('Failed'),
      );
      brevoService.sendSubscriptionExpiringEmail.mockRejectedValue(
        new Error('Connection refused'),
      );

      // Should not throw
      const result = await service.processRecurringCharges();
      expect(result.failed).toBe(1);
    });

    it('should handle email send throwing non-Error gracefully', async () => {
      const sub = createSubForNotification([
        { email: 'admin@test.com', firstName: 'Admin' },
      ]);

      prisma.subscription.findMany.mockResolvedValue([sub]);
      prisma.billingTransaction.findFirst.mockResolvedValue(null);
      subscriptionsService.chargeRecurring.mockRejectedValue(
        new Error('Failed'),
      );
      brevoService.sendSubscriptionExpiringEmail.mockRejectedValue(
        'not an error object',
      );

      const result = await service.processRecurringCharges();
      expect(result.failed).toBe(1);
    });

    it('should handle unknown plan correctly', async () => {
      const sub = createSubForNotification([
        { email: 'admin@test.com', firstName: 'Admin' },
      ]);
      sub.plan = 'UNKNOWN_PLAN';

      prisma.subscription.findMany.mockResolvedValue([sub]);
      prisma.billingTransaction.findFirst.mockResolvedValue(null);
      subscriptionsService.chargeRecurring.mockRejectedValue(
        new Error('Failed'),
      );
      brevoService.sendSubscriptionExpiringEmail.mockResolvedValue({
        success: true,
      });

      await service.processRecurringCharges();

      expect(
        brevoService.sendSubscriptionExpiringEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          planName: 'UNKNOWN_PLAN',
        }),
      );
    });

    it('should handle tenant with no admin users', async () => {
      const sub = createSubForNotification([]);

      prisma.subscription.findMany.mockResolvedValue([sub]);
      prisma.billingTransaction.findFirst.mockResolvedValue(null);
      subscriptionsService.chargeRecurring.mockRejectedValue(
        new Error('Failed'),
      );

      const result = await service.processRecurringCharges();

      expect(result.failed).toBe(1);
      expect(
        brevoService.sendSubscriptionExpiringEmail,
      ).not.toHaveBeenCalled();
    });
  });
});
