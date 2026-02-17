// Product Types

export type TaxCategory = 'GRAVADO_19' | 'GRAVADO_5' | 'EXENTO' | 'EXCLUIDO';

export const TAX_CATEGORY_OPTIONS = [
  { value: 'GRAVADO_19' as TaxCategory, label: 'Gravado 19%', rate: 19 },
  { value: 'GRAVADO_5' as TaxCategory, label: 'Gravado 5%', rate: 5 },
  { value: 'EXENTO' as TaxCategory, label: 'Exento (0%)', rate: 0 },
  { value: 'EXCLUIDO' as TaxCategory, label: 'Excluido (0%)', rate: 0 },
] as const;

export function taxRateFromCategory(category: TaxCategory): number {
  switch (category) {
    case 'GRAVADO_19': return 19;
    case 'GRAVADO_5': return 5;
    case 'EXENTO':
    case 'EXCLUIDO': return 0;
  }
}

export interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  sku: string;
  barcode?: string | null;
  salePrice: number;
  costPrice: number;
  taxRate: number;
  taxCategory: TaxCategory;
  stock: number;
  minStock: number;
  maxStock?: number | null;
  categoryId: string | null;
  category?: Category;
  brand?: string | null;
  unit: string;
  imageUrl?: string | null;
  status: ProductStatus;
  warehouseStocks?: WarehouseStock[];
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "DISCONTINUED"
  | "OUT_OF_STOCK";

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
  sortOrder?: "asc" | "desc";
}

export interface CreateProductData {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  salePrice: number;
  costPrice: number;
  taxCategory?: TaxCategory;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  categoryId?: string;
  brand?: string;
  unit?: string;
  imageUrl?: string;
  status?: ProductStatus;
}

export type UpdateProductData = Partial<CreateProductData>;

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
