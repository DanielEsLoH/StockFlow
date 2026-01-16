import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportsService } from '~/services/reports.service';
import { queryKeys } from '~/lib/query-client';
import { toast } from '~/components/ui/Toast';
import type {
  RecentReport,
  SalesReportParams,
  InventoryReportParams,
  CustomersReportParams,
} from '~/types/report';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch recent reports list
 */
export function useRecentReports(limit: number = 10) {
  return useQuery<RecentReport[]>({
    queryKey: queryKeys.reports.recent(limit),
    queryFn: () => reportsService.getRecentReports(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Generate and download sales report
 */
export function useGenerateSalesReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SalesReportParams) =>
      reportsService.generateSalesReport(params),
    onSuccess: ({ blob, fileName }) => {
      // Trigger file download
      reportsService.downloadReport(blob, fileName);

      // Invalidate recent reports to refresh the list
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });

      toast.success('Reporte de ventas generado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al generar el reporte de ventas');
    },
  });
}

/**
 * Generate and download inventory report
 */
export function useGenerateInventoryReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: InventoryReportParams) =>
      reportsService.generateInventoryReport(params),
    onSuccess: ({ blob, fileName }) => {
      // Trigger file download
      reportsService.downloadReport(blob, fileName);

      // Invalidate recent reports to refresh the list
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });

      toast.success('Reporte de inventario generado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al generar el reporte de inventario');
    },
  });
}

/**
 * Generate and download customers report
 */
export function useGenerateCustomersReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CustomersReportParams) =>
      reportsService.generateCustomersReport(params),
    onSuccess: ({ blob, fileName }) => {
      // Trigger file download
      reportsService.downloadReport(blob, fileName);

      // Invalidate recent reports to refresh the list
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });

      toast.success('Reporte de clientes generado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al generar el reporte de clientes');
    },
  });
}

/**
 * Download invoice PDF
 */
export function useDownloadInvoicePdf() {
  return useMutation({
    mutationFn: (invoiceId: string) =>
      reportsService.downloadInvoicePdf(invoiceId),
    onSuccess: ({ blob, fileName }) => {
      // Trigger file download
      reportsService.downloadReport(blob, fileName);

      toast.success('Factura descargada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al descargar la factura');
    },
  });
}
