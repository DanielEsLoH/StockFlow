import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for system admin login requests
 */
export class SystemAdminLoginDto {
  /**
   * System admin's email address
   * @example "admin@stockflow.com"
   */
  @ApiProperty({
    description: 'System admin email address',
    example: 'admin@stockflow.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  /**
   * System admin's password
   * @example "secureAdminPassword123"
   */
  @ApiProperty({
    description: 'System admin password',
    example: 'secureAdminPassword123',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
