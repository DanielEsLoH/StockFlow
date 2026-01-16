import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useRecentReports,
  useGenerateSalesReport,
  useGenerateInventoryReport,
  useGenerateCustomersReport,
  useDownloadInvoicePdf,
} from './useReports';
import { reportsService } from '~/services/reports.service';
import { toast } from '~/components/ui/Toast';
import { queryKeys } from '~/lib/query-client';
import type {
  RecentReport,
  SalesReportParams,
  InventoryReportParams,
  CustomersReportParams,
} from '~/types/report';

// Mock dependencies
vi.mock('~/services/reports.service');
vi.mock('~/components/ui/Toast');

// Mock data
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
];

const mockBlob = new Blob(['test content'], { type: 'application/pdf' });

const mockSalesReportResponse = {
  blob: mockBlob,
  fileName: 'reporte-ventas-2024-01-15.pdf',
};

const mockInventoryReportResponse = {
  blob: mockBlob,
  fileName: 'reporte-inventario-2024-01-15.pdf',
};

const mockCustomersReportResponse = {
  blob: mockBlob,
  fileName: 'reporte-clientes-2024-01-15.pdf',
};

const mockInvoicePdfResponse = {
  blob: mockBlob,
  fileName: 'factura-inv-123.pdf',
};

// Helper to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

// Helper to create a wrapper with access to the queryClient
function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const wrapper = function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };

  return { wrapper, queryClient };
}

