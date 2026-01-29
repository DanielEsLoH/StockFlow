import { SubscriptionPlan, SubscriptionPeriod } from '@prisma/client';

/**
 * Plan limits configuration for StockFlow subscription plans.
 * Based on Alegra pricing structure adapted for inventory management.
 */
export interface PlanLimits {
  /** Maximum number of users allowed */
  maxUsers: number;
  /** Maximum number of warehouses/bodegas allowed */
  maxWarehouses: number;
  /** Maximum number of products allowed (-1 = unlimited) */
  maxProducts: number;
  /** Maximum number of invoices per month (-1 = unlimited) */
  maxInvoices: number;
  /** Monthly price in COP */
  priceMonthly: number;
  /** Plan display name */
  displayName: string;
  /** Plan description */
  description: string;
  /** Features list for display */
  features: string[];
}

/**
 * Plan limits configuration for each subscription tier.
 *
 * EMPRENDEDOR: For solo entrepreneurs starting out
 * PYME: For small growing businesses
 * PRO: For established companies
 * PLUS: For large organizations
 */
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  EMPRENDEDOR: {
    maxUsers: 2, // 1 usuario + 1 contador gratis
    maxWarehouses: 1,
    maxProducts: -1, // Ilimitados (igual que Alegra)
    maxInvoices: -1, // Ilimitadas (igual que Alegra)
    priceMonthly: 69_900,
    displayName: 'Emprendedor',
    description: 'Para emprendedores que inician',
    features: [
      '1 usuario + 1 contador gratis',
      '1 bodega',
      'Productos ilimitados',
      'Facturas ilimitadas',
      'Facturación electrónica DIAN',
      'Soporte por email',
      'Reportes básicos',
    ],
  },
  PYME: {
    maxUsers: 3, // 2 usuarios + 1 contador gratis
    maxWarehouses: 2,
    maxProducts: -1, // Ilimitados (igual que Alegra)
    maxInvoices: -1, // Ilimitadas (igual que Alegra)
    priceMonthly: 149_900,
    displayName: 'PYME',
    description: 'Para pequeños negocios en crecimiento',
    features: [
      '2 usuarios + 1 contador gratis',
      '2 bodegas',
      'Productos ilimitados',
      'Facturas ilimitadas',
      'Facturación electrónica DIAN',
      'Soporte prioritario',
      'Reportes avanzados',
      'Notificaciones de stock',
    ],
  },
  PRO: {
    maxUsers: 4, // 3 usuarios + 1 contador gratis
    maxWarehouses: 10,
    maxProducts: -1, // Ilimitados (igual que Alegra)
    maxInvoices: -1, // Ilimitadas (igual que Alegra)
    priceMonthly: 219_900,
    displayName: 'Pro',
    description: 'Para empresas establecidas',
    features: [
      '3 usuarios + 1 contador gratis',
      '10 bodegas',
      'Productos ilimitados',
      'Facturas ilimitadas',
      'Facturación electrónica DIAN',
      'Soporte 24/7',
      'Reportes personalizados',
      'Integraciones básicas',
      'Alertas automatizadas',
    ],
  },
  PLUS: {
    maxUsers: 9, // 8 usuarios + 1 contador gratis
    maxWarehouses: 100,
    maxProducts: -1, // Ilimitados (igual que Alegra)
    maxInvoices: -1, // Ilimitadas (igual que Alegra)
    priceMonthly: 279_900,
    displayName: 'Plus',
    description: 'Para grandes organizaciones',
    features: [
      '8 usuarios + 1 contador gratis',
      '100 bodegas',
      'Productos ilimitados',
      'Facturas ilimitadas',
      'Facturación electrónica DIAN',
      'Soporte dedicado',
      'API access',
      'Integraciones avanzadas',
      'Dashboard personalizado',
      'Multi-sucursal',
    ],
  },
};

/**
 * Period duration in days for each subscription period type.
 */
export const PERIOD_DAYS: Record<SubscriptionPeriod, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  ANNUAL: 365,
};

/**
 * Period multiplier for pricing calculations.
 */
export const PERIOD_MULTIPLIERS: Record<SubscriptionPeriod, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  ANNUAL: 12,
};

/**
 * Discount percentages for longer subscription periods.
 */
export const PERIOD_DISCOUNTS: Record<SubscriptionPeriod, number> = {
  MONTHLY: 0,
  QUARTERLY: 0.1, // 10% discount
  ANNUAL: 0.2, // 20% discount
};

/**
 * Get the limits for a specific plan.
 */
export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

/**
 * Get the number of days for a subscription period.
 */
export function getPeriodDays(period: SubscriptionPeriod): number {
  return PERIOD_DAYS[period];
}

/**
 * Calculate the total price for a plan and period.
 * @param plan - The subscription plan
 * @param period - The subscription period
 * @returns Total price in COP with any applicable discount
 */
export function calculatePlanPrice(
  plan: SubscriptionPlan,
  period: SubscriptionPeriod,
): number {
  const limits = PLAN_LIMITS[plan];
  const multiplier = PERIOD_MULTIPLIERS[period];
  const discount = PERIOD_DISCOUNTS[period];

  const basePrice = limits.priceMonthly * multiplier;
  return Math.round(basePrice * (1 - discount));
}

/**
 * Check if a value is within the plan limit.
 * @param currentCount - Current count of resources
 * @param limit - Plan limit (-1 = unlimited)
 * @returns true if within limit, false if limit exceeded
 */
export function isWithinLimit(currentCount: number, limit: number): boolean {
  if (limit === -1) return true; // Unlimited
  return currentCount < limit;
}

/**
 * Get the remaining count before hitting the limit.
 * @param currentCount - Current count of resources
 * @param limit - Plan limit (-1 = unlimited)
 * @returns Remaining count or -1 if unlimited
 */
export function getRemainingCount(currentCount: number, limit: number): number {
  if (limit === -1) return -1; // Unlimited
  return Math.max(0, limit - currentCount);
}

/**
 * Plan hierarchy for upgrade/downgrade comparisons.
 * Higher number = higher tier plan.
 */
export const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  EMPRENDEDOR: 1,
  PYME: 2,
  PRO: 3,
  PLUS: 4,
};

/**
 * Check if a plan is higher tier than another.
 */
export function isPlanHigherTier(
  plan: SubscriptionPlan,
  compareTo: SubscriptionPlan,
): boolean {
  return PLAN_HIERARCHY[plan] > PLAN_HIERARCHY[compareTo];
}

/**
 * Get all plans in order from lowest to highest tier.
 */
export function getPlansInOrder(): SubscriptionPlan[] {
  return Object.entries(PLAN_HIERARCHY)
    .sort(([, a], [, b]) => a - b)
    .map(([plan]) => plan as SubscriptionPlan);
}
