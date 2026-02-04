// DIAN Electronic Invoicing Types

export enum TaxResponsibility {
  O_13 = 'O_13', // Gran contribuyente
  O_15 = 'O_15', // Autorretenedor
  O_23 = 'O_23', // Agente de retencion IVA
  O_47 = 'O_47', // Regimen simple
  R_99_PN = 'R_99_PN', // No responsable
}

export enum DianDocumentStatus {
  PENDING = 'PENDING',
  GENERATED = 'GENERATED',
  SIGNED = 'SIGNED',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum DianDocumentType {
  FACTURA_ELECTRONICA = 'FACTURA_ELECTRONICA',
  NOTA_CREDITO = 'NOTA_CREDITO',
  NOTA_DEBITO = 'NOTA_DEBITO',
}

export interface DianConfig {
  id: string;
  tenantId: string;
  nit: string;
  dv: string;
  businessName: string;
  tradeName?: string;
  taxResponsibilities: TaxResponsibility[];
  economicActivity: string;
  address: string;
  city: string;
  cityCode: string;
  department: string;
  departmentCode: string;
  postalCode?: string;
  countryCode: string;
  country: string;
  phone?: string;
  email: string;
  testMode: boolean;
  softwareId?: string;
  resolutionNumber?: string;
  resolutionDate?: string;
  resolutionPrefix?: string;
  resolutionRangeFrom?: number;
  resolutionRangeTo?: number;
  currentNumber?: number;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  hasSoftwareConfig: boolean;
  hasResolution: boolean;
  hasCertificate: boolean;
}

export interface CreateDianConfigDto {
  nit: string;
  dv: string;
  businessName: string;
  tradeName?: string;
  taxResponsibilities: TaxResponsibility[];
  economicActivity: string;
  address: string;
  city: string;
  cityCode: string;
  department: string;
  departmentCode: string;
  postalCode?: string;
  phone?: string;
  email: string;
  testMode?: boolean;
}

export interface UpdateDianConfigDto extends Partial<CreateDianConfigDto> {}

export interface SetDianSoftwareDto {
  softwareId: string;
  softwarePin: string;
  technicalKey: string;
}

export interface SetDianResolutionDto {
  resolutionNumber: string;
  resolutionDate: string;
  resolutionPrefix: string;
  resolutionRangeFrom: number;
  resolutionRangeTo: number;
}

export interface DianDocument {
  id: string;
  tenantId: string;
  invoiceId?: string;
  creditNoteId?: string;
  documentType: DianDocumentType;
  documentNumber: string;
  cufe: string;
  qrCode?: string;
  status: DianDocumentStatus;
  xmlContent?: string;
  signedXml?: string;
  pdfContent?: string;
  dianTrackId?: string;
  dianResponse?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
  sentAt?: string;
  acceptedAt?: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: string;
    customer?: {
      id: string;
      name: string;
      documentNumber: string;
    };
  };
}

export interface DianDocumentWithDetails extends DianDocument {
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: string;
    subtotal: string;
    tax: string;
    issueDate: string;
    customer?: {
      id: string;
      name: string;
      documentNumber: string;
      documentType: string;
      email?: string;
      phone?: string;
    };
    items: Array<{
      id: string;
      productId?: string;
      quantity: number;
      unitPrice: string;
      subtotal: string;
      tax: string;
      total: string;
    }>;
  };
}

export interface DianStats {
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  remainingNumbers: number;
  acceptanceRate: string | number;
}

export interface SendInvoiceDto {
  invoiceId: string;
  force?: boolean;
}

export interface SendInvoiceResult {
  success: boolean;
  documentId: string;
  cufe?: string;
  trackId?: string;
  status: DianDocumentStatus;
  message: string;
  errors?: string[];
}

export interface CheckDocumentStatusDto {
  documentId: string;
}

export interface CheckDocumentStatusResult {
  documentId: string;
  success: boolean;
  isValid?: boolean;
  statusCode?: string;
  statusDescription?: string;
  errors?: string[];
}

export interface PaginatedDianDocuments {
  data: DianDocument[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Colombia geographic data for forms
export interface ColombiaDepartment {
  code: string;
  name: string;
  cities: ColombiaCity[];
}

export interface ColombiaCity {
  code: string;
  name: string;
}

// Status display helpers
export const dianStatusLabels: Record<DianDocumentStatus, string> = {
  [DianDocumentStatus.PENDING]: 'Pendiente',
  [DianDocumentStatus.GENERATED]: 'Generado',
  [DianDocumentStatus.SIGNED]: 'Firmado',
  [DianDocumentStatus.SENT]: 'Enviado',
  [DianDocumentStatus.ACCEPTED]: 'Aceptado',
  [DianDocumentStatus.REJECTED]: 'Rechazado',
};

export const dianStatusColors: Record<DianDocumentStatus, 'default' | 'secondary' | 'success' | 'error' | 'warning'> = {
  [DianDocumentStatus.PENDING]: 'default',
  [DianDocumentStatus.GENERATED]: 'secondary',
  [DianDocumentStatus.SIGNED]: 'secondary',
  [DianDocumentStatus.SENT]: 'warning',
  [DianDocumentStatus.ACCEPTED]: 'success',
  [DianDocumentStatus.REJECTED]: 'error',
};

export const dianDocumentTypeLabels: Record<DianDocumentType, string> = {
  [DianDocumentType.FACTURA_ELECTRONICA]: 'Factura Electronica',
  [DianDocumentType.NOTA_CREDITO]: 'Nota Credito',
  [DianDocumentType.NOTA_DEBITO]: 'Nota Debito',
};

export const taxResponsibilityLabels: Record<TaxResponsibility, string> = {
  [TaxResponsibility.O_13]: 'O-13 Gran Contribuyente',
  [TaxResponsibility.O_15]: 'O-15 Autorretenedor',
  [TaxResponsibility.O_23]: 'O-23 Agente de Retencion IVA',
  [TaxResponsibility.O_47]: 'O-47 Regimen Simple de Tributacion',
  [TaxResponsibility.R_99_PN]: 'R-99-PN No Responsable de IVA',
};
