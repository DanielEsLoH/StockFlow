// Invoice Types

import type { Customer } from "./customer";
import type { Product } from "./product";

// Invoice Status
export type InvoiceStatus =
  | "DRAFT"
  | "PENDING"
  | "SENT"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "VOID";

// Invoice Source
export type InvoiceSource = "MANUAL" | "POS";

// Status display labels in Spanish
export const InvoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "Pendiente",
  SENT: "Enviada",
  PAID: "Pagada",
  OVERDUE: "Vencida",
  CANCELLED: "Cancelada",
  VOID: "Anulada",
};

// Invoice Item (line item)
export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  product?: Product;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  tax: number;
  subtotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

// Main Invoice entity
export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Customer;
  status: InvoiceStatus;
  source: InvoiceSource;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  // DIAN fields
  dianCufe?: string;
  dianXml?: string;
  dianPdf?: string;
  dianSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Lightweight invoice type for lists (without full items)
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Customer;
  status: InvoiceStatus;
  source: InvoiceSource;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  itemCount: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  // DIAN fields
  dianCufe?: string;
  createdAt: string;
  updatedAt: string;
}

// Filters for invoice list
export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus;
  source?: InvoiceSource;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Paginated response for invoices
export interface InvoicesResponse {
  data: InvoiceSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Create invoice item data
export interface CreateInvoiceItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}

// Update invoice item data
export interface UpdateInvoiceItemData extends Partial<CreateInvoiceItemData> {
  id?: string;
}

// Create invoice data
export interface CreateInvoiceData {
  customerId: string;
  dueDate?: string;
  items: CreateInvoiceItemData[];
  notes?: string;
  source?: InvoiceSource;
}

// Update invoice data
export interface UpdateInvoiceData {
  customerId?: string;
  status?: InvoiceStatus;
  issueDate?: string;
  dueDate?: string;
  paidAt?: string;
  items?: UpdateInvoiceItemData[];
  notes?: string;
}

// Invoice statistics
export interface InvoiceStats {
  totalInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  averageInvoiceValue: number;
  invoicesByStatus: Record<InvoiceStatus, number>;
}

// Invoice payment
export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
