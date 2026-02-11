import { IsEmail, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';

// CUID pattern: starts with 'c' followed by lowercase letters and numbers, typically 25 chars
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * DTO for creating a new invitation to join a tenant.
 *
 * Used when an admin invites a new user to their organization.
 * The invitation will be sent to the specified email address.
 */
export class CreateInvitationDto {
  /**
   * Email address of the person being invited.
   * Must be a valid email format.
   */
  @IsEmail({}, { message: 'Email invalido' })
  email: string;

  /**
   * Role to assign to the invited user upon acceptance.
   * Defaults to EMPLOYEE if not specified.
   * Valid roles: ADMIN, MANAGER, EMPLOYEE (SUPER_ADMIN not allowed for invitations)
   */
  @IsEnum(UserRole, { message: 'Rol invalido' })
  @IsOptional()
  role?: UserRole;

  /**
   * Warehouse ID to assign the invited user to.
   * Required for MANAGER and EMPLOYEE roles.
   * ADMIN users should NOT have a warehouse assigned.
   */
  @IsString({ message: 'El ID de la bodega debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID de la bodega debe ser un CUID valido',
  })
  @IsOptional()
  warehouseId?: string;
}
