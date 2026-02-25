import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collectionService } from "~/services/collection.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";

// ============================================================================
// QUERIES
// ============================================================================

export function useCollectionReminders(params: Record<string, unknown> = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: queryKeys.collection.reminders(params),
    queryFn: () => collectionService.getReminders(params),
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useCollectionReminder(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: queryKeys.collection.reminder(id),
    queryFn: () => collectionService.getReminder(id),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && !!id,
  });
}

export function useCollectionStats() {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: queryKeys.collection.stats(),
    queryFn: () => collectionService.getStats(),
    staleTime: 1000 * 60 * 2,
    enabled,
  });
}

export function useCollectionDashboard() {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: queryKeys.collection.dashboard(),
    queryFn: () => collectionService.getDashboard(),
    staleTime: 1000 * 60 * 2,
    enabled,
  });
}

export function useOverdueInvoices() {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: queryKeys.collection.overdueInvoices(),
    queryFn: () => collectionService.getOverdueInvoices(),
    staleTime: 1000 * 60 * 2,
    enabled,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      collectionService.createReminder(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collection.all,
      });
      toast.success("Recordatorio de cobro creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear el recordatorio de cobro");
    },
  });
}

export function useGenerateAutoReminders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => collectionService.generateAutoReminders(),
    onSuccess: (result: { generated: number }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collection.all,
      });
      toast.success(
        `${result.generated} recordatorio(s) generado(s) automaticamente`,
      );
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Error al generar recordatorios automaticos",
      );
    },
  });
}

export function useCancelReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => collectionService.cancelReminder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collection.all,
      });
      toast.success("Recordatorio cancelado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cancelar el recordatorio");
    },
  });
}

export function useMarkReminderSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => collectionService.markReminderSent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collection.all,
      });
      toast.success("Recordatorio marcado como enviado");
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Error al marcar el recordatorio como enviado",
      );
    },
  });
}

export function useMarkReminderFailed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => collectionService.markReminderFailed(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collection.all,
      });
      toast.success("Recordatorio marcado como fallido");
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Error al marcar el recordatorio como fallido",
      );
    },
  });
}
