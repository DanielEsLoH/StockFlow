import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { paymentsService } from "~/services/payments.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  Payment,
  PaymentFilters,
  PaymentsResponse,
  CreatePaymentData,
  PaymentStats,
} from "~/types/payment";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Paginated payments list with filters
 */
export function usePayments(filters: PaymentFilters = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery<PaymentsResponse>({
    queryKey: queryKeys.payments.list(filters as Record<string, unknown>),
    queryFn: () => paymentsService.getPayments(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

/**
 * Single payment detail by ID
 */
export function usePayment(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<Payment>({
    queryKey: queryKeys.payments.detail(id),
    queryFn: () => paymentsService.getPayment(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: enabled && !!id,
  });
}

/**
 * Payments for a specific invoice
 */
export function usePaymentsByInvoice(invoiceId: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<Payment[]>({
    queryKey: queryKeys.payments.byInvoice(invoiceId),
    queryFn: () => paymentsService.getPaymentsByInvoice(invoiceId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: enabled && !!invoiceId,
  });
}

/**
 * Payments for a specific customer
 */
export function usePaymentsByCustomer(customerId: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<Payment[]>({
    queryKey: queryKeys.payments.byCustomer(customerId),
    queryFn: () => paymentsService.getPaymentsByCustomer(customerId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: enabled && !!customerId,
  });
}

/**
 * Recent payments for dashboard (limited)
 */
export function useRecentPayments(limit: number = 5) {
  const enabled = useIsQueryEnabled();
  return useQuery<Payment[]>({
    queryKey: queryKeys.payments.recent(limit),
    queryFn: () => paymentsService.getRecentPayments(limit),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled,
  });
}

/**
 * Payment statistics
 */
export function usePaymentStats() {
  const enabled = useIsQueryEnabled();
  return useQuery<PaymentStats>({
    queryKey: queryKeys.payments.stats(),
    queryFn: () => paymentsService.getPaymentStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new payment
 */
export function useCreatePayment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentData) =>
      paymentsService.createPayment(data),
    onSuccess: (payment) => {
      // Invalidate all payment-related queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      // Invalidate invoice payments
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.byInvoice(payment.invoiceId),
      });
      // Invalidate invoice detail (status may change when payment is made)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.detail(payment.invoiceId),
      });
      // Invalidate invoice list (payment status may affect invoice list)
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      // Invalidate payment stats
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.stats(),
      });
      // Invalidate dashboard data
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      toast.success("Pago registrado exitosamente");
      navigate(`/payments/${payment.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al registrar el pago");
    },
  });
}

/**
 * Create a payment inline (no navigation after success).
 * Used from invoice detail modal.
 */
export function useCreatePaymentInline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentData) =>
      paymentsService.createPayment(data),
    onSuccess: (payment) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.byInvoice(payment.invoiceId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.detail(payment.invoiceId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.stats(),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      toast.success("Pago registrado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al registrar el pago");
    },
  });
}

/**
 * Delete a payment
 */
export function useDeletePayment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentsService.deletePayment(id),
    onSuccess: (_result, id) => {
      // Get the payment before removing from cache to access invoiceId
      const payment = queryClient.getQueryData<Payment>(
        queryKeys.payments.detail(id),
      );

      // Invalidate all payment queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });

      // Invalidate invoice payments if we have the payment data
      if (payment?.invoiceId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.payments.byInvoice(payment.invoiceId),
        });
        // Invalidate invoice detail
        void queryClient.invalidateQueries({
          queryKey: queryKeys.invoices.detail(payment.invoiceId),
        });
      }

      // Invalidate invoices list
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });

      // Invalidate stats and dashboard
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.stats(),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      // Remove from detail cache
      queryClient.removeQueries({ queryKey: queryKeys.payments.detail(id) });

      toast.success("Pago eliminado exitosamente");
      navigate("/payments");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar el pago");
    },
  });
}
