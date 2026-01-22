// Report format options
export type ReportFormat = 'pdf' | 'excel';

// Report type enum
export type ReportType = 'sales' | 'inventory' | 'customers';

// Sales report parameters
export interface SalesReportParams {
  format: ReportFormat;
  fromDate: string;
  toDate: string;
  categoryId?: string;
}

// Inventory report parameters
export interface InventoryReportParams {
  format: ReportFormat;
  categoryId?: string;
}

// Customers report parameters
export interface CustomersReportParams {
  format: ReportFormat;
}

// Date range preset options
export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom';

// Date range preset labels in Spanish
export const DateRangePresetLabels: Record<DateRangePreset, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  last7days: 'Últimos 7 días',
  last30days: 'Últimos 30 días',
  thisMonth: 'Este mes',
  lastMonth: 'Mes anterior',
  thisYear: 'Este año',
  custom: 'Personalizado',
};

// Report format labels in Spanish
export const ReportFormatLabels: Record<ReportFormat, string> = {
  pdf: 'PDF',
  excel: 'Excel',
};

// Report type labels in Spanish
export const ReportTypeLabels: Record<ReportType, string> = {
  sales: 'Ventas',
  inventory: 'Inventario',
  customers: 'Clientes',
};

// Report generation status
export interface ReportGenerationStatus {
  isGenerating: boolean;
  progress?: number;
  error?: string;
}

// Recent report entry for history
export interface RecentReport {
  id: string;
  type: ReportType;
  format: ReportFormat;
  generatedAt: string;
  params: SalesReportParams | InventoryReportParams | CustomersReportParams;
  fileSize?: number;
  fileName: string;
  downloadUrl?: string;
}
