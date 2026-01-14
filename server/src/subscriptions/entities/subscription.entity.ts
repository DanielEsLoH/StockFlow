import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan } from '@prisma/client';

/**
 * Plan limits entity
 */
export class PlanLimitsEntity {
  @ApiProperty({
    description: 'Maximum number of users allowed',
    example: 5,
  })
  maxUsers: number;

  @ApiProperty({
    description: 'Maximum number of products allowed',
    example: 1000,
  })
  maxProducts: number;

  @ApiProperty({
    description: 'Maximum number of warehouses allowed',
    example: 2,
  })
  maxWarehouses: number;

  @ApiProperty({
    description: 'Maximum invoices per month',
    example: 500,
  })
  maxInvoicesPerMonth: number;
}

/**
 * Subscription status entity for Swagger documentation
 */
export class SubscriptionStatusEntity {
  @ApiProperty({
    description: 'Tenant ID',
    example: 'cmkcykam80001reya0hsdx334',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Current subscription plan',
    enum: SubscriptionPlan,
    example: 'BASIC',
  })
  plan: SubscriptionPlan;

  @ApiProperty({
    description: 'Plan limits',
    type: PlanLimitsEntity,
  })
  limits: PlanLimitsEntity;

  @ApiPropertyOptional({
    description: 'Stripe customer ID',
    example: 'cus_Nh1234567890',
    nullable: true,
  })
  stripeCustomerId: string | null;

  @ApiPropertyOptional({
    description: 'Stripe subscription ID',
    example: 'sub_Nh1234567890',
    nullable: true,
  })
  stripeSubscriptionId: string | null;

  @ApiPropertyOptional({
    description: 'Stripe subscription status',
    example: 'active',
    nullable: true,
  })
  stripeSubscriptionStatus: string | null;

  @ApiPropertyOptional({
    description: 'Current period end date',
    example: '2024-02-15T00:00:00.000Z',
    nullable: true,
  })
  currentPeriodEnd: Date | null;

  @ApiPropertyOptional({
    description: 'Whether subscription will cancel at period end',
    example: false,
    nullable: true,
  })
  cancelAtPeriodEnd: boolean | null;
}

/**
 * Checkout session response entity
 */
export class CheckoutSessionResponseEntity {
  @ApiProperty({
    description: 'Stripe checkout session ID',
    example: 'cs_test_a1b2c3d4e5f6g7h8i9j0',
  })
  sessionId: string;

  @ApiProperty({
    description: 'URL to redirect user for checkout',
    example: 'https://checkout.stripe.com/pay/cs_test_...',
  })
  url: string;
}

/**
 * Portal session response entity
 */
export class PortalSessionResponseEntity {
  @ApiProperty({
    description: 'URL to redirect user to Stripe customer portal',
    example: 'https://billing.stripe.com/session/...',
  })
  url: string;
}

/**
 * Webhook response entity
 */
export class WebhookResponseEntity {
  @ApiProperty({
    description: 'Whether the webhook was received successfully',
    example: true,
  })
  received: boolean;
}