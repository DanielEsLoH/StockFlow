import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { Public } from '../common';
import { WebhookResponseEntity } from './entities/subscription.entity';

/**
 * WebhooksController handles incoming Stripe webhook events.
 *
 * This controller is PUBLIC (no authentication required) because
 * Stripe needs to call it directly. Security is handled via
 * webhook signature verification.
 *
 * IMPORTANT: This controller requires raw body access for signature
 * verification. The main.ts must be configured to preserve raw body
 * for this route.
 *
 * Stripe events handled:
 * - checkout.session.completed: User completed payment
 * - customer.subscription.updated: Subscription changed
 * - customer.subscription.deleted: Subscription canceled
 * - invoice.payment_failed: Payment failed
 */
@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Handles incoming Stripe webhook events.
   *
   * This endpoint:
   * 1. Verifies the webhook signature using Stripe's SDK
   * 2. Routes the event to the appropriate handler in SubscriptionsService
   * 3. Returns 200 OK to acknowledge receipt (even if processing fails)
   *
   * @param signature - Stripe signature header for verification
   * @param req - Raw request with body buffer
   * @returns Empty response with 200 status
   *
   * @example
   * POST /webhooks/stripe
   * Headers:
   *   stripe-signature: t=...,v1=...,v0=...
   * Body: <raw event JSON>
   */
  @Post('stripe')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Stripe webhook',
    description:
      'Handles incoming Stripe webhook events. This endpoint is public and verifies requests using the Stripe signature header. Used for processing subscription lifecycle events.',
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature for verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and processed',
    type: WebhookResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Missing signature or invalid payload',
  })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    this.logger.log('Received Stripe webhook');

    if (!signature) {
      this.logger.warn('Stripe webhook received without signature');
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;

    if (!rawBody) {
      this.logger.error(
        'Raw body not available - ensure rawBody: true is set for this route',
      );
      throw new BadRequestException(
        'Raw body not available for webhook verification',
      );
    }

    await this.subscriptionsService.handleWebhook(signature, rawBody);

    return { received: true };
  }
}
