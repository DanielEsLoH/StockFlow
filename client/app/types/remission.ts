export type RemissionStatus = 'DRAFT' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface Remission {
  id: string;
  tenantId: string;
  customerId: string | null;
  userId: string | null;
  warehouseId: string | null;
  invoiceId: string | null;
  remissionNumber: string;
  status: RemissionStatus;
  issueDate: string;
  deliveryDate: string | null;
  deliveryAddress: string | null;
  transportInfo: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: RemissionItem[];
  customer?: { id: string; name: string; email: string | null } | null;
  user?: { id: string; name: string } | null;
  warehouse?: { id: string; name: string } | null;
  invoice?: { id: string; invoiceNumber: string } | null;
}

export interface RemissionItem {
  id: string;
  remissionId: string;
  productId: string | null;
  description: string;
  quantity: number;
  unit: string;
  notes: string | null;
  product?: { id: string; sku: string; name: string } | null;
}

export interface CreateRemissionData {
  customerId?: string;
  warehouseId?: string;
  invoiceId?: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  transportInfo?: string;
  notes?: string;
  items: CreateRemissionItemData[];
}

export interface CreateRemissionItemData {
  productId?: string;
  description: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

export const remissionStatusLabels: Record<RemissionStatus, string> = {
  DRAFT: 'Borrador',
  DISPATCHED: 'Despachada',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

export const remissionStatusVariants: Record<RemissionStatus, string> = {
  DRAFT: 'secondary',
  DISPATCHED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
};
