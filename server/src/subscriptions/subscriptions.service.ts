import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SubscriptionPlan,
  SubscriptionPeriod,
  SubscriptionStatus as PrismaSubscriptionStatus,
  BillingStatus,
  NotificationType,
  NotificationPriority,
  UserRole,
  InvitationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { WompiService, WompiTransaction } from './wompi.service';
import {
  PLAN_LIMITS,
  calculatePlanPrice,
  getPlanLimits,
  PERIOD_DISCOUNTS,
  PERIOD_MULTIPLIERS,
} from './plan-limits';

// ============================================================================
// CONSTANTS
// ============================================================================

const PERIOD_DAYS: Record<SubscriptionPeriod, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  ANNUAL: 365,
};

/**
 * Maps Wompi transaction statuses to internal BillingStatus values.
 */
const WOMPI_STATUS_MAP: Record<string, BillingStatus> = {
  APPROVED: BillingStatus.APPROVED,
  DECLINED: BillingStatus.DECLINED,
  VOIDED: BillingStatus.VOIDED,
  ERROR: BillingStatus.ERROR,
  PENDING: BillingStatus.PENDING,
};

// ============================================================================
// EXPORTED INTERFACES
// ============================================================================

/**
 * Subscription status response returned by getSubscriptionStatus.
 */
export interface SubscriptionStatusResponse {
  tenantId: string;
  plan: SubscriptionPlan | null;
  status: PrismaSubscriptionStatus | null;
  periodType: SubscriptionPeriod | null;
  startDate: Date | null;
  endDate: Date | null;
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxInvoices: number;
    maxWarehouses: number;
  };
  usage: {
    users: { current: number; limit: number };
    contadores: { current: number; limit: number };
    warehouses: { current: number; limit: number };
  };
  hasPaymentSource: boolean;
  daysRemaining: number | null;
}

/**
 * Checkout configuration returned by getCheckoutConfig for the Wompi widget.
 */
export interface CheckoutConfigResponse {
  publicKey: string;
  reference: string;
  amountInCents: number;
  currency: string;
  integrityHash: string;
  redirectUrl: string;
  acceptanceToken: string;
  personalDataAuthToken: string;
  plan: SubscriptionPlan;
  period: SubscriptionPeriod;
  displayName: string;
  priceFormatted: string;
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * SubscriptionsService handles all Wompi-based subscription billing operations.
 *
 * This service manages:
 * - Querying subscription status for tenants
 * - Listing available plans with pricing
 * - Generating checkout widget configuration
 * - Verifying payments after Wompi widget callback
 * - Creating payment sources for recurring billing
 * - Charging recurring subscriptions
 * - Processing Wompi webhook events
 * - Querying billing history
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly wompiService: WompiService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Returns the current subscription status for a tenant.
   *
   * This is a local-only query -- no external API calls are made.
   *
   * @param tenantId - The tenant ID
   * @returns Current subscription status including plan, limits, and dates
   * @throws NotFoundException if tenant does not exist
   */
  async getSubscriptionStatus(
    tenantId: string,
  ): Promise<SubscriptionStatusResponse> {
    this.logger.log(`Getting subscription status for tenant ${tenantId}`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const subscription = tenant.subscription;
    let daysRemaining: number | null = null;

    if (subscription?.endDate) {
      const now = new Date();
      const diffMs = subscription.endDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Calculate usage counts
    const planLimits = tenant.plan ? getPlanLimits(tenant.plan) : null;
    const maxRegularUsers = planLimits
      ? tenant.maxUsers - planLimits.maxContadores
      : tenant.maxUsers;
    const maxContadores = planLimits?.maxContadores ?? 0;

    const [
      regularUserCount,
      contadorCount,
      pendingRegularInvitations,
      pendingContadorInvitations,
      warehouseCount,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { tenantId, role: { not: UserRole.CONTADOR } },
      }),
      this.prisma.user.count({
        where: { tenantId, role: UserRole.CONTADOR },
      }),
      this.prisma.invitation.count({
        where: {
          tenantId,
          role: { not: UserRole.CONTADOR },
          status: InvitationStatus.PENDING,
        },
      }),
      this.prisma.invitation.count({
        where: {
          tenantId,
          role: UserRole.CONTADOR,
          status: InvitationStatus.PENDING,
        },
      }),
      this.prisma.warehouse.count({ where: { tenantId } }),
    ]);

