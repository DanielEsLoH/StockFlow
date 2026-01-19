import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '@prisma/client';

/**
 * Data transfer object for changing a tenant's subscription plan
 */
export class ChangePlanDto {
  /**
   * The new subscription plan for the tenant
   * @example "PRO"
   */
  @ApiProperty({
    description: 'The new subscription plan to assign to the tenant',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.PRO,
  })
  @IsEnum(SubscriptionPlan, {
    message: `Plan must be one of: ${Object.values(SubscriptionPlan).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Plan is required' })
  plan: SubscriptionPlan;
}

/**
 * URL parameter DTO for tenant ID
 */
export class TenantIdParamDto {
  /**
   * The ID of the tenant
   * @example "clx1234567890tenant"
   */
  @ApiProperty({
    description: 'The unique identifier of the tenant',
    example: 'clx1234567890tenant',
  })
  @IsString({ message: 'Tenant ID must be a string' })
  @IsNotEmpty({ message: 'Tenant ID is required' })
  id: string;
}
