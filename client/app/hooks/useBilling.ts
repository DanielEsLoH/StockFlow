import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingService } from "~/services/billing.service";
import type {
  SubscriptionStatusResponse,
  PlanInfo,
  CheckoutConfigResponse,
  CheckoutConfigRequest,
  VerifyPaymentRequest,
  BillingTransaction,
  CreatePaymentSourceRequest,
} from "~/types/billing";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query for fetching the current tenant's subscription status
 */
export function useSubscriptionStatus() {
  const enabled = useIsQueryEnabled();
  return useQuery<SubscriptionStatusResponse>({
    queryKey: queryKeys.billing.status(),
    queryFn: () => billingService.getSubscriptionStatus(),
    enabled,
  });
}

/**
 * Query for fetching available subscription plans
 */
export function usePlans() {
  const enabled = useIsQueryEnabled();
  return useQuery<PlanInfo[]>({
    queryKey: queryKeys.billing.plans(),
    queryFn: () => billingService.getPlans(),
    staleTime: Infinity, // Plan info rarely changes
    enabled,
  });
}

/**
 * Query for fetching billing transaction history
 */
export function useBillingHistory() {
  const enabled = useIsQueryEnabled();
  return useQuery<BillingTransaction[]>({
    queryKey: queryKeys.billing.history(),
    queryFn: () => billingService.getBillingHistory(),
    enabled,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation to get checkout configuration for a plan/period
 */
export function useCheckoutConfig() {
  return useMutation<CheckoutConfigResponse, Error, CheckoutConfigRequest>({
    mutationFn: (request: CheckoutConfigRequest) =>
      billingService.getCheckoutConfig(request),
  });
}

/**
 * Mutation to verify a payment after Wompi checkout
 */
export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation<SubscriptionStatusResponse, Error, VerifyPaymentRequest>({
    mutationFn: (request: VerifyPaymentRequest) =>
      billingService.verifyPayment(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.billing.status(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.billing.history(),
      });
      toast.success("Pago verificado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al verificar el pago");
    },
  });
}

/**
 * Mutation to create a payment source (tokenized card)
 */
export function useCreatePaymentSource() {
  const queryClient = useQueryClient();

  return useMutation<
    { paymentSourceId: string },
    Error,
    CreatePaymentSourceRequest
  >({
    mutationFn: (request: CreatePaymentSourceRequest) =>
      billingService.createPaymentSource(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.billing.status(),
      });
      toast.success("Medio de pago registrado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al registrar el medio de pago");
    },
  });
}
