export type SupplierStatus = "ACTIVE" | "INACTIVE";
export type PaymentTerms = "IMMEDIATE" | "NET_15" | "NET_30" | "NET_60";

export const PaymentTermsLabels: Record<PaymentTerms, string> = {
  IMMEDIATE: "Inmediato",
  NET_15: "15 días",
  NET_30: "30 días",
  NET_60: "60 días",
};

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentType: string;
  documentNumber: string;
  address: string | null;
  city: string | null;
  state: string | null;
  businessName: string | null;
  taxId: string | null;
  notes: string | null;
  status: SupplierStatus;
  paymentTerms: PaymentTerms;
  contactName: string | null;
  contactPhone: string | null;
  totalOrders: number;
  totalPurchased: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierFilters {
  search?: string;
  status?: SupplierStatus;
  city?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateSupplierData {
  name: string;
  email?: string;
  phone?: string;
  documentType?: string;
  documentNumber: string;
  address?: string;
  city?: string;
  state?: string;
  businessName?: string;
  taxId?: string;
  notes?: string;
  paymentTerms?: PaymentTerms;
  contactName?: string;
  contactPhone?: string;
}

export type UpdateSupplierData = Partial<CreateSupplierData>;

export interface SuppliersResponse {
  data: Supplier[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SupplierStats {
  total: number;
  active: number;
  inactive: number;
}
