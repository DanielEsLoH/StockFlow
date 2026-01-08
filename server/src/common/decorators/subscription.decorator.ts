import { SetMetadata } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';

/**
 * Metadata key for storing required subscription plan
 */
export const SUBSCRIPTION_KEY = 'subscription';

/**
 * Decorator to specify the minimum subscription plan required to access a route.
 * Used in conjunction with SubscriptionGuard.
 *
 * The guard will check if the tenant's plan meets or exceeds the required plan
 * based on the plan hierarchy: FREE < BASIC < PRO < ENTERPRISE
 *
 * @param plan - The minimum SubscriptionPlan required for access
 * @returns A decorator function that sets the subscription metadata
 *
 * @example
 * // Require at least PRO plan
 * @SubscriptionRequired(SubscriptionPlan.PRO)
 * @UseGuards(SubscriptionGuard)
 * @Post('advanced-feature')
 * advancedFeature() {}
 *
 * @example
 * // Require ENTERPRISE plan for premium features
 * @SubscriptionRequired(SubscriptionPlan.ENTERPRISE)
 * @UseGuards(JwtAuthGuard, SubscriptionGuard)
 * @Get('enterprise-reports')
 * enterpriseReports() {}
 */
export const SubscriptionRequired = (plan: SubscriptionPlan) =>
  SetMetadata(SUBSCRIPTION_KEY, plan);
