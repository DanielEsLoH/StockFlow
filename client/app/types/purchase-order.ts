import type { Supplier } from "./supplier";
import type { PaymentMethod } from "./payment";

export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  UNPAID: "Sin pagar",
  PARTIALLY_PAID: "Parcial",
  PAID: "Pagada",
};

export const PaymentStatusVariants: Record<
  PaymentStatus,
  "default" | "primary" | "secondary" | "success" | "warning" | "error"
> = {
  UNPAID: "error",
  PARTIALLY_PAID: "warning",
  PAID: "success",
};

export interface PurchasePayment {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  paymentDate: string;
  createdAt: string;
  purchaseOrder?: {
    id: string;
    purchaseOrderNumber: string;
    total: number;
    paymentStatus: PaymentStatus;
    supplier?: { id: string; name: string } | null;
  } | null;
}

export interface CreatePurchasePaymentData {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  paymentDate?: string;
}

export type PurchaseOrderStatus =
  | "DRAFT"
  | "SENT"
  | "CONFIRMED"
  | "RECEIVED"
  | "CANCELLED";

export const PurchaseOrderStatusLabels: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  CONFIRMED: "Confirmada",
  RECEIVED: "Recibida",
  CANCELLED: "Cancelada",
};

export const PurchaseOrderStatusVariants: Record<
  PurchaseOrderStatus,
  "default" | "primary" | "secondary" | "success" | "warning" | "error"
> = {
  DRAFT: "secondary",
  SENT: "primary",
  CONFIRMED: "warning",
  RECEIVED: "success",
  CANCELLED: "error",
};

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  product?: { id: string; sku: string; name: string; costPrice: number } | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxCategory: string;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  purchaseOrderNumber: string;
  supplierId: string;
  supplier?: Supplier | null;
  userId?: string | null;
  user?: { id: string; name: string; email: string } | null;
  warehouseId: string;
  warehouse?: { id: string; name: string; code: string } | null;
  status: PurchaseOrderStatus;
  paymentStatus: PaymentStatus;
  issueDate: string;
  expectedDeliveryDate: string | null;
  receivedDate: string | null;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderSummary {
  id: string;
  purchaseOrderNumber: string;
  supplierId: string;
  supplier?: { id: string; name: string; documentNumber: string } | null;
  userId?: string | null;
  user?: { id: string; name: string; email: string } | null;
  warehouseId: string;
  warehouse?: { id: string; name: string; code: string } | null;
  status: PurchaseOrderStatus;
  paymentStatus: PaymentStatus;
  issueDate: string;
  expectedDeliveryDate: string | null;
  receivedDate: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  _count?: { items: number };
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderFilters {
  search?: string;
  status?: PurchaseOrderStatus;
  supplierId?: string;
  warehouseId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface PurchaseOrdersResponse {
  data: PurchaseOrderSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreatePurchaseOrderItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  taxCategory?: string;
}

export interface CreatePurchaseOrderData {
  supplierId: string;
  warehouseId: string;
  expectedDeliveryDate?: string;
  items: CreatePurchaseOrderItemData[];
  notes?: string;
}

export interface UpdatePurchaseOrderData {
  supplierId?: string;
  warehouseId?: string;
  expectedDeliveryDate?: string;
  items?: CreatePurchaseOrderItemData[];
  notes?: string;
}

export interface PurchaseOrderStats {
  totalPurchaseOrders: number;
  totalValue: number;
  totalReceived: number;
  purchaseOrdersByStatus: Record<string, number>;
}
