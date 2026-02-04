// Customer Types

export type CustomerType = 'INDIVIDUAL' | 'BUSINESS';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  documentType?: 'CC' | 'NIT' | 'CE' | 'PASSPORT';
  type: CustomerType;
  address?: string;
  city?: string;
  notes?: string;
  status?: CustomerStatus;  // Backend format
  isActive?: boolean;       // Legacy format
  totalPurchases?: number;
  totalSpent?: number;
  lastPurchaseDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFilters {
  search?: string;
  type?: CustomerType;
  city?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCustomerData {
  name: string;
  email: string;
  phone?: string;
  document?: string;
  documentType?: 'CC' | 'NIT' | 'CE' | 'PASSPORT';
  type: CustomerType;
  address?: string;
  city?: string;
  notes?: string;
  isActive?: boolean;
}

export type UpdateCustomerData = Partial<CreateCustomerData>

export interface CustomersResponse {
  data: Customer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CustomerStats {
  totalInvoices: number;
  totalSpent: number;
  averageOrderValue: number;
  lastPurchaseDate: string | null;
}