import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

// CUID pattern: starts with 'c' followed by lowercase letters and numbers
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

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
  @ApiPropertyOptional({
    description: 'User email address (must be unique within tenant)',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  email?: string;

  /**
   * User's first name
   * @example "John"
   */
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    minLength: 1,
  })
  @IsString({ message: 'First name must be a string' })
  @MinLength(1, { message: 'First name cannot be empty' })
  @IsOptional()
  firstName?: string;

  /**
   * User's last name
   * @example "Doe"
   */
  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    minLength: 1,
  })
  @IsString({ message: 'Last name must be a string' })
  @MinLength(1, { message: 'Last name cannot be empty' })
  @IsOptional()
  lastName?: string;

  /**
   * User's phone number (can be null to clear)
   * @example "+1234567890"
   */
  @ApiPropertyOptional({
    description: 'User phone number (can be null to clear)',
    example: '+1234567890',
    nullable: true,
  })
  @IsString({ message: 'Phone must be a string' })
  @IsOptional()
  phone?: string | null;

  /**
   * User's role within the tenant (ADMIN only can change this)
   * @example "MANAGER"
   */
  @ApiPropertyOptional({
    description: 'User role within the tenant (ADMIN only can change)',
    enum: UserRole,
    example: 'MANAGER',
  })
  @IsEnum(UserRole, { message: 'Role must be a valid UserRole' })
  @IsOptional()
  role?: UserRole;

  /**
   * User's status (ADMIN only can change this)
   * @example "ACTIVE"
   */
  @ApiPropertyOptional({
    description: 'User account status (ADMIN only can change)',
    enum: UserStatus,
    example: 'ACTIVE',
  })
  @IsEnum(UserStatus, { message: 'Status must be a valid UserStatus' })
  @IsOptional()
  status?: UserStatus;

  /**
   * User's avatar URL (can be null to clear)
   * @example "https://example.com/avatar.jpg"
   */
  @ApiPropertyOptional({
    description: 'User avatar URL (can be null to clear)',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  @IsString({ message: 'Avatar must be a string' })
  @IsOptional()
  avatar?: string | null;

  /**
   * Warehouse ID to assign the user to (required for MANAGER and EMPLOYEE roles, null to clear)
   * @example "cmkcykam80004reya0hsdx337"
   */
  @ApiPropertyOptional({
    description:
      'Warehouse ID to assign the user to (required for MANAGER and EMPLOYEE, null to clear for ADMIN)',
    example: 'cmkcykam80004reya0hsdx337',
    nullable: true,
  })
  @ValidateIf((o) => o.warehouseId !== null)
  @IsString({ message: 'Warehouse ID must be a string' })
  @Matches(CUID_PATTERN, {
    message: 'Warehouse ID must be a valid CUID',
  })
  @IsOptional()
  warehouseId?: string | null;
}
