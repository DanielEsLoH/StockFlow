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

// Payment Status
export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

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

// Payment status display labels in Spanish
export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  COMPLETED: "Completado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
};

// Main Payment entity
export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoice?: Invoice;
  customerId: string;
  customer?: Customer;
  customerName?: string;
  invoiceNumber?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  processedAt?: string;
  reference?: string;
  referenceNumber?: string;
  notes?: string;
  refundedAt?: string;
  refundAmount?: number;
  originalPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

// Lightweight payment type for lists
export interface PaymentSummary {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoice?: Invoice;
  customerId: string;
  customer?: Customer;
  customerName?: string;
  invoiceNumber?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  processedAt?: string;
  reference?: string;
  referenceNumber?: string;
  createdAt: string;
  updatedAt: string;
}

// Filters for payment list
export interface PaymentFilters {
  search?: string;
  invoiceId?: string;
  customerId?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
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
  customerId: string;
  customerName?: string;
  invoiceNumber?: string;
  amount: number;
  method: PaymentMethod;
  status?: PaymentStatus;
  paymentDate?: string;
  reference?: string;
  referenceNumber?: string;
  notes?: string;
}

// Update payment data
export interface UpdatePaymentData {
  invoiceId?: string;
  customerId?: string;
  amount?: number;
  method?: PaymentMethod;
  status?: PaymentStatus;
  paymentDate?: string;
  processedAt?: string;
  reference?: string;
  referenceNumber?: string;
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
  paymentsByStatus: Record<PaymentStatus, number>;
  paymentsByMethod: Record<PaymentMethod, number>;
  todayPayments: number;
  todayTotal: number;
  weekPayments: number;
  weekTotal: number;
}
