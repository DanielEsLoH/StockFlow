import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan, Tenant } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma';

/**
 * Plan limits configuration for each subscription tier.
 * -1 indicates unlimited.
 * Note: The primary plan limits configuration is in plan-limits.ts.
 * This is kept for backward compatibility with Stripe webhook handlers.
 */
export const STRIPE_PLAN_LIMITS: Record<
  SubscriptionPlan,
  {
    maxUsers: number;
    maxProducts: number;
    maxInvoices: number;
    maxWarehouses: number;
  }
> = {
  EMPRENDEDOR: { maxUsers: 1, maxProducts: 100, maxInvoices: 50, maxWarehouses: 1 },
  PYME: { maxUsers: 2, maxProducts: 500, maxInvoices: -1, maxWarehouses: 2 },
  PRO: { maxUsers: 3, maxProducts: 2000, maxInvoices: -1, maxWarehouses: 10 },
  PLUS: {
    maxUsers: 8,
    maxProducts: -1,
    maxInvoices: -1,
    maxWarehouses: 100,
  },
};

/**
 * Subscription status response interface.
 */
export interface SubscriptionStatus {
  tenantId: string;
  plan: SubscriptionPlan;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxInvoices: number;
    maxWarehouses: number;
  };
  stripeSubscriptionStatus?: Stripe.Subscription.Status;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Checkout session response interface.
 */
export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

/**
 * Portal session response interface.
 */
export interface PortalSessionResponse {
  url: string;
}