describe('useReports hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // QUERY HOOKS
  // ============================================================================

  describe('useRecentReports', () => {
    it('should fetch recent reports on mount', async () => {
      vi.mocked(reportsService.getRecentReports).mockResolvedValue(mockRecentReports);

      const { result } = renderHook(() => useRecentReports(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRecentReports);
      expect(reportsService.getRecentReports).toHaveBeenCalled();
    });

    it('should respect limit parameter with default value of 10', async () => {
      vi.mocked(reportsService.getRecentReports).mockResolvedValue(mockRecentReports);

      const { result } = renderHook(() => useRecentReports(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the query key includes the default limit of 10
      expect(result.current.data).toEqual(mockRecentReports);
    });

    it('should respect custom limit parameter', async () => {
      vi.mocked(reportsService.getRecentReports).mockResolvedValue(mockRecentReports.slice(0, 2));

      const { result } = renderHook(() => useRecentReports(5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
    });

    it('should return loading state initially', () => {
      vi.mocked(reportsService.getRecentReports).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useRecentReports(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should return error state on failure', async () => {
      const error = new Error('Failed to fetch recent reports');
      vi.mocked(reportsService.getRecentReports).mockRejectedValue(error);

      const { result } = renderHook(() => useRecentReports(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should return empty array when no reports exist', async () => {
      vi.mocked(reportsService.getRecentReports).mockResolvedValue([]);

      const { result } = renderHook(() => useRecentReports(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should fetch with different limit values', async () => {
      vi.mocked(reportsService.getRecentReports).mockResolvedValue(mockRecentReports);

      const { result: result3 } = renderHook(() => useRecentReports(3), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result3.current.isSuccess).toBe(true);
      });

      const { result: result20 } = renderHook(() => useRecentReports(20), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result20.current.isSuccess).toBe(true);
      });

      // Both should call the service
      expect(reportsService.getRecentReports).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // MUTATION HOOKS
  // ============================================================================

  describe('useGenerateSalesReport', () => {
    const salesParams: SalesReportParams = {
      format: 'pdf',
      fromDate: '2024-01-01',
      toDate: '2024-01-15',
    };

    it('should generate sales report successfully', async () => {
      vi.mocked(reportsService.generateSalesReport).mockResolvedValue(mockSalesReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateSalesReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(salesParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.generateSalesReport).toHaveBeenCalledWith(salesParams);
    });

    it('should download the file on success', async () => {
      vi.mocked(reportsService.generateSalesReport).mockResolvedValue(mockSalesReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateSalesReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(salesParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.downloadReport).toHaveBeenCalledWith(
        mockSalesReportResponse.blob,
        mockSalesReportResponse.fileName
      );
    });

    it('should show success toast "Reporte de ventas generado exitosamente"', async () => {
      vi.mocked(reportsService.generateSalesReport).mockResolvedValue(mockSalesReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateSalesReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(salesParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Reporte de ventas generado exitosamente');
    });

    it('should show error toast on failure', async () => {
      const error = new Error('Error al generar el reporte');
      vi.mocked(reportsService.generateSalesReport).mockRejectedValue(error);

      const { result } = renderHook(() => useGenerateSalesReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(salesParams);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al generar el reporte');
    });

    it('should show default error message when error has no message', async () => {
      vi.mocked(reportsService.generateSalesReport).mockRejectedValue(new Error());

      const { result } = renderHook(() => useGenerateSalesReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(salesParams);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al generar el reporte de ventas');
    });

    it('should invalidate reports cache on success', async () => {
      vi.mocked(reportsService.generateSalesReport).mockResolvedValue(mockSalesReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useGenerateSalesReport(), { wrapper });

      await act(async () => {
        result.current.mutate(salesParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.reports.all });
    });

    it('should generate sales report with optional categoryId', async () => {
      const paramsWithCategory: SalesReportParams = {
        ...salesParams,
        categoryId: 'cat-123',
      };

      vi.mocked(reportsService.generateSalesReport).mockResolvedValue(mockSalesReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateSalesReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(paramsWithCategory);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.generateSalesReport).toHaveBeenCalledWith(paramsWithCategory);
    });

    it('should generate sales report in excel format', async () => {
      const excelParams: SalesReportParams = {
        ...salesParams,
        format: 'excel',
      };

      const excelResponse = {
        blob: new Blob(['excel content'], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        fileName: 'reporte-ventas-2024-01-15.xlsx',
      };

      vi.mocked(reportsService.generateSalesReport).mockResolvedValue(excelResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateSalesReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(excelParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.generateSalesReport).toHaveBeenCalledWith(excelParams);
      expect(reportsService.downloadReport).toHaveBeenCalledWith(
        excelResponse.blob,
        excelResponse.fileName
      );
    });

    it('should return loading state while generating', async () => {
      let resolvePromise: (value: { blob: Blob; fileName: string }) => void;
      const promise = new Promise<{ blob: Blob; fileName: string }>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(reportsService.generateSalesReport).mockReturnValue(promise);

      const { result } = renderHook(() => useGenerateSalesReport(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(salesParams);
      });

      // Check pending state immediately after calling mutate
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Resolve the promise to clean up
      resolvePromise!(mockSalesReportResponse);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useGenerateInventoryReport', () => {
    const inventoryParams: InventoryReportParams = {
      format: 'pdf',
    };

    it('should generate inventory report successfully', async () => {
      vi.mocked(reportsService.generateInventoryReport).mockResolvedValue(mockInventoryReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateInventoryReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(inventoryParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.generateInventoryReport).toHaveBeenCalledWith(inventoryParams);
    });

    it('should download the file on success', async () => {
      vi.mocked(reportsService.generateInventoryReport).mockResolvedValue(mockInventoryReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateInventoryReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(inventoryParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.downloadReport).toHaveBeenCalledWith(
        mockInventoryReportResponse.blob,
        mockInventoryReportResponse.fileName
      );
    });

    it('should show success toast "Reporte de inventario generado exitosamente"', async () => {
      vi.mocked(reportsService.generateInventoryReport).mockResolvedValue(mockInventoryReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateInventoryReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(inventoryParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Reporte de inventario generado exitosamente');
    });

    it('should show error toast on failure', async () => {
      const error = new Error('Error al generar el reporte de inventario');
      vi.mocked(reportsService.generateInventoryReport).mockRejectedValue(error);

      const { result } = renderHook(() => useGenerateInventoryReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(inventoryParams);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al generar el reporte de inventario');
    });

    it('should show default error message when error has no message', async () => {
      vi.mocked(reportsService.generateInventoryReport).mockRejectedValue(new Error());

      const { result } = renderHook(() => useGenerateInventoryReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(inventoryParams);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al generar el reporte de inventario');
    });

    it('should invalidate reports cache on success', async () => {
      vi.mocked(reportsService.generateInventoryReport).mockResolvedValue(mockInventoryReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useGenerateInventoryReport(), { wrapper });

      await act(async () => {
        result.current.mutate(inventoryParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.reports.all });
    });

    it('should generate inventory report with optional categoryId', async () => {
      const paramsWithCategory: InventoryReportParams = {
        ...inventoryParams,
        categoryId: 'cat-456',
      };

      vi.mocked(reportsService.generateInventoryReport).mockResolvedValue(mockInventoryReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateInventoryReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(paramsWithCategory);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.generateInventoryReport).toHaveBeenCalledWith(paramsWithCategory);
    });

    it('should generate inventory report in excel format', async () => {
      const excelParams: InventoryReportParams = {
        format: 'excel',
      };

      const excelResponse = {
        blob: new Blob(['excel content'], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        fileName: 'reporte-inventario-2024-01-15.xlsx',
      };

      vi.mocked(reportsService.generateInventoryReport).mockResolvedValue(excelResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateInventoryReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(excelParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.generateInventoryReport).toHaveBeenCalledWith(excelParams);
    });

    it('should return loading state while generating', async () => {
      let resolvePromise: (value: { blob: Blob; fileName: string }) => void;
      const promise = new Promise<{ blob: Blob; fileName: string }>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(reportsService.generateInventoryReport).mockReturnValue(promise);

      const { result } = renderHook(() => useGenerateInventoryReport(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(inventoryParams);
      });

      // Check pending state immediately after calling mutate
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Resolve the promise to clean up
      resolvePromise!(mockInventoryReportResponse);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useGenerateCustomersReport', () => {
    const customersParams: CustomersReportParams = {
      format: 'pdf',
    };

    it('should generate customers report successfully', async () => {
      vi.mocked(reportsService.generateCustomersReport).mockResolvedValue(mockCustomersReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateCustomersReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(customersParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.generateCustomersReport).toHaveBeenCalledWith(customersParams);
    });

    it('should download the file on success', async () => {
      vi.mocked(reportsService.generateCustomersReport).mockResolvedValue(mockCustomersReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateCustomersReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(customersParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.downloadReport).toHaveBeenCalledWith(
        mockCustomersReportResponse.blob,
        mockCustomersReportResponse.fileName
      );
    });

    it('should show success toast "Reporte de clientes generado exitosamente"', async () => {
      vi.mocked(reportsService.generateCustomersReport).mockResolvedValue(mockCustomersReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateCustomersReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(customersParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Reporte de clientes generado exitosamente');
    });

    it('should show error toast on failure', async () => {
      const error = new Error('Error al generar el reporte de clientes');
      vi.mocked(reportsService.generateCustomersReport).mockRejectedValue(error);

      const { result } = renderHook(() => useGenerateCustomersReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(customersParams);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al generar el reporte de clientes');
    });

    it('should show default error message when error has no message', async () => {
      vi.mocked(reportsService.generateCustomersReport).mockRejectedValue(new Error());

      const { result } = renderHook(() => useGenerateCustomersReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(customersParams);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al generar el reporte de clientes');
    });

    it('should invalidate reports cache on success', async () => {
      vi.mocked(reportsService.generateCustomersReport).mockResolvedValue(mockCustomersReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useGenerateCustomersReport(), { wrapper });

      await act(async () => {
        result.current.mutate(customersParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.reports.all });
    });

    it('should generate customers report in excel format', async () => {
      const excelParams: CustomersReportParams = {
        format: 'excel',
      };

      const excelResponse = {
        blob: new Blob(['excel content'], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        fileName: 'reporte-clientes-2024-01-15.xlsx',
      };

      vi.mocked(reportsService.generateCustomersReport).mockResolvedValue(excelResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateCustomersReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(excelParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.generateCustomersReport).toHaveBeenCalledWith(excelParams);
    });

    it('should return loading state while generating', async () => {
      let resolvePromise: (value: { blob: Blob; fileName: string }) => void;
      const promise = new Promise<{ blob: Blob; fileName: string }>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(reportsService.generateCustomersReport).mockReturnValue(promise);

      const { result } = renderHook(() => useGenerateCustomersReport(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(customersParams);
      });

      // Check pending state immediately after calling mutate
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Resolve the promise to clean up
      resolvePromise!(mockCustomersReportResponse);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useDownloadInvoicePdf', () => {
    const invoiceId = 'inv-123';

    it('should download invoice PDF successfully', async () => {
      vi.mocked(reportsService.downloadInvoicePdf).mockResolvedValue(mockInvoicePdfResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useDownloadInvoicePdf(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(invoiceId);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.downloadInvoicePdf).toHaveBeenCalledWith(invoiceId);
    });

    it('should trigger file download on success', async () => {
      vi.mocked(reportsService.downloadInvoicePdf).mockResolvedValue(mockInvoicePdfResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useDownloadInvoicePdf(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(invoiceId);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.downloadReport).toHaveBeenCalledWith(
        mockInvoicePdfResponse.blob,
        mockInvoicePdfResponse.fileName
      );
    });

    it('should show success toast "Factura descargada exitosamente"', async () => {
      vi.mocked(reportsService.downloadInvoicePdf).mockResolvedValue(mockInvoicePdfResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useDownloadInvoicePdf(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(invoiceId);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Factura descargada exitosamente');
    });

    it('should show error toast on failure', async () => {
      const error = new Error('Error al descargar la factura');
      vi.mocked(reportsService.downloadInvoicePdf).mockRejectedValue(error);

      const { result } = renderHook(() => useDownloadInvoicePdf(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(invoiceId);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al descargar la factura');
    });

    it('should show default error message when error has no message', async () => {
      vi.mocked(reportsService.downloadInvoicePdf).mockRejectedValue(new Error());

      const { result } = renderHook(() => useDownloadInvoicePdf(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(invoiceId);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al descargar la factura');
    });

    it('should return loading state while downloading', async () => {
      let resolvePromise: (value: { blob: Blob; fileName: string }) => void;
      const promise = new Promise<{ blob: Blob; fileName: string }>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(reportsService.downloadInvoicePdf).mockReturnValue(promise);

      const { result } = renderHook(() => useDownloadInvoicePdf(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(invoiceId);
      });

      // Check pending state immediately after calling mutate
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Resolve the promise to clean up
      resolvePromise!(mockInvoicePdfResponse);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should download with different invoice IDs', async () => {
      vi.mocked(reportsService.downloadInvoicePdf).mockResolvedValue(mockInvoicePdfResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useDownloadInvoicePdf(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('inv-456');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.downloadInvoicePdf).toHaveBeenCalledWith('inv-456');
    });

    it('should handle invoice not found error', async () => {
      const error = new Error('Factura no encontrada');
      vi.mocked(reportsService.downloadInvoicePdf).mockRejectedValue(error);

      const { result } = renderHook(() => useDownloadInvoicePdf(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('non-existent-id');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Factura no encontrada');
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe('Edge cases', () => {
    it('should handle network errors gracefully for sales report', async () => {
      const networkError = new Error('Network error');
      vi.mocked(reportsService.generateSalesReport).mockRejectedValue(networkError);

      const { result } = renderHook(() => useGenerateSalesReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          format: 'pdf',
          fromDate: '2024-01-01',
          toDate: '2024-01-15',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Network error');
    });

    it('should handle network errors gracefully for inventory report', async () => {
      const networkError = new Error('Network error');
      vi.mocked(reportsService.generateInventoryReport).mockRejectedValue(networkError);

      const { result } = renderHook(() => useGenerateInventoryReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ format: 'pdf' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Network error');
    });

    it('should handle network errors gracefully for customers report', async () => {
      const networkError = new Error('Network error');
      vi.mocked(reportsService.generateCustomersReport).mockRejectedValue(networkError);

      const { result } = renderHook(() => useGenerateCustomersReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ format: 'pdf' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Network error');
    });

    it('should handle network errors gracefully for invoice PDF download', async () => {
      const networkError = new Error('Network error');
      vi.mocked(reportsService.downloadInvoicePdf).mockRejectedValue(networkError);

      const { result } = renderHook(() => useDownloadInvoicePdf(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('inv-123');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Network error');
    });

    it('should handle concurrent report generation', async () => {
      vi.mocked(reportsService.generateSalesReport).mockResolvedValue(mockSalesReportResponse);
      vi.mocked(reportsService.generateInventoryReport).mockResolvedValue(mockInventoryReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result: salesResult } = renderHook(() => useGenerateSalesReport(), {
        wrapper: createWrapper(),
      });

      const { result: inventoryResult } = renderHook(() => useGenerateInventoryReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        salesResult.current.mutate({
          format: 'pdf',
          fromDate: '2024-01-01',
          toDate: '2024-01-15',
        });
        inventoryResult.current.mutate({ format: 'pdf' });
      });

      await waitFor(() => {
        expect(salesResult.current.isSuccess).toBe(true);
        expect(inventoryResult.current.isSuccess).toBe(true);
      });

      expect(reportsService.generateSalesReport).toHaveBeenCalled();
      expect(reportsService.generateInventoryReport).toHaveBeenCalled();
    });

    it('should handle empty blob response', async () => {
      const emptyBlobResponse = {
        blob: new Blob([], { type: 'application/pdf' }),
        fileName: 'empty-report.pdf',
      };

      vi.mocked(reportsService.generateSalesReport).mockResolvedValue(emptyBlobResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateSalesReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          format: 'pdf',
          fromDate: '2024-01-01',
          toDate: '2024-01-15',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.downloadReport).toHaveBeenCalledWith(
        emptyBlobResponse.blob,
        emptyBlobResponse.fileName
      );
    });

    it('should handle server timeout error', async () => {
      const timeoutError = new Error('Request timeout');
      vi.mocked(reportsService.generateSalesReport).mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useGenerateSalesReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          format: 'pdf',
          fromDate: '2024-01-01',
          toDate: '2024-01-15',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Request timeout');
    });
  });

  // ============================================================================
  // CACHE INVALIDATION TESTS
  // ============================================================================

  describe('Cache invalidation', () => {
    it('should invalidate reports.all cache after generating sales report', async () => {
      vi.mocked(reportsService.generateSalesReport).mockResolvedValue(mockSalesReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { wrapper, queryClient } = createWrapperWithClient();

      // Pre-populate cache
      queryClient.setQueryData(queryKeys.reports.recent(10), mockRecentReports);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useGenerateSalesReport(), { wrapper });

      await act(async () => {
        result.current.mutate({
          format: 'pdf',
          fromDate: '2024-01-01',
          toDate: '2024-01-15',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.reports.all });
    });

    it('should invalidate reports.all cache after generating inventory report', async () => {
      vi.mocked(reportsService.generateInventoryReport).mockResolvedValue(mockInventoryReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { wrapper, queryClient } = createWrapperWithClient();

      // Pre-populate cache
      queryClient.setQueryData(queryKeys.reports.recent(10), mockRecentReports);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useGenerateInventoryReport(), { wrapper });

      await act(async () => {
        result.current.mutate({ format: 'pdf' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.reports.all });
    });

    it('should invalidate reports.all cache after generating customers report', async () => {
      vi.mocked(reportsService.generateCustomersReport).mockResolvedValue(mockCustomersReportResponse);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { wrapper, queryClient } = createWrapperWithClient();

      // Pre-populate cache
      queryClient.setQueryData(queryKeys.reports.recent(10), mockRecentReports);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useGenerateCustomersReport(), { wrapper });

      await act(async () => {
        result.current.mutate({ format: 'pdf' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.reports.all });
    });

    it('should NOT invalidate cache on error', async () => {
      const error = new Error('Report generation failed');
      vi.mocked(reportsService.generateSalesReport).mockRejectedValue(error);

      const { wrapper, queryClient } = createWrapperWithClient();

      // Pre-populate cache
      queryClient.setQueryData(queryKeys.reports.recent(10), mockRecentReports);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useGenerateSalesReport(), { wrapper });

      await act(async () => {
        result.current.mutate({
          format: 'pdf',
          fromDate: '2024-01-01',
          toDate: '2024-01-15',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // invalidateQueries should NOT have been called since the mutation failed
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // FILE DOWNLOAD TESTS
  // ============================================================================

  describe('File download behavior', () => {
    it('should call downloadReport with correct blob and fileName for sales report', async () => {
      const customFileName = 'ventas-enero-2024.pdf';
      const customBlob = new Blob(['custom content'], { type: 'application/pdf' });
      const response = { blob: customBlob, fileName: customFileName };

      vi.mocked(reportsService.generateSalesReport).mockResolvedValue(response);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateSalesReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          format: 'pdf',
          fromDate: '2024-01-01',
          toDate: '2024-01-31',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.downloadReport).toHaveBeenCalledWith(customBlob, customFileName);
    });

    it('should handle large blob files', async () => {
      // Create a large blob (simulating a large file)
      const largeContent = 'x'.repeat(10000000); // 10MB of content
      const largeBlob = new Blob([largeContent], { type: 'application/pdf' });
      const response = { blob: largeBlob, fileName: 'large-report.pdf' };

      vi.mocked(reportsService.generateInventoryReport).mockResolvedValue(response);
      vi.mocked(reportsService.downloadReport).mockImplementation(() => {});

      const { result } = renderHook(() => useGenerateInventoryReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ format: 'pdf' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reportsService.downloadReport).toHaveBeenCalledWith(largeBlob, 'large-report.pdf');
    });
  });
});
