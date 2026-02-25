export type SupportDocumentStatus = 'DRAFT' | 'GENERATED' | 'SENT' | 'ACCEPTED' | 'REJECTED';

export interface SupportDocument {
  id: string;
  tenantId: string;
  supplierId: string | null;
  userId: string | null;
  documentNumber: string;
  issueDate: string;
  supplierName: string;
  supplierDocument: string;
  supplierDocType: string;
  subtotal: number;
  tax: number;
  withholdings: number;
  total: number;
  status: SupportDocumentStatus;
  dianCude: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: SupportDocumentItem[];
  supplier?: { id: string; name: string } | null;
}

export interface SupportDocumentItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface CreateSupportDocumentData {
  supplierId?: string;
  supplierName: string;
  supplierDocument: string;
  supplierDocType?: string;
  issueDate?: string;
  notes?: string;
  items: { description: string; quantity: number; unitPrice: number; taxRate: number }[];
}

export const supportDocStatusLabels: Record<SupportDocumentStatus, string> = {
  DRAFT: 'Borrador',
  GENERATED: 'Generado',
  SENT: 'Enviado',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
};

export const supportDocStatusVariants: Record<SupportDocumentStatus, string> = {
  DRAFT: 'secondary',
  GENERATED: 'outline',
  SENT: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'destructive',
};
