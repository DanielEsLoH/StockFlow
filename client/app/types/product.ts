// Product Types

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  price: number;
  cost: number;
  quantity: number;
  minStock: number;
  maxStock?: number;
  categoryId: string;
  category?: Category;
  warehouseId: string;
  warehouse?: Warehouse;
  images?: string[];
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

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

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  warehouseId?: string;
  status?: ProductStatus;
  lowStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateProductData {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  price: number;
  cost: number;
  quantity: number;
  minStock: number;
  maxStock?: number;
  categoryId: string;
  warehouseId: string;
  images?: string[];
  status?: ProductStatus;
}

export type UpdateProductData = Partial<CreateProductData>

export interface ProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
  warehouse: string;
  warehouseId: string;
}