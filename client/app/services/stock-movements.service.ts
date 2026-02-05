import { api } from "~/lib/api";
import type {
  StockMovement,
  StockMovementFilters,
  StockMovementsResponse,
  CreateStockAdjustmentData,
  CreateTransferData,
  TransferResponse,
} from "~/types/stock-movement";

export const stockMovementsService = {
  async getMovements(
    filters: StockMovementFilters = {},
  ): Promise<StockMovementsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<StockMovementsResponse>(
      `/stock-movements?${params.toString()}`,
    );
    return data;
  },

  async getMovement(id: string): Promise<StockMovement> {
    const { data } = await api.get<StockMovement>(`/stock-movements/${id}`);
    return data;
  },

  async createAdjustment(
    adjustmentData: CreateStockAdjustmentData,
  ): Promise<StockMovement> {
    const { data } = await api.post<StockMovement>(
      "/stock-movements",
      adjustmentData,
    );
    return data;
  },

  async getMovementsByProduct(
    productId: string,
    filters: StockMovementFilters = {},
  ): Promise<StockMovementsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== "productId") {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<StockMovementsResponse>(
      `/products/${productId}/movements?${params.toString()}`,
    );
    return data;
  },

  async getMovementsByWarehouse(
    warehouseId: string,
    filters: StockMovementFilters = {},
  ): Promise<StockMovementsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== "warehouseId") {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<StockMovementsResponse>(
      `/warehouses/${warehouseId}/movements?${params.toString()}`,
    );
    return data;
  },

  async createTransfer(
    transferData: CreateTransferData,
  ): Promise<TransferResponse> {
    const { data } = await api.post<TransferResponse>(
      "/stock-movements/transfers",
      transferData,
    );
    return data;
  },
};
