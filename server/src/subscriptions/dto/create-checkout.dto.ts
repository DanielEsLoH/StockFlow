import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '@prisma/client';

/**
 * DTO for creating a Stripe checkout session.
 *
 * Used when a tenant wants to upgrade their subscription plan.
 * The plan must be one of the paid plans (BASIC, PRO, or ENTERPRISE).
 */
export class CreateCheckoutDto {
  /**
   * The target subscription plan.
   * FREE is not allowed since checkout is only for paid plans.
   *
   * @example 'BASIC'
   */
  @ApiProperty({
    description: 'Target subscription plan (BASIC, PRO, or ENTERPRISE)',
    enum: SubscriptionPlan,
    example: 'BASIC',
  })
  @IsEnum(SubscriptionPlan, {
    message: 'Plan must be one of: FREE, BASIC, PRO, ENTERPRISE',
  })
  @IsNotEmpty({ message: 'Plan is required' })
  readonly plan: SubscriptionPlan;
}