// Warehouse Types

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  manager?: string;
  capacity?: number;
  currentOccupancy?: number;
  isActive: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseFilters {
  search?: string;
  city?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateWarehouseData {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  manager?: string;
  capacity?: number;
  isActive?: boolean;
}

export type UpdateWarehouseData = Partial<CreateWarehouseData>

export interface WarehousesResponse {
  data: Warehouse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface WarehouseStats {
  totalProducts: number;
  lowStockProducts: number;
  totalValue: number;
  utilizationPercentage: number;
}