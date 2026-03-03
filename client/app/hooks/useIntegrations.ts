import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query-client";
import { integrationsService } from "~/services/integrations.service";
import type {
  CreateIntegrationDto,
  UpdateIntegrationDto,
  CreateProductMappingDto,
} from "~/types/integration";
import { toast } from "~/components/ui/Toast";

/**
 * React Query hooks for e-commerce integrations.
 *
 * vercel-react-best-practices applied:
 * - bundle-barrel-imports: direct imports only
 * - rerender-functional-setstate: mutation callbacks use invalidation
 */

// ────────────────────── Queries ──────────────────────

/** Fetch all integrations. */
export function useIntegrations() {
  return useQuery({
    queryKey: queryKeys.integrations.list(),
    queryFn: () => integrationsService.getIntegrations(),
  });
}

/** Fetch a single integration by ID. */
export function useIntegration(id: string) {
  return useQuery({
    queryKey: queryKeys.integrations.detail(id),
    queryFn: () => integrationsService.getIntegration(id),
    enabled: !!id,
  });
}

/** Fetch product mappings for an integration. */
export function useIntegrationMappings(integrationId: string) {
  return useQuery({
    queryKey: queryKeys.integrations.mappings(integrationId),
    queryFn: () => integrationsService.getMappings(integrationId),
    enabled: !!integrationId,
  });
}

/** Fetch sync logs for an integration. */
export function useIntegrationSyncLogs(
  integrationId: string,
  limit = 20,
) {
  return useQuery({
    queryKey: queryKeys.integrations.syncLogs(integrationId),
    queryFn: () => integrationsService.getSyncLogs(integrationId, limit),
    enabled: !!integrationId,
  });
}

/** Fetch unmapped external products. */
export function useUnmappedProducts(integrationId: string) {
  return useQuery({
    queryKey: queryKeys.integrations.unmapped(integrationId),
    queryFn: () => integrationsService.getUnmappedProducts(integrationId),
    enabled: !!integrationId,
  });
}

// ────────────────────── Mutations ──────────────────────

/** Create a new integration. */
export function useCreateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateIntegrationDto) =>
      integrationsService.createIntegration(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
      toast.success("Integración creada exitosamente");
    },
  });
}

/** Update an integration. */
export function useUpdateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateIntegrationDto }) =>
      integrationsService.updateIntegration(id, dto),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.detail(id),
      });
      toast.success("Integración actualizada");
    },
  });
}

/** Delete an integration. */
export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationsService.deleteIntegration(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
      toast.success("Integración eliminada");
    },
  });
}

/** Verify an integration connection. */
export function useVerifyConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationsService.verifyConnection(id),
    onSuccess: (data, id) => {
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.detail(id),
      });
      if (data.connected) {
        toast.success("Conexión verificada exitosamente");
      } else {
        toast.error("No se pudo verificar la conexión");
      }
    },
  });
}

/** Create a product mapping. */
export function useCreateMapping(integrationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateProductMappingDto) =>
      integrationsService.createMapping(integrationId, dto),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.mappings(integrationId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.unmapped(integrationId),
      });
      toast.success("Mapeo de producto creado");
    },
  });
}

/** Delete a product mapping. */
export function useDeleteMapping(integrationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: string) =>
      integrationsService.deleteMapping(integrationId, mappingId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.mappings(integrationId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.unmapped(integrationId),
      });
      toast.success("Mapeo eliminado");
    },
  });
}

// ────────────────────── Sync Mutations ──────────────────────

/** Sync all enabled data types. */
export function useSyncAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) =>
      integrationsService.syncAll(integrationId),
    onSuccess: (_data, integrationId) => {
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.syncLogs(integrationId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.detail(integrationId),
      });
      toast.success("Sincronización completada");
    },
  });
}

/** Sync products only. */
export function useSyncProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) =>
      integrationsService.syncProducts(integrationId),
    onSuccess: (_data, integrationId) => {
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.syncLogs(integrationId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success("Productos sincronizados");
    },
  });
}

/** Sync orders only. */
export function useSyncOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) =>
      integrationsService.syncOrders(integrationId),
    onSuccess: (_data, integrationId) => {
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.syncLogs(integrationId),
      });
      toast.success("Pedidos sincronizados");
    },
  });
}

/** Sync inventory to platform. */
export function useSyncInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) =>
      integrationsService.syncInventory(integrationId),
    onSuccess: (_data, integrationId) => {
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.syncLogs(integrationId),
      });
      toast.success("Inventario sincronizado");
    },
  });
}
