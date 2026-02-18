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

// Payment Status (on the Invoice, not the Payment entity)
export type InvoicePaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export const InvoicePaymentStatusLabels: Record<InvoicePaymentStatus, string> = {
  UNPAID: "Sin pagar",
  PARTIALLY_PAID: "Parcial",
  PAID: "Pagada",
};

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

// Tenant/Issuer data included in invoice responses
export interface InvoiceTenant {
  name: string;
  email: string;
  phone?: string | null;
  businessName?: string | null;
  nit?: string | null;
  dv?: string | null;
  address?: string | null;
  city?: string | null;
  resolutionNumber?: string | null;
  resolutionPrefix?: string | null;
  resolutionRangeFrom?: number | null;
  resolutionRangeTo?: number | null;
  resolutionDate?: string | null;
}

// Main Invoice entity
export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Customer;
  userId?: string;
  user?: { id: string; name: string; email: string } | null;
  warehouseId?: string | null;
  warehouse?: { id: string; name: string; code: string } | null;
  tenant?: InvoiceTenant;
  status: InvoiceStatus;
  paymentStatus?: InvoicePaymentStatus;
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
  userId?: string;
  user?: { id: string; name: string; email: string } | null;
  warehouseId?: string | null;
  warehouse?: { id: string; name: string; code: string } | null;
  status: InvoiceStatus;
  paymentStatus?: InvoicePaymentStatus;
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
  taxCategory?: import('./product').TaxCategory;
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
  warehouseId?: string;
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

// Pending collection invoice (for collections dashboard)
export interface PendingCollectionInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: { id: string; name: string } | null;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  total: number;
  totalPaid: number;
  remainingBalance: number;
  dueDate: string | null;
  issueDate: string;
  daysOverdue: number;
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
