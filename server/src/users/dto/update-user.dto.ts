import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
} from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';

/**
 * Data transfer object for updating an existing user.
 * All fields are optional - only provided fields will be updated.
 * Note: password cannot be changed through this DTO - use ChangePasswordDto.
 * Note: tenantId cannot be changed.
 */
export class UpdateUserDto {
  /**
   * User's email address (must be unique within tenant)
   * @example "john.doe@example.com"
   */
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  email?: string;

  /**
   * User's first name
   * @example "John"
   */
  @IsString({ message: 'First name must be a string' })
  @MinLength(1, { message: 'First name cannot be empty' })
  @IsOptional()
  firstName?: string;

  /**
   * User's last name
   * @example "Doe"
   */
  @IsString({ message: 'Last name must be a string' })
  @MinLength(1, { message: 'Last name cannot be empty' })
  @IsOptional()
  lastName?: string;

  /**
   * User's phone number
   * @example "+1234567890"
   */
  @IsString({ message: 'Phone must be a string' })
  @IsOptional()
  phone?: string;

  /**
   * User's role within the tenant (ADMIN only can change this)
   * @example "MANAGER"
   */
  @IsEnum(UserRole, { message: 'Role must be a valid UserRole' })
  @IsOptional()
  role?: UserRole;

  /**
   * User's status (ADMIN only can change this)
   * @example "ACTIVE"
   */
  @IsEnum(UserStatus, { message: 'Status must be a valid UserStatus' })
  @IsOptional()
  status?: UserStatus;

  /**
   * User's avatar URL
   * @example "https://example.com/avatar.jpg"
   */
  @IsString({ message: 'Avatar must be a string' })
  @IsOptional()
  avatar?: string;
}
