import { api } from "~/lib/api";
import type {
  SubscriptionStatusResponse,
  PlanInfo,
  CheckoutConfigResponse,
  CheckoutConfigRequest,
  VerifyPaymentRequest,
  BillingTransaction,
  CreatePaymentSourceRequest,
} from "~/types/billing";

export const billingService = {
  async getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
    const { data } = await api.get<SubscriptionStatusResponse>(
      "/subscriptions/status",
    );
    return data;
  },

  async getPlans(): Promise<PlanInfo[]> {
    const { data } = await api.get<PlanInfo[]>("/subscriptions/plans");
    return data;
  },

  async getCheckoutConfig(
    request: CheckoutConfigRequest,
  ): Promise<CheckoutConfigResponse> {
    const { data } = await api.post<CheckoutConfigResponse>(
      "/subscriptions/checkout-config",
      request,
    );
    return data;
  },

  async verifyPayment(
    request: VerifyPaymentRequest,
  ): Promise<SubscriptionStatusResponse> {
    const { data } = await api.post<SubscriptionStatusResponse>(
      "/subscriptions/verify-payment",
      request,
    );
    return data;
  },

  async createPaymentSource(
    request: CreatePaymentSourceRequest,
  ): Promise<{ paymentSourceId: string }> {
    const { data } = await api.post<{ paymentSourceId: string }>(
      "/subscriptions/payment-source",
      request,
    );
    return data;
  },

  async getBillingHistory(): Promise<BillingTransaction[]> {
    const { data } = await api.get<BillingTransaction[]>(
      "/subscriptions/billing-history",
    );
    return data;
  },
};