    return {
      tenantId: tenant.id,
      plan: tenant.plan,
      status: subscription?.status ?? null,
      periodType: subscription?.periodType ?? null,
      startDate: subscription?.startDate ?? null,
      endDate: subscription?.endDate ?? null,
      limits: {
        maxUsers: tenant.maxUsers,
        maxProducts: tenant.maxProducts,
        maxInvoices: tenant.maxInvoices,
        maxWarehouses: tenant.maxWarehouses,
      },
      usage: {
        users: {
          current: regularUserCount + pendingRegularInvitations,
          limit: maxRegularUsers,
        },
        contadores: {
          current: contadorCount + pendingContadorInvitations,
          limit: maxContadores,
        },
        warehouses: {
          current: warehouseCount,
          limit: tenant.maxWarehouses,
        },
      },
      hasPaymentSource: !!tenant.wompiPaymentSourceId,
      daysRemaining,
    };
  }

  /**
   * Returns all available plans with pricing for every period.
   *
   * @returns Array of plan info objects with prices for each period
   */
  getPlans() {
    const plans = Object.entries(PLAN_LIMITS).map(([key, limits]) => {
      const plan = key as SubscriptionPlan;

      const prices = Object.values(SubscriptionPeriod).reduce(
        (acc, period) => {
          const price = calculatePlanPrice(plan, period);
          acc[period] = {
            total: price,
            totalInCents: price * 100,
            monthly: Math.round(price / PERIOD_MULTIPLIERS[period]),
            discount: PERIOD_DISCOUNTS[period],
          };
          return acc;
        },
        {} as Record<
          SubscriptionPeriod,
          {
            total: number;
            totalInCents: number;
            monthly: number;
            discount: number;
          }
        >,
      );

      return {
        plan,
        displayName: limits.displayName,
        description: limits.description,
        features: limits.features,
        priceMonthly: limits.priceMonthly,
        limits: {
          maxUsers: limits.maxUsers,
          maxWarehouses: limits.maxWarehouses,
          maxProducts: limits.maxProducts,
          maxInvoices: limits.maxInvoices,
        },
        prices,
      };
    });

    return plans;
  }

  /**
   * Generates the configuration needed by the frontend to open the Wompi
   * checkout widget.
   *
   * @param tenantId - The tenant ID
   * @param plan - The target subscription plan
   * @param period - The subscription period
   * @returns Checkout widget configuration
   * @throws BadRequestException if plan is EMPRENDEDOR
   * @throws NotFoundException if tenant does not exist
   */
  async getCheckoutConfig(
    tenantId: string,
    plan: SubscriptionPlan,
    period: SubscriptionPeriod,
  ): Promise<CheckoutConfigResponse> {
    this.logger.log(
      `Generating checkout config for tenant ${tenantId} - plan: ${plan}, period: ${period}`,
    );

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const priceInCop = calculatePlanPrice(plan, period);
    const amountInCents = priceInCop * 100;
    const reference = `SF-${tenantId.slice(0, 8)}-${Date.now()}`;

    // generateIntegrityHash is synchronous; getMerchantInfo is async
    const integrityHash = this.wompiService.generateIntegrityHash(
      reference,
      amountInCents,
      'COP',
    );
    const merchantInfo = await this.wompiService.getMerchantInfo();
    const publicKey = this.wompiService.getPublicKey();

    const planLimits = getPlanLimits(plan);
    const redirectUrl = `${this.frontendUrl}/billing?success=true`;

    const priceFormatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(priceInCop);

    return {
      publicKey,
      reference,
      amountInCents,
      currency: 'COP',
      integrityHash,
      redirectUrl,
      acceptanceToken: merchantInfo.presigned_acceptance.acceptance_token,
      personalDataAuthToken:
        merchantInfo.presigned_personal_data_auth.acceptance_token,
      plan,
      period,
      displayName: planLimits.displayName,
      priceFormatted,
    };
  }

  /**
   * Verifies a Wompi transaction after the widget checkout callback and
   * activates the subscription if the payment was approved.
   *
   * @param tenantId - The tenant ID
   * @param transactionId - The Wompi transaction ID
   * @returns Updated subscription status
   * @throws NotFoundException if tenant does not exist
   */
  async verifyPayment(
    tenantId: string,
    transactionId: string,
    plan: SubscriptionPlan,
    period: SubscriptionPeriod,
  ): Promise<SubscriptionStatusResponse> {
    this.logger.log(
      `Verifying payment for tenant ${tenantId} - transaction: ${transactionId}, plan: ${plan}, period: ${period}`,
    );

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    let wompiTx: WompiTransaction;

    try {
      wompiTx = await this.wompiService.getTransaction(transactionId);
    } catch (error) {
      this.logger.error(
        `Failed to retrieve Wompi transaction ${transactionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException(
        'Failed to verify payment with Wompi',
      );
    }

    const billingStatus = WOMPI_STATUS_MAP[wompiTx.status] ?? BillingStatus.ERROR;

    // Create BillingTransaction record
    const billingTransaction = await this.prisma.billingTransaction.create({
      data: {
        tenantId,
        wompiTransactionId: wompiTx.id,
        wompiReference: wompiTx.reference,
        plan,
        period,
        amountInCents: wompiTx.amount_in_cents,
        currency: wompiTx.currency,
        status: billingStatus,
        paymentMethodType: wompiTx.payment_method_type ?? null,
        failureReason: wompiTx.status_message ?? null,
        isRecurring: false,
      },
    });

    // If approved, activate or renew the subscription
    if (billingStatus === BillingStatus.APPROVED) {
      const isSamePlan = tenant.plan === plan;
      const hasActiveSubscription = tenant.plan !== null;

      if (isSamePlan && hasActiveSubscription) {
        // Renewal: extend current subscription end date
        await this.extendSubscription(
          tenantId,
          period,
          billingTransaction.id,
        );
      } else {
        // New plan or upgrade: activate subscription
        await this.activateSubscription(
          tenantId,
          plan,
          period,
          billingTransaction.id,
          wompiTx.customer_email ?? null,
        );
      }
    }

    return this.getSubscriptionStatus(tenantId);
  }

  /**
   * Creates a payment source (tokenized card) on Wompi for recurring billing.
   *
   * @param tenantId - The tenant ID
   * @param token - Wompi tokenized card token
   * @param acceptanceToken - Wompi acceptance token
   * @param personalAuthToken - Optional personal data authorization token
   * @throws NotFoundException if tenant does not exist
   */
  async createPaymentSource(
    tenantId: string,
    token: string,
    acceptanceToken: string,
    personalAuthToken?: string,
  ): Promise<{ paymentSourceId: string }> {
    this.logger.log(`Creating payment source for tenant ${tenantId}`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const customerEmail = tenant.wompiCustomerEmail ?? tenant.email;

    let paymentSource: Awaited<
      ReturnType<WompiService['createPaymentSource']>
    >;

    try {
      // WompiService.createPaymentSource(token, customerEmail, acceptanceToken, personalAuthToken?)
      paymentSource = await this.wompiService.createPaymentSource(
        token,
        customerEmail,
        acceptanceToken,
        personalAuthToken,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create payment source for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException(
        'Failed to create payment source with Wompi',
      );
    }

    // WompiPaymentSource.id is a number; wompiPaymentSourceId on Tenant is String
    const paymentSourceIdStr = String(paymentSource.id);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { wompiPaymentSourceId: paymentSourceIdStr },
    });

    this.logger.log(
      `Payment source ${paymentSourceIdStr} stored for tenant ${tenantId}`,
    );

    return { paymentSourceId: paymentSourceIdStr };
  }

  /**
   * Charges a tenant's stored payment source to renew their subscription.
   *
   * @param tenantId - The tenant ID
   * @returns Updated subscription status
   * @throws NotFoundException if tenant or subscription does not exist
   * @throws BadRequestException if tenant has no stored payment source
   */
  async chargeRecurring(
    tenantId: string,
  ): Promise<SubscriptionStatusResponse> {
    this.logger.log(`Charging recurring payment for tenant ${tenantId}`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    if (!tenant.subscription) {
      throw new NotFoundException(
        `No active subscription found for tenant ${tenantId}`,
      );
    }

    if (!tenant.wompiPaymentSourceId) {
      throw new BadRequestException(
        'Tenant does not have a stored payment source. Please add a payment method first.',
      );
    }

    const { subscription } = tenant;
    const plan = subscription.plan;
    const period = subscription.periodType;
    const priceInCop = calculatePlanPrice(plan, period);
    const amountInCents = priceInCop * 100;
    const reference = `SF-${tenantId.slice(0, 8)}-${Date.now()}`;

    const merchantInfo = await this.wompiService.getMerchantInfo();

    // CreateTransactionParams.paymentSourceId is number | undefined
    const paymentSourceId = parseInt(tenant.wompiPaymentSourceId, 10);

    let wompiTx: WompiTransaction;

    try {
      wompiTx = await this.wompiService.createTransaction({
        amountInCents,
        currency: 'COP',
        customerEmail: tenant.wompiCustomerEmail ?? tenant.email,
        reference,
        paymentSourceId,
        acceptanceToken: merchantInfo.presigned_acceptance.acceptance_token,
        recurrent: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create recurring transaction for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException(
        'Failed to process recurring payment with Wompi',
      );
    }

    const billingStatus = WOMPI_STATUS_MAP[wompiTx.status] ?? BillingStatus.ERROR;

    const billingTransaction = await this.prisma.billingTransaction.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        wompiTransactionId: wompiTx.id,
        wompiReference: reference,
        plan,
        period,
        amountInCents,
        currency: 'COP',
        status: billingStatus,
        paymentMethodType: wompiTx.payment_method_type ?? null,
        failureReason: wompiTx.status_message ?? null,
        isRecurring: true,
      },
    });

    if (billingStatus === BillingStatus.APPROVED) {
      await this.extendSubscription(tenantId, period, billingTransaction.id);
      this.logger.log(
        `Recurring payment approved for tenant ${tenantId} - subscription extended`,
      );
    } else {
      this.logger.warn(
        `Recurring payment ${billingStatus} for tenant ${tenantId} - transaction: ${wompiTx.id}`,
      );
    }

    return this.getSubscriptionStatus(tenantId);
  }

  /**
   * Processes incoming Wompi webhook events.
   *
   * Currently handles the `transaction.updated` event to update billing
   * transaction records and activate subscriptions when payments are approved.
   *
   * @param body - The raw webhook request body
   * @throws BadRequestException if webhook signature is invalid
   */
  async handleWebhook(body: any): Promise<void> {
    const isValid = this.wompiService.verifyWebhookSignature(body);

    if (!isValid) {
      this.logger.warn('Wompi webhook received with invalid signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = body.event;
    this.logger.log(`Processing Wompi webhook event: ${event}`);

    try {
      if (event === 'transaction.updated') {
        await this.handleTransactionUpdated(body.data?.transaction);
      } else {
        this.logger.log(`Unhandled Wompi webhook event: ${event}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing webhook ${event}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't rethrow -- acknowledge receipt to Wompi.
      // Failed events can be retried from the Wompi dashboard.
    }
  }

  /**
   * Returns the billing transaction history for a tenant, ordered by most
   * recent first.
   *
   * @param tenantId - The tenant ID
   * @returns Array of BillingTransaction records
   */
  async getBillingHistory(tenantId: string) {
    this.logger.log(`Getting billing history for tenant ${tenantId}`);

    return this.prisma.billingTransaction.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Activates a subscription for a tenant after a successful payment.
   * Creates or updates the Subscription record and applies plan limits
   * to the tenant.
   */
  private async activateSubscription(
    tenantId: string,
    plan: SubscriptionPlan,
    period: SubscriptionPeriod,
    billingTransactionId: string,
    customerEmail: string | null,
  ): Promise<void> {
    const limits = getPlanLimits(plan);
    const durationDays = PERIOD_DAYS[period];
    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.executeInTransaction(async (tx) => {
      // Upsert subscription
      await tx.subscription.upsert({
        where: { tenantId },
        create: {
          tenantId,
          plan,
          status: PrismaSubscriptionStatus.ACTIVE,
          periodType: period,
          startDate,
          endDate,
        },
        update: {
          plan,
          status: PrismaSubscriptionStatus.ACTIVE,
          periodType: period,
          startDate,
          endDate,
          suspendedAt: null,
          suspendedReason: null,
        },
      });

      // Update tenant plan and limits
      const tenantUpdateData: Record<string, unknown> = {
        plan,
        maxUsers: limits.maxUsers,
        maxProducts: limits.maxProducts,
        maxInvoices: limits.maxInvoices,
        maxWarehouses: limits.maxWarehouses,
      };

      if (customerEmail) {
        tenantUpdateData.wompiCustomerEmail = customerEmail;
      }

      await tx.tenant.update({
        where: { id: tenantId },
        data: tenantUpdateData,
      });

      // Link billing transaction to subscription
      const subscription = await tx.subscription.findUnique({
        where: { tenantId },
      });

      if (subscription) {
        await tx.billingTransaction.update({
          where: { id: billingTransactionId },
          data: { subscriptionId: subscription.id },
        });
      }

      // Create in-app notification for the subscription activation
      const periodLabel =
        period === SubscriptionPeriod.MONTHLY
          ? 'mensual'
          : period === SubscriptionPeriod.QUARTERLY
            ? 'trimestral'
            : 'anual';

      await tx.notification.create({
        data: {
          tenantId,
          type: NotificationType.SUBSCRIPTION_ACTIVATED,
          title: `Plan ${limits.displayName} activado`,
          message: `Tu suscripción ${periodLabel} al plan ${limits.displayName} ha sido activada exitosamente. Vence el ${endDate.toLocaleDateString('es-CO')}.`,
          priority: NotificationPriority.HIGH,
          link: '/billing',
          metadata: { plan, period, endDate: endDate.toISOString() },
        },
      });
    });

    this.logger.log(
      `Subscription activated for tenant ${tenantId}: plan=${plan}, period=${period}, endDate=${endDate.toISOString()}`,
    );
  }

  /**
   * Extends the current subscription end date by the subscription's period
   * duration. If the subscription is already expired, extends from now instead.
   */
  private async extendSubscription(
    tenantId: string,
    period: SubscriptionPeriod,
    billingTransactionId: string,
  ): Promise<void> {
    const durationDays = PERIOD_DAYS[period];

    await this.prisma.executeInTransaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { tenantId },
      });

      if (!subscription) {
        this.logger.warn(
          `Cannot extend subscription: no subscription found for tenant ${tenantId}`,
        );
        return;
      }

      // Extend from the current endDate (or now if already expired)
      const baseDate =
        subscription.endDate > new Date()
          ? subscription.endDate
          : new Date();

      const newEndDate = new Date(
        baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000,
      );

      await tx.subscription.update({
        where: { tenantId },
        data: {
          endDate: newEndDate,
          status: PrismaSubscriptionStatus.ACTIVE,
        },
      });

      await tx.billingTransaction.update({
        where: { id: billingTransactionId },
        data: { subscriptionId: subscription.id },
      });

      // Create renewal notification
      const periodLabel =
        period === SubscriptionPeriod.MONTHLY
          ? 'mensual'
          : period === SubscriptionPeriod.QUARTERLY
            ? 'trimestral'
            : 'anual';

      const planLimits = getPlanLimits(subscription.plan);

      await tx.notification.create({
        data: {
          tenantId,
          type: NotificationType.SUBSCRIPTION_ACTIVATED,
          title: `Plan ${planLimits.displayName} renovado`,
          message: `Tu suscripción ${periodLabel} al plan ${planLimits.displayName} ha sido renovada. Nueva fecha de vencimiento: ${newEndDate.toLocaleDateString('es-CO')}.`,
          priority: NotificationPriority.HIGH,
          link: '/billing',
          metadata: {
            plan: subscription.plan,
            period,
            endDate: newEndDate.toISOString(),
            isRenewal: true,
          },
        },
      });
    });

    this.logger.log(
      `Subscription extended for tenant ${tenantId} by ${durationDays} days`,
    );
  }

  /**
   * Handles a `transaction.updated` webhook event from Wompi.
   * Updates the BillingTransaction record and activates the plan if the
   * transaction transitions to APPROVED.
   */
  private async handleTransactionUpdated(
    transactionData: any,
  ): Promise<void> {
    if (!transactionData?.id) {
      this.logger.warn(
        'Webhook transaction.updated received without transaction data',
      );
      return;
    }

    const wompiTransactionId = transactionData.id as string;
    const newStatus =
      WOMPI_STATUS_MAP[transactionData.status] ?? BillingStatus.ERROR;

    this.logger.log(
      `Processing transaction update: ${wompiTransactionId} -> ${newStatus}`,
    );

    // Find the existing billing transaction
    const billingTransaction =
      await this.prisma.billingTransaction.findUnique({
        where: { wompiTransactionId },
      });

    if (!billingTransaction) {
      this.logger.warn(
        `No BillingTransaction found for Wompi transaction: ${wompiTransactionId}`,
      );
      return;
    }

    const previousStatus = billingTransaction.status;

    // Update the billing transaction status
    await this.prisma.billingTransaction.update({
      where: { wompiTransactionId },
      data: {
        status: newStatus,
        paymentMethodType:
          transactionData.payment_method_type ??
          billingTransaction.paymentMethodType,
        failureReason:
          transactionData.status_message ??
          billingTransaction.failureReason,
      },
    });

    // If the transaction is newly APPROVED, activate the subscription
    if (
      newStatus === BillingStatus.APPROVED &&
      previousStatus !== BillingStatus.APPROVED
    ) {
      this.logger.log(
        `Transaction ${wompiTransactionId} newly approved - activating plan for tenant ${billingTransaction.tenantId}`,
      );

      const customerEmail =
        transactionData.customer_email ??
        transactionData.customer_data?.email ??
        null;

      await this.activateSubscription(
        billingTransaction.tenantId,
        billingTransaction.plan,
        billingTransaction.period,
        billingTransaction.id,
        customerEmail,
      );
    }
  }

}
