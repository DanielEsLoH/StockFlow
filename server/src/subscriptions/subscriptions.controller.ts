import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import type {
  SubscriptionStatusResponse,
  CheckoutConfigResponse,
} from './subscriptions.service';
import {
  CreateCheckoutDto,
  VerifyPaymentDto,
  CreatePaymentSourceDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { CurrentTenant, Roles } from '../common/decorators';
import {
  SubscriptionStatusEntity,
  CheckoutConfigResponseEntity,
  PaymentSourceResponseEntity,
  BillingTransactionEntity,
} from './entities/subscription.entity';

/**
 * SubscriptionsController handles all subscription management endpoints.
 *
 * All endpoints require JWT authentication.
 * Most operations are restricted to ADMIN role to prevent
 * unauthorized subscription changes.
 *
 * Endpoints:
 * - GET /subscriptions/status - Get current subscription status
 * - GET /subscriptions/plans - Get available plans with pricing
 * - POST /subscriptions/checkout-config - Get Wompi checkout widget configuration
 * - POST /subscriptions/verify-payment - Verify payment after Wompi widget callback
 * - POST /subscriptions/payment-source - Create a payment source for recurring billing
 * - GET /subscriptions/billing-history - Get billing transaction history
 */
@ApiTags('subscriptions')
@ApiBearerAuth('JWT-auth')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Gets the current subscription status for the tenant.
   */
  @Get('status')
  @ApiOperation({
    summary: 'Get subscription status',
    description:
      'Returns the current subscription status for the tenant including plan, limits, dates, and payment source status. All authenticated users can access this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved successfully',
    type: SubscriptionStatusEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getStatus(
    @CurrentTenant() tenantId: string,
  ): Promise<SubscriptionStatusResponse> {
    this.logger.log(`Getting subscription status for tenant: ${tenantId}`);
    return this.subscriptionsService.getSubscriptionStatus(tenantId);
  }

  /**
   * Returns all available plans with pricing for every period.
   */
  @Get('plans')
  @ApiOperation({
    summary: 'Get available plans',
    description:
      'Returns all available subscription plans with pricing details for each period (monthly, quarterly, annual). Includes features, limits, and discount information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Plans retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  getPlans() {
    this.logger.log('Getting available plans');
    return this.subscriptionsService.getPlans();
  }

  /**
   * Generates checkout widget configuration for the Wompi payment widget.
   * Only ADMIN users can initiate subscription upgrades.
   */
  @Post('checkout-config')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get checkout configuration',
    description:
      'Generates the configuration needed by the frontend to open the Wompi checkout widget. Includes public key, reference, amount, integrity hash, and acceptance tokens. Only ADMIN users can request checkout configurations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Checkout configuration generated successfully',
    type: CheckoutConfigResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid plan or EMPRENDEDOR plan selected',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getCheckoutConfig(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCheckoutDto,
  ): Promise<CheckoutConfigResponse> {
    this.logger.log(
      `Creating checkout config for tenant ${tenantId} - plan: ${dto.plan}, period: ${dto.period}`,
    );
    return this.subscriptionsService.getCheckoutConfig(
      tenantId,
      dto.plan,
      dto.period,
    );
  }

  /**
   * Verifies a Wompi payment after the checkout widget callback.
   * If the payment is approved, the subscription is activated.
   */
  @Post('verify-payment')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify payment',
    description:
      'Verifies a Wompi transaction after the checkout widget callback. If the payment was approved, the subscription is activated and plan limits are updated. Returns the updated subscription status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment verified and subscription status updated',
    type: SubscriptionStatusEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Tenant not found',
  })
  async verifyPayment(
    @CurrentTenant() tenantId: string,
    @Body() dto: VerifyPaymentDto,
  ): Promise<SubscriptionStatusResponse> {
    this.logger.log(
      `Verifying payment for tenant ${tenantId} - transaction: ${dto.transactionId}, plan: ${dto.plan}, period: ${dto.period}`,
    );
    return this.subscriptionsService.verifyPayment(
      tenantId,
      dto.transactionId,
      dto.plan,
      dto.period,
    );
  }

  /**
   * Creates a Wompi payment source (tokenized card) for recurring billing.
   */
  @Post('payment-source')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create payment source',
    description:
      'Creates a Wompi payment source from a tokenized card for recurring billing. The token must be obtained client-side via the Wompi.js SDK. Only ADMIN users can add payment methods.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment source created successfully',
    type: PaymentSourceResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Tenant not found',
  })
  async createPaymentSource(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePaymentSourceDto,
  ): Promise<{ paymentSourceId: string }> {
    this.logger.log(`Creating payment source for tenant: ${tenantId}`);
    return this.subscriptionsService.createPaymentSource(
      tenantId,
      dto.token,
      dto.acceptanceToken,
      dto.personalAuthToken,
    );
  }

  /**
   * Returns the billing transaction history for the tenant.
   */
  @Get('billing-history')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get billing history',
    description:
      'Returns all billing transactions for the tenant, ordered by most recent first. Includes transaction status, amounts, payment methods, and timestamps. Only ADMIN users can view billing history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Billing history retrieved successfully',
    type: [BillingTransactionEntity],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getBillingHistory(@CurrentTenant() tenantId: string) {
    this.logger.log(`Getting billing history for tenant: ${tenantId}`);
    return this.subscriptionsService.getBillingHistory(tenantId);
  }
}
