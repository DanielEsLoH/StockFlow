import { api } from "~/lib/api";
import type {
  PurchaseOrder,
  PurchaseOrderFilters,
  PurchaseOrdersResponse,
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
  PurchaseOrderStats,
} from "~/types/purchase-order";

export const purchaseOrdersService = {
  async getPurchaseOrders(
    filters: PurchaseOrderFilters = {},
  ): Promise<PurchaseOrdersResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<PurchaseOrdersResponse>(
      `/purchase-orders?${params.toString()}`,
    );
    return data;
  },

  async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const { data } = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
    return data;
  },

  async createPurchaseOrder(
    orderData: CreatePurchaseOrderData,
  ): Promise<PurchaseOrder> {
    const { data } = await api.post<PurchaseOrder>(
      "/purchase-orders",
      orderData,
    );
    return data;
  },

  async updatePurchaseOrder(
    id: string,
    orderData: UpdatePurchaseOrderData,
  ): Promise<PurchaseOrder> {
    const { data } = await api.patch<PurchaseOrder>(
      `/purchase-orders/${id}`,
      orderData,
    );
    return data;
  },

  async deletePurchaseOrder(id: string): Promise<void> {
    await api.delete(`/purchase-orders/${id}`);
  },

  async sendPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const { data } = await api.patch<PurchaseOrder>(
      `/purchase-orders/${id}/send`,
    );
    return data;
  },

  async confirmPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const { data } = await api.patch<PurchaseOrder>(
      `/purchase-orders/${id}/confirm`,
    );
    return data;
  },

  async receivePurchaseOrder(id: string): Promise<PurchaseOrder> {
    const { data } = await api.post<PurchaseOrder>(
      `/purchase-orders/${id}/receive`,
    );
    return data;
  },

  async cancelPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const { data } = await api.patch<PurchaseOrder>(
      `/purchase-orders/${id}/cancel`,
    );
    return data;
  },

  async getPurchaseOrderStats(): Promise<PurchaseOrderStats> {
    const { data } = await api.get<PurchaseOrderStats>(
      "/purchase-orders/stats",
    );
    return data;
  },
};
