import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for suspending a tenant's subscription
 */
export class SuspendPlanDto {
  /**
   * The reason for suspending the subscription
   * @example "Violation of terms of service"
   */
  @ApiProperty({
    description: 'The reason for suspending the subscription',
    example: 'Violation of terms of service',
    maxLength: 500,
  })
  @IsString({ message: 'Reason must be a string' })
  @IsNotEmpty({ message: 'Reason is required for suspension' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason: string;
}
