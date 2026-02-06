import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { warehousesService } from "~/services/warehouses.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  Warehouse,
  WarehouseFilters,
  WarehousesResponse,
  CreateWarehouseData,
  UpdateWarehouseData,
  WarehouseStats,
} from "~/types/warehouse";

// Warehouses list hook with filters (paginated)
export function useWarehousesWithFilters(filters: WarehouseFilters = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery<WarehousesResponse>({
    queryKey: queryKeys.warehouses.list(filters as Record<string, unknown>),
    queryFn: () => warehousesService.getWarehousesWithFilters(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

// Active warehouses hook (for dropdowns)
export function useWarehouses() {
  const enabled = useIsQueryEnabled();
  return useQuery<Warehouse[]>({
    queryKey: queryKeys.warehouses.all,
    queryFn: () => warehousesService.getWarehouses(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled,
  });
}

// All warehouses including inactive
export function useAllWarehouses() {
  const enabled = useIsQueryEnabled();
  return useQuery<Warehouse[]>({
    queryKey: [...queryKeys.warehouses.all, "all"],
    queryFn: () => warehousesService.getAllWarehouses(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled,
  });
}

// Single warehouse hook
export function useWarehouse(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<Warehouse>({
    queryKey: queryKeys.warehouses.detail(id),
    queryFn: () => warehousesService.getWarehouse(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: enabled && !!id,
  });
}

// Warehouse stats hook
export function useWarehouseStats(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<WarehouseStats>({
    queryKey: [...queryKeys.warehouses.detail(id), "stats"],
    queryFn: () => warehousesService.getWarehouseStats(id),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: enabled && !!id,
  });
}

// Cities for filter dropdown
export function useWarehouseCities() {
  const enabled = useIsQueryEnabled();
  return useQuery<string[]>({
    queryKey: [...queryKeys.warehouses.all, "cities"],
    queryFn: () => warehousesService.getCities(),
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled,
  });
}

// Create warehouse mutation
export function useCreateWarehouse() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWarehouseData) =>
      warehousesService.createWarehouse(data),
    onSuccess: (warehouse) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.warehouses.all,
      });
      toast.success(`Bodega "${warehouse.name}" creada exitosamente`);
      navigate("/warehouses");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear la bodega");
    },
  });
}

// Update warehouse mutation
export function useUpdateWarehouse() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWarehouseData }) =>
      warehousesService.updateWarehouse(id, data),
    onSuccess: (warehouse) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.warehouses.all,
      });
      queryClient.setQueryData(
        queryKeys.warehouses.detail(warehouse.id),
        warehouse,
      );
      toast.success(`Bodega "${warehouse.name}" actualizada exitosamente`);
      navigate(`/warehouses/${warehouse.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar la bodega");
    },
  });
}

// Delete warehouse mutation
export function useDeleteWarehouse() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => warehousesService.deleteWarehouse(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.warehouses.all,
      });
      toast.success("Bodega eliminada exitosamente");
      navigate("/warehouses");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar la bodega");
    },
  });
}
