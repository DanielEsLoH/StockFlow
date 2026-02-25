import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { costCentersService } from "~/services/cost-centers.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  CostCenter,
  CreateCostCenterData,
  UpdateCostCenterData,
  CostCenterOption,
} from "~/types/cost-center";

// ============================================================================
// QUERIES
// ============================================================================

export function useCostCenters(search?: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<CostCenter[]>({
    queryKey: queryKeys.costCenters.list({ search } as Record<string, unknown>),
    queryFn: () => costCentersService.getAll(search),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useCostCenter(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<CostCenter>({
    queryKey: queryKeys.costCenters.detail(id),
    queryFn: () => costCentersService.getOne(id),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && !!id,
  });
}

export function useCostCenterOptions() {
  const enabled = useIsQueryEnabled();
  return useQuery<CostCenterOption[]>({
    queryKey: queryKeys.costCenters.options(),
    queryFn: () => costCentersService.getOptions(),
    staleTime: 1000 * 60 * 10,
    enabled,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCreateCostCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCostCenterData) =>
      costCentersService.create(data),
    onSuccess: (costCenter) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.costCenters.all,
      });
      toast.success(
        `Centro de costo "${costCenter.name}" creado exitosamente`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear el centro de costo");
    },
  });
}

export function useUpdateCostCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCostCenterData }) =>
      costCentersService.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.costCenters.all,
      });
      toast.success("Centro de costo actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar el centro de costo");
    },
  });
}

export function useDeleteCostCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => costCentersService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.costCenters.all,
      });
      toast.success("Centro de costo eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar el centro de costo");
    },
  });
}
