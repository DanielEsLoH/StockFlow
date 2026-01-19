import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for user registration requests
 * When registering, a new tenant (company) is created with the provided name
 */
export class RegisterDto {
  /**
   * User's email address
   * @example "user@example.com"
   */
  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  /**
   * User's password (minimum 8 characters)
   * @example "securePassword123"
   */
  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'securePassword123',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  /**
   * User's first name
   * @example "John"
   */
  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  /**
   * User's last name
   * @example "Doe"
   */
  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  /**
   * Name of the company/tenant to create
   * @example "My Company S.A.S"
   */
  @ApiProperty({
    description: 'Name of the company/tenant to create',
    example: 'My Company S.A.S',
  })
  @IsString({ message: 'Company name must be a string' })
  @IsNotEmpty({ message: 'Company name is required' })
  tenantName: string;
}