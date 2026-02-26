import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { recurringInvoicesService } from "~/services/recurring-invoices.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import type { CreateRecurringInvoiceData } from "~/types/recurring-invoice";

const recurringKeys = {
  all: ["recurring-invoices"] as const,
  list: (page: number) => [...recurringKeys.all, "list", page] as const,
  detail: (id: string) => [...recurringKeys.all, "detail", id] as const,
};

export function useRecurringInvoices(page = 1) {
  return useQuery({
    queryKey: recurringKeys.list(page),
    queryFn: () => recurringInvoicesService.getAll(page),
  });
}

export function useRecurringInvoice(id: string) {
  return useQuery({
    queryKey: recurringKeys.detail(id),
    queryFn: () => recurringInvoicesService.getById(id),
    enabled: !!id,
  });
}

export function useCreateRecurringInvoice() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: CreateRecurringInvoiceData) =>
      recurringInvoicesService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recurringKeys.all });
      toast.success("Factura recurrente creada exitosamente");
      navigate("/invoices/recurring");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear factura recurrente");
    },
  });
}

export function useUpdateRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateRecurringInvoiceData>;
    }) => recurringInvoicesService.update(id, data),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: recurringKeys.all });
      queryClient.setQueryData(recurringKeys.detail(result.id), result);
      toast.success("Factura recurrente actualizada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar");
    },
  });
}

export function useToggleRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recurringInvoicesService.toggle(id),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: recurringKeys.all });
      toast.success(
        result.isActive
          ? "Factura recurrente activada"
          : "Factura recurrente desactivada",
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cambiar estado");
    },
  });
}

export function useDeleteRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recurringInvoicesService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recurringKeys.all });
      toast.success("Factura recurrente desactivada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al desactivar");
    },
  });
}
