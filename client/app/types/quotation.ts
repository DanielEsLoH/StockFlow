import type { Customer } from "./customer";

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export const QuotationStatusLabels: Record<QuotationStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
  CONVERTED: "Convertida",
};

export const QuotationStatusVariants: Record<
  QuotationStatus,
  "default" | "primary" | "secondary" | "success" | "warning" | "error"
> = {
  DRAFT: "secondary",
  SENT: "primary",
  ACCEPTED: "success",
  REJECTED: "error",
  EXPIRED: "warning",
  CONVERTED: "primary",
};

export interface QuotationItem {
  id: string;
  quotationId: string;
  productId: string | null;
  product?: { id: string; sku: string; name: string } | null;
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

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string | null;
  customer?: Customer | null;
  userId?: string | null;
  user?: { id: string; name: string; email: string } | null;
  status: QuotationStatus;
  issueDate: string;
  validUntil: string | null;
  items: QuotationItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string | null;
  convertedToInvoiceId?: string | null;
  convertedToInvoice?: { id: string; invoiceNumber: string } | null;
  convertedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationSummary {
  id: string;
  quotationNumber: string;
  customerId: string | null;
  customer?: { id: string; name: string } | null;
  userId?: string | null;
  user?: { id: string; name: string; email: string } | null;
  status: QuotationStatus;
  issueDate: string;
  validUntil: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  convertedToInvoiceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationFilters {
  search?: string;
  status?: QuotationStatus;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface QuotationsResponse {
  data: QuotationSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateQuotationItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  taxCategory?: string;
}

export interface CreateQuotationData {
  customerId?: string;
  validUntil?: string;
  items: CreateQuotationItemData[];
  notes?: string;
}

export interface UpdateQuotationData {
  customerId?: string;
  validUntil?: string;
  notes?: string;
}

export interface QuotationStats {
  totalQuotations: number;
  totalValue: number;
  quotationsByStatus: Record<string, number>;
}
