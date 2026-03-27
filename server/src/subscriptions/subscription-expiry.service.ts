import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  SubscriptionStatus,
  TenantStatus,
  NotificationType,
  NotificationPriority,
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
      // Warnings: 30, 15, 7 days and tomorrow
      await this.notifyExpiring(30);
      await this.notifyExpiring(15);
      await this.notifyExpiring(7);
      await this.notifyExpiring(1);

      // Expire subscriptions that have passed their end date
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
   * Notifies tenants whose subscriptions expire in exactly `days` days.
   * Uses a 24-hour window to ensure each subscription only triggers once per interval.
   */
  private async notifyExpiring(days: number): Promise<void> {
    const upper = new Date();
    upper.setDate(upper.getDate() + days);

    const lower = new Date();
    lower.setDate(lower.getDate() + days - 1);

    const expiringSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: { gte: lower, lte: upper },
      },
      include: {
        tenant: {
          include: {
            users: { where: { role: 'ADMIN', status: 'ACTIVE' } },
          },
        },
      },
    });

    this.logger.log(
      `Found ${expiringSubscriptions.length} subscriptions expiring in ${days} day(s)`,
    );

    for (const subscription of expiringSubscriptions) {
      await this.sendExpiryWarning(subscription, days);
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
   * Sends a warning email and in-app notification about upcoming subscription expiration.
   */
  private async sendExpiryWarning(
    subscription: Subscription & {
      tenant: Tenant & { users: User[] };
    },
    daysUntilExpiry: number,
  ): Promise<void> {
    const planLimits = PLAN_LIMITS[subscription.plan];

    // Urgency escalates as expiry approaches
    const priority =
      daysUntilExpiry <= 3
        ? NotificationPriority.URGENT
        : daysUntilExpiry <= 7
          ? NotificationPriority.HIGH
          : NotificationPriority.MEDIUM;

    const title =
      daysUntilExpiry === 1
        ? 'Tu suscripción vence mañana'
        : `Tu suscripción vence en ${daysUntilExpiry} días`;

    for (const user of subscription.tenant.users) {
      try {
        // Email notification
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

        // In-app notification (deduplicated: skip if one was already created today)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const existing = await this.prisma.notification.findFirst({
          where: {
            tenantId: subscription.tenantId,
            userId: user.id,
            type: NotificationType.SUBSCRIPTION_EXPIRING,
            createdAt: { gte: startOfDay },
          },
        });

        if (!existing) {
          await this.prisma.notification.create({
            data: {
              tenantId: subscription.tenantId,
              userId: user.id,
              type: NotificationType.SUBSCRIPTION_EXPIRING,
              title,
              message: `El plan ${planLimits.displayName} de ${subscription.tenant.name} vence el ${subscription.endDate.toLocaleDateString('es-CO')}. Renueva para continuar sin interrupciones.`,
              priority,
              link: '/settings/billing',
            },
          });
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
      // Email
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

      // In-app notification
      await this.prisma.notification.create({
        data: {
          tenantId: subscription.tenantId,
          userId: user.id,
          type: NotificationType.SUBSCRIPTION_EXPIRED,
          title: 'Tu suscripción ha vencido',
          message: `El plan ${planLimits.displayName} de ${subscription.tenant.name} ha expirado. Renueva ahora para recuperar el acceso.`,
          priority: NotificationPriority.URGENT,
          link: '/settings/billing',
        },
      });
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