/**
 * SubscriptionsService handles all Stripe subscription-related operations.
 *
 * This service manages:
 * - Creating checkout sessions for plan upgrades
 * - Creating customer portal sessions for subscription management
 * - Processing webhook events from Stripe
 * - Syncing subscription status with tenant records
 *
 * @example
 * ```TypeScript
 * // In a controller
 * @Post('create-checkout')
 * async createCheckout(
 *   @CurrentTenant() tenantId: string,
 *   @Body() dto: CreateCheckoutDto,
 * ) {
 *   return this.subscriptionsService.createCheckoutSession(tenantId, dto. Plan);
 * }
 * ```
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly stripe: Stripe | null;
  private readonly stripeEnabled: boolean;
  private readonly frontendUrl: string;
  private readonly webhookSecret: string;
  private readonly priceIds: Record<Exclude<SubscriptionPlan, 'EMPRENDEDOR'>, string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured - Stripe features will be disabled',
      );
      this.stripe = null;
      this.stripeEnabled = false;
    } else {
      // Initialize Stripe client only if key is provided
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-12-15.clover',
        typescript: true,
      });
      this.stripeEnabled = true;
    }

    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    this.webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';

    // Map plans to Stripe price IDs
    this.priceIds = {
      PYME: this.configService.get<string>('STRIPE_PRICE_PYME') || '',
      PRO: this.configService.get<string>('STRIPE_PRICE_PRO') || '',
      PLUS: this.configService.get<string>('STRIPE_PRICE_PLUS') || '',
    };
  }

  /**
   * Checks if Stripe is enabled and returns the Stripe instance.
   * Throws an error if Stripe is not configured.
   *
   * @returns The Stripe instance
   * @throws BadRequestException if Stripe is not enabled
   */
  private getStripeClient(): Stripe {
    if (!this.stripeEnabled || !this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.',
      );
    }
    return this.stripe;
  }

  /**
   * Creates a Stripe checkout session for upgrading to a paid plan.
   *
   * This method:
   * 1. Retrieves or creates a Stripe customer for the tenant
   * 2. Creates a checkout session with the appropriate price
   * 3. Returns the session ID and URL for redirect
   *
   * @param tenantId - The tenant's ID
   * @param plan - The target subscription plan
   * @returns Checkout session details with URL
   * @throws BadRequestException if plan is FREE or invalid
   * @throws NotFoundException if tenant not found
   */
  async createCheckoutSession(
    tenantId: string,
    plan: SubscriptionPlan,
  ): Promise<CheckoutSessionResponse> {
    const stripe = this.getStripeClient();
    this.logger.log(`Creating checkout session for tenant ${tenantId}`);

    if (plan === 'EMPRENDEDOR') {
      throw new BadRequestException(
        'Cannot create checkout session for EMPRENDEDOR plan - it is the base plan',
      );
    }

    const priceId = this.priceIds[plan];
    if (!priceId) {
      throw new BadRequestException(
        `Price not configured for plan: ${plan}. Please configure STRIPE_PRICE_${plan}`,
      );
    }

    // Get tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    // Get or create Stripe customer
    const stripeCustomerId = await this.getOrCreateStripeCustomer(tenant);

    try {
      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${this.frontendUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${this.frontendUrl}/settings/billing?canceled=true`,
        metadata: {
          tenantId,
          plan,
        },
        subscription_data: {
          metadata: {
            tenantId,
            plan,
          },
        },
      });

      this.logger.log(
        `Checkout session created: ${session.id} for tenant ${tenantId}`,
      );

      return {
        sessionId: session.id,
        url: session.url || '',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException(
        'Failed to create checkout session',
      );
    }
  }

  /**
   * Creates a Stripe customer portal session for managing subscriptions.
   *
   * Allows customers to:
   * - View billing history
   * - Update payment methods
   * - Cancel or modify subscriptions
   *
   * @param tenantId - The tenant's ID
   * @param returnUrl - Optional URL to redirect after portal session
   * @returns Portal session URL
   * @throws NotFoundException if tenant not found or has no Stripe customer
   */
  async createPortalSession(
    tenantId: string,
    returnUrl?: string,
  ): Promise<PortalSessionResponse> {
    const stripe = this.getStripeClient();
    this.logger.log(`Creating portal session for tenant ${tenantId}`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    if (!tenant.stripeCustomerId) {
      throw new BadRequestException(
        'No Stripe customer found for this tenant. Please subscribe to a plan first.',
      );
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: tenant.stripeCustomerId,
        return_url: returnUrl || `${this.frontendUrl}/settings/billing`,
      });

      this.logger.log(`Portal session created for tenant ${tenantId}`);

      return {
        url: session.url,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create portal session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException(
        'Failed to create customer portal session',
      );
    }
  }

  /**
   * Gets the current subscription status for a tenant.
   *
   * @param tenantId - The tenant's ID
   * @returns Subscription status including plan, limits, and Stripe details
   * @throws NotFoundException if tenant not found
   */
  async getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus> {
    this.logger.log(`Getting subscription status for tenant ${tenantId}`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

      const status: SubscriptionStatus = {
      tenantId: tenant.id,
      plan: tenant.plan || 'EMPRENDEDOR',
      stripeCustomerId: tenant.stripeCustomerId,
      stripeSubscriptionId: tenant.stripeSubscriptionId,
      limits: {
        maxUsers: tenant.maxUsers,
        maxProducts: tenant.maxProducts,
        maxInvoices: tenant.maxInvoices,
        maxWarehouses: tenant.maxWarehouses,
      },
    };

    // If there's an active Stripe subscription and Stripe is enabled, fetch additional details
    if (tenant.stripeSubscriptionId && this.stripeEnabled && this.stripe) {
      try {
        const subscriptionResponse = await this.stripe.subscriptions.retrieve(
          tenant.stripeSubscriptionId,
        );
        // Stripe Response<T> type extends T, cast to access subscription properties
        const subscription =
          subscriptionResponse as unknown as Stripe.Subscription;

        status.stripeSubscriptionStatus = subscription.status;
        status.cancelAtPeriodEnd = subscription.cancel_at_period_end;

        // In Clover API (2025-12-15), current_period_end is on subscription items
        // Access it from the first item if available
        if (subscription.items?.data?.length > 0) {
          const firstItem = subscription.items.data[0];
          if (firstItem.current_period_end) {
            status.currentPeriodEnd = new Date(
              firstItem.current_period_end * 1000,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Could not fetch Stripe subscription details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // Continue without Stripe details - don't fail the request
      }
    }

    return status;
  }

  /**
   * Handles Stripe webhook events.
   *
   * Supported events:
   * - checkout.session.completed: Updates tenant plan after successful checkout
   * - customer.subscription.updated: Syncs plan changes from Stripe
   * - customer.subscription.deleted: Downgrades tenant to FREE
   * - invoice.payment_failed: Logs payment failure (subscription status managed by Stripe)
   *
   * @param signature - Stripe signature header
   * @param rawBody - Raw request body for signature verification
   */
  async handleWebhook(signature: string, rawBody: Buffer): Promise<void> {
    const stripe = this.getStripeClient();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;

        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing webhook ${event.type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't rethrow - acknowledge receipt to Stripe
      // Failed events can be retried via Stripe dashboard
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Gets or creates a Stripe customer for a tenant.
   *
   * @param tenant - The tenant record
   * @returns Stripe customer ID
   */
  private async getOrCreateStripeCustomer(tenant: Tenant): Promise<string> {
    if (tenant.stripeCustomerId) {
      return tenant.stripeCustomerId;
    }

    // Note: This method is only called after getStripeClient() has verified stripe is non-null
    const stripe = this.stripe!;

    try {
      const customer = await stripe.customers.create({
        email: tenant.email,
        name: tenant.name,
        metadata: {
          tenantId: tenant.id,
          slug: tenant.slug,
        },
      });

      // Update tenant with Stripe customer ID
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customer.id },
      });

      this.logger.log(
        `Created Stripe customer ${customer.id} for tenant ${tenant.id}`,
      );

      return customer.id;
    } catch (error) {
      this.logger.error(
        `Failed to create Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException(
        'Failed to create Stripe customer',
      );
    }
  }

  /**
   * Handles checkout.session.completed webhook event.
   *
   * Updates tenant with subscription details and applies plan limits.
   *
   * @param session - Stripe checkout session
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const tenantId = session.metadata?.tenantId;
    const planFromMetadata = session.metadata?.plan as
      | SubscriptionPlan
      | undefined;

    if (!tenantId) {
      this.logger.warn(
        'Checkout session completed without tenantId in metadata',
      );
      return;
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      this.logger.warn('Checkout session completed without subscription ID');
      return;
    }

    // Determine plan from metadata or subscription
    let plan: SubscriptionPlan = planFromMetadata || 'PYME';

    if (!planFromMetadata && this.stripe) {
      // Try to get plan from subscription metadata
      try {
        const subscription =
          await this.stripe.subscriptions.retrieve(subscriptionId);
        const subscriptionPlan = subscription.metadata
          ?.plan as SubscriptionPlan;
        if (subscriptionPlan && STRIPE_PLAN_LIMITS[subscriptionPlan]) {
          plan = subscriptionPlan;
        }
      } catch (error) {
        this.logger.warn(
          `Could not fetch subscription for plan details: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
    }

    const limits = STRIPE_PLAN_LIMITS[plan];

    await this.prisma.executeInTransaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          plan,
          stripeSubscriptionId: subscriptionId,
          maxUsers: limits.maxUsers,
          maxProducts: limits.maxProducts,
          maxInvoices: limits.maxInvoices,
          maxWarehouses: limits.maxWarehouses,
        },
      });
    });

    this.logger.log(
      `Tenant ${tenantId} upgraded to ${plan} plan (subscription: ${subscriptionId})`,
    );
  }

  /**
   * Handles customer.subscription.updated webhook event.
   *
   * Syncs plan changes that occur through Stripe (e.g., plan changes via portal).
   *
   * @param subscription - Stripe subscription
   */
  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const tenantId = subscription.metadata?.tenantId;

    if (!tenantId) {
      // Try to find tenant by customer ID
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

      if (!customerId) {
        this.logger.warn(
          'Subscription updated without tenantId or customer ID',
        );
        return;
      }

      const tenant = await this.prisma.tenant.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!tenant) {
        this.logger.warn(`No tenant found for Stripe customer: ${customerId}`);
        return;
      }

      await this.updateTenantFromSubscription(tenant.id, subscription);
      return;
    }

    await this.updateTenantFromSubscription(tenantId, subscription);
  }

  /**
   * Updates tenant plan based on subscription details.
   *
   * @param tenantId - Tenant ID
   * @param subscription - Stripe subscription
   */
  private async updateTenantFromSubscription(
    tenantId: string,
    subscription: Stripe.Subscription,
  ): Promise<void> {
    // Get plan from subscription metadata
    const plan = (subscription.metadata?.plan as SubscriptionPlan) || undefined;

    // If subscription is active, and we have a plan, update the tenant
    if (subscription.status === 'active' && plan && STRIPE_PLAN_LIMITS[plan]) {
      const limits = STRIPE_PLAN_LIMITS[plan];

      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          plan,
          stripeSubscriptionId: subscription.id,
          maxUsers: limits.maxUsers,
          maxProducts: limits.maxProducts,
          maxInvoices: limits.maxInvoices,
          maxWarehouses: limits.maxWarehouses,
        },
      });

      this.logger.log(`Tenant ${tenantId} subscription updated to ${plan}`);
    } else if (
      subscription.status === 'past_due' ||
      subscription.status === 'unpaid'
    ) {
      this.logger.warn(
        `Tenant ${tenantId} subscription is ${subscription.status}`,
      );
      // Could implement grace period logic here
    }
  }

  /**
   * Handles customer.subscription.deleted webhook event.
   *
   * Downgrades tenant to FREE plan when subscription is canceled.
   *
   * @param subscription - Stripe subscription
   */
  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const tenantId = subscription.metadata?.tenantId;
    let targetTenantId = tenantId;

    if (!targetTenantId) {
      // Try to find tenant by customer ID
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

      if (!customerId) {
        this.logger.warn('Subscription deleted without tenantId or customer');
        return;
      }

      const tenant = await this.prisma.tenant.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!tenant) {
        this.logger.warn(`No tenant found for Stripe customer: ${customerId}`);
        return;
      }

      targetTenantId = tenant.id;
    }

    // When subscription is cancelled, set plan to null (no active subscription)
    // The tenant will need to be suspended or have a new plan activated by admin
    await this.prisma.executeInTransaction(async (tx) => {
      await tx.tenant.update({
        where: { id: targetTenantId },
        data: {
          plan: null,
          stripeSubscriptionId: null,
        },
      });
    });

    this.logger.log(
      `Tenant ${targetTenantId} subscription cancelled - plan set to null`,
    );
  }

  /**
   * Handles invoice.payment_failed webhook event.
   *
   * Logs the payment failure. Stripe handles subscription status automatically.
   * Could be extended to send notification emails.
   *
   * @param invoice - Stripe invoice
   */
  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

    if (!customerId) {
      this.logger.warn('Invoice payment failed without customer ID');
      return;
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!tenant) {
      this.logger.warn(`Payment failed for unknown customer: ${customerId}`);
      return;
    }

    this.logger.warn(
      `Payment failed for tenant ${tenant.id} (${tenant.name}) - Invoice: ${invoice.id}`,
    );

    // Note: Stripe will automatically mark the subscription as past_due
    // Additional logic could be added here:
    // - Send email notification to tenant
    // - Update tenant status to indicate payment issue
    // - Implement grace period countdown
  }
}
