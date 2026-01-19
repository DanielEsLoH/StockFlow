import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data transfer object for suspending a user
 */
export class SuspendUserDto {
  /**
   * Optional reason for suspending the user
   * @example "Violation of terms of service"
   */
  @ApiPropertyOptional({
    description: 'Reason for suspending the user',
    example: 'Violation of terms of service',
    maxLength: 500,
  })
  @IsString({ message: 'Reason must be a string' })
  @IsOptional()
  @MaxLength(500, { message: 'Reason must be at most 500 characters' })
  reason?: string;
}
