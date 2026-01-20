import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for changing a user's password.
 * Requires the current password for verification before changing.
 */
export class ChangePasswordDto {
  /**
   * User's current password for verification
   * @example "currentPassword123"
   */
  @ApiProperty({
    description: 'Current password for verification',
    example: 'currentPassword123',
  })
  @IsString({ message: 'Current password must be a string' })
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  /**
   * User's new password (minimum 8 characters)
   * @example "newSecurePassword456"
   */
  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    example: 'newSecurePassword456',
    minLength: 8,
  })
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword: string;
}
