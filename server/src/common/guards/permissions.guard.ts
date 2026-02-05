import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../permissions/permission.enum';
import { PermissionsService } from '../permissions/permissions.service';
import {
  PERMISSIONS_KEY,
  PermissionRequirement,
} from '../decorators/require-permissions.decorator';
import { RequestUser } from '../../auth/types';

/**
 * Guard that checks if the authenticated user has the required permissions.
 * Must be used after JwtAuthGuard to have access to the user object.
 *
 * @example
 * // Single permission
 * @RequirePermissions(Permission.POS_SELL)
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * async sellProduct() { }
 *
 * @example
 * // Any of multiple permissions
 * @RequirePermissions(Permission.POS_SELL, Permission.POS_REFUND)
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * async processTransaction() { }
 *
 * @example
 * // All permissions required
 * @RequirePermissions([Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT], 'ALL')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * async exportReport() { }
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get permission requirements from decorator metadata
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions specified, allow access (permissive by default)
    if (!requirement || requirement.permissions.length === 0) {
      return true;
    }

    // Get authenticated user from request
    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    const user = request.user;

    if (!user) {
      this.logger.warn(
        'PermissionsGuard: No user in request. Make sure JwtAuthGuard runs first.',
      );
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Check permissions based on mode
    const { permissions, mode } = requirement;
    let hasAccess: boolean;

    if (mode === 'ALL') {
      hasAccess = await this.permissionsService.hasAllPermissions(
        user.userId,
        user.role,
        user.tenantId,
        permissions,
      );
    } else {
      // Default is 'ANY'
      hasAccess = await this.permissionsService.hasAnyPermission(
        user.userId,
        user.role,
        user.tenantId,
        permissions,
      );
    }

    if (!hasAccess) {
      this.logger.debug(
        `Access denied for user ${user.userId} (role: ${user.role}): missing permissions [${permissions.join(', ')}]`,
      );
      throw new ForbiddenException(
        'No tienes permisos suficientes para realizar esta accion',
      );
    }

    return true;
  }
}
