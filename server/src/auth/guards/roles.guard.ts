import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators';
import { RequestUser } from '../types';

/**
 * Roles Guard for role-based access control (RBAC).
 *
 * This guard checks if the authenticated user has one of the required roles
 * specified by the @Roles() decorator. Must be used after JwtAuthGuard
 * to ensure the user is authenticated and attached to the request.
 *
 * Features:
 * - Checks roles from both handler and controller level decorators
 * - Allows access if no roles are specified (permissive by default)
 * - Supports multiple allowed roles (OR logic)
 *
 * @example
 * // Single role requirement
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 * @Delete(':id')
 * deleteUser() {}
 *
 * @example
 * // Multiple roles (any of these roles can access)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN, UserRole.MANAGER)
 * @Get('reports')
 * getReports() {}
 *
 * @example
 * // Controller-level roles with method overrides
 * @Controller('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 * export class AdminController {
 *   // Requires ADMIN (from controller)
 *   @Get()
 *   getDashboard() {}
 *
 *   // Requires SUPER_ADMIN (overrides controller)
 *   @Roles(UserRole.SUPER_ADMIN)
 *   @Delete('system')
 *   dangerousOperation() {}
 * }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Determines if the current request can proceed based on user roles.
   *
   * @param context - The execution context containing the request
   * @returns true if the user has one of the required roles, false otherwise
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator metadata
    // getAllAndOverride checks handler first, then class, returning the first found
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, allow access (permissive default)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get the authenticated user from the request
    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    const user = request.user;

    // If no user is attached (shouldn't happen if JwtAuthGuard is used first)
    if (!user) {
      return false;
    }

    // Check if user's role matches any of the required roles
    return requiredRoles.some((role) => user.role === role);
  }
}
