import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Tenant, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getPlanLimits } from '../../subscriptions/plan-limits';
import { CHECK_LIMIT_KEY } from '../decorators/check-limit.decorator';
import { LimitType } from '../services';
import { RequestUser } from '../../auth/types';

/**
 * LimitCheckInterceptor
 *
 * An interceptor that enforces tenant resource limits before allowing
 * create operations to proceed. Works in conjunction with the @CheckLimit
 * decorator to determine which limit type to check.
 *
 * This interceptor is designed for multi-tenant SaaS applications where
 * different subscription plans have different resource limits.
 *
 * Plan limits (example):
 * - FREE: 2 users, 100 products, 50 invoices/month, 1 warehouse
 * - BASIC: 5 users, 1000 products, unlimited invoices, 3 warehouses
 * - PRO: 20 users, unlimited products/invoices, 10 warehouses
 * - ENTERPRISE: Unlimited everything (-1 means unlimited)
 *
 * Features:
 * - Checks limits before the request handler executes
 * - Supports all limit types: users, products, invoices, warehouses
 * - Invoices are counted monthly (resets at the start of each month)
 * - -1 means unlimited (no limit check performed)
 * - Passes through if no @CheckLimit decorator is present
 * - Provides clear error messages with current limit for upgrade prompts
 *
 * @example
 * ```typescript
 * // In a controller
 * @Post()
 * @CheckLimit('products')
 * @UseInterceptors(LimitCheckInterceptor)
 * create(@Body() dto: CreateProductDto) {
 *   // This only executes if product limit not reached
 *   return this.productsService.create(dto);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Combining with other guards
 * @Post()
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 * @CheckLimit('users')
 * @UseInterceptors(LimitCheckInterceptor)
 * inviteUser(@Body() dto: InviteUserDto) {
 *   return this.usersService.invite(dto);
 * }
 * ```
 */
@Injectable()
export class LimitCheckInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LimitCheckInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Intercepts the request and checks resource limits before proceeding.
   *
   * @param context - The execution context containing the request
   * @param next - The next handler in the chain
   * @returns Observable that completes the request or throws ForbiddenException
   */
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    // Only process HTTP requests
    if (context.getType() !== 'http') {
      return next.handle();
    }

    // Get the limit type from the decorator metadata
    const limitType = this.reflector.get<LimitType | undefined>(
      CHECK_LIMIT_KEY,
      context.getHandler(),
    );

    // If no limit check is required, pass through
    if (!limitType) {
      return next.handle();
    }

    // Get the authenticated user from the request
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    // Validate user is authenticated
    if (!user) {
      this.logger.warn(
        'LimitCheckInterceptor called without authenticated user',
      );
      throw new ForbiddenException(
        'Authentication required to perform this action',
      );
    }

    // Validate tenant ID is present
    if (!user.tenantId) {
      this.logger.warn('LimitCheckInterceptor called without tenant context');
      throw new ForbiddenException(
        'Tenant context required to perform this action',
      );
    }

    // Fetch the tenant to get current limits
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });

    if (!tenant) {
      this.logger.error(`Tenant not found: ${user.tenantId}`);
      throw new ForbiddenException('Tenant not found');
    }

    // Get the limit value for this resource type
    const limit = this.getLimitValue(tenant, limitType);

    // -1 means unlimited, skip the check
    if (limit === -1) {
      this.logger.debug(
        `Unlimited ${limitType} for tenant ${tenant.id}, allowing request`,
      );
      return next.handle();
    }

    // Count current resources for this tenant
    const currentCount = await this.getCurrentCount(user.tenantId, limitType);

    this.logger.debug(
      `Checking ${limitType} limit for tenant ${tenant.id}: ${currentCount}/${limit}`,
    );

    // Check if limit is reached
    if (currentCount >= limit) {
      const resourceName = this.capitalize(limitType);
      this.logger.debug(
        `${resourceName} limit reached for tenant ${tenant.id}: ${currentCount}/${limit}`,
      );
      throw new ForbiddenException(
        `${resourceName} limit reached (${limit}). Upgrade your plan.`,
      );
    }

    // Limit not reached, proceed with the request
    return next.handle();
  }

  /**
   * Gets the current count of resources for the specified type.
   *
   * For invoices, counts only invoices created in the current month
   * since invoice limits are typically monthly quotas.
   *
   * @param tenantId - The tenant ID to count resources for
   * @param limitType - The type of resource to count
   * @returns The current count of resources
   */
  private async getCurrentCount(
    tenantId: string,
    limitType: LimitType,
  ): Promise<number> {
    switch (limitType) {
      case 'users':
        return this.prisma.user.count({
          where: { tenantId },
        });

      case 'products':
        return this.prisma.product.count({
          where: { tenantId },
        });

      case 'invoices': {
        // Count invoices for the current month only (monthly limit)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        return this.prisma.invoice.count({
          where: {
            tenantId,
            createdAt: { gte: startOfMonth },
          },
        });
      }

      case 'warehouses':
        return this.prisma.warehouse.count({
          where: { tenantId },
        });

      case 'contadores':
        return this.prisma.user.count({
          where: { tenantId, role: UserRole.CONTADOR },
        });

      case 'employees':
        return this.prisma.employee.count({
          where: { tenantId },
        });

      default: {
        // Exhaustive check - TypeScript will error if a case is missed
        const exhaustiveCheck: never = limitType;
        this.logger.error(`Unknown limit type: ${String(exhaustiveCheck)}`);
        return 0;
      }
    }
  }

  /**
   * Gets the limit value for the specified type from the tenant object.
   *
   * @param tenant - The tenant object containing limit values
   * @param limitType - The type of limit to retrieve
   * @returns The limit value (-1 for unlimited)
   */
  private getLimitValue(tenant: Tenant, limitType: LimitType): number {
    switch (limitType) {
      case 'users':
        return tenant.maxUsers;
      case 'products':
        return tenant.maxProducts;
      case 'invoices':
        return tenant.maxInvoices;
      case 'warehouses':
        return tenant.maxWarehouses;
      case 'contadores': {
        if (!tenant.plan) return 0;
        return getPlanLimits(tenant.plan).maxContadores;
      }
      case 'employees':
        return tenant.maxEmployees;
      default: {
        const exhaustiveCheck: never = limitType;
        throw new Error(`Unknown limit type: ${String(exhaustiveCheck)}`);
      }
    }
  }

  /**
   * Capitalizes the first letter of a string.
   *
   * @param str - The string to capitalize
   * @returns The capitalized string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
