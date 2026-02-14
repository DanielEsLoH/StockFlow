import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  SubscriptionPlan,
  SubscriptionPeriod,
  SubscriptionStatus,
  TenantStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { SubscriptionManagementService } from './subscription-management.service';
import { PrismaService } from '../prisma';
import { BrevoService } from '../notifications/mail/brevo.service';
import { PLAN_LIMITS, getPeriodDays, calculatePlanPrice } from './plan-limits';

describe('SubscriptionManagementService', () => {
  let service: SubscriptionManagementService;
  let prismaService: PrismaService;
  let brevoService: BrevoService;

  // Mock data
  const mockTenantId = 'tenant-123';
  const mockSubscriptionId = 'sub-123';
  const mockAdminId = 'admin-123';
  const mockUserId = 'user-123';

  const mockUser = {
    id: mockUserId,
    email: 'admin@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hash',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    tenantId: mockTenantId,
    emailVerified: true,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    avatarUrl: null,
    lastLoginAt: null,
    approvedAt: null,
    approvedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTenant = {
    id: mockTenantId,
    name: 'Acme Corp',
    slug: 'acme-corp',
    email: 'acme@example.com',
    phone: '+57 300 123 4567',
    status: TenantStatus.ACTIVE,
    plan: SubscriptionPlan.PYME,
    wompiPaymentSourceId: null,
    wompiCustomerEmail: null,
    maxUsers: 2,
    maxProducts: -1,
    maxInvoices: -1,
    maxWarehouses: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubscription = {
    id: mockSubscriptionId,
    tenantId: mockTenantId,
    plan: SubscriptionPlan.PYME,
    status: SubscriptionStatus.ACTIVE,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    periodType: SubscriptionPeriod.MONTHLY,
    activatedById: mockAdminId,
    suspendedAt: null,
    suspendedReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaSubscription = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  };

  const mockPrismaTenant = {
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  const mockPrismaTransaction = jest.fn();

  const mockBrevoService = {
    sendSubscriptionActivatedEmail: jest.fn(),
    sendSubscriptionSuspendedEmail: jest.fn(),
    sendSubscriptionChangedEmail: jest.fn(),
  };

  // Helper to flush promises
  const flushPromises = () =>
    new Promise(jest.requireActual('timers').setImmediate);

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));

    const mockPrismaService = {
      subscription: mockPrismaSubscription,
      tenant: mockPrismaTenant,
      $transaction: mockPrismaTransaction,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionManagementService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BrevoService, useValue: mockBrevoService },
      ],
    }).compile();

    service = module.get<SubscriptionManagementService>(
      SubscriptionManagementService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
    brevoService = module.get<BrevoService>(BrevoService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('activatePlan', () => {
    it('should activate a plan successfully', async () => {
      const tenantWithUsers = { ...mockTenant, users: [mockUser] };
      mockPrismaTenant.findUnique.mockResolvedValue(tenantWithUsers);

      const newSubscription = {
        ...mockSubscription,
        plan: SubscriptionPlan.PYME,
      };
      const updatedTenant = { ...mockTenant, plan: SubscriptionPlan.PYME };

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            upsert: jest.fn().mockResolvedValue(newSubscription),
          },
          tenant: {
            update: jest.fn().mockResolvedValue(updatedTenant),
          },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionActivatedEmail.mockResolvedValue({
        success: true,
      });

      const result = await service.activatePlan(
        mockTenantId,
        SubscriptionPlan.PYME,
        SubscriptionPeriod.MONTHLY,
        mockAdminId,
      );

      expect(result.success).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.tenant).toBeDefined();
      expect(result.message).toContain('activado exitosamente');
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockPrismaTenant.findUnique.mockResolvedValue(null);

      await expect(
        service.activatePlan(
          mockTenantId,
          SubscriptionPlan.PYME,
          SubscriptionPeriod.MONTHLY,
          mockAdminId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate correct end date for MONTHLY period', async () => {
      const tenantWithUsers = { ...mockTenant, users: [mockUser] };
      mockPrismaTenant.findUnique.mockResolvedValue(tenantWithUsers);

      let capturedUpsertData: any;
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            upsert: jest.fn().mockImplementation((args) => {
              capturedUpsertData = args;
              return mockSubscription;
            }),
          },
          tenant: {
            update: jest.fn().mockResolvedValue(mockTenant),
          },
        };
        return callback(tx);
      });

      await service.activatePlan(
        mockTenantId,
        SubscriptionPlan.PYME,
        SubscriptionPeriod.MONTHLY,
        mockAdminId,
      );

      const expectedEndDate = new Date('2024-01-15T12:00:00.000Z');
      expectedEndDate.setDate(expectedEndDate.getDate() + 30);

      expect(capturedUpsertData.create.periodType).toBe(
        SubscriptionPeriod.MONTHLY,
      );
    });

    it('should calculate correct end date for QUARTERLY period', async () => {
      const tenantWithUsers = { ...mockTenant, users: [mockUser] };
      mockPrismaTenant.findUnique.mockResolvedValue(tenantWithUsers);

      let capturedUpsertData: any;
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            upsert: jest.fn().mockImplementation((args) => {
              capturedUpsertData = args;
              return mockSubscription;
            }),
          },
          tenant: {
            update: jest.fn().mockResolvedValue(mockTenant),
          },
        };
        return callback(tx);
      });

      await service.activatePlan(
        mockTenantId,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.QUARTERLY,
        mockAdminId,
      );

      expect(capturedUpsertData.create.periodType).toBe(
        SubscriptionPeriod.QUARTERLY,
      );
    });

    it('should calculate correct end date for ANNUAL period', async () => {
      const tenantWithUsers = { ...mockTenant, users: [mockUser] };
      mockPrismaTenant.findUnique.mockResolvedValue(tenantWithUsers);

      let capturedUpsertData: any;
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            upsert: jest.fn().mockImplementation((args) => {
              capturedUpsertData = args;
              return mockSubscription;
            }),
          },
          tenant: {
            update: jest.fn().mockResolvedValue(mockTenant),
          },
        };
        return callback(tx);
      });

      await service.activatePlan(
        mockTenantId,
        SubscriptionPlan.PLUS,
        SubscriptionPeriod.ANNUAL,
        mockAdminId,
      );

      expect(capturedUpsertData.create.periodType).toBe(
        SubscriptionPeriod.ANNUAL,
      );
    });

    it('should update tenant limits according to plan', async () => {
      const tenantWithUsers = { ...mockTenant, users: [mockUser] };
      mockPrismaTenant.findUnique.mockResolvedValue(tenantWithUsers);

      let capturedTenantUpdate: any;
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            upsert: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: {
            update: jest.fn().mockImplementation((args) => {
              capturedTenantUpdate = args;
              return mockTenant;
            }),
          },
        };
        return callback(tx);
      });

      await service.activatePlan(
        mockTenantId,
        SubscriptionPlan.PRO,
        SubscriptionPeriod.MONTHLY,
        mockAdminId,
      );

      const proLimits = PLAN_LIMITS[SubscriptionPlan.PRO];
      expect(capturedTenantUpdate.data.maxUsers).toBe(proLimits.maxUsers);
      expect(capturedTenantUpdate.data.maxWarehouses).toBe(
        proLimits.maxWarehouses,
      );
      expect(capturedTenantUpdate.data.maxProducts).toBe(proLimits.maxProducts);
      expect(capturedTenantUpdate.data.maxInvoices).toBe(proLimits.maxInvoices);
    });

    it('should send activation notification to admin user', async () => {
      const tenantWithUsers = { ...mockTenant, users: [mockUser] };
      mockPrismaTenant.findUnique.mockResolvedValue(tenantWithUsers);

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            upsert: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionActivatedEmail.mockResolvedValue({
        success: true,
      });

      await service.activatePlan(
        mockTenantId,
        SubscriptionPlan.PYME,
        SubscriptionPeriod.MONTHLY,
        mockAdminId,
      );

      // Wait for async notification
      await flushPromises();

      expect(
        mockBrevoService.sendSubscriptionActivatedEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          firstName: mockUser.firstName,
          planName: PLAN_LIMITS[SubscriptionPlan.PYME].displayName,
        }),
      );
    });

    it('should not send notification if no admin user exists', async () => {
      const tenantWithNoUsers = { ...mockTenant, users: [] };
      mockPrismaTenant.findUnique.mockResolvedValue(tenantWithNoUsers);

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            upsert: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      await service.activatePlan(
        mockTenantId,
        SubscriptionPlan.PYME,
        SubscriptionPeriod.MONTHLY,
        mockAdminId,
      );

      await flushPromises();

      expect(
        mockBrevoService.sendSubscriptionActivatedEmail,
      ).not.toHaveBeenCalled();
    });

    it('should handle notification failure gracefully', async () => {
      const tenantWithUsers = { ...mockTenant, users: [mockUser] };
      mockPrismaTenant.findUnique.mockResolvedValue(tenantWithUsers);

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            upsert: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionActivatedEmail.mockRejectedValue(
        new Error('Email service down'),
      );

      const result = await service.activatePlan(
        mockTenantId,
        SubscriptionPlan.PYME,
        SubscriptionPeriod.MONTHLY,
        mockAdminId,
      );

      await flushPromises();

      // Should still succeed
      expect(result.success).toBe(true);
      // The error is caught in the .catch() handler, which calls logger.error
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should log error with undefined stack when .catch receives a non-Error rejection (line 142)', async () => {
      const tenantWithUsers = { ...mockTenant, users: [mockUser] };
      mockPrismaTenant.findUnique.mockResolvedValue(tenantWithUsers);

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            upsert: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      // Spy on the private method to force the outer .catch() handler
      jest
        .spyOn(service as any, 'sendPlanActivationNotification')
        .mockRejectedValue('string rejection');

      const result = await service.activatePlan(
        mockTenantId,
        SubscriptionPlan.PYME,
        SubscriptionPeriod.MONTHLY,
        mockAdminId,
      );

      await flushPromises();

      expect(result.success).toBe(true);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to send plan activation notification',
        undefined,
      );
    });

    it('should clear suspended fields when reactivating', async () => {
      const tenantWithUsers = { ...mockTenant, users: [mockUser] };
      mockPrismaTenant.findUnique.mockResolvedValue(tenantWithUsers);

      let capturedUpsertData: any;
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            upsert: jest.fn().mockImplementation((args) => {
              capturedUpsertData = args;
              return mockSubscription;
            }),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      await service.activatePlan(
        mockTenantId,
        SubscriptionPlan.PYME,
        SubscriptionPeriod.MONTHLY,
        mockAdminId,
      );

      expect(capturedUpsertData.update.suspendedAt).toBeNull();
      expect(capturedUpsertData.update.suspendedReason).toBeNull();
    });
  });

  describe('suspendPlan', () => {
    it('should suspend a plan successfully', async () => {
      const subscriptionWithTenant = {
        ...mockSubscription,
        tenant: { ...mockTenant, users: [mockUser] },
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        subscriptionWithTenant,
      );

      const suspendedSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedReason: 'Non-payment',
      };
      const suspendedTenant = { ...mockTenant, status: TenantStatus.SUSPENDED };

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockResolvedValue(suspendedSubscription),
          },
          tenant: {
            update: jest.fn().mockResolvedValue(suspendedTenant),
          },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionSuspendedEmail.mockResolvedValue({
        success: true,
      });

      const result = await service.suspendPlan(
        mockTenantId,
        'Non-payment',
        mockAdminId,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Plan suspendido exitosamente');
    });

    it('should throw NotFoundException if subscription not found', async () => {
      mockPrismaSubscription.findUnique.mockResolvedValue(null);

      await expect(
        service.suspendPlan(mockTenantId, 'Reason', mockAdminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already suspended', async () => {
      const suspendedSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.SUSPENDED,
        tenant: { ...mockTenant, users: [mockUser] },
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        suspendedSubscription,
      );

      await expect(
        service.suspendPlan(mockTenantId, 'Reason', mockAdminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should send suspension notification', async () => {
      const subscriptionWithTenant = {
        ...mockSubscription,
        tenant: { ...mockTenant, users: [mockUser] },
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        subscriptionWithTenant,
      );

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionSuspendedEmail.mockResolvedValue({
        success: true,
      });

      await service.suspendPlan(mockTenantId, 'Violation of ToS', mockAdminId);

      await flushPromises();

      expect(
        mockBrevoService.sendSubscriptionSuspendedEmail,
      ).toHaveBeenCalledWith({
        to: mockUser.email,
        firstName: mockUser.firstName,
        reason: 'Violation of ToS',
      });
    });

    it('should set suspendedAt and suspendedReason', async () => {
      const subscriptionWithTenant = {
        ...mockSubscription,
        tenant: { ...mockTenant, users: [mockUser] },
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        subscriptionWithTenant,
      );

      let capturedUpdateData: any;
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockImplementation((args) => {
              capturedUpdateData = args;
              return mockSubscription;
            }),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      await service.suspendPlan(mockTenantId, 'Test reason', mockAdminId);

      expect(capturedUpdateData.data.status).toBe(SubscriptionStatus.SUSPENDED);
      expect(capturedUpdateData.data.suspendedAt).toBeInstanceOf(Date);
      expect(capturedUpdateData.data.suspendedReason).toBe('Test reason');
    });

    it('should handle notification failure gracefully', async () => {
      const subscriptionWithTenant = {
        ...mockSubscription,
        tenant: { ...mockTenant, users: [mockUser] },
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        subscriptionWithTenant,
      );

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionSuspendedEmail.mockRejectedValue(
        new Error('Service error'),
      );

      const result = await service.suspendPlan(
        mockTenantId,
        'Reason',
        mockAdminId,
      );

      await flushPromises();

      expect(result.success).toBe(true);
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should log error with undefined stack when .catch receives a non-Error rejection (line 215)', async () => {
      const subscriptionWithTenant = {
        ...mockSubscription,
        tenant: { ...mockTenant, users: [mockUser] },
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        subscriptionWithTenant,
      );

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      // Spy on the private method to force the outer .catch() handler
      jest
        .spyOn(service as any, 'sendPlanSuspensionNotification')
        .mockRejectedValue('string rejection');

      const result = await service.suspendPlan(
        mockTenantId,
        'Reason',
        mockAdminId,
      );

      await flushPromises();

      expect(result.success).toBe(true);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to send plan suspension notification',
        undefined,
      );
    });
  });

  describe('reactivatePlan', () => {
    it('should reactivate a suspended plan successfully', async () => {
      const suspendedSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedReason: 'Test',
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Future date
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        suspendedSubscription,
      );

      const reactivatedSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
        suspendedAt: null,
        suspendedReason: null,
      };

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockResolvedValue(reactivatedSubscription),
          },
          tenant: {
            update: jest.fn().mockResolvedValue({
              ...mockTenant,
              status: TenantStatus.ACTIVE,
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.reactivatePlan(mockTenantId, mockAdminId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Plan reactivado exitosamente');
    });

    it('should throw NotFoundException if subscription not found', async () => {
      mockPrismaSubscription.findUnique.mockResolvedValue(null);

      await expect(
        service.reactivatePlan(mockTenantId, mockAdminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not suspended', async () => {
      const activeSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(activeSubscription);

      await expect(
        service.reactivatePlan(mockTenantId, mockAdminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if subscription expired', async () => {
      const expiredSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.SUSPENDED,
        endDate: new Date('2024-01-10T00:00:00.000Z'), // Past date
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(expiredSubscription);

      await expect(
        service.reactivatePlan(mockTenantId, mockAdminId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reactivatePlan(mockTenantId, mockAdminId),
      ).rejects.toThrow('Subscription has expired');
    });

    it('should clear suspended fields', async () => {
      const suspendedSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.SUSPENDED,
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        suspendedSubscription,
      );

      let capturedUpdateData: any;
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockImplementation((args) => {
              capturedUpdateData = args;
              return mockSubscription;
            }),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      await service.reactivatePlan(mockTenantId, mockAdminId);

      expect(capturedUpdateData.data.status).toBe(SubscriptionStatus.ACTIVE);
      expect(capturedUpdateData.data.suspendedAt).toBeNull();
      expect(capturedUpdateData.data.suspendedReason).toBeNull();
    });
  });

  describe('changePlan', () => {
    it('should change plan successfully', async () => {
      const subscriptionWithTenant = {
        ...mockSubscription,
        plan: SubscriptionPlan.PYME,
        tenant: { ...mockTenant, users: [mockUser] },
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        subscriptionWithTenant,
      );

      const updatedSubscription = {
        ...mockSubscription,
        plan: SubscriptionPlan.PRO,
      };
      const updatedTenant = { ...mockTenant, plan: SubscriptionPlan.PRO };

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockResolvedValue(updatedSubscription),
          },
          tenant: { update: jest.fn().mockResolvedValue(updatedTenant) },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionChangedEmail.mockResolvedValue({
        success: true,
      });

      const result = await service.changePlan(
        mockTenantId,
        SubscriptionPlan.PRO,
        mockAdminId,
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Plan cambiado');
    });

    it('should throw NotFoundException if subscription not found', async () => {
      mockPrismaSubscription.findUnique.mockResolvedValue(null);

      await expect(
        service.changePlan(mockTenantId, SubscriptionPlan.PRO, mockAdminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if subscription not active', async () => {
      const suspendedSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.SUSPENDED,
        tenant: mockTenant,
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        suspendedSubscription,
      );

      await expect(
        service.changePlan(mockTenantId, SubscriptionPlan.PRO, mockAdminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update tenant limits to new plan', async () => {
      const subscriptionWithTenant = {
        ...mockSubscription,
        tenant: { ...mockTenant, users: [mockUser] },
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        subscriptionWithTenant,
      );

      let capturedTenantUpdate: any;
      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: {
            update: jest.fn().mockImplementation((args) => {
              capturedTenantUpdate = args;
              return mockTenant;
            }),
          },
        };
        return callback(tx);
      });

      await service.changePlan(
        mockTenantId,
        SubscriptionPlan.PLUS,
        mockAdminId,
      );

      const plusLimits = PLAN_LIMITS[SubscriptionPlan.PLUS];
      expect(capturedTenantUpdate.data.plan).toBe(SubscriptionPlan.PLUS);
      expect(capturedTenantUpdate.data.maxUsers).toBe(plusLimits.maxUsers);
      expect(capturedTenantUpdate.data.maxWarehouses).toBe(
        plusLimits.maxWarehouses,
      );
    });

    it('should send change notification', async () => {
      const subscriptionWithTenant = {
        ...mockSubscription,
        plan: SubscriptionPlan.PYME,
        tenant: { ...mockTenant, users: [mockUser] },
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        subscriptionWithTenant,
      );

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionChangedEmail.mockResolvedValue({
        success: true,
      });

      await service.changePlan(mockTenantId, SubscriptionPlan.PRO, mockAdminId);

      await flushPromises();

      expect(
        mockBrevoService.sendSubscriptionChangedEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          oldPlanName: PLAN_LIMITS[SubscriptionPlan.PYME].displayName,
          newPlanName: PLAN_LIMITS[SubscriptionPlan.PRO].displayName,
        }),
      );
    });

    it('should handle notification failure gracefully', async () => {
      const subscriptionWithTenant = {
        ...mockSubscription,
        tenant: { ...mockTenant, users: [mockUser] },
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        subscriptionWithTenant,
      );

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionChangedEmail.mockRejectedValue(
        new Error('Service error'),
      );

      const result = await service.changePlan(
        mockTenantId,
        SubscriptionPlan.PRO,
        mockAdminId,
      );

      await flushPromises();

      expect(result.success).toBe(true);
    });

    it('should log error with undefined stack when .catch receives a non-Error rejection (line 361)', async () => {
      const subscriptionWithTenant = {
        ...mockSubscription,
        tenant: { ...mockTenant, users: [mockUser] },
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        subscriptionWithTenant,
      );

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      // Spy on the private method to force the outer .catch() handler
      jest
        .spyOn(service as any, 'sendPlanChangeNotification')
        .mockRejectedValue('string rejection');

      const result = await service.changePlan(
        mockTenantId,
        SubscriptionPlan.PRO,
        mockAdminId,
      );

      await flushPromises();

      expect(result.success).toBe(true);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to send plan change notification',
        undefined,
      );
    });
  });

  describe('getSubscription', () => {
    it('should return subscription with tenant', async () => {
      const subscriptionWithTenant = {
        ...mockSubscription,
        tenant: mockTenant,
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        subscriptionWithTenant,
      );

      const result = await service.getSubscription(mockTenantId);

      expect(result).toEqual(subscriptionWithTenant);
      expect(mockPrismaSubscription.findUnique).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        include: { tenant: true },
      });
    });

    it('should return null if not found', async () => {
      mockPrismaSubscription.findUnique.mockResolvedValue(null);

      const result = await service.getSubscription(mockTenantId);

      expect(result).toBeNull();
    });
  });

  describe('getSubscriptions', () => {
    it('should return all subscriptions', async () => {
      const subscriptions = [
        { ...mockSubscription, tenant: mockTenant },
        { ...mockSubscription, id: 'sub-456', tenant: mockTenant },
      ];
      mockPrismaSubscription.findMany.mockResolvedValue(subscriptions);

      const result = await service.getSubscriptions();

      expect(result).toEqual(subscriptions);
      expect(mockPrismaSubscription.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: { tenant: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status when provided', async () => {
      mockPrismaSubscription.findMany.mockResolvedValue([]);

      await service.getSubscriptions(SubscriptionStatus.ACTIVE);

      expect(mockPrismaSubscription.findMany).toHaveBeenCalledWith({
        where: { status: SubscriptionStatus.ACTIVE },
        include: { tenant: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getExpiringSubscriptions', () => {
    it('should return subscriptions expiring within days', async () => {
      const expiringSubscriptions = [
        { ...mockSubscription, tenant: mockTenant },
      ];
      mockPrismaSubscription.findMany.mockResolvedValue(expiringSubscriptions);

      const result = await service.getExpiringSubscriptions(7);

      expect(result).toEqual(expiringSubscriptions);
      expect(mockPrismaSubscription.findMany).toHaveBeenCalledWith({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endDate: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        include: { tenant: true },
        orderBy: { endDate: 'asc' },
      });
    });
  });

  describe('getPlanLimits', () => {
    it('should return limits for EMPRENDEDOR plan', () => {
      const limits = service.getPlanLimits(SubscriptionPlan.EMPRENDEDOR);
      expect(limits).toEqual(PLAN_LIMITS[SubscriptionPlan.EMPRENDEDOR]);
    });

    it('should return limits for PYME plan', () => {
      const limits = service.getPlanLimits(SubscriptionPlan.PYME);
      expect(limits).toEqual(PLAN_LIMITS[SubscriptionPlan.PYME]);
    });

    it('should return limits for PRO plan', () => {
      const limits = service.getPlanLimits(SubscriptionPlan.PRO);
      expect(limits).toEqual(PLAN_LIMITS[SubscriptionPlan.PRO]);
    });

    it('should return limits for PLUS plan', () => {
      const limits = service.getPlanLimits(SubscriptionPlan.PLUS);
      expect(limits).toEqual(PLAN_LIMITS[SubscriptionPlan.PLUS]);
    });
  });

  describe('getAllPlanLimits', () => {
    it('should return all plan limits', () => {
      const allLimits = service.getAllPlanLimits();
      expect(allLimits).toEqual(PLAN_LIMITS);
      expect(Object.keys(allLimits)).toEqual(
        expect.arrayContaining(['EMPRENDEDOR', 'PYME', 'PRO', 'PLUS']),
      );
    });
  });

  describe('calculatePrice', () => {
    it('should calculate monthly price', () => {
      const price = service.calculatePrice(
        SubscriptionPlan.PYME,
        SubscriptionPeriod.MONTHLY,
      );
      expect(price).toBe(
        calculatePlanPrice(SubscriptionPlan.PYME, SubscriptionPeriod.MONTHLY),
      );
    });

    it('should calculate quarterly price with discount', () => {
      const price = service.calculatePrice(
        SubscriptionPlan.PRO,
        SubscriptionPeriod.QUARTERLY,
      );
      expect(price).toBe(
        calculatePlanPrice(SubscriptionPlan.PRO, SubscriptionPeriod.QUARTERLY),
      );
    });

    it('should calculate annual price with discount', () => {
      const price = service.calculatePrice(
        SubscriptionPlan.PLUS,
        SubscriptionPeriod.ANNUAL,
      );
      expect(price).toBe(
        calculatePlanPrice(SubscriptionPlan.PLUS, SubscriptionPeriod.ANNUAL),
      );
    });
  });

  describe('private notification methods', () => {
    describe('sendPlanActivationNotification', () => {
      it('should log success when email sent successfully', async () => {
        const tenantWithUsers = { ...mockTenant, users: [mockUser] };
        mockPrismaTenant.findUnique.mockResolvedValue(tenantWithUsers);

        mockPrismaTransaction.mockImplementation(async (callback) => {
          const tx = {
            subscription: {
              upsert: jest.fn().mockResolvedValue(mockSubscription),
            },
            tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
          };
          return callback(tx);
        });

        mockBrevoService.sendSubscriptionActivatedEmail.mockResolvedValue({
          success: true,
        });

        await service.activatePlan(
          mockTenantId,
          SubscriptionPlan.PYME,
          SubscriptionPeriod.MONTHLY,
          mockAdminId,
        );

        await flushPromises();

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Plan activation notification sent'),
        );
      });

      it('should log warning when email fails', async () => {
        const tenantWithUsers = { ...mockTenant, users: [mockUser] };
        mockPrismaTenant.findUnique.mockResolvedValue(tenantWithUsers);

        mockPrismaTransaction.mockImplementation(async (callback) => {
          const tx = {
            subscription: {
              upsert: jest.fn().mockResolvedValue(mockSubscription),
            },
            tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
          };
          return callback(tx);
        });

        mockBrevoService.sendSubscriptionActivatedEmail.mockResolvedValue({
          success: false,
          error: 'Invalid email',
        });

        await service.activatePlan(
          mockTenantId,
          SubscriptionPlan.PYME,
          SubscriptionPeriod.MONTHLY,
          mockAdminId,
        );

        await flushPromises();

        expect(Logger.prototype.warn).toHaveBeenCalledWith(
          expect.stringContaining('Plan activation notification failed'),
        );
      });

      it('should log error when exception occurs', async () => {
        const tenantWithUsers = { ...mockTenant, users: [mockUser] };
        mockPrismaTenant.findUnique.mockResolvedValue(tenantWithUsers);

        mockPrismaTransaction.mockImplementation(async (callback) => {
          const tx = {
            subscription: {
              upsert: jest.fn().mockResolvedValue(mockSubscription),
            },
            tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
          };
          return callback(tx);
        });

        mockBrevoService.sendSubscriptionActivatedEmail.mockRejectedValue(
          new Error('Network error'),
        );

        await service.activatePlan(
          mockTenantId,
          SubscriptionPlan.PYME,
          SubscriptionPeriod.MONTHLY,
          mockAdminId,
        );

        await flushPromises();

        expect(Logger.prototype.error).toHaveBeenCalledWith(
          expect.stringContaining('Plan activation notification error'),
          expect.any(String),
        );
      });
    });

    describe('sendPlanSuspensionNotification', () => {
      it('should log success when email sent successfully', async () => {
        const subscriptionWithTenant = {
          ...mockSubscription,
          tenant: { ...mockTenant, users: [mockUser] },
        };
        mockPrismaSubscription.findUnique.mockResolvedValue(
          subscriptionWithTenant,
        );

        mockPrismaTransaction.mockImplementation(async (callback) => {
          const tx = {
            subscription: {
              update: jest.fn().mockResolvedValue(mockSubscription),
            },
            tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
          };
          return callback(tx);
        });

        mockBrevoService.sendSubscriptionSuspendedEmail.mockResolvedValue({
          success: true,
        });

        await service.suspendPlan(mockTenantId, 'Reason', mockAdminId);

        await flushPromises();

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Plan suspension notification sent'),
        );
      });

      it('should log warning when email fails', async () => {
        const subscriptionWithTenant = {
          ...mockSubscription,
          tenant: { ...mockTenant, users: [mockUser] },
        };
        mockPrismaSubscription.findUnique.mockResolvedValue(
          subscriptionWithTenant,
        );

        mockPrismaTransaction.mockImplementation(async (callback) => {
          const tx = {
            subscription: {
              update: jest.fn().mockResolvedValue(mockSubscription),
            },
            tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
          };
          return callback(tx);
        });

        mockBrevoService.sendSubscriptionSuspendedEmail.mockResolvedValue({
          success: false,
          error: 'Service error',
        });

        await service.suspendPlan(mockTenantId, 'Reason', mockAdminId);

        await flushPromises();

        expect(Logger.prototype.warn).toHaveBeenCalledWith(
          expect.stringContaining('Plan suspension notification failed'),
        );
      });
    });

    describe('sendPlanChangeNotification', () => {
      it('should log success when email sent successfully', async () => {
        const subscriptionWithTenant = {
          ...mockSubscription,
          tenant: { ...mockTenant, users: [mockUser] },
        };
        mockPrismaSubscription.findUnique.mockResolvedValue(
          subscriptionWithTenant,
        );

        mockPrismaTransaction.mockImplementation(async (callback) => {
          const tx = {
            subscription: {
              update: jest.fn().mockResolvedValue(mockSubscription),
            },
            tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
          };
          return callback(tx);
        });

        mockBrevoService.sendSubscriptionChangedEmail.mockResolvedValue({
          success: true,
        });

        await service.changePlan(
          mockTenantId,
          SubscriptionPlan.PRO,
          mockAdminId,
        );

        await flushPromises();

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Plan change notification sent'),
        );
      });

      it('should log warning when email fails', async () => {
        const subscriptionWithTenant = {
          ...mockSubscription,
          tenant: { ...mockTenant, users: [mockUser] },
        };
        mockPrismaSubscription.findUnique.mockResolvedValue(
          subscriptionWithTenant,
        );

        mockPrismaTransaction.mockImplementation(async (callback) => {
          const tx = {
            subscription: {
              update: jest.fn().mockResolvedValue(mockSubscription),
            },
            tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
          };
          return callback(tx);
        });

        mockBrevoService.sendSubscriptionChangedEmail.mockResolvedValue({
          success: false,
          error: 'Invalid recipient',
        });

        await service.changePlan(
          mockTenantId,
          SubscriptionPlan.PRO,
          mockAdminId,
        );

        await flushPromises();

        expect(Logger.prototype.warn).toHaveBeenCalledWith(
          expect.stringContaining('Plan change notification failed'),
        );
      });

      it('should handle non-Error exception', async () => {
        const subscriptionWithTenant = {
          ...mockSubscription,
          tenant: { ...mockTenant, users: [mockUser] },
        };
        mockPrismaSubscription.findUnique.mockResolvedValue(
          subscriptionWithTenant,
        );

        mockPrismaTransaction.mockImplementation(async (callback) => {
          const tx = {
            subscription: {
              update: jest.fn().mockResolvedValue(mockSubscription),
            },
            tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
          };
          return callback(tx);
        });

        mockBrevoService.sendSubscriptionChangedEmail.mockRejectedValue(
          'string error',
        );

        await service.changePlan(
          mockTenantId,
          SubscriptionPlan.PRO,
          mockAdminId,
        );

        await flushPromises();

        expect(Logger.prototype.error).toHaveBeenCalledWith(
          expect.stringContaining('Plan change notification error'),
          undefined,
        );
      });
    });
  });

  describe('edge cases', () => {
    it('should handle tenant with no admin users for suspension', async () => {
      const subscriptionWithNoAdmins = {
        ...mockSubscription,
        tenant: { ...mockTenant, users: [] },
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        subscriptionWithNoAdmins,
      );

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      const result = await service.suspendPlan(
        mockTenantId,
        'Reason',
        mockAdminId,
      );

      expect(result.success).toBe(true);
      expect(
        mockBrevoService.sendSubscriptionSuspendedEmail,
      ).not.toHaveBeenCalled();
    });

    it('should handle tenant with no admin users for plan change', async () => {
      const subscriptionWithNoAdmins = {
        ...mockSubscription,
        tenant: { ...mockTenant, users: [] },
      };
      mockPrismaSubscription.findUnique.mockResolvedValue(
        subscriptionWithNoAdmins,
      );

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: {
            update: jest.fn().mockResolvedValue(mockSubscription),
          },
          tenant: { update: jest.fn().mockResolvedValue(mockTenant) },
        };
        return callback(tx);
      });

      const result = await service.changePlan(
        mockTenantId,
        SubscriptionPlan.PRO,
        mockAdminId,
      );

      expect(result.success).toBe(true);
      expect(
        mockBrevoService.sendSubscriptionChangedEmail,
      ).not.toHaveBeenCalled();
    });
  });
});
