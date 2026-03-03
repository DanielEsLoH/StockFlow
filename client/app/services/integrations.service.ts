import { api } from "~/lib/api";
import type {
  Integration,
  ProductMapping,
  SyncLog,
  ExternalProduct,
  CreateIntegrationDto,
  UpdateIntegrationDto,
  CreateProductMappingDto,
} from "~/types/integration";

/**
 * Integrations service — API calls for e-commerce integrations.
 *
 * vercel-react-best-practices applied:
 * - bundle-barrel-imports: direct import of api from ~/lib/api
 */
export const integrationsService = {
  // ────────────────────── Integration CRUD ──────────────────────

  /** List all integrations. */
  async getIntegrations(): Promise<Integration[]> {
    const { data } = await api.get<Integration[]>("/integrations");
    return data;
  },

  /** Get a single integration by ID. */
  async getIntegration(id: string): Promise<Integration> {
    const { data } = await api.get<Integration>(`/integrations/${id}`);
    return data;
  },

  /** Create a new integration. */
  async createIntegration(dto: CreateIntegrationDto): Promise<Integration> {
    const { data } = await api.post<Integration>("/integrations", dto);
    return data;
  },

  /** Update an integration. */
  async updateIntegration(
    id: string,
    dto: UpdateIntegrationDto,
  ): Promise<Integration> {
    const { data } = await api.put<Integration>(`/integrations/${id}`, dto);
    return data;
  },

  /** Delete an integration. */
  async deleteIntegration(id: string): Promise<void> {
    await api.delete(`/integrations/${id}`);
  },

  /** Verify an integration's connection. */
  async verifyConnection(id: string): Promise<{ connected: boolean }> {
    const { data } = await api.post<{ connected: boolean }>(
      `/integrations/${id}/verify`,
    );
    return data;
  },

  // ────────────────────── Product Mappings ──────────────────────

  /** List product mappings for an integration. */
  async getMappings(integrationId: string): Promise<ProductMapping[]> {
    const { data } = await api.get<ProductMapping[]>(
      `/integrations/${integrationId}/mappings`,
    );
    return data;
  },

  /** Create a product mapping. */
  async createMapping(
    integrationId: string,
    dto: CreateProductMappingDto,
  ): Promise<ProductMapping> {
    const { data } = await api.post<ProductMapping>(
      `/integrations/${integrationId}/mappings`,
      dto,
    );
    return data;
  },

  /** Delete a product mapping. */
  async deleteMapping(
    integrationId: string,
    mappingId: string,
  ): Promise<void> {
    await api.delete(
      `/integrations/${integrationId}/mappings/${mappingId}`,
    );
  },

  // ────────────────────── Sync Operations ──────────────────────

  /** Run all enabled syncs. */
  async syncAll(integrationId: string): Promise<SyncLog[]> {
    const { data } = await api.post<SyncLog[]>(
      `/integrations/${integrationId}/sync`,
    );
    return data;
  },

  /** Sync products only. */
  async syncProducts(integrationId: string): Promise<SyncLog> {
    const { data } = await api.post<SyncLog>(
      `/integrations/${integrationId}/sync/products`,
    );
    return data;
  },

  /** Sync orders only. */
  async syncOrders(integrationId: string): Promise<SyncLog> {
    const { data } = await api.post<SyncLog>(
      `/integrations/${integrationId}/sync/orders`,
    );
    return data;
  },

  /** Push inventory to platform. */
  async syncInventory(integrationId: string): Promise<SyncLog> {
    const { data } = await api.post<SyncLog>(
      `/integrations/${integrationId}/sync/inventory`,
    );
    return data;
  },

  /** Get unmapped external products. */
  async getUnmappedProducts(
    integrationId: string,
  ): Promise<ExternalProduct[]> {
    const { data } = await api.get<ExternalProduct[]>(
      `/integrations/${integrationId}/sync/unmapped`,
    );
    return data;
  },

  // ────────────────────── Sync Logs ──────────────────────

  /** Get sync logs for an integration. */
  async getSyncLogs(
    integrationId: string,
    limit = 20,
  ): Promise<SyncLog[]> {
    const { data } = await api.get<SyncLog[]>(
      `/integrations/${integrationId}/logs?limit=${limit}`,
    );
    return data;
  },
};
