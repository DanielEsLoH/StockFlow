// Payment Types

import type { Customer } from "./customer";
import type { Invoice } from "./invoice";

// Payment Method
export type PaymentMethod =
  | "CASH"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "BANK_TRANSFER"
  | "WIRE_TRANSFER"
  | "CHECK"
  | "PSE"
  | "NEQUI"
  | "DAVIPLATA"
  | "OTHER";

// Invoice Payment Status (from invoice, not payment itself)
export type InvoicePaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

// Payment method display labels in Spanish
export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CREDIT_CARD: "Tarjeta de Crédito",
  DEBIT_CARD: "Tarjeta Débito",
  BANK_TRANSFER: "Transferencia Bancaria",
  WIRE_TRANSFER: "Transferencia Internacional",
  CHECK: "Cheque",
  PSE: "PSE",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  OTHER: "Otro",
};

// Invoice payment status display labels in Spanish
export const InvoicePaymentStatusLabels: Record<InvoicePaymentStatus, string> = {
  UNPAID: "Sin pagar",
  PARTIALLY_PAID: "Parcial",
  PAID: "Pagada",
};

// Main Payment entity — matches backend PaymentResponse
export interface Payment {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  paymentDate: string;
  createdAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
    paymentStatus: InvoicePaymentStatus;
    customer?: {
      id: string;
      name: string;
    } | null;
  };
}

// Lightweight payment type for lists (same as Payment since backend returns same shape)
export type PaymentSummary = Payment;

// Filters for payment list
export interface PaymentFilters {
  search?: string;
  invoiceId?: string;
  customerId?: string;
  method?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Paginated response for payments
export interface PaymentsResponse {
  data: PaymentSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Create payment data
export interface CreatePaymentData {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paymentDate?: string;
  reference?: string;
  notes?: string;
}

// Payment statistics
export interface PaymentStats {
  totalPayments: number;
  totalReceived: number;
  totalPending: number;
  totalRefunded: number;
  totalProcessing: number;
  averagePaymentValue: number;
  paymentsByStatus: Record<string, number>;
  paymentsByMethod: Record<PaymentMethod, number>;
  todayPayments: number;
  todayTotal: number;
  weekPayments: number;
  weekTotal: number;
}
