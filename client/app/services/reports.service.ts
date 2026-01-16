import type {
  SalesReportParams,
  InventoryReportParams,
  CustomersReportParams,
  RecentReport,
  ReportFormat,
} from '~/types/report';

// Helper to generate random delay between min and max milliseconds
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// Helper to format date for filename (YYYY-MM-DD)
function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

// Helper to get file extension based on format
function getFileExtension(format: ReportFormat): string {
  return format === 'pdf' ? 'pdf' : 'xlsx';
}

// Helper to get MIME type based on format
function getMimeType(format: ReportFormat): string {
  return format === 'pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

// Helper to create a mock Blob with simulated file data
function createMockBlob(format: ReportFormat, content: string): Blob {
  const mimeType = getMimeType(format);
  // In a real scenario, this would be actual file data
  // For mock purposes, we create a blob with some placeholder content
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  return new Blob([data], { type: mimeType });
}

// Mock recent reports data
const mockRecentReports: RecentReport[] = [
  {
    id: '1',
    type: 'sales',
    format: 'pdf',
    generatedAt: '2024-01-14T15:30:00Z',
    params: {
      format: 'pdf',
      fromDate: '2024-01-01',
      toDate: '2024-01-14',
    },
    fileSize: 245760,
    fileName: 'reporte-ventas-2024-01-14.pdf',
  },
  {
    id: '2',
    type: 'inventory',
    format: 'excel',
    generatedAt: '2024-01-13T10:15:00Z',
    params: {
      format: 'excel',
    },
    fileSize: 512000,
    fileName: 'reporte-inventario-2024-01-13.xlsx',
  },
  {
    id: '3',
    type: 'customers',
    format: 'pdf',
    generatedAt: '2024-01-12T09:00:00Z',
    params: {
      format: 'pdf',
    },
    fileSize: 184320,
    fileName: 'reporte-clientes-2024-01-12.pdf',
  },
  {
    id: '4',
    type: 'sales',
    format: 'excel',
    generatedAt: '2024-01-10T14:45:00Z',
    params: {
      format: 'excel',
      fromDate: '2023-12-01',
      toDate: '2023-12-31',
      categoryId: 'cat-1',
    },
    fileSize: 768000,
    fileName: 'reporte-ventas-2024-01-10.xlsx',
  },
  {
    id: '5',
    type: 'inventory',
    format: 'pdf',
    generatedAt: '2024-01-08T11:20:00Z',
    params: {
      format: 'pdf',
      categoryId: 'cat-2',
    },
    fileSize: 156672,
    fileName: 'reporte-inventario-2024-01-08.pdf',
  },
];

// Service
export const reportsService = {
  // Generate sales report
  async generateSalesReport(
    params: SalesReportParams
  ): Promise<{ blob: Blob; fileName: string }> {
    // In production, uncomment this:
    // const { data } = await api.post<Blob>('/reports/sales', params, {
    //   responseType: 'blob',
    // });
    // const fileName = `reporte-ventas-${formatDateForFilename()}.${getFileExtension(params.format)}`;
    // return { blob: data, fileName };

    // Mock data for development
    await randomDelay(1000, 2000);

    const content = `
      REPORTE DE VENTAS
      =================
      Periodo: ${params.fromDate} - ${params.toDate}
      ${params.categoryId ? `Categoria: ${params.categoryId}` : 'Todas las categorias'}
      Generado: ${new Date().toISOString()}

      Este es un archivo de prueba generado para desarrollo.
      En produccion, este seria un archivo ${params.format.toUpperCase()} real con datos de ventas.
    `;

    const blob = createMockBlob(params.format, content);
    const fileName = `reporte-ventas-${formatDateForFilename()}.${getFileExtension(params.format)}`;

    return { blob, fileName };
  },

  // Generate inventory report
  async generateInventoryReport(
    params: InventoryReportParams
  ): Promise<{ blob: Blob; fileName: string }> {
    // In production, uncomment this:
    // const { data } = await api.post<Blob>('/reports/inventory', params, {
    //   responseType: 'blob',
    // });
    // const fileName = `reporte-inventario-${formatDateForFilename()}.${getFileExtension(params.format)}`;
    // return { blob: data, fileName };

    // Mock data for development
    await randomDelay(1000, 2000);

    const content = `
      REPORTE DE INVENTARIO
      =====================
      ${params.categoryId ? `Categoria: ${params.categoryId}` : 'Todas las categorias'}
      Generado: ${new Date().toISOString()}

      Este es un archivo de prueba generado para desarrollo.
      En produccion, este seria un archivo ${params.format.toUpperCase()} real con datos de inventario.
    `;

    const blob = createMockBlob(params.format, content);
    const fileName = `reporte-inventario-${formatDateForFilename()}.${getFileExtension(params.format)}`;

    return { blob, fileName };
  },

  // Generate customers report
  async generateCustomersReport(
    params: CustomersReportParams
  ): Promise<{ blob: Blob; fileName: string }> {
    // In production, uncomment this:
    // const { data } = await api.post<Blob>('/reports/customers', params, {
    //   responseType: 'blob',
    // });
    // const fileName = `reporte-clientes-${formatDateForFilename()}.${getFileExtension(params.format)}`;
    // return { blob: data, fileName };

    // Mock data for development
    await randomDelay(1000, 2000);

    const content = `
      REPORTE DE CLIENTES
      ===================
      Generado: ${new Date().toISOString()}

      Este es un archivo de prueba generado para desarrollo.
      En produccion, este seria un archivo ${params.format.toUpperCase()} real con datos de clientes.
    `;

    const blob = createMockBlob(params.format, content);
    const fileName = `reporte-clientes-${formatDateForFilename()}.${getFileExtension(params.format)}`;

    return { blob, fileName };
  },

  // Download invoice as PDF
  async downloadInvoicePdf(
    invoiceId: string
  ): Promise<{ blob: Blob; fileName: string }> {
    // In production, uncomment this:
    // const { data } = await api.get<Blob>(`/invoices/${invoiceId}/pdf`, {
    //   responseType: 'blob',
    // });
    // const fileName = `factura-${invoiceId}.pdf`;
    // return { blob: data, fileName };

    // Mock data for development
    await randomDelay(500, 1000);

    const content = `
      FACTURA
      =======
      Numero de Factura: ${invoiceId}
      Fecha de Generacion: ${new Date().toISOString()}

      Este es un archivo de prueba generado para desarrollo.
      En produccion, este seria un archivo PDF real con los datos de la factura.
    `;

    const blob = createMockBlob('pdf', content);
    const fileName = `factura-${invoiceId}.pdf`;

    return { blob, fileName };
  },

  // Helper to trigger file download in the browser
  downloadReport(blob: Blob, fileName: string): void {
    // Create object URL for the blob
    const url = window.URL.createObjectURL(blob);

    // Create anchor element
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke object URL to free memory
    window.URL.revokeObjectURL(url);
  },

  // Get list of recent reports
  async getRecentReports(): Promise<RecentReport[]> {
    // In production, uncomment this:
    // const { data } = await api.get<RecentReport[]>('/reports/recent');
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 400));
    return mockRecentReports;
  },
};
