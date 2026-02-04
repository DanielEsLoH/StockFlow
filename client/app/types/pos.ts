import type { PaymentMethod } from "./payment";

// ============================================================================
// CASH REGISTER TYPES
// ============================================================================

export type CashRegisterStatus = "OPEN" | "CLOSED" | "SUSPENDED";

export interface CashRegister {
  id: string;
  tenantId: string;
  warehouseId: string;
  name: string;
  code: string;
  status: CashRegisterStatus;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashRegisterWithWarehouse extends CashRegister {
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  activeSession?: {
    id: string;
    openedAt: string;
    userId: string;
  } | null;
}

export interface CashRegistersResponse {
  data: CashRegisterWithWarehouse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateCashRegisterData {
  name: string;
  code: string;
  warehouseId: string;
  status?: CashRegisterStatus;
  description?: string;
}

export interface UpdateCashRegisterData {
  name?: string;
  code?: string;
  warehouseId?: string;
  status?: CashRegisterStatus;
  description?: string;
}

export interface CashRegisterFilters {
  page?: number;
  limit?: number;
  warehouseId?: string;
  status?: CashRegisterStatus;
}

// ============================================================================
// POS SESSION TYPES
// ============================================================================

export type POSSessionStatus = "ACTIVE" | "CLOSED" | "SUSPENDED";

export type CashMovementType =
  | "OPENING"
  | "CLOSING"
  | "SALE"
  | "REFUND"
  | "CASH_IN"
  | "CASH_OUT";

export interface POSSession {
  id: string;
  tenantId: string;
  cashRegisterId: string;
  userId: string;
  status: POSSessionStatus;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface POSSessionWithDetails extends POSSession {
  cashRegister?: {
    id: string;
    name: string;
    code: string;
    warehouse?: {
      id: string;
      name: string;
    };
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    name?: string;
    email: string;
  };
  totalSales?: number;
  salesCount?: number;
  currentCash?: number;
}

export interface POSSessionsResponse {
  data: POSSessionWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface OpenSessionData {
  cashRegisterId: string;
  openingAmount: number;
  notes?: string;
}

export interface CloseSessionData {
  closingAmount: number;
  notes?: string;
}

export interface CashMovementData {
  action: "CASH_IN" | "CASH_OUT";
  amount: number;
  reference?: string;
  notes?: string;
}

export interface CashMovement {
  id: string;
  sessionId: string;
  type: CashMovementType;
  amount: number;
  method: PaymentMethod | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface POSSessionFilters {
  page?: number;
  limit?: number;
  cashRegisterId?: string;
  status?: POSSessionStatus;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}

// ============================================================================
// X/Z REPORT TYPES
// ============================================================================

export interface XZReport {
  type: "X" | "Z";
  session: {
    id: string;
    cashRegisterName: string;
    cashRegisterCode: string;
    userName: string;
    openedAt: string;
    closedAt: string | null;
  };
  openingAmount: number;
  totalCashSales: number;
  totalCardSales: number;
  totalOtherSales: number;
  totalSales: number;
  totalSalesAmount: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedCash: number;
  expectedCashAmount: number;
  declaredCashAmount: number | null;
  difference: number | null;
  totalTransactions: number;
  transactionCount: number;
  salesByPaymentMethod: Record<string, number>;
  salesByMethod: Array<{
    method: PaymentMethod;
    count: number;
    total: number;
  }>;
  generatedAt: string;
}

// ============================================================================
// POS SALE TYPES
// ============================================================================

export interface SalePayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  cardLastFour: string | null;
  createdAt: string;
}

export interface POSSale {
  id: string;
  tenantId: string;
  sessionId: string;
  invoiceId: string;
  saleNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: string;
}

export type POSSaleStatus = "COMPLETED" | "VOIDED";

export interface POSSaleItem {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
  subtotal: number;
  tax?: number;
  total?: number;
}

export interface POSSaleWithDetails extends POSSale {
  status: POSSaleStatus;
  voidedAt?: string | null;
  voidReason?: string | null;
  voidedById?: string | null;
  customer?: {
    id: string;
    name: string;
    documentNumber?: string;
  } | null;
  items?: POSSaleItem[];
  invoice?: {
    id: string;
    invoiceNumber: string;
  };
  payments: SalePayment[];
  session?: {
    id: string;
    cashRegister?: {
      id: string;
      name: string;
      code: string;
    };
  };
}

export interface POSSalesResponse {
  data: POSSaleWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SaleItemData {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discountPercent?: number;
}

export interface SalePaymentData {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  cardLastFour?: string;
}

export interface CreateSaleData {
  customerId?: string;
  items: SaleItemData[];
  payments: SalePaymentData[];
  discountPercent?: number;
  notes?: string;
}

export interface POSSaleFilters {
  page?: number;
  limit?: number;
  sessionId?: string;
  fromDate?: string;
  toDate?: string;
}

// ============================================================================
// POS CART TYPES
// ============================================================================

export interface CartItem {
  productId: string;
  productName: string;
  productSku: string;
  barcode?: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
  subtotal: number;
  tax: number;
  total: number;
  maxStock: number;
}
