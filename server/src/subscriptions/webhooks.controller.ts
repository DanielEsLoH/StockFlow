import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { Public } from '../common';
import { WebhookResponseEntity } from './entities/subscription.entity';

/**
 * WebhooksController handles incoming Wompi webhook events.
 *
 * This controller is PUBLIC (no authentication required) because
 * Wompi needs to call it directly. Security is handled via
 * webhook signature verification (SHA256 checksum).
 *
 * Wompi events handled:
 * - transaction.updated: Transaction status changed (PENDING -> APPROVED/DECLINED/etc.)
 */
@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Handles incoming Wompi webhook events.
   *
   * Wompi sends webhook events as JSON POST requests with a signature
   * embedded in the body (body.signature.checksum). The service verifies
   * the signature using SHA256 before processing the event.
   *
   * @param body - The parsed JSON webhook payload
   * @returns Acknowledgement response
   */
  @Post('wompi')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Wompi webhook',
    description:
      'Handles incoming Wompi webhook events. This endpoint is public and verifies requests using the embedded SHA256 signature. Used for processing payment status updates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and processed',
    type: WebhookResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid signature or payload',
  })
  async handleWompiWebhook(
    @Body() body: any,
  ): Promise<{ received: boolean }> {
    this.logger.log('Received Wompi webhook');

    await this.subscriptionsService.handleWebhook(body);

    return { received: true };
  }
}
