import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { suppliersService } from "~/services/suppliers.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  Supplier,
  SupplierFilters,
  SuppliersResponse,
  CreateSupplierData,
  UpdateSupplierData,
  SupplierStats,
} from "~/types/supplier";

// ============================================================================
// QUERIES
// ============================================================================

export function useSuppliers(filters: SupplierFilters = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery<SuppliersResponse>({
    queryKey: queryKeys.suppliers.list(filters as Record<string, unknown>),
    queryFn: () => suppliersService.getSuppliers(filters),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useSupplier(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<Supplier>({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => suppliersService.getSupplier(id),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && !!id,
  });
}

export function useSupplierStats() {
  const enabled = useIsQueryEnabled();
  return useQuery<SupplierStats>({
    queryKey: queryKeys.suppliers.stats(),
    queryFn: () => suppliersService.getSupplierStats(),
    staleTime: 1000 * 60 * 2,
    enabled,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCreateSupplier() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplierData) =>
      suppliersService.createSupplier(data),
    onSuccess: (supplier) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.all,
      });
      toast.success(`Proveedor "${supplier.name}" creado exitosamente`);
      navigate(`/suppliers/${supplier.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear el proveedor");
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierData }) =>
      suppliersService.updateSupplier(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.all,
      });
      toast.success("Proveedor actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar el proveedor");
    },
  });
}

export function useDeleteSupplier() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => suppliersService.deleteSupplier(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.all,
      });
      toast.success("Proveedor eliminado exitosamente");
      navigate("/suppliers");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar el proveedor");
    },
  });
}
