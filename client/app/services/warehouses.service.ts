import { api } from "~/lib/api";
import type {
  Warehouse,
  WarehouseFilters,
  WarehousesResponse,
  CreateWarehouseData,
  UpdateWarehouseData,
  WarehouseStats,
} from "~/types/warehouse";

// Service - Real API calls
export const warehousesService = {
  // Get paginated warehouses with filters
  async getWarehousesWithFilters(
    filters: WarehouseFilters = {},
  ): Promise<WarehousesResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<WarehousesResponse>(
      `/warehouses?${params.toString()}`,
    );
    return data;
  },

  // Get active warehouses (for dropdowns)
  // Backend returns paginated response, extract the data array
  async getWarehouses(): Promise<Warehouse[]> {
    const { data } = await api.get<WarehousesResponse>(
      "/warehouses?limit=1000",
    );
    return data.data;
  },

  // Get all warehouses including inactive
  // Backend returns paginated response, extract the data array
  async getAllWarehouses(): Promise<Warehouse[]> {
    const { data } = await api.get<WarehousesResponse>(
      "/warehouses?all=true&limit=1000",
    );
    return data.data;
  },

  async getWarehouse(id: string): Promise<Warehouse> {
    const { data } = await api.get<Warehouse>(`/warehouses/${id}`);
    return data;
  },

  async getWarehouseStats(id: string): Promise<WarehouseStats> {
    const { data } = await api.get<WarehouseStats>(`/warehouses/${id}/stats`);
    return data;
  },

  async createWarehouse(
    warehouseData: CreateWarehouseData,
  ): Promise<Warehouse> {
    const { data } = await api.post<Warehouse>("/warehouses", warehouseData);
    return data;
  },

  async updateWarehouse(
    id: string,
    warehouseData: UpdateWarehouseData,
  ): Promise<Warehouse> {
    const { data } = await api.patch<Warehouse>(
      `/warehouses/${id}`,
      warehouseData,
    );
    return data;
  },

  async deleteWarehouse(id: string): Promise<void> {
    await api.delete(`/warehouses/${id}`);
  },

  // Get unique cities for filter dropdown
  async getCities(): Promise<string[]> {
    const { data } = await api.get<string[]>("/warehouses/cities");
    return data;
  },
};
