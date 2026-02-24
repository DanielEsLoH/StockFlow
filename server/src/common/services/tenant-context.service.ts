import {
  Injectable,
  Scope,
  Inject,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Tenant, TenantStatus, UserRole, EmployeeStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getTenantId as getTenantIdFromStorage } from '../context';
import { getPlanLimits } from '../../subscriptions/plan-limits';

/**
 * Supported limit types that can be checked against tenant plan limits.
 */
export type LimitType = 'users' | 'products' | 'invoices' | 'warehouses' | 'contadores' | 'employees';

/**
 * Interface for the authenticated request with tenant information.
 */
interface AuthenticatedRequest extends Request {
  tenantId?: string;
  user?: {
    tenantId?: string;
    userId?: string;
  };
}

/**
 * TenantContextService
 *
 * A request-scoped service that provides access to tenant information
 * and limit checking functionality throughout the application.
 *
 * This service is particularly useful for:
 * - Checking tenant plan limits before creating resources
 * - Accessing tenant information without explicit parameter passing
 * - Validating tenant status (active, suspended, etc.)
 *
 * The service uses multiple fallback strategies to get the tenant ID:
 * 1. Request object (set by TenantMiddleware)
 * 2. AsyncLocalStorage (set by TenantMiddleware)
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ProductsService {
 *   constructor(private readonly tenantContext: TenantContextService) {}
 *
 *   async create(dto: CreateProductDto) {
 *     const canCreate = await this.tenantContext.checkLimit('products');
 *     if (!canCreate) {
 *       throw new ForbiddenException('Product limit reached. Upgrade your plan.');
 *     }
 *     // proceed with creation
 *   }
 * }
 * ```
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);

  /**
   * Cached tenant object for the current request.
   * Avoids multiple database queries within the same request lifecycle.
   */
  private cachedTenant: Tenant | null = null;

  constructor(
    @Inject(REQUEST) private readonly request: AuthenticatedRequest,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Gets the current tenant ID from the request context.
   *
   * Attempts to retrieve the tenant ID from multiple sources:
   * 1. request.tenantId (set by TenantMiddleware)
   * 2. request.user.tenantId (from JWT payload)
   * 3. AsyncLocalStorage (fallback)
   *
   * @returns The tenant ID string, or undefined if not in a tenant context
   *
   * @example
   * ```typescript
   * const tenantId = this.tenantContext.getTenantId();
   * if (!tenantId) {
   *   throw new UnauthorizedException('Tenant context required');
   * }
   * ```
   */
  getTenantId(): string | undefined {
    // Try request object first (set by middleware)
    if (this.request?.tenantId) {
      return this.request.tenantId;
    }

    // Try user object from JWT
    if (this.request?.user?.tenantId) {
      return this.request.user.tenantId;
    }

    // Fallback to AsyncLocalStorage
    return getTenantIdFromStorage();
  }

  /**
   * Gets the current tenant ID, throwing an error if not available.
   *
   * Use this when tenant context is required for the operation.
   *
   * @returns The tenant ID string
   * @throws ForbiddenException if no tenant context is available
   *
   * @example
   * ```typescript
   * const tenantId = this.tenantContext.requireTenantId();
   * // tenantId is guaranteed to be a string here
   * ```
   */
  requireTenantId(): string {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant context required. Ensure you are authenticated.',
      );
    }
    return tenantId;
  }

  /**
   * Fetches the full Tenant object from the database.
   *
   * The tenant is cached for the duration of the request to avoid
   * multiple database queries when checking multiple limits or
   * accessing tenant properties multiple times.
   *
   * @returns The Tenant object
   * @throws ForbiddenException if tenant not found or no tenant context
   *
   * @example
   * ```typescript
   * const tenant = await this.tenantContext.getTenant();
   * console.log(`Current plan: ${tenant.plan}`);
   * ```
   */
  async getTenant(): Promise<Tenant> {
    // Return cached tenant if available
    if (this.cachedTenant) {
      return this.cachedTenant;
    }

    const tenantId = this.requireTenantId();

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      this.logger.error(`Tenant not found: ${tenantId}`);
      throw new ForbiddenException('Tenant not found');
    }

    // Cache for subsequent calls in the same request
    this.cachedTenant = tenant;

    return tenant;
  }

  /**
   * Checks if the tenant can create more resources of the specified type.
   *
   * Compares the current count against the tenant's plan limit.
   * A limit of -1 means unlimited.
   *
   * @param limitType - The type of resource to check ('users' | 'products' | 'invoices' | 'warehouses')
   * @returns True if the tenant can create more resources, false if limit reached
   *
   * @example
   * ```typescript
   * const canCreate = await this.tenantContext.checkLimit('products');
   * if (!canCreate) {
   *   throw new ForbiddenException('Product limit reached');
   * }
   * ```
   */
  async checkLimit(limitType: LimitType): Promise<boolean> {
    const tenant = await this.getTenant();
    const limit = this.getLimitValue(tenant, limitType);

    // -1 means unlimited
    if (limit === -1) {
      return true;
    }

    const currentCount = await this.getCurrentCount(limitType);

    this.logger.debug(
      `Checking ${limitType} limit: ${currentCount}/${limit} for tenant ${tenant.id}`,
    );

    return currentCount < limit;
  }

  /**
   * Enforces a limit check, throwing an exception if limit is reached.
   *
   * This is a convenience method that combines checkLimit with error throwing.
   *
   * @param limitType - The type of resource to check
   * @throws ForbiddenException if the limit has been reached
   *
   * @example
   * ```typescript
   * await this.tenantContext.enforceLimit('products');
   * // If we get here, we can create the product
   * ```
   */
  async enforceLimit(limitType: LimitType): Promise<void> {
    const canCreate = await this.checkLimit(limitType);
    if (!canCreate) {
      const tenant = await this.getTenant();
      const limit = this.getLimitValue(tenant, limitType);
      throw new ForbiddenException(
        `${this.capitalize(limitType)} limit reached (${limit}). Upgrade your plan to create more.`,
      );
    }
  }

  /**
   * Gets the current count of resources for the specified type.
   *
   * For invoices, counts only invoices created in the current month
   * (for monthly invoice limits).
   *
   * @param limitType - The type of resource to count
   * @returns The current count of resources
   *
   * @example
   * ```typescript
   * const productCount = await this.tenantContext.getCurrentCount('products');
   * console.log(`You have ${productCount} products`);
   * ```
   */
  async getCurrentCount(limitType: LimitType): Promise<number> {
    const tenantId = this.requireTenantId();

    switch (limitType) {
      case 'users':
        return this.prisma.user.count({
          where: { tenantId, role: { not: UserRole.CONTADOR } },
        });

      case 'contadores':
        return this.prisma.user.count({
          where: { tenantId, role: UserRole.CONTADOR },
        });

      case 'products':
        return this.prisma.product.count({
          where: { tenantId },
        });

      case 'invoices': {
        // Count invoices for the current month only
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

      case 'employees':
        return this.prisma.employee.count({
          where: { tenantId, status: { not: EmployeeStatus.TERMINATED } },
        });

      default: {
        const exhaustiveCheck: never = limitType;
        throw new Error(`Unknown limit type: ${String(exhaustiveCheck)}`);
      }
    }
  }

  /**
   * Gets the limit value for the specified type from the tenant object.
   *
   * @param tenant - The tenant object
   * @param limitType - The type of limit to retrieve
   * @returns The limit value (-1 for unlimited)
   */
  getLimit(tenant: Tenant, limitType: LimitType): number {
    return this.getLimitValue(tenant, limitType);
  }

  /**
   * Gets the remaining count for a resource type.
   *
   * @param limitType - The type of resource
   * @returns The remaining count, or -1 if unlimited
   *
   * @example
   * ```typescript
   * const remaining = await this.tenantContext.getRemainingCount('products');
   * if (remaining !== -1) {
   *   console.log(`You can create ${remaining} more products`);
   * }
   * ```
   */
  async getRemainingCount(limitType: LimitType): Promise<number> {
    const tenant = await this.getTenant();
    const limit = this.getLimitValue(tenant, limitType);

    // -1 means unlimited
    if (limit === -1) {
      return -1;
    }

    const currentCount = await this.getCurrentCount(limitType);
    return Math.max(0, limit - currentCount);
  }

  /**
   * Checks if the tenant is in an active status.
   *
   * Only tenants with ACTIVE status should be able to perform operations.
   * TRIAL status may have limited functionality.
   *
   * @returns True if the tenant status is ACTIVE
   *
   * @example
   * ```typescript
   * const isActive = await this.tenantContext.isActive();
   * if (!isActive) {
   *   throw new ForbiddenException('Your account is not active');
   * }
   * ```
   */
  async isActive(): Promise<boolean> {
    const tenant = await this.getTenant();
    return tenant.status === TenantStatus.ACTIVE;
  }

  /**
   * Checks if the tenant is in trial or active status.
   *
   * @returns True if the tenant can use the application
   */
  async canUseApplication(): Promise<boolean> {
    const tenant = await this.getTenant();
    return (
      tenant.status === TenantStatus.ACTIVE ||
      tenant.status === TenantStatus.TRIAL
    );
  }

  /**
   * Validates that the tenant is active, throwing an exception if not.
   *
   * @throws ForbiddenException if tenant is suspended or inactive
   */
  async requireActiveStatus(): Promise<void> {
    const tenant = await this.getTenant();

    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new ForbiddenException(
        'Your account has been suspended. Please contact support.',
      );
    }

    if (tenant.status === TenantStatus.INACTIVE) {
      throw new ForbiddenException(
        'Your account is inactive. Please renew your subscription.',
      );
    }
  }

  /**
   * Gets the tenant's current subscription plan.
   *
   * @returns The subscription plan name or null if no plan is active
   */
  async getPlan(): Promise<string | null> {
    const tenant = await this.getTenant();
    return tenant.plan;
  }

  /**
   * Gets all limits for the current tenant.
   *
   * Useful for displaying usage information to users.
   *
   * @returns Object containing all limits and current counts
   *
   * @example
   * ```typescript
   * const usage = await this.tenantContext.getUsageSummary();
   * // {
   * //   users: { current: 3, limit: 5, remaining: 2 },
   * //   products: { current: 150, limit: -1, remaining: -1 },
   * //   ...
   * // }
   * ```
   */
  async getUsageSummary(): Promise<
    Record<LimitType, { current: number; limit: number; remaining: number }>
  > {
    const tenant = await this.getTenant();

    const limitTypes: LimitType[] = [
      'users',
      'contadores',
      'products',
      'invoices',
      'warehouses',
      'employees',
    ];

    const result = {} as Record<
      LimitType,
      { current: number; limit: number; remaining: number }
    >;

    for (const limitType of limitTypes) {
      const limit = this.getLimitValue(tenant, limitType);
      const current = await this.getCurrentCount(limitType);
      const remaining = limit === -1 ? -1 : Math.max(0, limit - current);

      result[limitType] = { current, limit, remaining };
    }

    return result;
  }

  /**
   * Internal helper to get the limit value from a tenant object.
   */
  private getLimitValue(tenant: Tenant, limitType: LimitType): number {
    switch (limitType) {
      case 'users': {
        if (!tenant.plan) return tenant.maxUsers;
        const planLimits = getPlanLimits(tenant.plan);
        return tenant.maxUsers - planLimits.maxContadores;
      }
      case 'contadores': {
        if (!tenant.plan) return 0;
        return getPlanLimits(tenant.plan).maxContadores;
      }
      case 'products':
        return tenant.maxProducts;
      case 'invoices':
        return tenant.maxInvoices;
      case 'warehouses':
        return tenant.maxWarehouses;
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
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
