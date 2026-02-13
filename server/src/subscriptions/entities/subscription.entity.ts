import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SubscriptionPlan,
  SubscriptionPeriod,
  SubscriptionStatus,
  BillingStatus,
} from '@prisma/client';

/**
 * Plan limits entity for Swagger documentation
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
    description: 'Maximum invoices allowed',
    example: 500,
  })
  maxInvoices: number;
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

  @ApiPropertyOptional({
    description: 'Current subscription plan',
    enum: SubscriptionPlan,
    example: 'PYME',
    nullable: true,
  })
  plan: SubscriptionPlan | null;

  @ApiPropertyOptional({
    description: 'Subscription status',
    enum: SubscriptionStatus,
    example: 'ACTIVE',
    nullable: true,
  })
  status: SubscriptionStatus | null;

  @ApiPropertyOptional({
    description: 'Subscription period type',
    enum: SubscriptionPeriod,
    example: 'MONTHLY',
    nullable: true,
  })
  periodType: SubscriptionPeriod | null;

  @ApiPropertyOptional({
    description: 'Subscription start date',
    example: '2026-02-12T00:00:00.000Z',
    nullable: true,
  })
  startDate: Date | null;

  @ApiPropertyOptional({
    description: 'Subscription end date',
    example: '2026-03-12T00:00:00.000Z',
    nullable: true,
  })
  endDate: Date | null;

  @ApiProperty({
    description: 'Plan limits',
    type: PlanLimitsEntity,
  })
  limits: PlanLimitsEntity;

  @ApiProperty({
    description: 'Whether the tenant has a stored payment source for recurring billing',
    example: false,
  })
  hasPaymentSource: boolean;

  @ApiPropertyOptional({
    description: 'Days remaining until subscription expires',
    example: 25,
    nullable: true,
  })
  daysRemaining: number | null;
}

/**
 * Checkout configuration response entity for the Wompi widget
 */
export class CheckoutConfigResponseEntity {
  @ApiProperty({
    description: 'Wompi public API key for the checkout widget',
    example: 'pub_test_xxxxx',
  })
  publicKey: string;

  @ApiProperty({
    description: 'Unique transaction reference',
    example: 'SF-cmkcykam-1707753600000',
  })
  reference: string;

  @ApiProperty({
    description: 'Amount in cents (COP)',
    example: 14990000,
  })
  amountInCents: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'COP',
  })
  currency: string;

  @ApiProperty({
    description: 'SHA256 integrity hash for the widget',
    example: 'a1b2c3d4e5f6...',
  })
  integrityHash: string;

  @ApiProperty({
    description: 'URL to redirect after payment',
    example: 'https://stockflow.com.co/billing?success=true',
  })
  redirectUrl: string;

  @ApiProperty({
    description: 'Wompi acceptance token',
    example: 'eyJ...',
  })
  acceptanceToken: string;

  @ApiProperty({
    description: 'Wompi personal data authorization token',
    example: 'eyJ...',
  })
  personalDataAuthToken: string;

  @ApiProperty({
    description: 'Target subscription plan',
    enum: SubscriptionPlan,
    example: 'PYME',
  })
  plan: SubscriptionPlan;

  @ApiProperty({
    description: 'Subscription period',
    enum: SubscriptionPeriod,
    example: 'MONTHLY',
  })
  period: SubscriptionPeriod;

  @ApiProperty({
    description: 'Plan display name',
    example: 'Plan Pyme',
  })
  displayName: string;

  @ApiProperty({
    description: 'Formatted price string',
    example: '$149.900',
  })
  priceFormatted: string;
}

/**
 * Payment source creation response entity
 */
export class PaymentSourceResponseEntity {
  @ApiProperty({
    description: 'Wompi payment source ID',
    example: '12345',
  })
  paymentSourceId: string;
}

/**
 * Billing transaction entity for Swagger documentation
 */
export class BillingTransactionEntity {
  @ApiProperty({ description: 'Transaction ID', example: 'cmkcykam80001reya0hsdx334' })
  id: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiPropertyOptional({ description: 'Subscription ID', nullable: true })
  subscriptionId: string | null;

  @ApiPropertyOptional({ description: 'Wompi transaction ID', nullable: true })
  wompiTransactionId: string | null;

  @ApiPropertyOptional({ description: 'Wompi reference', nullable: true })
  wompiReference: string | null;

  @ApiProperty({ description: 'Subscription plan', enum: SubscriptionPlan })
  plan: SubscriptionPlan;

  @ApiProperty({ description: 'Subscription period', enum: SubscriptionPeriod })
  period: SubscriptionPeriod;

  @ApiProperty({ description: 'Amount in cents (COP)', example: 14990000 })
  amountInCents: number;

  @ApiProperty({ description: 'Currency code', example: 'COP' })
  currency: string;

  @ApiProperty({ description: 'Billing status', enum: BillingStatus })
  status: BillingStatus;

  @ApiPropertyOptional({ description: 'Payment method type', nullable: true })
  paymentMethodType: string | null;

  @ApiPropertyOptional({ description: 'Failure reason', nullable: true })
  failureReason: string | null;

  @ApiProperty({ description: 'Whether this is a recurring charge', example: false })
  isRecurring: boolean;

  @ApiProperty({ description: 'Transaction creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Transaction last update date' })
  updatedAt: Date;
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
