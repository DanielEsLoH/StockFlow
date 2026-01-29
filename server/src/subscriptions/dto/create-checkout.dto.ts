import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '@prisma/client';

/**
 * DTO for creating a Stripe checkout session.
 *
 * Used when a tenant wants to upgrade their subscription plan.
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
}
