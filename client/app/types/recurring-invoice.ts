export type RecurringInterval =
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUAL";

export interface RecurringInvoiceItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount?: number;
  taxCategory?: string;
}

export interface RecurringInvoice {
  id: string;
  tenantId: string;
  customerId: string;
  warehouseId: string | null;
  notes: string | null;
  items: RecurringInvoiceItem[];
  interval: RecurringInterval;
  nextIssueDate: string;
  endDate: string | null;
  lastIssuedAt: string | null;
  autoSend: boolean;
  autoEmail: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
  _count?: {
    invoices: number;
  };
}

export interface RecurringInvoicesResponse {
  data: RecurringInvoice[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateRecurringInvoiceData {
  customerId: string;
  warehouseId?: string;
  notes?: string;
  items: RecurringInvoiceItem[];
  interval: RecurringInterval;
  nextIssueDate: string;
  endDate?: string;
  autoSend?: boolean;
  autoEmail?: boolean;
}

export const INTERVAL_LABELS: Record<RecurringInterval, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  ANNUAL: "Anual",
};
