import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { quotationsService } from "~/services/quotations.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  Quotation,
  QuotationFilters,
  QuotationsResponse,
  CreateQuotationData,
  UpdateQuotationData,
  QuotationStats,
} from "~/types/quotation";

// ============================================================================
// QUERIES
// ============================================================================

export function useQuotations(filters: QuotationFilters = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery<QuotationsResponse>({
    queryKey: queryKeys.quotations.list(filters as Record<string, unknown>),
    queryFn: () => quotationsService.getQuotations(filters),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useQuotation(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<Quotation>({
    queryKey: queryKeys.quotations.detail(id),
    queryFn: () => quotationsService.getQuotation(id),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && !!id,
  });
}

export function useQuotationStats() {
  const enabled = useIsQueryEnabled();
  return useQuery<QuotationStats>({
    queryKey: queryKeys.quotations.stats(),
    queryFn: () => quotationsService.getQuotationStats(),
    staleTime: 1000 * 60 * 2,
    enabled,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCreateQuotation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuotationData) =>
      quotationsService.createQuotation(data),
    onSuccess: (quotation) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quotations.all,
      });
      toast.success(
        `Cotizacion "${quotation.quotationNumber}" creada exitosamente`,
      );
      navigate(`/quotations/${quotation.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear la cotizacion");
    },
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuotationData }) =>
      quotationsService.updateQuotation(id, data),
    onSuccess: (quotation) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quotations.all,
      });
      toast.success("Cotizacion actualizada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar la cotizacion");
    },
  });
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quotationsService.deleteQuotation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quotations.all,
      });
      toast.success("Cotizacion eliminada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar la cotizacion");
    },
  });
}

export function useSendQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quotationsService.sendQuotation(id),
    onSuccess: (quotation) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quotations.all,
      });
      toast.success(
        `Cotizacion "${quotation.quotationNumber}" enviada exitosamente`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al enviar la cotizacion");
    },
  });
}

export function useAcceptQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quotationsService.acceptQuotation(id),
    onSuccess: (quotation) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quotations.all,
      });
      toast.success(
        `Cotizacion "${quotation.quotationNumber}" aceptada`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al aceptar la cotizacion");
    },
  });
}

export function useRejectQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quotationsService.rejectQuotation(id),
    onSuccess: (quotation) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quotations.all,
      });
      toast.success(
        `Cotizacion "${quotation.quotationNumber}" rechazada`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al rechazar la cotizacion");
    },
  });
}

export function useConvertToInvoice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quotationsService.convertToInvoice(id),
    onSuccess: (quotation) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quotations.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.all,
      });
      toast.success(
        `Cotizacion convertida a factura exitosamente`,
      );
      if (quotation.convertedToInvoiceId) {
        navigate(`/invoices/${quotation.convertedToInvoiceId}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al convertir la cotizacion");
    },
  });
}
