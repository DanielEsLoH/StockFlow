import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

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
}
