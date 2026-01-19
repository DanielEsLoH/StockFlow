import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data transfer object for deleting a user
 */
export class DeleteUserDto {
  /**
   * Optional reason for deleting the user
   * @example "User requested account deletion"
   */
  @ApiPropertyOptional({
    description: 'Reason for deleting the user',
    example: 'User requested account deletion',
    maxLength: 500,
  })
  @IsString({ message: 'Reason must be a string' })
  @IsOptional()
  @MaxLength(500, { message: 'Reason must be at most 500 characters' })
  reason?: string;
}
