import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Metadata key for storing required roles
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles are allowed to access a route.
 * Used in conjunction with RolesGuard.
 *
 * Can be applied at the controller or method level.
 * Method-level decorators override controller-level decorators.
 *
 * @param roles - One or more UserRole values that are allowed access
 * @returns A decorator function that sets the roles metadata
 *
 * @example
 * // Allow only ADMIN users
 * @Roles(UserRole.ADMIN)
 * @Get('admin-only')
 * adminRoute() {}
 *
 * @example
 * // Allow ADMIN and MANAGER users
 * @Roles(UserRole.ADMIN, UserRole.MANAGER)
 * @Get('management')
 * managementRoute() {}
 *
 * @example
 * // Controller-level role restriction
 * @Controller('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 * export class AdminController {}
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
