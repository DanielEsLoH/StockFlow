export interface WithholdingCertificate {
  id: string;
  tenantId: string;
  supplierId: string;
  year: number;
  certificateNumber: string;
  totalBase: number;
  totalWithheld: number;
  withholdingType: string;
  generatedAt: string;
  pdfUrl: string | null;
  createdAt: string;
  supplier?: { id: string; name: string; documentNumber: string } | null;
}

export interface GenerateCertificateData {
  supplierId: string;
  year: number;
  withholdingType: string;
}

export interface CertificateStats {
  totalCertificates: number;
  totalBase: number;
  totalWithheld: number;
}
