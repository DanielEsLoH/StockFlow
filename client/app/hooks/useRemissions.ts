import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { remissionsService } from "~/services/remissions.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type { Remission, CreateRemissionData } from "~/types/remission";

// ============================================================================
// QUERIES
// ============================================================================

export function useRemissions(params: Record<string, unknown> = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery<{
    data: Remission[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: queryKeys.remissions.list(params),
    queryFn: () => remissionsService.getAll(params as Parameters<typeof remissionsService.getAll>[0]),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useRemission(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<Remission>({
    queryKey: queryKeys.remissions.detail(id),
    queryFn: () => remissionsService.getOne(id),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && !!id,
  });
}

export function useRemissionStats() {
  const enabled = useIsQueryEnabled();
  return useQuery<Record<string, number>>({
    queryKey: queryKeys.remissions.stats(),
    queryFn: () => remissionsService.getStats(),
    staleTime: 1000 * 60 * 2,
    enabled,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCreateRemission() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRemissionData) => remissionsService.create(data),
    onSuccess: (remission) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.remissions.all,
      });
      toast.success(
        `Remision "${remission.remissionNumber}" creada exitosamente`,
      );
      navigate(`/remissions/${remission.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear la remision");
    },
  });
}

export function useCreateFromInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) =>
      remissionsService.createFromInvoice(invoiceId),
    onSuccess: (remission) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.remissions.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.all,
      });
      toast.success(
        `Remision "${remission.remissionNumber}" creada desde factura exitosamente`,
      );
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Error al crear la remision desde factura",
      );
    },
  });
}

export function useUpdateRemission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateRemissionData>;
    }) => remissionsService.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.remissions.all,
      });
      toast.success("Remision actualizada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar la remision");
    },
  });
}

export function useDeleteRemission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => remissionsService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.remissions.all,
      });
      toast.success("Remision eliminada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar la remision");
    },
  });
}

export function useDispatchRemission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => remissionsService.dispatch(id),
    onSuccess: (remission) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.remissions.all,
      });
      toast.success(
        `Remision "${remission.remissionNumber}" despachada exitosamente`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al despachar la remision");
    },
  });
}

export function useDeliverRemission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => remissionsService.deliver(id),
    onSuccess: (remission) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.remissions.all,
      });
      toast.success(
        `Remision "${remission.remissionNumber}" entregada exitosamente`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al entregar la remision");
    },
  });
}

export function useCancelRemission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => remissionsService.cancel(id),
    onSuccess: (remission) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.remissions.all,
      });
      toast.success(
        `Remision "${remission.remissionNumber}" cancelada exitosamente`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cancelar la remision");
    },
  });
}
