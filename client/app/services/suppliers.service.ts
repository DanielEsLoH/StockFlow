import { api } from "~/lib/api";
import type {
  Supplier,
  SupplierFilters,
  SuppliersResponse,
  CreateSupplierData,
  UpdateSupplierData,
  SupplierStats,
} from "~/types/supplier";

export const suppliersService = {
  async getSuppliers(
    filters: SupplierFilters = {},
  ): Promise<SuppliersResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<SuppliersResponse>(
      `/suppliers?${params.toString()}`,
    );
    return data;
  },

  async getSupplier(id: string): Promise<Supplier> {
    const { data } = await api.get<Supplier>(`/suppliers/${id}`);
    return data;
  },

  async searchSuppliers(query: string): Promise<Supplier[]> {
    const { data } = await api.get<Supplier[]>(
      `/suppliers/search?q=${encodeURIComponent(query)}`,
    );
    return data;
  },

  async createSupplier(supplierData: CreateSupplierData): Promise<Supplier> {
    const { data } = await api.post<Supplier>("/suppliers", supplierData);
    return data;
  },

  async updateSupplier(
    id: string,
    supplierData: UpdateSupplierData,
  ): Promise<Supplier> {
    const { data } = await api.patch<Supplier>(
      `/suppliers/${id}`,
      supplierData,
    );
    return data;
  },

  async deleteSupplier(id: string): Promise<void> {
    await api.delete(`/suppliers/${id}`);
  },

  async getSupplierStats(): Promise<SupplierStats> {
    const { data } = await api.get<SupplierStats>("/suppliers/stats");
    return data;
  },
};
