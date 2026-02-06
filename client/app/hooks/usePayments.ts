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
  UpdatePaymentData,
  PaymentStats,
  PaymentStatus,
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
      // Invalidate customer payments
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.byCustomer(payment.customerId),
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

      toast.success(`Pago "${payment.paymentNumber}" registrado exitosamente`);
      navigate(`/payments/${payment.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al registrar el pago");
    },
  });
}

/**
 * Update an existing payment
 */
export function useUpdatePayment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentData }) =>
      paymentsService.updatePayment(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.payments.detail(id),
      });

      // Snapshot the previous value
      const previousPayment = queryClient.getQueryData<Payment>(
        queryKeys.payments.detail(id),
      );

      // Optimistically update the payment detail
      if (previousPayment) {
        queryClient.setQueryData<Payment>(queryKeys.payments.detail(id), {
          ...previousPayment,
          ...data,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousPayment };
    },
    onSuccess: (payment) => {
      // Invalidate list queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      // Update detail cache
      queryClient.setQueryData(queryKeys.payments.detail(payment.id), payment);
      // Invalidate invoice payments
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.byInvoice(payment.invoiceId),
      });
      // Invalidate customer payments
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.byCustomer(payment.customerId),
      });
      // Invalidate invoice detail (payment amount changes may affect invoice)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.detail(payment.invoiceId),
      });
      // Invalidate payment stats
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.stats(),
      });
      // Invalidate dashboard
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      toast.success(`Pago "${payment.paymentNumber}" actualizado exitosamente`);
      navigate(`/payments/${payment.id}`);
    },
    onError: (error: Error, { id }, context) => {
      // Rollback optimistic update on error
      if (context?.previousPayment) {
        queryClient.setQueryData(
          queryKeys.payments.detail(id),
          context.previousPayment,
        );
      }
      toast.error(error.message || "Error al actualizar el pago");
    },
  });
}

/**
 * Update payment status only
 */
export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PaymentStatus }) =>
      paymentsService.updatePaymentStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.payments.detail(id),
      });

      // Snapshot the previous value
      const previousPayment = queryClient.getQueryData<Payment>(
        queryKeys.payments.detail(id),
      );

      // Optimistically update the status
      if (previousPayment) {
        queryClient.setQueryData<Payment>(queryKeys.payments.detail(id), {
          ...previousPayment,
          status,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousPayment };
    },
    onSuccess: (payment) => {
      // Invalidate all payment queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      // Update detail cache
      queryClient.setQueryData(queryKeys.payments.detail(payment.id), payment);
      // Invalidate invoice payments
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.byInvoice(payment.invoiceId),
      });
      // Invalidate customer payments
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.byCustomer(payment.customerId),
      });
      // Invalidate invoice detail (payment status may affect invoice status)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.detail(payment.invoiceId),
      });
      // Invalidate invoice list
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      // Invalidate stats
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.stats(),
      });
      // Invalidate dashboard
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      const statusMessages: Record<PaymentStatus, string> = {
        PENDING: "marcado como pendiente",
        PROCESSING: "marcado como en proceso",
        COMPLETED: "marcado como completado",
        FAILED: "marcado como fallido",
        REFUNDED: "marcado como reembolsado",
        CANCELLED: "cancelado",
      };

      toast.success(
        `Pago "${payment.paymentNumber}" ${statusMessages[payment.status]}`,
      );
    },
    onError: (error: Error, { id }, context) => {
      // Rollback optimistic update on error
      if (context?.previousPayment) {
        queryClient.setQueryData(
          queryKeys.payments.detail(id),
          context.previousPayment,
        );
      }
      toast.error(error.message || "Error al actualizar el estado del pago");
    },
  });
}

/**
 * Delete a payment (only pending payments can be deleted)
 */
export function useDeletePayment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentsService.deletePayment(id),
    onSuccess: (_result, id) => {
      // Get the payment before removing from cache to access invoiceId and customerId
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

      // Invalidate customer payments if we have the payment data
      if (payment?.customerId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.payments.byCustomer(payment.customerId),
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

/**
 * Process a refund (partial or full)
 */
export function useRefundPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount?: number }) =>
      paymentsService.refundPayment(id, amount),
    onSuccess: (payment, { id }) => {
      // Get the original payment to access invoiceId and customerId
      const originalPayment = queryClient.getQueryData<Payment>(
        queryKeys.payments.detail(id),
      );

      // Invalidate all payment queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });

      // Update or invalidate detail cache
      // If full refund, the original payment was updated
      // If partial refund, a new payment record was created
      if (payment.id === id) {
        // Full refund - update the original payment
        queryClient.setQueryData(queryKeys.payments.detail(id), payment);
      } else {
        // Partial refund - invalidate original and the new refund payment
        void queryClient.invalidateQueries({
          queryKey: queryKeys.payments.detail(id),
        });
      }

      // Invalidate invoice payments
      const invoiceId = payment.invoiceId || originalPayment?.invoiceId;
      if (invoiceId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.payments.byInvoice(invoiceId),
        });
        // Invalidate invoice detail (refund affects invoice balance)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.invoices.detail(invoiceId),
        });
      }

      // Invalidate customer payments
      const customerId = payment.customerId || originalPayment?.customerId;
      if (customerId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.payments.byCustomer(customerId),
        });
      }

      // Invalidate invoice list
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });

      // Invalidate stats and dashboard
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.stats(),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      const refundAmount = payment.refundAmount || payment.amount;
      const formattedAmount = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
      }).format(Math.abs(refundAmount));

      toast.success(`Reembolso de ${formattedAmount} procesado exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al procesar el reembolso");
    },
  });
}
