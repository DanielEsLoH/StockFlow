import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for user login requests
 */
export class LoginDto {
  /**
   * User's email address
   * @example "user@example.com"
   */
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  /**
   * User's password
   * @example "securePassword123"
   */
  @ApiProperty({
    description: 'User password',
    example: 'securePassword123',
    minLength: 1,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
