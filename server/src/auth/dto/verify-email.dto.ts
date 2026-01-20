import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for verifying email with a token
 */
export class VerifyEmailDto {
  /**
   * The verification token sent to the user's email
   * @example "a1b2c3d4e5f6..."
   */
  @ApiProperty({
    description: 'The verification token sent to the user email',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  token: string;
}

/**
 * Data transfer object for requesting a new verification email
 */
export class ResendVerificationDto {
  /**
   * User's email address to resend verification to
   * @example "user@example.com"
   */
  @ApiProperty({
    description: 'Email address to resend verification email to',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}