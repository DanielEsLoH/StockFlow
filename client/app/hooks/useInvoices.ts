import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { invoicesService } from "~/services/invoices.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  Invoice,
  InvoiceFilters,
  InvoicesResponse,
  CreateInvoiceData,
  UpdateInvoiceData,
  CreateInvoiceItemData,
  UpdateInvoiceItemData,
  InvoiceStats,
  InvoiceStatus,
} from "~/types/invoice";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Paginated invoices list with filters
 */
export function useInvoices(filters: InvoiceFilters = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery<InvoicesResponse>({
    queryKey: queryKeys.invoices.list(filters as Record<string, unknown>),
    queryFn: () => invoicesService.getInvoices(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

/**
 * Single invoice detail by ID
 */
export function useInvoice(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<Invoice>({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: () => invoicesService.getInvoice(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: enabled && !!id,
  });
}

/**
 * Invoices for a specific customer
 */
export function useInvoicesByCustomer(customerId: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<Invoice[]>({
    queryKey: queryKeys.invoices.byCustomer(customerId),
    queryFn: () => invoicesService.getInvoicesByCustomer(customerId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: enabled && !!customerId,
  });
}

/**
 * Recent invoices for dashboard (limited)
 */
export function useRecentInvoices(limit: number = 5) {
  const enabled = useIsQueryEnabled();
  return useQuery<Invoice[]>({
    queryKey: queryKeys.invoices.recent(limit),
    queryFn: () => invoicesService.getRecentInvoices(limit),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled,
  });
}

/**
 * Invoice statistics
 */
export function useInvoiceStats() {
  const enabled = useIsQueryEnabled();
  return useQuery<InvoiceStats>({
    queryKey: queryKeys.invoices.stats(),
    queryFn: () => invoicesService.getInvoiceStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new invoice
 */
export function useCreateInvoice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceData) =>
      invoicesService.createInvoice(data),
    onSuccess: (invoice) => {
      // Invalidate all invoice-related queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      // Invalidate customer invoices if we know the customer
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.byCustomer(invoice.customerId),
      });
      // Invalidate dashboard stats
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      toast.success(`Factura "${invoice.invoiceNumber}" creada exitosamente`);
      navigate(`/invoices/${invoice.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear la factura");
    },
  });
}

/**
 * POS Checkout: create invoice + mark as SENT + optional immediate payment.
 * Does NOT navigate (POS handles its own flow with ticket modal).
 */
export function useCheckoutInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: CreateInvoiceData & {
        immediatePayment?: boolean;
        paymentMethod?: string;
      },
    ) => invoicesService.checkoutInvoice(data),
    onSuccess: (invoice) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.byCustomer(invoice.customerId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

      toast.success(`Factura "${invoice.invoiceNumber}" procesada`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al procesar la factura");
    },
  });
}

/**
 * Update an existing invoice
 */
export function useUpdateInvoice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceData }) =>
      invoicesService.updateInvoice(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.invoices.detail(id),
      });

      // Snapshot the previous value
      const previousInvoice = queryClient.getQueryData<Invoice>(
        queryKeys.invoices.detail(id),
      );

      // Optimistically update the invoice detail (excluding items to avoid type issues)
      if (previousInvoice) {
        const { items: _, ...restData } = data;
        void _; // Satisfy ESLint unused variable check
        queryClient.setQueryData<Invoice>(queryKeys.invoices.detail(id), {
          ...previousInvoice,
          ...restData,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousInvoice };
    },
    onSuccess: (invoice) => {
      // Invalidate list queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      // Update detail cache
      queryClient.setQueryData(queryKeys.invoices.detail(invoice.id), invoice);
      // Invalidate customer invoices
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.byCustomer(invoice.customerId),
      });
      // Invalidate dashboard stats
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      toast.success(
        `Factura "${invoice.invoiceNumber}" actualizada exitosamente`,
      );
      navigate(`/invoices/${invoice.id}`);
    },
    onError: (error: Error, { id }, context) => {
      // Rollback optimistic update on error
      if (context?.previousInvoice) {
        queryClient.setQueryData(
          queryKeys.invoices.detail(id),
          context.previousInvoice,
        );
      }
      toast.error(error.message || "Error al actualizar la factura");
    },
  });
}

/**
 * Update invoice status only (e.g., mark as paid, cancel)
 */
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      invoicesService.updateInvoiceStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.invoices.detail(id),
      });

      // Snapshot the previous value
      const previousInvoice = queryClient.getQueryData<Invoice>(
        queryKeys.invoices.detail(id),
      );

      // Optimistically update the status
      if (previousInvoice) {
        queryClient.setQueryData<Invoice>(queryKeys.invoices.detail(id), {
          ...previousInvoice,
          status,
          paidAt:
            status === "PAID"
              ? new Date().toISOString()
              : previousInvoice.paidAt,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousInvoice };
    },
    onSuccess: (invoice) => {
      // Invalidate all invoice queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      // Update detail cache
      queryClient.setQueryData(queryKeys.invoices.detail(invoice.id), invoice);
      // Invalidate customer invoices
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.byCustomer(invoice.customerId),
      });
      // Invalidate stats
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.stats(),
      });
      // Invalidate dashboard
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      const statusMessages: Record<InvoiceStatus, string> = {
        DRAFT: "marcada como borrador",
        PENDING: "marcada como pendiente",
        SENT: "enviada",
        PAID: "marcada como pagada",
        OVERDUE: "marcada como vencida",
        CANCELLED: "cancelada",
        VOID: "anulada",
      };

      toast.success(
        `Factura "${invoice.invoiceNumber}" ${statusMessages[invoice.status]}`,
      );
    },
    onError: (error: Error, { id }, context) => {
      // Rollback optimistic update on error
      if (context?.previousInvoice) {
        queryClient.setQueryData(
          queryKeys.invoices.detail(id),
          context.previousInvoice,
        );
      }
      toast.error(
        error.message || "Error al actualizar el estado de la factura",
      );
    },
  });
}

/**
 * Delete an invoice (only draft invoices can be deleted)
 */
export function useDeleteInvoice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoicesService.deleteInvoice(id),
    onSuccess: (_result, id) => {
      // Get the invoice before removing from cache to access customerId
      const invoice = queryClient.getQueryData<Invoice>(
        queryKeys.invoices.detail(id),
      );

      // Invalidate all invoice queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });

      // Invalidate customer invoices if we have the invoice data
      if (invoice?.customerId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.invoices.byCustomer(invoice.customerId),
        });
      }

      // Invalidate stats and dashboard
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.stats(),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      // Remove from detail cache
      queryClient.removeQueries({ queryKey: queryKeys.invoices.detail(id) });

      toast.success("Factura eliminada exitosamente");
      navigate("/invoices");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar la factura");
    },
  });
}

// ============================================================================
// LINE ITEM MUTATIONS
// ============================================================================

/**
 * Add a line item to an invoice
 */
export function useAddInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      item,
    }: {
      invoiceId: string;
      item: CreateInvoiceItemData;
    }) => invoicesService.addInvoiceItem(invoiceId, item),
    onSuccess: (invoice) => {
      // Update the detail cache with the returned invoice
      queryClient.setQueryData(queryKeys.invoices.detail(invoice.id), invoice);

      // Invalidate list queries since totals changed
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });

      // Invalidate customer invoices
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.byCustomer(invoice.customerId),
      });

      toast.success("Item agregado a la factura");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al agregar el item");
    },
  });
}

/**
 * Update a line item in an invoice
 */
export function useUpdateInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      itemId,
      data,
    }: {
      invoiceId: string;
      itemId: string;
      data: UpdateInvoiceItemData;
    }) => invoicesService.updateInvoiceItem(invoiceId, itemId, data),
    onMutate: async ({ invoiceId, itemId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.invoices.detail(invoiceId),
      });

      // Snapshot previous invoice
      const previousInvoice = queryClient.getQueryData<Invoice>(
        queryKeys.invoices.detail(invoiceId),
      );

      // Optimistically update the item
      if (previousInvoice?.items) {
        const updatedItems = previousInvoice.items.map((item) =>
          item.id === itemId ? { ...item, ...data } : item,
        );

        queryClient.setQueryData<Invoice>(
          queryKeys.invoices.detail(invoiceId),
          {
            ...previousInvoice,
            items: updatedItems,
            updatedAt: new Date().toISOString(),
          },
        );
      }

      return { previousInvoice };
    },
    onSuccess: (invoice) => {
      // Update detail cache with server response
      queryClient.setQueryData(queryKeys.invoices.detail(invoice.id), invoice);

      // Invalidate list queries since totals may have changed
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });

      // Invalidate customer invoices
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.byCustomer(invoice.customerId),
      });

      toast.success("Item actualizado");
    },
    onError: (error: Error, { invoiceId }, context) => {
      // Rollback optimistic update
      if (context?.previousInvoice) {
        queryClient.setQueryData(
          queryKeys.invoices.detail(invoiceId),
          context.previousInvoice,
        );
      }
      toast.error(error.message || "Error al actualizar el item");
    },
  });
}

/**
 * Remove a line item from an invoice
 */
export function useRemoveInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      itemId,
    }: {
      invoiceId: string;
      itemId: string;
    }) => invoicesService.removeInvoiceItem(invoiceId, itemId),
    onMutate: async ({ invoiceId, itemId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.invoices.detail(invoiceId),
      });

      // Snapshot previous invoice
      const previousInvoice = queryClient.getQueryData<Invoice>(
        queryKeys.invoices.detail(invoiceId),
      );

      // Optimistically remove the item
      if (previousInvoice?.items) {
        const updatedItems = previousInvoice.items.filter(
          (item) => item.id !== itemId,
        );

        queryClient.setQueryData<Invoice>(
          queryKeys.invoices.detail(invoiceId),
          {
            ...previousInvoice,
            items: updatedItems,
            updatedAt: new Date().toISOString(),
          },
        );
      }

      return { previousInvoice };
    },
    onSuccess: (invoice) => {
      // Update detail cache with server response
      queryClient.setQueryData(queryKeys.invoices.detail(invoice.id), invoice);

      // Invalidate list queries since totals changed
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });

      // Invalidate customer invoices
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.byCustomer(invoice.customerId),
      });

      toast.success("Item eliminado de la factura");
    },
    onError: (error: Error, { invoiceId }, context) => {
      // Rollback optimistic update
      if (context?.previousInvoice) {
        queryClient.setQueryData(
          queryKeys.invoices.detail(invoiceId),
          context.previousInvoice,
        );
      }
      toast.error(error.message || "Error al eliminar el item");
    },
  });
}

// ============================================================================
// DIAN INTEGRATION
// ============================================================================

/**
 * Send invoice to DIAN for electronic validation
 */
export function useSendInvoiceToDian() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) => invoicesService.sendToDian(invoiceId),
    onSuccess: (invoice) => {
      // Update detail cache with the returned invoice (now has DIAN fields)
      queryClient.setQueryData(queryKeys.invoices.detail(invoice.id), invoice);

      // Invalidate list queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });

      toast.success(
        `Factura "${invoice.invoiceNumber}" enviada a la DIAN exitosamente`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al enviar la factura a la DIAN");
    },
  });
}
