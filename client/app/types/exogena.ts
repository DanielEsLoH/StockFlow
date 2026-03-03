export interface ExogenaThirdPartyRow {
  conceptCode: string;
  documentType: string;
  documentNumber: string;
  dv: string;
  businessName: string;
  address: string;
  city: string;
  amount: number;
  taxAmount: number;
}

export interface ExogenaFormatoData {
  formatNumber: string;
  name: string;
  rows: ExogenaThirdPartyRow[];
  totalAmount: number;
  totalTaxAmount: number;
}

export interface ExogenaReport {
  year: number;
  tenantNit: string;
  tenantName: string;
  generatedAt: string;
  formatos: ExogenaFormatoData[];
}
