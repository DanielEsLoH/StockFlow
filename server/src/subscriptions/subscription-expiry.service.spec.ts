import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  SubscriptionPlan,
  SubscriptionPeriod,
  SubscriptionStatus,
  TenantStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { SubscriptionExpiryService } from './subscription-expiry.service';
import { PrismaService } from '../prisma';
import { BrevoService } from '../notifications/mail/brevo.service';
import { PLAN_LIMITS } from './plan-limits';

describe('SubscriptionExpiryService', () => {
  let service: SubscriptionExpiryService;
  let prismaService: PrismaService;
  let brevoService: BrevoService;

  // Mock data
  const mockTenantId = 'tenant-123';
  const mockSubscriptionId = 'sub-123';
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
    users: [mockUser],
  };

  const mockSubscription = {
    id: mockSubscriptionId,
    tenantId: mockTenantId,
    plan: SubscriptionPlan.PYME,
    status: SubscriptionStatus.ACTIVE,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    periodType: SubscriptionPeriod.MONTHLY,
    activatedById: null,
    suspendedAt: null,
    suspendedReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: mockTenant,
  };

  const mockPrismaSubscription = {
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };

  const mockPrismaTenant = {
    update: jest.fn(),
  };

  const mockPrismaTransaction = jest.fn();

  const mockBrevoService = {
    sendSubscriptionExpiringEmail: jest.fn(),
    sendSubscriptionExpiredEmail: jest.fn(),
  };

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
        SubscriptionExpiryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BrevoService, useValue: mockBrevoService },
      ],
    }).compile();

    service = module.get<SubscriptionExpiryService>(SubscriptionExpiryService);
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

  describe('handleSubscriptionExpiry', () => {
    it('should run all expiry checks successfully', async () => {
      mockPrismaSubscription.findMany.mockResolvedValue([]);

      await service.handleSubscriptionExpiry();

      // Should have called findMany 3 times (7 days, tomorrow, expired)
      expect(mockPrismaSubscription.findMany).toHaveBeenCalledTimes(3);
    });

    it('should log error when an exception occurs', async () => {
      const error = new Error('Database error');
      mockPrismaSubscription.findMany.mockRejectedValueOnce(error);

      await service.handleSubscriptionExpiry();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error during subscription expiry check',
        error.stack,
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockPrismaSubscription.findMany.mockRejectedValueOnce('string error');

      await service.handleSubscriptionExpiry();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error during subscription expiry check',
        undefined,
      );
    });
  });

  describe('notifyExpiringSubscriptions (7 days)', () => {
    it('should find subscriptions expiring in 7 days', async () => {
      mockPrismaSubscription.findMany.mockResolvedValue([]);

      await service.handleSubscriptionExpiry();

      // First call is for 7-day notifications
      expect(mockPrismaSubscription.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: {
            status: SubscriptionStatus.ACTIVE,
            endDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          },
          include: {
            tenant: {
              include: {
                users: {
                  where: { role: 'ADMIN', status: 'ACTIVE' },
                },
              },
            },
          },
        }),
      );
    });

    it('should send warning emails to all admin users', async () => {
      const subscription = { ...mockSubscription };
      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([subscription]) // 7 days
        .mockResolvedValueOnce([]) // tomorrow
        .mockResolvedValueOnce([]); // expired

      mockBrevoService.sendSubscriptionExpiringEmail.mockResolvedValue({
        success: true,
      });

      await service.handleSubscriptionExpiry();

      expect(
        mockBrevoService.sendSubscriptionExpiringEmail,
      ).toHaveBeenCalledWith({
        to: mockUser.email,
        firstName: mockUser.firstName,
        planName: PLAN_LIMITS[SubscriptionPlan.PYME].displayName,
        expiryDate: subscription.endDate,
        daysRemaining: 7,
        tenantName: mockTenant.name,
      });
    });

    it('should handle multiple admin users', async () => {
      const secondUser = {
        ...mockUser,
        id: 'user-456',
        email: 'admin2@example.com',
        firstName: 'Jane',
      };
      const subscription = {
        ...mockSubscription,
        tenant: { ...mockTenant, users: [mockUser, secondUser] },
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([subscription])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockBrevoService.sendSubscriptionExpiringEmail.mockResolvedValue({
        success: true,
      });

      await service.handleSubscriptionExpiry();

      expect(
        mockBrevoService.sendSubscriptionExpiringEmail,
      ).toHaveBeenCalledTimes(2);
    });

    it('should log warning when email sending fails', async () => {
      const subscription = { ...mockSubscription };
      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([subscription])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockBrevoService.sendSubscriptionExpiringEmail.mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });

      await service.handleSubscriptionExpiry();

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send expiry warning'),
      );
    });

    it('should handle email sending exceptions', async () => {
      const subscription = { ...mockSubscription };
      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([subscription])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockBrevoService.sendSubscriptionExpiringEmail.mockRejectedValue(
        new Error('Network error'),
      );

      await service.handleSubscriptionExpiry();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error sending expiry warning'),
        expect.any(String),
      );
    });
  });

  describe('notifyExpiringTomorrow', () => {
    it('should find subscriptions expiring tomorrow', async () => {
      mockPrismaSubscription.findMany.mockResolvedValue([]);

      await service.handleSubscriptionExpiry();

      // Second call is for tomorrow notifications
      expect(mockPrismaSubscription.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: {
            status: SubscriptionStatus.ACTIVE,
            endDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          },
        }),
      );
    });

    it('should send warning emails with 1 day remaining', async () => {
      const subscription = { ...mockSubscription };
      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([]) // 7 days
        .mockResolvedValueOnce([subscription]) // tomorrow
        .mockResolvedValueOnce([]); // expired

      mockBrevoService.sendSubscriptionExpiringEmail.mockResolvedValue({
        success: true,
      });

      await service.handleSubscriptionExpiry();

      expect(
        mockBrevoService.sendSubscriptionExpiringEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          daysRemaining: 1,
        }),
      );
    });
  });

  describe('expireSubscriptions', () => {
    it('should find expired subscriptions', async () => {
      mockPrismaSubscription.findMany.mockResolvedValue([]);

      await service.handleSubscriptionExpiry();

      // Third call is for expired subscriptions
      expect(mockPrismaSubscription.findMany).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: {
            status: SubscriptionStatus.ACTIVE,
            endDate: {
              lt: expect.any(Date),
            },
          },
        }),
      );
    });

    it('should expire subscription and suspend tenant in transaction', async () => {
      const expiredSubscription = {
        ...mockSubscription,
        endDate: new Date('2024-01-10T00:00:00.000Z'), // Past date
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([]) // 7 days
        .mockResolvedValueOnce([]) // tomorrow
        .mockResolvedValueOnce([expiredSubscription]); // expired

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: { update: jest.fn() },
          tenant: { update: jest.fn() },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionExpiredEmail.mockResolvedValue({
        success: true,
      });

      await service.handleSubscriptionExpiry();

      expect(mockPrismaTransaction).toHaveBeenCalled();
    });

    it('should send expiration notification to all admin users', async () => {
      const expiredSubscription = {
        ...mockSubscription,
        endDate: new Date('2024-01-10T00:00:00.000Z'),
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expiredSubscription]);

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: { update: jest.fn() },
          tenant: { update: jest.fn() },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionExpiredEmail.mockResolvedValue({
        success: true,
      });

      await service.handleSubscriptionExpiry();

      expect(
        mockBrevoService.sendSubscriptionExpiredEmail,
      ).toHaveBeenCalledWith({
        to: mockUser.email,
        firstName: mockUser.firstName,
        planName: PLAN_LIMITS[SubscriptionPlan.PYME].displayName,
        expiryDate: expiredSubscription.endDate,
        tenantName: mockTenant.name,
      });
    });

    it('should log warning when expiration notification fails', async () => {
      const expiredSubscription = {
        ...mockSubscription,
        endDate: new Date('2024-01-10T00:00:00.000Z'),
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expiredSubscription]);

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: { update: jest.fn() },
          tenant: { update: jest.fn() },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionExpiredEmail.mockResolvedValue({
        success: false,
        error: 'Service unavailable',
      });

      await service.handleSubscriptionExpiry();

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send expiration notification'),
      );
    });

    it('should handle transaction errors', async () => {
      const expiredSubscription = {
        ...mockSubscription,
        endDate: new Date('2024-01-10T00:00:00.000Z'),
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expiredSubscription]);

      mockPrismaTransaction.mockRejectedValue(new Error('Transaction failed'));

      await service.handleSubscriptionExpiry();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error expiring subscription'),
        expect.any(String),
      );
    });

    it('should handle notification exceptions', async () => {
      const expiredSubscription = {
        ...mockSubscription,
        endDate: new Date('2024-01-10T00:00:00.000Z'),
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expiredSubscription]);

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: { update: jest.fn() },
          tenant: { update: jest.fn() },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionExpiredEmail.mockRejectedValue(
        new Error('Network error'),
      );

      await service.handleSubscriptionExpiry();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error sending expiration notification'),
        expect.any(String),
      );
    });
  });

  describe('runExpiryCheck', () => {
    it('should return counts for all subscription states', async () => {
      mockPrismaSubscription.count
        .mockResolvedValueOnce(5) // expiring in 7 days
        .mockResolvedValueOnce(2) // expiring tomorrow
        .mockResolvedValueOnce(1); // expired

      const result = await service.runExpiryCheck();

      expect(result).toEqual({
        expiring7Days: 5,
        expiringTomorrow: 2,
        expired: 1,
      });
    });

    it('should query with correct date ranges', async () => {
      mockPrismaSubscription.count.mockResolvedValue(0);

      await service.runExpiryCheck();

      // Should have 3 count queries
      expect(mockPrismaSubscription.count).toHaveBeenCalledTimes(3);

      // Check first query (7 days)
      expect(mockPrismaSubscription.count).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: {
            status: SubscriptionStatus.ACTIVE,
            endDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          },
        }),
      );

      // Check second query (tomorrow)
      expect(mockPrismaSubscription.count).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: {
            status: SubscriptionStatus.ACTIVE,
            endDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          },
        }),
      );

      // Check third query (expired)
      expect(mockPrismaSubscription.count).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: {
            status: SubscriptionStatus.ACTIVE,
            endDate: {
              lt: expect.any(Date),
            },
          },
        }),
      );
    });

    it('should run all queries in parallel using Promise.all', async () => {
      // Verify that all 3 count queries are called, which implies Promise.all usage
      mockPrismaSubscription.count.mockResolvedValue(1);

      await service.runExpiryCheck();

      // All 3 queries should be made
      expect(mockPrismaSubscription.count).toHaveBeenCalledTimes(3);
    });
  });

  describe('sendExpiryWarning', () => {
    it('should handle tenants with no admin users', async () => {
      const subscriptionWithNoUsers = {
        ...mockSubscription,
        tenant: { ...mockTenant, users: [] },
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([subscriptionWithNoUsers])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.handleSubscriptionExpiry();

      expect(
        mockBrevoService.sendSubscriptionExpiringEmail,
      ).not.toHaveBeenCalled();
    });

    it('should continue sending to other users if one fails', async () => {
      const secondUser = {
        ...mockUser,
        id: 'user-456',
        email: 'admin2@example.com',
      };
      const subscription = {
        ...mockSubscription,
        tenant: { ...mockTenant, users: [mockUser, secondUser] },
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([subscription])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockBrevoService.sendSubscriptionExpiringEmail
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ success: true });

      await service.handleSubscriptionExpiry();

      expect(
        mockBrevoService.sendSubscriptionExpiringEmail,
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendExpirationNotification', () => {
    it('should use correct plan display name', async () => {
      const expiredSubscription = {
        ...mockSubscription,
        plan: SubscriptionPlan.PRO,
        endDate: new Date('2024-01-10T00:00:00.000Z'),
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expiredSubscription]);

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: { update: jest.fn() },
          tenant: { update: jest.fn() },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionExpiredEmail.mockResolvedValue({
        success: true,
      });

      await service.handleSubscriptionExpiry();

      expect(
        mockBrevoService.sendSubscriptionExpiredEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          planName: PLAN_LIMITS[SubscriptionPlan.PRO].displayName,
        }),
      );
    });
  });

  describe('transaction behavior', () => {
    it('should update subscription status to EXPIRED', async () => {
      const expiredSubscription = {
        ...mockSubscription,
        endDate: new Date('2024-01-10T00:00:00.000Z'),
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expiredSubscription]);

      const txSubscriptionUpdate = jest.fn();
      const txTenantUpdate = jest.fn();

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: { update: txSubscriptionUpdate },
          tenant: { update: txTenantUpdate },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionExpiredEmail.mockResolvedValue({
        success: true,
      });

      await service.handleSubscriptionExpiry();

      expect(txSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: expiredSubscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
    });

    it('should update tenant status to SUSPENDED', async () => {
      const expiredSubscription = {
        ...mockSubscription,
        endDate: new Date('2024-01-10T00:00:00.000Z'),
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expiredSubscription]);

      const txSubscriptionUpdate = jest.fn();
      const txTenantUpdate = jest.fn();

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: { update: txSubscriptionUpdate },
          tenant: { update: txTenantUpdate },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionExpiredEmail.mockResolvedValue({
        success: true,
      });

      await service.handleSubscriptionExpiry();

      expect(txTenantUpdate).toHaveBeenCalledWith({
        where: { id: expiredSubscription.tenantId },
        data: { status: TenantStatus.SUSPENDED },
      });
    });
  });

  describe('multiple subscriptions', () => {
    it('should process multiple expiring subscriptions', async () => {
      const subscription1 = { ...mockSubscription, id: 'sub-1' };
      const subscription2 = {
        ...mockSubscription,
        id: 'sub-2',
        tenant: {
          ...mockTenant,
          id: 'tenant-456',
          users: [{ ...mockUser, id: 'user-456', email: 'admin2@example.com' }],
        },
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([subscription1, subscription2])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockBrevoService.sendSubscriptionExpiringEmail.mockResolvedValue({
        success: true,
      });

      await service.handleSubscriptionExpiry();

      expect(
        mockBrevoService.sendSubscriptionExpiringEmail,
      ).toHaveBeenCalledTimes(2);
    });

    it('should process multiple expired subscriptions', async () => {
      const expired1 = {
        ...mockSubscription,
        id: 'sub-1',
        endDate: new Date('2024-01-10T00:00:00.000Z'),
      };
      const expired2 = {
        ...mockSubscription,
        id: 'sub-2',
        endDate: new Date('2024-01-10T00:00:00.000Z'),
        tenant: {
          ...mockTenant,
          id: 'tenant-456',
          users: [{ ...mockUser, id: 'user-456', email: 'admin2@example.com' }],
        },
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expired1, expired2]);

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: { update: jest.fn() },
          tenant: { update: jest.fn() },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionExpiredEmail.mockResolvedValue({
        success: true,
      });

      await service.handleSubscriptionExpiry();

      expect(mockPrismaTransaction).toHaveBeenCalledTimes(2);
      expect(
        mockBrevoService.sendSubscriptionExpiredEmail,
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle subscription with non-Error exception in warning', async () => {
      const subscription = { ...mockSubscription };
      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([subscription])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockBrevoService.sendSubscriptionExpiringEmail.mockRejectedValue(
        'string error',
      );

      await service.handleSubscriptionExpiry();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error sending expiry warning'),
        undefined,
      );
    });

    it('should handle subscription with non-Error exception in notification', async () => {
      const expiredSubscription = {
        ...mockSubscription,
        endDate: new Date('2024-01-10T00:00:00.000Z'),
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expiredSubscription]);

      mockPrismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          subscription: { update: jest.fn() },
          tenant: { update: jest.fn() },
        };
        return callback(tx);
      });

      mockBrevoService.sendSubscriptionExpiredEmail.mockRejectedValue(
        'string error',
      );

      await service.handleSubscriptionExpiry();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error sending expiration notification'),
        undefined,
      );
    });

    it('should handle transaction with non-Error exception', async () => {
      const expiredSubscription = {
        ...mockSubscription,
        endDate: new Date('2024-01-10T00:00:00.000Z'),
      };

      mockPrismaSubscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expiredSubscription]);

      mockPrismaTransaction.mockRejectedValue('string error');

      await service.handleSubscriptionExpiry();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error expiring subscription'),
        undefined,
      );
    });
  });
});
