// Stock Movement Types

export type MovementType =
  | "SALE"
  | "PURCHASE"
  | "ADJUSTMENT"
  | "TRANSFER"
  | "RETURN"
  | "DAMAGE"
  | "EXPIRED";

export interface StockMovement {
  id: string;
  tenantId: string;
  productId: string;
  warehouseId: string | null;
  userId: string | null;
  type: MovementType;
  quantity: number;
  reason: string | null;
  notes: string | null;
  invoiceId: string | null;
  createdAt: string;
  product?: {
    id: string;
    sku: string;
    name: string;
  };
  warehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface StockMovementFilters {
  productId?: string;
  warehouseId?: string;
  type?: MovementType;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface StockMovementsResponse {
  data: StockMovement[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateStockAdjustmentData {
  productId: string;
  warehouseId?: string;
  quantity: number;
  reason: string;
  notes?: string;
}

export interface CreateTransferData {
  productId: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  quantity: number;
  reason?: string;
  notes?: string;
}

export interface TransferResponse {
  outMovement: StockMovement;
  inMovement: StockMovement;
}

export const MovementTypeLabels: Record<MovementType, string> = {
  SALE: "Venta",
  PURCHASE: "Compra",
  ADJUSTMENT: "Ajuste",
  TRANSFER: "Transferencia",
  RETURN: "Devolucion",
  DAMAGE: "Daño",
  EXPIRED: "Vencido",
};

export const MovementTypeColors: Record<
  MovementType,
  "success" | "primary" | "warning" | "error" | "secondary" | "default"
> = {
  SALE: "error",
  PURCHASE: "success",
  ADJUSTMENT: "warning",
  TRANSFER: "primary",
  RETURN: "secondary",
  DAMAGE: "error",
  EXPIRED: "error",
};
