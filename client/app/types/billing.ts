// Subscription plans
export type SubscriptionPlan = 'EMPRENDEDOR' | 'PYME' | 'PRO' | 'PLUS';

// Subscription periods
export type SubscriptionPeriod = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

// Subscription status
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';

// Billing transaction status
export type BillingStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

// Subscription status response from GET /subscriptions/status
export interface SubscriptionStatusResponse {
  tenantId: string;
  plan: SubscriptionPlan | null;
  status: SubscriptionStatus | null;
  periodType: SubscriptionPeriod | null;
  startDate: string | null;
  endDate: string | null;
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxInvoices: number;
    maxWarehouses: number;
  };
  hasPaymentSource: boolean;
  daysRemaining: number | null;
}

// Plan info from GET /subscriptions/plans
export interface PlanPricing {
  total: number;
  totalInCents: number;
  monthly: number;
  discount: number;
}

export interface PlanInfo {
  plan: SubscriptionPlan;
  displayName: string;
  description: string;
  features: string[];
  priceMonthly: number;
  limits: {
    maxUsers: number;
    maxWarehouses: number;
    maxProducts: number;
    maxInvoices: number;
  };
  prices: Record<SubscriptionPeriod, PlanPricing>;
}

// Checkout config from POST /subscriptions/checkout-config
export interface CheckoutConfigResponse {
  publicKey: string;
  reference: string;
  amountInCents: number;
  currency: string;
  integrityHash: string;
  redirectUrl: string;
  acceptanceToken: string;
  personalDataAuthToken: string;
  plan: SubscriptionPlan;
  period: SubscriptionPeriod;
  displayName: string;
  priceFormatted: string;
}

// Billing transaction from GET /subscriptions/billing-history
export interface BillingTransaction {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  wompiTransactionId: string | null;
  wompiReference: string | null;
  plan: SubscriptionPlan;
  period: SubscriptionPeriod;
  amountInCents: number;
  currency: string;
  status: BillingStatus;
  paymentMethodType: string | null;
  failureReason: string | null;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

// Request DTOs
export interface CheckoutConfigRequest {
  plan: SubscriptionPlan;
  period: SubscriptionPeriod;
}

export interface VerifyPaymentRequest {
  transactionId: string;
  plan: SubscriptionPlan;
  period: SubscriptionPeriod;
}

export interface CreatePaymentSourceRequest {
  token: string;
  acceptanceToken: string;
  personalAuthToken?: string;
}
