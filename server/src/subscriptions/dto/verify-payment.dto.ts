import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan, SubscriptionPeriod } from '@prisma/client';

/**
 * DTO for verifying a Wompi payment after the checkout widget callback.
 *
 * The transactionId is returned by the Wompi widget after the user
 * completes a payment. The backend uses it to verify the payment
 * status with the Wompi API.
 *
 * plan and period are passed from the frontend because the Wompi widget
 * does not return custom metadata — the backend cannot determine which
 * plan/period the user selected from the transaction alone.
 */
export class VerifyPaymentDto {
  /**
   * The Wompi transaction ID returned by the checkout widget.
   *
   * @example '12345-1234567890-12345'
   */
  @ApiProperty({
    description: 'Wompi transaction ID from the checkout widget callback',
    example: '12345-1234567890-12345',
  })
  @IsString({ message: 'Transaction ID must be a string' })
  @IsNotEmpty({ message: 'Transaction ID is required' })
  readonly transactionId: string;

  /**
   * The subscription plan the user selected for checkout.
   */
  @ApiProperty({
    description: 'The subscription plan selected by the user',
    enum: SubscriptionPlan,
    example: 'PLUS',
  })
  @IsEnum(SubscriptionPlan, { message: 'Invalid subscription plan' })
  @IsNotEmpty({ message: 'Plan is required' })
  readonly plan: SubscriptionPlan;

  /**
   * The subscription period the user selected for checkout.
   */
  @ApiProperty({
    description: 'The subscription period selected by the user',
    enum: SubscriptionPeriod,
    example: 'MONTHLY',
  })
  @IsEnum(SubscriptionPeriod, { message: 'Invalid subscription period' })
  @IsNotEmpty({ message: 'Period is required' })
  readonly period: SubscriptionPeriod;
}
