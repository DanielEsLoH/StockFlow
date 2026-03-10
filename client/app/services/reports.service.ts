import { api } from "~/lib/api";
import type {
  SalesReportParams,
  InventoryReportParams,
  CustomersReportParams,
  RecentReport,
  ReportFormat,
} from "~/types/report";

function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

function getFileExtension(format: ReportFormat): string {
  return format === "pdf" ? "pdf" : "xlsx";
}

export const reportsService = {
  async generateSalesReport(
    params: SalesReportParams,
  ): Promise<{ blob: Blob; fileName: string }> {
    const searchParams = new URLSearchParams();
    searchParams.append("format", params.format);
    searchParams.append("fromDate", params.fromDate);
    searchParams.append("toDate", params.toDate);
    if (params.categoryId) searchParams.append("categoryId", params.categoryId);

    const { data } = await api.get<Blob>(
      `/reports/sales?${searchParams.toString()}`,
      { responseType: "blob" },
    );
    const fileName = `reporte-ventas-${formatDateForFilename()}.${getFileExtension(params.format)}`;
    return { blob: data, fileName };
  },

  async generateInventoryReport(
    params: InventoryReportParams,
  ): Promise<{ blob: Blob; fileName: string }> {
    const searchParams = new URLSearchParams();
    searchParams.append("format", params.format);
    if (params.categoryId) searchParams.append("categoryId", params.categoryId);

    const { data } = await api.get<Blob>(
      `/reports/inventory?${searchParams.toString()}`,
      { responseType: "blob" },
    );
    const fileName = `reporte-inventario-${formatDateForFilename()}.${getFileExtension(params.format)}`;
    return { blob: data, fileName };
  },

  async generateCustomersReport(
    params: CustomersReportParams,
  ): Promise<{ blob: Blob; fileName: string }> {
    const searchParams = new URLSearchParams();
    searchParams.append("format", params.format);

    const { data } = await api.get<Blob>(
      `/reports/customers?${searchParams.toString()}`,
      { responseType: "blob" },
    );
    const fileName = `reporte-clientes-${formatDateForFilename()}.${getFileExtension(params.format)}`;
    return { blob: data, fileName };
  },

  async downloadInvoicePdf(
    invoiceId: string,
  ): Promise<{ blob: Blob; fileName: string }> {
    const { data } = await api.get<Blob>(`/invoices/${invoiceId}/pdf`, {
      responseType: "blob",
    });
    const fileName = `factura-${invoiceId}.pdf`;
    return { blob: data, fileName };
  },

  downloadReport(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async getRecentReports(): Promise<RecentReport[]> {
    // No backend endpoint yet — return empty array
    return [];
  },
};
