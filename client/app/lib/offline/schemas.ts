/**
 * TypeScript types for IndexedDB offline tables.
 * These mirror the server Prisma models but only include
 * fields needed for offline invoice creation.
 */

export interface OfflineProduct {
  id: string;
  tenantId: string;
  categoryId: string | null;
  sku: string;
  name: string;
  description: string | null;
  costPrice: number;
  salePrice: number;
  taxRate: number;
  taxCategory: string;
  stock: number;
  minStock: number;
  barcode: string | null;
  brand: string | null;
  unit: string;
  imageUrl: string | null;
  status: string;
  updatedAt: string;
}

export interface OfflineCustomer {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentType: string;
  documentNumber: string;
  dv: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  businessName: string | null;
  taxId: string | null;
  creditLimit: number | null;
  status: string;
  updatedAt: string;
}

export interface OfflineWarehouse {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  isMain: boolean;
  status: string;
}

export interface OfflineTenantConfig {
  tenantId: string;
  name: string;
  email: string;
  phone: string | null;
  defaultCurrency: string;
  lastInvoiceNumber: string | null;
  updatedAt: string;
}

export interface SyncMeta {
  key: string;
  lastSyncAt: number;
  recordCount: number;
}

/** Sync status for offline-created invoices */
export type OfflineInvoiceSyncStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "conflict"
  | "error";

export interface OfflineInvoice {
  localId: string;
  tenantId: string;
  customerId: string | null;
  customerName: string | null;
  invoiceNumber: string;
  source: "MANUAL" | "POS";
  items: OfflineInvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  warehouseId: string | null;
  notes: string | null;
  syncStatus: OfflineInvoiceSyncStatus;
  serverInvoiceId: string | null;
  conflictDetails: string | null;
  createdAt: string;
  syncedAt: string | null;
}

export interface OfflineInvoiceItem {
  productId: string | null;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxCategory: string;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface SyncQueueEntry {
  id?: number;
  type: "invoice" | "payment";
  payload: string;
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
  lastError: string | null;
  createdAt: string;
}
