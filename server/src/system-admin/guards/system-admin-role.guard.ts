import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemAdminRole, SystemAdminRequestUser } from '../types';

/**
 * Metadata key for storing required system admin roles
 */
export const SYSTEM_ADMIN_ROLES_KEY = 'systemAdminRoles';

/**
 * Decorator to specify required system admin roles for a route
 *
 * @param roles - Array of allowed system admin roles
 *
 * @example
 * // Only SUPER_ADMIN can access this route
 * @SystemAdminRoles(SystemAdminRole.SUPER_ADMIN)
 * @Delete(':id')
 * deleteUser(@Param('id') id: string) {}
 *
 * @example
 * // SUPER_ADMIN or SUPPORT can access this route
 * @SystemAdminRoles(SystemAdminRole.SUPER_ADMIN, SystemAdminRole.SUPPORT)
 * @Get('users')
 * getUsers() {}
 */
export const SystemAdminRoles = (...roles: SystemAdminRole[]) =>
  SetMetadata(SYSTEM_ADMIN_ROLES_KEY, roles);

/**
 * Guard that checks if the authenticated system admin has the required role(s).
 *
 * This guard should be used AFTER SystemAdminAuthGuard to ensure
 * the user is authenticated before checking roles.
 *
 * Role hierarchy:
 * - SUPER_ADMIN: Full access to all system admin features
 * - SUPPORT: Access to user management (approve, suspend, view users)
 * - BILLING: Access to subscription management (change plans, view tenants)
 *
 * @example
 * // Use with SystemAdminRoles decorator
 * @UseGuards(SystemAdminAuthGuard, SystemAdminRoleGuard)
 * @SystemAdminRoles(SystemAdminRole.SUPER_ADMIN)
 * @Delete(':id')
 * deleteUser() {}
 */
@Injectable()
export class SystemAdminRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<SystemAdminRole[]>(
      SYSTEM_ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, allow access (just needs authentication)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get the authenticated system admin from the request
    const request = context.switchToHttp().getRequest();
    const admin: SystemAdminRequestUser = request.user;

    if (!admin) {
      throw new ForbiddenException(
        'System admin authentication required before role check',
      );
    }

    // SUPER_ADMIN has access to everything
    if (admin.role === SystemAdminRole.SUPER_ADMIN) {
      return true;
    }

    // Check if the admin's role is in the required roles
    const hasRole = requiredRoles.includes(admin.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required role(s): ${requiredRoles.join(', ')}. Your role: ${admin.role}`,
      );
    }

    return true;
  }
}
