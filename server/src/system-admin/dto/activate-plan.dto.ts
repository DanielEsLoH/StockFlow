import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan, SubscriptionPeriod } from '@prisma/client';

/**
 * Data transfer object for activating a tenant's subscription plan
 */
export class ActivatePlanDto {
  /**
   * The subscription plan to activate
   * @example "PYME"
   */
  @ApiProperty({
    description: 'The subscription plan to activate',
    enum: SubscriptionPlan,
    example: 'PYME',
  })
  @IsEnum(SubscriptionPlan, {
    message: `Plan must be one of: ${Object.values(SubscriptionPlan).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Plan is required' })
  plan: SubscriptionPlan;

  /**
   * The subscription period (duration)
   * @example "QUARTERLY"
   */
  @ApiProperty({
    description: 'The subscription period (MONTHLY = 30 days, QUARTERLY = 90 days, ANNUAL = 365 days)',
    enum: SubscriptionPeriod,
    example: 'QUARTERLY',
  })
  @IsEnum(SubscriptionPeriod, {
    message: `Period must be one of: ${Object.values(SubscriptionPeriod).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Period is required' })
  period: SubscriptionPeriod;
}
