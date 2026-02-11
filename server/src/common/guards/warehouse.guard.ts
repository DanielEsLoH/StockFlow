import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { RequestUser } from '../../auth/types';

export const WAREHOUSE_SCOPED_KEY = 'warehouse_scoped';

/**
 * Guard that ensures warehouse-scoped operations are only performed
 * by users with an assigned warehouse, or by ADMIN/SUPER_ADMIN users.
 *
 * For non-admin users:
 * - Verifies the user has a warehouse assigned
 * - If a warehouseId is in the request body/query, verifies it matches the user's warehouse
 *
 * For ADMIN/SUPER_ADMIN users:
 * - Always allows access (they can operate on any warehouse)
 *
 * Must be used after JwtAuthGuard to have access to the user object.
 */
@Injectable()
export class WarehouseGuard implements CanActivate {
  private readonly logger = new Logger(WarehouseGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the endpoint is warehouse-scoped
    const isWarehouseScoped = this.reflector.getAllAndOverride<boolean>(
      WAREHOUSE_SCOPED_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If not warehouse-scoped, allow access
    if (!isWarehouseScoped) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user: RequestUser;
      body?: { warehouseId?: string };
      query?: { warehouseId?: string };
    }>();
    const user = request.user;

    if (!user) {
      this.logger.warn(
        'WarehouseGuard: No user in request. Ensure JwtAuthGuard runs first.',
      );
      throw new ForbiddenException('Usuario no autenticado');
    }

    // ADMIN and SUPER_ADMIN can access any warehouse
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Fetch user's warehouse assignment from DB
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { warehouseId: true },
    });

    if (!dbUser?.warehouseId) {
      this.logger.warn(
        `WarehouseGuard: User ${user.userId} has no warehouse assigned`,
      );
      throw new ForbiddenException(
        'No tiene una bodega asignada. Contacte al administrador.',
      );
    }

    // Check if request includes a warehouseId that doesn't match
    const requestWarehouseId =
      request.body?.warehouseId ?? request.query?.warehouseId;

    if (requestWarehouseId && requestWarehouseId !== dbUser.warehouseId) {
      this.logger.warn(
        `WarehouseGuard: User ${user.userId} tried to access warehouse ${requestWarehouseId} but is assigned to ${dbUser.warehouseId}`,
      );
      throw new ForbiddenException(
        'Solo puede operar en su bodega asignada',
      );
    }

    return true;
  }
}
