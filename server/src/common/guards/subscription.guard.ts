import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SUBSCRIPTION_KEY } from '../decorators';
import { RequestUser } from '../../auth/types';

/**
 * Plan hierarchy for subscription level comparison.
 * Higher numbers indicate higher-tier plans.
 */
const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.BASIC]: 1,
  [SubscriptionPlan.PRO]: 2,
  [SubscriptionPlan.ENTERPRISE]: 3,
};

/**
 * Subscription Guard for plan-based access control.
 *
 * This guard checks if the authenticated user's tenant has a subscription plan
 * that meets or exceeds the required plan level. Must be used after JwtAuthGuard
 * to ensure the user is authenticated and tenant information is available.
 *
 * Plan Hierarchy (from lowest to highest):
 * - FREE (0)
 * - BASIC (1)
 * - PRO (2)
 * - ENTERPRISE (3)
 *
 * A tenant with a higher-tier plan can access routes requiring lower-tier plans.
 *
 * @example
 * // Require PRO plan or higher
 * @UseGuards(JwtAuthGuard, SubscriptionGuard)
 * @SubscriptionRequired(SubscriptionPlan.PRO)
 * @Post('bulk-import')
 * bulkImport() {}
 *
 * @example
 * // Require ENTERPRISE plan
 * @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
 * @Roles(UserRole.ADMIN)
 * @SubscriptionRequired(SubscriptionPlan.ENTERPRISE)
 * @Get('analytics')
 * advancedAnalytics() {}
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Determines if the current request can proceed based on subscription plan.
   *
   * @param context - The execution context containing the request
   * @returns Promise<boolean> indicating if the tenant has sufficient subscription
   * @throws ForbiddenException if the tenant's plan is insufficient
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required subscription plan from decorator metadata
    const requiredPlan = this.reflector.get<SubscriptionPlan>(
      SUBSCRIPTION_KEY,
      context.getHandler(),
    );

    // If no subscription requirement is specified, allow access
    if (!requiredPlan) {
      return true;
    }

    // Get the authenticated user from the request
    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    const user = request.user;

    // If no user is attached (shouldn't happen if JwtAuthGuard is used first)
    if (!user) {
      this.logger.warn('SubscriptionGuard called without authenticated user');
      return false;
    }

    // Fetch the tenant to get their current subscription plan
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, plan: true, name: true },
    });

    // Handle case where tenant is not found
    if (!tenant) {
      this.logger.error(`Tenant not found: ${user.tenantId}`);
      throw new ForbiddenException('Tenant not found');
    }

    // Compare plan levels using the hierarchy
    const tenantPlanLevel = PLAN_HIERARCHY[tenant.plan];
    const requiredPlanLevel = PLAN_HIERARCHY[requiredPlan];

    // Check if tenant's plan meets or exceeds the required plan
    const hasAccess = tenantPlanLevel >= requiredPlanLevel;

    if (!hasAccess) {
      this.logger.debug(
        `Access denied for tenant ${tenant.name}: has ${tenant.plan} (level ${tenantPlanLevel}), requires ${requiredPlan} (level ${requiredPlanLevel})`,
      );
      throw new ForbiddenException(
        `This feature requires a ${requiredPlan} plan or higher. Your current plan is ${tenant.plan}.`,
      );
    }

    this.logger.debug(
      `Access granted for tenant ${tenant.name}: has ${tenant.plan}, requires ${requiredPlan}`,
    );

    return true;
  }
}
