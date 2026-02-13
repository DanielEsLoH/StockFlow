import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan, SubscriptionPeriod } from '@prisma/client';

/**
 * DTO for requesting a Wompi checkout widget configuration.
 *
 * Used when a tenant admin wants to upgrade their subscription plan.
 * The plan must be one of the paid plans (PYME, PRO, or PLUS).
 */
export class CreateCheckoutDto {
  /**
   * The target subscription plan.
   * EMPRENDEDOR is not allowed since checkout is only for paid plans.
   *
   * @example 'PYME'
   */
  @ApiProperty({
    description: 'Target subscription plan (PYME, PRO, or PLUS)',
    enum: SubscriptionPlan,
    example: 'PYME',
  })
  @IsEnum(SubscriptionPlan, {
    message: 'Plan must be one of: EMPRENDEDOR, PYME, PRO, PLUS',
  })
  @IsNotEmpty({ message: 'Plan is required' })
  readonly plan: SubscriptionPlan;

  /**
   * The subscription period.
   *
   * @example 'MONTHLY'
   */
  @ApiProperty({
    description: 'Subscription period (MONTHLY, QUARTERLY, or ANNUAL)',
    enum: SubscriptionPeriod,
    example: 'MONTHLY',
  })
  @IsEnum(SubscriptionPeriod, {
    message: 'Period must be one of: MONTHLY, QUARTERLY, ANNUAL',
  })
  @IsNotEmpty({ message: 'Period is required' })
  readonly period: SubscriptionPeriod;
}
