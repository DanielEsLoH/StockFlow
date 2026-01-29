import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  SubscriptionStatus,
  TenantStatus,
  Subscription,
  Tenant,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { BrevoService } from '../notifications/mail/brevo.service';
import { PLAN_LIMITS } from './plan-limits';

/**
 * Service for handling subscription expiration through scheduled jobs.
 *
 * Responsibilities:
 * - Check for expiring subscriptions and send warning emails (7 days before)
 * - Expire subscriptions that have passed their end date
 * - Suspend tenants with expired subscriptions
 */
@Injectable()
export class SubscriptionExpiryService {
  private readonly logger = new Logger(SubscriptionExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brevoService: BrevoService,
  ) {}

  /**
   * Daily job to check for expiring and expired subscriptions.
   * Runs at midnight every day.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionExpiry(): Promise<void> {
    this.logger.log('Running subscription expiry check...');

    try {
      // 1. Send warning emails for subscriptions expiring in 7 days
      await this.notifyExpiringSubscriptions();

      // 2. Send final warning for subscriptions expiring tomorrow
      await this.notifyExpiringTomorrow();

      // 3. Expire subscriptions that have passed their end date
      await this.expireSubscriptions();

      this.logger.log('Subscription expiry check completed');
    } catch (error) {
      this.logger.error(
        'Error during subscription expiry check',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Notifies tenants whose subscriptions expire in 7 days.
   */
  private async notifyExpiringSubscriptions(): Promise<void> {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const sixDaysFromNow = new Date();
    sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);

    // Find subscriptions expiring in exactly 7 days (within a 24-hour window)
    const expiringSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          gte: sixDaysFromNow,
          lte: sevenDaysFromNow,
        },
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
    });

    this.logger.log(
      `Found ${expiringSubscriptions.length} subscriptions expiring in 7 days`,
    );

    for (const subscription of expiringSubscriptions) {
      await this.sendExpiryWarning(subscription, 7);
    }
  }

  /**
   * Notifies tenants whose subscriptions expire tomorrow.
   */
  private async notifyExpiringTomorrow(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const today = new Date();

    // Find subscriptions expiring tomorrow (within a 24-hour window)
    const expiringSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          gte: today,
          lte: tomorrow,
        },
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
    });

    this.logger.log(
      `Found ${expiringSubscriptions.length} subscriptions expiring tomorrow`,
    );

    for (const subscription of expiringSubscriptions) {
      await this.sendExpiryWarning(subscription, 1);
    }
  }

  /**
   * Expires subscriptions that have passed their end date.
   */
  private async expireSubscriptions(): Promise<void> {
    const now = new Date();

    // Find active subscriptions that have expired
    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          lt: now,
        },
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
    });

    this.logger.log(
      `Found ${expiredSubscriptions.length} subscriptions to expire`,
    );

    for (const subscription of expiredSubscriptions) {
      await this.expireSubscription(subscription);
    }
  }

  /**
   * Expires a single subscription and suspends the tenant.
   */
  private async expireSubscription(
    subscription: Subscription & {
      tenant: Tenant & { users: User[] };
    },
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Update subscription status
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.EXPIRED },
        });

        // Suspend the tenant
        await tx.tenant.update({
          where: { id: subscription.tenantId },
          data: { status: TenantStatus.SUSPENDED },
        });
      });

      this.logger.log(
        `Subscription expired for tenant ${subscription.tenantId}`,
      );

      // Send expiration notification to admin users
      for (const user of subscription.tenant.users) {
        await this.sendExpirationNotification(subscription, user);
      }
    } catch (error) {
      this.logger.error(
        `Error expiring subscription ${subscription.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Sends a warning email about upcoming subscription expiration.
   */
  private async sendExpiryWarning(
    subscription: Subscription & {
      tenant: Tenant & { users: User[] };
    },
    daysUntilExpiry: number,
  ): Promise<void> {
    const planLimits = PLAN_LIMITS[subscription.plan];

    for (const user of subscription.tenant.users) {
      try {
        const result = await this.brevoService.sendSubscriptionExpiringEmail({
          to: user.email,
          firstName: user.firstName,
          planName: planLimits.displayName,
          expiryDate: subscription.endDate,
          daysRemaining: daysUntilExpiry,
          tenantName: subscription.tenant.name,
        });

        if (result.success) {
          this.logger.log(
            `Expiry warning sent to ${user.email} for tenant ${subscription.tenantId}`,
          );
        } else {
          this.logger.warn(
            `Failed to send expiry warning to ${user.email}: ${result.error}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error sending expiry warning to ${user.email}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  /**
   * Sends a notification that the subscription has expired.
   */
  private async sendExpirationNotification(
    subscription: Subscription & { tenant: Tenant },
    user: User,
  ): Promise<void> {
    const planLimits = PLAN_LIMITS[subscription.plan];

    try {
      const result = await this.brevoService.sendSubscriptionExpiredEmail({
        to: user.email,
        firstName: user.firstName,
        planName: planLimits.displayName,
        expiryDate: subscription.endDate,
        tenantName: subscription.tenant.name,
      });

      if (result.success) {
        this.logger.log(
          `Expiration notification sent to ${user.email} for tenant ${subscription.tenantId}`,
        );
      } else {
        this.logger.warn(
          `Failed to send expiration notification to ${user.email}: ${result.error}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error sending expiration notification to ${user.email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Manual method to run expiry check (for testing or admin trigger).
   */
  async runExpiryCheck(): Promise<{
    expiring7Days: number;
    expiringTomorrow: number;
    expired: number;
  }> {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const now = new Date();

    const [expiring7Days, expiringTomorrow, expired] = await Promise.all([
      this.prisma.subscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endDate: {
            gte: new Date(),
            lte: sevenDaysFromNow,
          },
        },
      }),
      this.prisma.subscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endDate: {
            gte: now,
            lte: tomorrow,
          },
        },
      }),
      this.prisma.subscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endDate: {
            lt: now,
          },
        },
      }),
    ]);

    return { expiring7Days, expiringTomorrow, expired };
  }
}
