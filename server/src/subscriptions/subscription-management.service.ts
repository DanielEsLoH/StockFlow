import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  SubscriptionPlan,
  SubscriptionPeriod,
  SubscriptionStatus,
  TenantStatus,
  Subscription,
  Tenant,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { BrevoService } from '../notifications/mail/brevo.service';
import {
  PLAN_LIMITS,
  getPeriodDays,
  calculatePlanPrice,
  PlanLimits,
} from './plan-limits';

/**
 * Result of a subscription operation
 */
export interface SubscriptionOperationResult {
  success: boolean;
  subscription: Subscription;
  tenant: Tenant;
  message: string;
}

/**
 * Service for managing tenant subscriptions.
 *
 * Handles:
 * - Activating plans for tenants
 * - Suspending plans
 * - Changing plans
 * - Calculating prices and periods
 */
@Injectable()
export class SubscriptionManagementService {
  private readonly logger = new Logger(SubscriptionManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brevoService: BrevoService,
  ) {}

  /**
   * Activates a subscription plan for a tenant.
   *
   * @param tenantId - The tenant ID
   * @param plan - The plan to activate
   * @param period - The subscription period (MONTHLY, QUARTERLY, ANNUAL)
   * @param adminId - The system admin ID who activated the plan
   * @returns The created/updated subscription and tenant
   */
  async activatePlan(
    tenantId: string,
    plan: SubscriptionPlan,
    period: SubscriptionPeriod,
    adminId: string,
  ): Promise<SubscriptionOperationResult> {
    this.logger.log(
      `Activating plan ${plan} for tenant ${tenantId} with period ${period}`,
    );

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: 'ADMIN' } } },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const limits = PLAN_LIMITS[plan];
    const durationDays = getPeriodDays(period);
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      // Create or update subscription
      const subscription = await tx.subscription.upsert({
        where: { tenantId },
        create: {
          tenantId,
          plan,
          status: SubscriptionStatus.ACTIVE,
          periodType: period,
          startDate,
          endDate,
          activatedById: adminId,
        },
        update: {
          plan,
          status: SubscriptionStatus.ACTIVE,
          periodType: period,
          startDate,
          endDate,
          activatedById: adminId,
          suspendedAt: null,
          suspendedReason: null,
        },
      });

      // Update tenant limits and status
      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          plan,
          status: TenantStatus.ACTIVE,
          maxUsers: limits.maxUsers,
          maxWarehouses: limits.maxWarehouses,
          maxProducts: limits.maxProducts,
          maxInvoices: limits.maxInvoices,
        },
      });

      return { subscription, tenant: updatedTenant };
    });

    this.logger.log(
      `Plan ${plan} activated for tenant ${tenantId} until ${endDate.toISOString()}`,
    );

    // Send notification to tenant admin
    const adminUser = tenant.users[0];
    if (adminUser) {
      this.sendPlanActivationNotification(
        adminUser.email,
        adminUser.firstName,
        plan,
        period,
        endDate,
      ).catch((error) => {
        this.logger.error(
          'Failed to send plan activation notification',
          error instanceof Error ? error.stack : undefined,
        );
      });
    }

    return {
      success: true,
      subscription: result.subscription,
      tenant: result.tenant,
      message: `Plan ${limits.displayName} activado exitosamente hasta ${endDate.toLocaleDateString('es-CO')}`,
    };
  }

  /**
   * Suspends a tenant's subscription due to violation or non-payment.
   *
   * @param tenantId - The tenant ID
   * @param reason - The reason for suspension
   * @param adminId - The system admin ID who suspended the plan
   * @returns The updated subscription and tenant
   */
  async suspendPlan(
    tenantId: string,
    reason: string,
    adminId: string,
  ): Promise<SubscriptionOperationResult> {
    this.logger.log(`Suspending plan for tenant ${tenantId}: ${reason}`);

    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { tenant: { include: { users: { where: { role: 'ADMIN' } } } } },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription for tenant ${tenantId} not found`);
    }

    if (subscription.status === SubscriptionStatus.SUSPENDED) {
      throw new BadRequestException('Subscription is already suspended');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedSubscription = await tx.subscription.update({
        where: { tenantId },
        data: {
          status: SubscriptionStatus.SUSPENDED,
          suspendedAt: new Date(),
          suspendedReason: reason,
        },
      });

      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { status: TenantStatus.SUSPENDED },
      });

      return { subscription: updatedSubscription, tenant: updatedTenant };
    });

    this.logger.log(`Plan suspended for tenant ${tenantId}`);

    // Send notification to tenant admin
    const adminUser = subscription.tenant.users[0];
    if (adminUser) {
      this.sendPlanSuspensionNotification(
        adminUser.email,
        adminUser.firstName,
        reason,
      ).catch((error) => {
        this.logger.error(
          'Failed to send plan suspension notification',
          error instanceof Error ? error.stack : undefined,
        );
      });
    }

    return {
      success: true,
      subscription: result.subscription,
      tenant: result.tenant,
      message: 'Plan suspendido exitosamente',
    };
  }

  /**
   * Reactivates a suspended subscription.
   *
   * @param tenantId - The tenant ID
   * @param adminId - The system admin ID who reactivated the plan
   * @returns The updated subscription and tenant
   */
  async reactivatePlan(
    tenantId: string,
    adminId: string,
  ): Promise<SubscriptionOperationResult> {
    this.logger.log(`Reactivating plan for tenant ${tenantId}`);

    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription for tenant ${tenantId} not found`);
    }

    if (subscription.status !== SubscriptionStatus.SUSPENDED) {
      throw new BadRequestException('Subscription is not suspended');
    }

    // Check if subscription hasn't expired
    if (subscription.endDate < new Date()) {
      throw new BadRequestException(
        'Subscription has expired. Please activate a new plan.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedSubscription = await tx.subscription.update({
        where: { tenantId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          suspendedAt: null,
          suspendedReason: null,
        },
      });

      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { status: TenantStatus.ACTIVE },
      });

      return { subscription: updatedSubscription, tenant: updatedTenant };
    });

    this.logger.log(`Plan reactivated for tenant ${tenantId}`);

    return {
      success: true,
      subscription: result.subscription,
      tenant: result.tenant,
      message: 'Plan reactivado exitosamente',
    };
  }

  /**
   * Changes a tenant's subscription plan.
   * The period remains the same (end date doesn't change).
   *
   * @param tenantId - The tenant ID
   * @param newPlan - The new plan
   * @param adminId - The system admin ID who changed the plan
   * @returns The updated subscription and tenant
   */
  async changePlan(
    tenantId: string,
    newPlan: SubscriptionPlan,
    adminId: string,
  ): Promise<SubscriptionOperationResult> {
    this.logger.log(`Changing plan to ${newPlan} for tenant ${tenantId}`);

    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { tenant: { include: { users: { where: { role: 'ADMIN' } } } } },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription for tenant ${tenantId} not found`);
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot change plan on non-active subscription',
      );
    }

    const limits = PLAN_LIMITS[newPlan];
    const oldPlan = subscription.plan;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedSubscription = await tx.subscription.update({
        where: { tenantId },
        data: { plan: newPlan },
      });

      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          plan: newPlan,
          maxUsers: limits.maxUsers,
          maxWarehouses: limits.maxWarehouses,
          maxProducts: limits.maxProducts,
          maxInvoices: limits.maxInvoices,
        },
      });

      return { subscription: updatedSubscription, tenant: updatedTenant };
    });

    this.logger.log(`Plan changed from ${oldPlan} to ${newPlan} for tenant ${tenantId}`);

    // Send notification to tenant admin
    const adminUser = subscription.tenant.users[0];
    if (adminUser) {
      this.sendPlanChangeNotification(
        adminUser.email,
        adminUser.firstName,
        oldPlan,
        newPlan,
      ).catch((error) => {
        this.logger.error(
          'Failed to send plan change notification',
          error instanceof Error ? error.stack : undefined,
        );
      });
    }

    return {
      success: true,
      subscription: result.subscription,
      tenant: result.tenant,
      message: `Plan cambiado de ${PLAN_LIMITS[oldPlan].displayName} a ${limits.displayName}`,
    };
  }

  /**
   * Gets subscription details for a tenant.
   *
   * @param tenantId - The tenant ID
   * @returns The subscription with tenant info
   */
  async getSubscription(tenantId: string): Promise<Subscription & { tenant: Tenant } | null> {
    return this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { tenant: true },
    });
  }

  /**
   * Gets all subscriptions with optional filtering.
   *
   * @param status - Optional status filter
   * @returns List of subscriptions
   */
  async getSubscriptions(
    status?: SubscriptionStatus,
  ): Promise<(Subscription & { tenant: Tenant })[]> {
    return this.prisma.subscription.findMany({
      where: status ? { status } : undefined,
      include: { tenant: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Gets subscriptions expiring within a number of days.
   *
   * @param days - Number of days to look ahead
   * @returns List of expiring subscriptions
   */
  async getExpiringSubscriptions(
    days: number,
  ): Promise<(Subscription & { tenant: Tenant })[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          gte: now,
          lte: futureDate,
        },
      },
      include: { tenant: true },
      orderBy: { endDate: 'asc' },
    });
  }

  /**
   * Gets plan limits for a specific plan.
   *
   * @param plan - The subscription plan
   * @returns The plan limits
   */
  getPlanLimits(plan: SubscriptionPlan): PlanLimits {
    return PLAN_LIMITS[plan];
  }

  /**
   * Gets all plan limits.
   *
   * @returns All plan limits
   */
  getAllPlanLimits(): Record<SubscriptionPlan, PlanLimits> {
    return PLAN_LIMITS;
  }

  /**
   * Calculates the price for a plan and period.
   *
   * @param plan - The subscription plan
   * @param period - The subscription period
   * @returns The calculated price
   */
  calculatePrice(plan: SubscriptionPlan, period: SubscriptionPeriod): number {
    return calculatePlanPrice(plan, period);
  }

  // Private notification methods

  private async sendPlanActivationNotification(
    email: string,
    firstName: string,
    plan: SubscriptionPlan,
    period: SubscriptionPeriod,
    endDate: Date,
  ): Promise<void> {
    const limits = PLAN_LIMITS[plan];

    try {
      const result = await this.brevoService.sendSubscriptionActivatedEmail({
        to: email,
        firstName,
        planName: limits.displayName,
        period,
        endDate,
        features: limits.features,
      });

      if (result.success) {
        this.logger.log(`Plan activation notification sent to ${email}`);
      } else {
        this.logger.warn(`Plan activation notification failed for ${email}: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(
        `Plan activation notification error for ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async sendPlanSuspensionNotification(
    email: string,
    firstName: string,
    reason: string,
  ): Promise<void> {
    try {
      const result = await this.brevoService.sendSubscriptionSuspendedEmail({
        to: email,
        firstName,
        reason,
      });

      if (result.success) {
        this.logger.log(`Plan suspension notification sent to ${email}`);
      } else {
        this.logger.warn(`Plan suspension notification failed for ${email}: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(
        `Plan suspension notification error for ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async sendPlanChangeNotification(
    email: string,
    firstName: string,
    oldPlan: SubscriptionPlan,
    newPlan: SubscriptionPlan,
  ): Promise<void> {
    const oldLimits = PLAN_LIMITS[oldPlan];
    const newLimits = PLAN_LIMITS[newPlan];

    try {
      const result = await this.brevoService.sendSubscriptionChangedEmail({
        to: email,
        firstName,
        oldPlanName: oldLimits.displayName,
        newPlanName: newLimits.displayName,
        newFeatures: newLimits.features,
      });

      if (result.success) {
        this.logger.log(`Plan change notification sent to ${email}`);
      } else {
        this.logger.warn(`Plan change notification failed for ${email}: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(
        `Plan change notification error for ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
