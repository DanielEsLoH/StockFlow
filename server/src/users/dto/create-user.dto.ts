import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * Data transfer object for creating a new user.
 * Used by ADMIN users to create users within their tenant.
 */
export class CreateUserDto {
  /**
   * User's email address (must be unique within tenant)
   * @example "john.doe@example.com"
   */
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  /**
   * User's password (minimum 8 characters)
   * @example "securePassword123"
   */
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  /**
   * User's first name
   * @example "John"
   */
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  /**
   * User's last name
   * @example "Doe"
   */
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  /**
   * User's phone number (optional)
   * @example "+1234567890"
   */
  @IsString({ message: 'Phone must be a string' })
  @IsOptional()
  phone?: string;

  /**
   * User's role within the tenant (defaults to EMPLOYEE)
   * @example "EMPLOYEE"
   */
  @IsEnum(UserRole, { message: 'Role must be a valid UserRole' })
  @IsOptional()
  role?: UserRole = UserRole.EMPLOYEE;
}
