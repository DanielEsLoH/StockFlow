import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { SubscriptionsService } from './subscriptions.service';
import { PLAN_LIMITS } from './plan-limits';
import { BrevoService } from '../notifications/mail/brevo.service';

/**
 * SubscriptionBillingService handles automated recurring billing via cron jobs.
 *
 * This service runs daily to:
 * 1. Find active subscriptions expiring within 3 days
 * 2. Attempt recurring charges for tenants with stored payment sources
 * 3. Log and notify failures (tenants without payment sources are handled
 *    by SubscriptionExpiryService)
 *
 * Cron schedule: Every day at 11:00 UTC (6:00 AM COT)
 */
@Injectable()
export class SubscriptionBillingService {
  private readonly logger = new Logger(SubscriptionBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly brevoService: BrevoService,
  ) {}

  /**
   * Daily cron job to process recurring subscription billing.
   *
   * Runs at 11:00 UTC (6:00 AM Colombia Time) every day.
   * Finds subscriptions expiring within 3 days that have a stored
   * payment source, and attempts to charge them automatically.
   */
  @Cron('0 11 * * *', {
    name: 'subscription-recurring-billing',
    timeZone: 'UTC',
  })
  async handleRecurringBilling(): Promise<void> {
    this.logger.log('Running recurring billing check...');

    try {
      const results = await this.processRecurringCharges();
      this.logger.log(
        `Recurring billing completed: ${results.attempted} attempted, ` +
          `${results.succeeded} succeeded, ${results.failed} failed`,
      );
    } catch (error) {
      this.logger.error(
        'Error during recurring billing check',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Processes all pending recurring charges.
   *
   * Finds active subscriptions expiring within 3 days where:
   * - The tenant has a stored Wompi payment source
   * - No billing transaction has been created for renewal yet
   *
   * @returns Summary of attempted, succeeded, and failed charges
   */
  async processRecurringCharges(): Promise<{
    attempted: number;
    succeeded: number;
    failed: number;
  }> {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const now = new Date();

    // Find active subscriptions expiring within 3 days
    // where the tenant has a stored payment source
    const expiringSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          gte: now,
          lte: threeDaysFromNow,
        },
        tenant: {
          wompiPaymentSourceId: { not: null },
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
      `Found ${expiringSubscriptions.length} subscriptions eligible for recurring billing`,
    );

    let attempted = 0;
    let succeeded = 0;
    let failed = 0;

    for (const subscription of expiringSubscriptions) {
      // Check if a recurring billing transaction already exists for this period
      const existingTransaction =
        await this.prisma.billingTransaction.findFirst({
          where: {
            tenantId: subscription.tenantId,
            subscriptionId: subscription.id,
            isRecurring: true,
            createdAt: {
              gte: new Date(
                subscription.endDate.getTime() - 7 * 24 * 60 * 60 * 1000,
              ),
            },
          },
        });

      if (existingTransaction) {
        this.logger.log(
          `Skipping tenant ${subscription.tenantId} - recurring transaction already exists`,
        );
        continue;
      }

      attempted++;

      try {
        const result = await this.subscriptionsService.chargeRecurring(
          subscription.tenantId,
        );

        if (result.status === SubscriptionStatus.ACTIVE) {
          succeeded++;
          this.logger.log(
            `Recurring charge succeeded for tenant ${subscription.tenantId}`,
          );
        } else {
          failed++;
          this.logger.warn(
            `Recurring charge completed but subscription not active for tenant ${subscription.tenantId}`,
          );
          await this.notifyChargeFailed(subscription);
        }
      } catch (error) {
        failed++;
        this.logger.error(
          `Recurring charge failed for tenant ${subscription.tenantId}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
        await this.notifyChargeFailed(subscription);
      }
    }

    return { attempted, succeeded, failed };
  }

  /**
   * Sends expiry warning emails to tenant admins when a recurring charge fails.
   *
   * Reuses the existing subscription expiring email template with 0 days
   * remaining to communicate urgency. The SubscriptionExpiryService will
   * handle the actual expiration if no manual payment is made.
   */
  private async notifyChargeFailed(
    subscription: {
      tenantId: string;
      plan: string;
      endDate: Date;
      tenant: {
        name: string;
        users: { email: string; firstName: string }[];
      };
    },
  ): Promise<void> {
    const planKey = subscription.plan as keyof typeof PLAN_LIMITS;
    const planLimits = PLAN_LIMITS[planKey];
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    );

    for (const user of subscription.tenant.users) {
      try {
        const result = await this.brevoService.sendSubscriptionExpiringEmail({
          to: user.email,
          firstName: user.firstName,
          planName: planLimits?.displayName ?? subscription.plan,
          expiryDate: subscription.endDate,
          daysRemaining,
          tenantName: subscription.tenant.name,
        });

        if (result.success) {
          this.logger.log(
            `Payment failure warning sent to ${user.email} for tenant ${subscription.tenantId}`,
          );
        } else {
          this.logger.warn(
            `Failed to send payment failure warning to ${user.email}: ${result.error}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error sending payment failure warning to ${user.email}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
