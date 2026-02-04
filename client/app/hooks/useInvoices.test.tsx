import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import {
  useInvoices,
  useInvoice,
  useInvoicesByCustomer,
  useRecentInvoices,
  useInvoiceStats,
  useCreateInvoice,
  useUpdateInvoice,
  useUpdateInvoiceStatus,
  useDeleteInvoice,
  useAddInvoiceItem,
  useUpdateInvoiceItem,
  useRemoveInvoiceItem,
} from './useInvoices';
import { invoicesService } from '~/services/invoices.service';
import type {
  Invoice,
  InvoicesResponse,
  InvoiceSummary,
  InvoiceStats,
  InvoiceItem,
} from '~/types/invoice';

// Mock dependencies
vi.mock('~/services/invoices.service', () => ({
  invoicesService: {
    getInvoices: vi.fn(),
    getInvoice: vi.fn(),
    getInvoicesByCustomer: vi.fn(),
    getRecentInvoices: vi.fn(),
    getInvoiceStats: vi.fn(),
    createInvoice: vi.fn(),
    updateInvoice: vi.fn(),
    updateInvoiceStatus: vi.fn(),
    deleteInvoice: vi.fn(),
    addInvoiceItem: vi.fn(),
    updateInvoiceItem: vi.fn(),
    removeInvoiceItem: vi.fn(),
  },
}));

vi.mock('~/components/ui/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock data
const mockInvoiceItem: InvoiceItem = {
  id: '1-1',
  invoiceId: '1',
  productId: 'prod-1',
  description: 'iPhone 15 Pro Max',
  quantity: 1,
  unitPrice: 5999000,
  discount: 0,
  tax: 19,
  subtotal: 5999000,
  total: 7138810,
  createdAt: '2024-01-05T10:00:00Z',
  updatedAt: '2024-01-05T10:00:00Z',
};

const mockInvoice: Invoice = {
  id: '1',
  invoiceNumber: 'FAC-2024-0001',
  customerId: '1',
  customer: {
    id: '1',
    name: 'Juan Carlos Perez',
    email: 'jcperez@email.com',
    phone: '+57 300 123 4567',
    document: '1234567890',
    documentType: 'CC',
    type: 'INDIVIDUAL',
    address: 'Calle 80 #45-12',
    city: 'Bogota',
    isActive: true,
    createdAt: '2023-06-15T10:00:00Z',
    updatedAt: '2024-01-10T15:30:00Z',
  },
  status: 'PENDING',
  source: 'MANUAL',
  issueDate: '2024-01-05T10:00:00Z',
  dueDate: '2024-01-20T10:00:00Z',
  items: [mockInvoiceItem],
  subtotal: 5999000,
  taxAmount: 1139810,
  discountAmount: 0,
  total: 7138810,
  notes: 'Test invoice',
  createdAt: '2024-01-05T10:00:00Z',
  updatedAt: '2024-01-05T10:00:00Z',
};

const mockPaidInvoice: Invoice = {
  ...mockInvoice,
  id: '2',
  invoiceNumber: 'FAC-2024-0002',
  status: 'PAID',
  paidAt: '2024-01-18T14:30:00Z',
};

const mockDraftInvoice: Invoice = {
  ...mockInvoice,
  id: '3',
  invoiceNumber: 'FAC-2024-0003',
  status: 'DRAFT',
};

const mockInvoiceSummary: InvoiceSummary = {
  id: '1',
  invoiceNumber: 'FAC-2024-0001',
  customerId: '1',
  customer: mockInvoice.customer,
  status: 'PENDING',
  source: 'MANUAL',
  issueDate: '2024-01-05T10:00:00Z',
  dueDate: '2024-01-20T10:00:00Z',
  itemCount: 1,
  subtotal: 5999000,
  taxAmount: 1139810,
  discountAmount: 0,
  total: 7138810,
  createdAt: '2024-01-05T10:00:00Z',
  updatedAt: '2024-01-05T10:00:00Z',
};

const mockInvoicesResponse: InvoicesResponse = {
  data: [mockInvoiceSummary],
  meta: {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

const mockInvoiceStats: InvoiceStats = {
  totalInvoices: 10,
  totalRevenue: 50000000,
  pendingAmount: 15000000,
  overdueAmount: 5000000,
  averageInvoiceValue: 5000000,
  invoicesByStatus: {
    DRAFT: 1,
    PENDING: 3,
    PAID: 4,
    OVERDUE: 1,
    CANCELLED: 1,
  },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('useInvoices hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // QUERY HOOKS
  // ============================================================================

  describe('useInvoices', () => {
    it('should fetch invoices with no filters', async () => {
      vi.mocked(invoicesService.getInvoices).mockResolvedValue(mockInvoicesResponse);

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getInvoices).toHaveBeenCalledWith({});
      expect(result.current.data).toEqual(mockInvoicesResponse);
    });

    it('should fetch invoices with status filter', async () => {
      vi.mocked(invoicesService.getInvoices).mockResolvedValue(mockInvoicesResponse);

      const filters = { status: 'PENDING' as const };
      const { result } = renderHook(() => useInvoices(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getInvoices).toHaveBeenCalledWith(filters);
    });

    it('should fetch invoices with customerId filter', async () => {
      vi.mocked(invoicesService.getInvoices).mockResolvedValue(mockInvoicesResponse);

      const filters = { customerId: '1' };
      const { result } = renderHook(() => useInvoices(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getInvoices).toHaveBeenCalledWith(filters);
    });

    it('should fetch invoices with date range filter', async () => {
      vi.mocked(invoicesService.getInvoices).mockResolvedValue(mockInvoicesResponse);

      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };
      const { result } = renderHook(() => useInvoices(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getInvoices).toHaveBeenCalledWith(filters);
    });

    it('should fetch invoices with amount range filter', async () => {
      vi.mocked(invoicesService.getInvoices).mockResolvedValue(mockInvoicesResponse);

      const filters = {
        minAmount: 1000000,
        maxAmount: 10000000,
      };
      const { result } = renderHook(() => useInvoices(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getInvoices).toHaveBeenCalledWith(filters);
    });

    it('should handle pagination filters', async () => {
      vi.mocked(invoicesService.getInvoices).mockResolvedValue(mockInvoicesResponse);

      const filters = { page: 2, limit: 20 };
      const { result } = renderHook(() => useInvoices(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getInvoices).toHaveBeenCalledWith(filters);
    });

    it('should handle search filter', async () => {
      vi.mocked(invoicesService.getInvoices).mockResolvedValue(mockInvoicesResponse);

      const filters = { search: 'FAC-2024' };
      const { result } = renderHook(() => useInvoices(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getInvoices).toHaveBeenCalledWith(filters);
    });

    it('should handle sorting filters', async () => {
      vi.mocked(invoicesService.getInvoices).mockResolvedValue(mockInvoicesResponse);

      const filters = { sortBy: 'total', sortOrder: 'desc' as const };
      const { result } = renderHook(() => useInvoices(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getInvoices).toHaveBeenCalledWith(filters);
    });

    it('should handle multiple filters', async () => {
      vi.mocked(invoicesService.getInvoices).mockResolvedValue(mockInvoicesResponse);

      const filters = {
        status: 'PENDING' as const,
        customerId: '1',
        startDate: '2024-01-01',
        page: 1,
        limit: 10,
      };
      const { result } = renderHook(() => useInvoices(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getInvoices).toHaveBeenCalledWith(filters);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch invoices');
      vi.mocked(invoicesService.getInvoices).mockRejectedValue(error);

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useInvoice', () => {
    it('should fetch a single invoice by id', async () => {
      vi.mocked(invoicesService.getInvoice).mockResolvedValue(mockInvoice);

      const { result } = renderHook(() => useInvoice('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getInvoice).toHaveBeenCalledWith('1');
      expect(result.current.data).toEqual(mockInvoice);
    });

    it('should not fetch if id is empty', async () => {
      const { result } = renderHook(() => useInvoice(''), {
        wrapper: createWrapper(),
      });

      // Should not be loading since query is disabled
      expect(result.current.isLoading).toBe(false);
      expect(invoicesService.getInvoice).not.toHaveBeenCalled();
    });

    it('should handle non-existent invoice', async () => {
      const error = new Error('Factura no encontrada');
      vi.mocked(invoicesService.getInvoice).mockRejectedValue(error);

      const { result } = renderHook(() => useInvoice('999'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch invoice');
      vi.mocked(invoicesService.getInvoice).mockRejectedValue(error);

      const { result } = renderHook(() => useInvoice('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useInvoicesByCustomer', () => {
    it('should fetch invoices for a specific customer', async () => {
      const customerInvoices = [mockInvoice, mockPaidInvoice];
      vi.mocked(invoicesService.getInvoicesByCustomer).mockResolvedValue(customerInvoices);

      const { result } = renderHook(() => useInvoicesByCustomer('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getInvoicesByCustomer).toHaveBeenCalledWith('1');
      expect(result.current.data).toEqual(customerInvoices);
    });

    it('should not fetch if customerId is empty', async () => {
      const { result } = renderHook(() => useInvoicesByCustomer(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(invoicesService.getInvoicesByCustomer).not.toHaveBeenCalled();
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch customer invoices');
      vi.mocked(invoicesService.getInvoicesByCustomer).mockRejectedValue(error);

      const { result } = renderHook(() => useInvoicesByCustomer('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should return empty array for customer with no invoices', async () => {
      vi.mocked(invoicesService.getInvoicesByCustomer).mockResolvedValue([]);

      const { result } = renderHook(() => useInvoicesByCustomer('999'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useRecentInvoices', () => {
    it('should fetch recent invoices with default limit', async () => {
      const recentInvoices = [mockInvoice, mockPaidInvoice];
      vi.mocked(invoicesService.getRecentInvoices).mockResolvedValue(recentInvoices);

      const { result } = renderHook(() => useRecentInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getRecentInvoices).toHaveBeenCalledWith(5);
      expect(result.current.data).toEqual(recentInvoices);
    });

    it('should fetch recent invoices with custom limit', async () => {
      const recentInvoices = [mockInvoice, mockPaidInvoice, mockDraftInvoice];
      vi.mocked(invoicesService.getRecentInvoices).mockResolvedValue(recentInvoices);

      const { result } = renderHook(() => useRecentInvoices(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getRecentInvoices).toHaveBeenCalledWith(10);
      expect(result.current.data).toEqual(recentInvoices);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch recent invoices');
      vi.mocked(invoicesService.getRecentInvoices).mockRejectedValue(error);

      const { result } = renderHook(() => useRecentInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useInvoiceStats', () => {
    it('should fetch invoice statistics', async () => {
      vi.mocked(invoicesService.getInvoiceStats).mockResolvedValue(mockInvoiceStats);

      const { result } = renderHook(() => useInvoiceStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(invoicesService.getInvoiceStats).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockInvoiceStats);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch invoice stats');
      vi.mocked(invoicesService.getInvoiceStats).mockRejectedValue(error);

      const { result } = renderHook(() => useInvoiceStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should return statistics with correct structure', async () => {
      vi.mocked(invoicesService.getInvoiceStats).mockResolvedValue(mockInvoiceStats);

      const { result } = renderHook(() => useInvoiceStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.totalInvoices).toBe(10);
      expect(result.current.data?.totalRevenue).toBe(50000000);
      expect(result.current.data?.pendingAmount).toBe(15000000);
      expect(result.current.data?.overdueAmount).toBe(5000000);
      expect(result.current.data?.invoicesByStatus).toBeDefined();
    });
  });

  // ============================================================================
  // MUTATION HOOKS
  // ============================================================================

  describe('useCreateInvoice', () => {
    it('should create an invoice and navigate to invoice detail', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(invoicesService.createInvoice).mockResolvedValue(mockInvoice);

      const { result } = renderHook(() => useCreateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          customerId: '1',
          issueDate: '2024-01-05T10:00:00Z',
          dueDate: '2024-01-20T10:00:00Z',
          items: [
            {
              productId: 'prod-1',
              description: 'iPhone 15 Pro Max',
              quantity: 1,
              unitPrice: 5999000,
            },
          ],
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${mockInvoice.invoiceNumber}" creada exitosamente`
      );
      expect(mockNavigate).toHaveBeenCalledWith(`/invoices/${mockInvoice.id}`);
    });

    it('should create an invoice with notes', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const invoiceWithNotes = { ...mockInvoice, notes: 'Important note' };
      vi.mocked(invoicesService.createInvoice).mockResolvedValue(invoiceWithNotes);

      const { result } = renderHook(() => useCreateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          customerId: '1',
          issueDate: '2024-01-05T10:00:00Z',
          dueDate: '2024-01-20T10:00:00Z',
          items: [
            {
              productId: 'prod-1',
              description: 'iPhone 15 Pro Max',
              quantity: 1,
              unitPrice: 5999000,
            },
          ],
          notes: 'Important note',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${invoiceWithNotes.invoiceNumber}" creada exitosamente`
      );
    });

    it('should create an invoice with specific status', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(invoicesService.createInvoice).mockResolvedValue(mockDraftInvoice);

      const { result } = renderHook(() => useCreateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          customerId: '1',
          status: 'DRAFT',
          issueDate: '2024-01-05T10:00:00Z',
          dueDate: '2024-01-20T10:00:00Z',
          items: [
            {
              productId: 'prod-1',
              description: 'iPhone 15 Pro Max',
              quantity: 1,
              unitPrice: 5999000,
            },
          ],
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${mockDraftInvoice.invoiceNumber}" creada exitosamente`
      );
    });

    it('should show error toast on failure', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Creation failed');
      vi.mocked(invoicesService.createInvoice).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          customerId: '1',
          issueDate: '2024-01-05T10:00:00Z',
          dueDate: '2024-01-20T10:00:00Z',
          items: [
            {
              productId: 'prod-1',
              description: 'iPhone 15 Pro Max',
              quantity: 1,
              unitPrice: 5999000,
            },
          ],
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Creation failed');
    });

    it('should show default error message if error has no message', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(invoicesService.createInvoice).mockRejectedValue(new Error(''));

      const { result } = renderHook(() => useCreateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          customerId: '1',
          issueDate: '2024-01-05T10:00:00Z',
          dueDate: '2024-01-20T10:00:00Z',
          items: [
            {
              productId: 'prod-1',
              description: 'iPhone 15 Pro Max',
              quantity: 1,
              unitPrice: 5999000,
            },
          ],
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al crear la factura');
    });
  });

  describe('useUpdateInvoice', () => {
    it('should update an invoice and navigate to invoice detail', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const updatedInvoice = { ...mockInvoice, notes: 'Updated notes' };
      vi.mocked(invoicesService.updateInvoice).mockResolvedValue(updatedInvoice);

      const { result } = renderHook(() => useUpdateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          data: { notes: 'Updated notes' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${updatedInvoice.invoiceNumber}" actualizada exitosamente`
      );
      expect(mockNavigate).toHaveBeenCalledWith(`/invoices/${updatedInvoice.id}`);
    });

    it('should update invoice customer', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const updatedInvoice = { ...mockInvoice, customerId: '2' };
      vi.mocked(invoicesService.updateInvoice).mockResolvedValue(updatedInvoice);

      const { result } = renderHook(() => useUpdateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          data: { customerId: '2' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${updatedInvoice.invoiceNumber}" actualizada exitosamente`
      );
    });

    it('should update invoice dates', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const updatedInvoice = {
        ...mockInvoice,
        issueDate: '2024-01-10T10:00:00Z',
        dueDate: '2024-01-25T10:00:00Z',
      };
      vi.mocked(invoicesService.updateInvoice).mockResolvedValue(updatedInvoice);

      const { result } = renderHook(() => useUpdateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          data: {
            issueDate: '2024-01-10T10:00:00Z',
            dueDate: '2024-01-25T10:00:00Z',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${updatedInvoice.invoiceNumber}" actualizada exitosamente`
      );
    });

    it('should show error toast on failure', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Update failed');
      vi.mocked(invoicesService.updateInvoice).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          data: { notes: 'Updated notes' },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Update failed');
    });

    it('should show default error message if error has no message', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(invoicesService.updateInvoice).mockRejectedValue(new Error(''));

      const { result } = renderHook(() => useUpdateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          data: { notes: 'Updated notes' },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al actualizar la factura');
    });

    it('should show error for paid invoice', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('No se puede modificar una factura pagada o cancelada');
      vi.mocked(invoicesService.updateInvoice).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '2',
          data: { notes: 'Updated notes' },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        'No se puede modificar una factura pagada o cancelada'
      );
    });

    it('should show error for non-existent invoice', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Factura no encontrada');
      vi.mocked(invoicesService.updateInvoice).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '999',
          data: { notes: 'Updated notes' },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Factura no encontrada');
    });
  });

  describe('useUpdateInvoiceStatus', () => {
    it('should update invoice status to PAID', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const paidInvoice = { ...mockInvoice, status: 'PAID' as const, paidAt: '2024-01-18T14:30:00Z' };
      vi.mocked(invoicesService.updateInvoiceStatus).mockResolvedValue(paidInvoice);

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          status: 'PAID',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${paidInvoice.invoiceNumber}" marcada como pagada`
      );
    });

    it('should update invoice status to CANCELLED', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const cancelledInvoice = { ...mockInvoice, status: 'CANCELLED' as const };
      vi.mocked(invoicesService.updateInvoiceStatus).mockResolvedValue(cancelledInvoice);

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          status: 'CANCELLED',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${cancelledInvoice.invoiceNumber}" cancelada`
      );
    });

    it('should update invoice status to PENDING', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const pendingInvoice = { ...mockDraftInvoice, status: 'PENDING' as const };
      vi.mocked(invoicesService.updateInvoiceStatus).mockResolvedValue(pendingInvoice);

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '3',
          status: 'PENDING',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${pendingInvoice.invoiceNumber}" marcada como pendiente`
      );
    });

    it('should update invoice status to DRAFT', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(invoicesService.updateInvoiceStatus).mockResolvedValue(mockDraftInvoice);

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '3',
          status: 'DRAFT',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${mockDraftInvoice.invoiceNumber}" marcada como borrador`
      );
    });

    it('should update invoice status to OVERDUE', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const overdueInvoice = { ...mockInvoice, status: 'OVERDUE' as const };
      vi.mocked(invoicesService.updateInvoiceStatus).mockResolvedValue(overdueInvoice);

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          status: 'OVERDUE',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${overdueInvoice.invoiceNumber}" marcada como vencida`
      );
    });

    it('should show error toast on failure', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Status update failed');
      vi.mocked(invoicesService.updateInvoiceStatus).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          status: 'PAID',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Status update failed');
    });

    it('should show default error message if error has no message', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(invoicesService.updateInvoiceStatus).mockRejectedValue(new Error(''));

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          status: 'PAID',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al actualizar el estado de la factura');
    });

    it('should show error for invalid status transition', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('No se puede cambiar el estado de una factura cancelada');
      vi.mocked(invoicesService.updateInvoiceStatus).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: '5',
          status: 'PAID',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        'No se puede cambiar el estado de una factura cancelada'
      );
    });
  });

  describe('useDeleteInvoice', () => {
    it('should delete an invoice and navigate to invoices list', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(invoicesService.deleteInvoice).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('3');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Factura eliminada exitosamente');
      expect(mockNavigate).toHaveBeenCalledWith('/invoices');
    });

    it('should show error toast on failure', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Delete failed');
      vi.mocked(invoicesService.deleteInvoice).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Delete failed');
    });

    it('should show default error message if error has no message', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(invoicesService.deleteInvoice).mockRejectedValue(new Error(''));

      const { result } = renderHook(() => useDeleteInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al eliminar la factura');
    });

    it('should show error when deleting non-draft invoice', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Solo se pueden eliminar facturas en borrador');
      vi.mocked(invoicesService.deleteInvoice).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Solo se pueden eliminar facturas en borrador');
    });

    it('should show error for non-existent invoice', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Factura no encontrada');
      vi.mocked(invoicesService.deleteInvoice).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('999');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Factura no encontrada');
    });
  });

  // ============================================================================
  // LINE ITEM MUTATION HOOKS
  // ============================================================================

  describe('useAddInvoiceItem', () => {
    it('should add an item to an invoice', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const updatedInvoice = {
        ...mockInvoice,
        items: [
          ...mockInvoice.items,
          {
            id: '1-2',
            invoiceId: '1',
            productId: 'prod-2',
            description: 'AirPods Pro',
            quantity: 1,
            unitPrice: 1099000,
            discount: 0,
            tax: 19,
            subtotal: 1099000,
            total: 1307810,
            createdAt: '2024-01-05T10:00:00Z',
            updatedAt: '2024-01-05T10:00:00Z',
          },
        ],
      };
      vi.mocked(invoicesService.addInvoiceItem).mockResolvedValue(updatedInvoice);

      const { result } = renderHook(() => useAddInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          item: {
            productId: 'prod-2',
            description: 'AirPods Pro',
            quantity: 1,
            unitPrice: 1099000,
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Item agregado a la factura');
    });

    it('should add an item with discount', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const updatedInvoice = { ...mockInvoice };
      vi.mocked(invoicesService.addInvoiceItem).mockResolvedValue(updatedInvoice);

      const { result } = renderHook(() => useAddInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          item: {
            productId: 'prod-2',
            description: 'AirPods Pro',
            quantity: 2,
            unitPrice: 1099000,
            discount: 10,
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Item agregado a la factura');
    });

    it('should add an item with custom tax', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const updatedInvoice = { ...mockInvoice };
      vi.mocked(invoicesService.addInvoiceItem).mockResolvedValue(updatedInvoice);

      const { result } = renderHook(() => useAddInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          item: {
            productId: 'prod-2',
            description: 'AirPods Pro',
            quantity: 1,
            unitPrice: 1099000,
            tax: 5,
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Item agregado a la factura');
    });

    it('should show error toast on failure', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Add item failed');
      vi.mocked(invoicesService.addInvoiceItem).mockRejectedValue(error);

      const { result } = renderHook(() => useAddInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          item: {
            productId: 'prod-2',
            description: 'AirPods Pro',
            quantity: 1,
            unitPrice: 1099000,
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Add item failed');
    });

    it('should show default error message if error has no message', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(invoicesService.addInvoiceItem).mockRejectedValue(new Error(''));

      const { result } = renderHook(() => useAddInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          item: {
            productId: 'prod-2',
            description: 'AirPods Pro',
            quantity: 1,
            unitPrice: 1099000,
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al agregar el item');
    });

    it('should show error when adding item to paid invoice', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('No se puede modificar una factura pagada o cancelada');
      vi.mocked(invoicesService.addInvoiceItem).mockRejectedValue(error);

      const { result } = renderHook(() => useAddInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '2',
          item: {
            productId: 'prod-2',
            description: 'AirPods Pro',
            quantity: 1,
            unitPrice: 1099000,
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        'No se puede modificar una factura pagada o cancelada'
      );
    });
  });

  describe('useUpdateInvoiceItem', () => {
    it('should update an item in an invoice', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const updatedInvoice = { ...mockInvoice };
      vi.mocked(invoicesService.updateInvoiceItem).mockResolvedValue(updatedInvoice);

      const { result } = renderHook(() => useUpdateInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-1',
          data: { quantity: 2 },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Item actualizado');
    });

    it('should update item unit price', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const updatedInvoice = { ...mockInvoice };
      vi.mocked(invoicesService.updateInvoiceItem).mockResolvedValue(updatedInvoice);

      const { result } = renderHook(() => useUpdateInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-1',
          data: { unitPrice: 6499000 },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Item actualizado');
    });

    it('should update item discount', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const updatedInvoice = { ...mockInvoice };
      vi.mocked(invoicesService.updateInvoiceItem).mockResolvedValue(updatedInvoice);

      const { result } = renderHook(() => useUpdateInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-1',
          data: { discount: 15 },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Item actualizado');
    });

    it('should update item description', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const updatedInvoice = { ...mockInvoice };
      vi.mocked(invoicesService.updateInvoiceItem).mockResolvedValue(updatedInvoice);

      const { result } = renderHook(() => useUpdateInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-1',
          data: { description: 'iPhone 15 Pro Max 256GB' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Item actualizado');
    });

    it('should show error toast on failure', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Update item failed');
      vi.mocked(invoicesService.updateInvoiceItem).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-1',
          data: { quantity: 2 },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Update item failed');
    });

    it('should show default error message if error has no message', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(invoicesService.updateInvoiceItem).mockRejectedValue(new Error(''));

      const { result } = renderHook(() => useUpdateInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-1',
          data: { quantity: 2 },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al actualizar el item');
    });

    it('should show error when updating item in paid invoice', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('No se puede modificar una factura pagada o cancelada');
      vi.mocked(invoicesService.updateInvoiceItem).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '2',
          itemId: '2-1',
          data: { quantity: 2 },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        'No se puede modificar una factura pagada o cancelada'
      );
    });

    it('should show error for non-existent item', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Item no encontrado');
      vi.mocked(invoicesService.updateInvoiceItem).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '999',
          data: { quantity: 2 },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Item no encontrado');
    });
  });

  describe('useRemoveInvoiceItem', () => {
    it('should remove an item from an invoice', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const invoiceWithMultipleItems = {
        ...mockInvoice,
        items: [
          mockInvoiceItem,
          {
            id: '1-2',
            invoiceId: '1',
            productId: 'prod-2',
            description: 'AirPods Pro',
            quantity: 1,
            unitPrice: 1099000,
            discount: 0,
            tax: 19,
            subtotal: 1099000,
            total: 1307810,
            createdAt: '2024-01-05T10:00:00Z',
            updatedAt: '2024-01-05T10:00:00Z',
          },
        ],
      };
      const updatedInvoice = {
        ...invoiceWithMultipleItems,
        items: [invoiceWithMultipleItems.items[0]],
      };
      vi.mocked(invoicesService.removeInvoiceItem).mockResolvedValue(updatedInvoice);

      const { result } = renderHook(() => useRemoveInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-2',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Item eliminado de la factura');
    });

    it('should show error toast on failure', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('Remove item failed');
      vi.mocked(invoicesService.removeInvoiceItem).mockRejectedValue(error);

      const { result } = renderHook(() => useRemoveInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-1',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Remove item failed');
    });

    it('should show default error message if error has no message', async () => {
      const { toast } = await import('~/components/ui/Toast');
      vi.mocked(invoicesService.removeInvoiceItem).mockRejectedValue(new Error(''));

      const { result } = renderHook(() => useRemoveInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-1',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Error al eliminar el item');
    });

    it('should show error when removing item from paid invoice', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('No se puede modificar una factura pagada o cancelada');
      vi.mocked(invoicesService.removeInvoiceItem).mockRejectedValue(error);

      const { result } = renderHook(() => useRemoveInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '2',
          itemId: '2-1',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        'No se puede modificar una factura pagada o cancelada'
      );
    });

    it('should show error when removing last item', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const error = new Error('La factura debe tener al menos un item');
      vi.mocked(invoicesService.removeInvoiceItem).mockRejectedValue(error);

      const { result } = renderHook(() => useRemoveInvoiceItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-1',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('La factura debe tener al menos un item');
    });
  });

  // ============================================================================
  // OPTIMISTIC UPDATE AND ROLLBACK TESTS
  // ============================================================================

  describe('useUpdateInvoice - optimistic updates', () => {
    it('should optimistically update invoice excluding items from data', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Pre-populate the cache with the invoice
      queryClient.setQueryData(['invoices', '1'], mockInvoice);

      const updatedInvoice = { ...mockInvoice, notes: 'Updated notes' };
      vi.mocked(invoicesService.updateInvoice).mockResolvedValue(updatedInvoice);

      function Wrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useUpdateInvoice(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          data: {
            notes: 'Updated notes',
            items: [
              {
                productId: 'prod-1',
                description: 'Test Item',
                quantity: 1,
                unitPrice: 1000,
              },
            ],
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${updatedInvoice.invoiceNumber}" actualizada exitosamente`
      );
    });

    it('should rollback optimistic update on error when previousInvoice exists', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Pre-populate the cache with the invoice
      queryClient.setQueryData(['invoices', '1'], mockInvoice);

      const error = new Error('Update failed');
      vi.mocked(invoicesService.updateInvoice).mockRejectedValue(error);

      function Wrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useUpdateInvoice(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          data: { notes: 'Updated notes' },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify rollback occurred - cache should have original invoice
      const cachedInvoice = queryClient.getQueryData(['invoices', '1']);
      expect(cachedInvoice).toEqual(mockInvoice);
      expect(toast.error).toHaveBeenCalledWith('Update failed');
    });
  });

  describe('useUpdateInvoiceStatus - optimistic updates', () => {
    it('should optimistically update status when previousInvoice exists', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Pre-populate the cache with the invoice
      queryClient.setQueryData(['invoices', '1'], mockInvoice);

      const paidInvoice = { ...mockInvoice, status: 'PAID' as const, paidAt: '2024-01-18T14:30:00Z' };
      vi.mocked(invoicesService.updateInvoiceStatus).mockResolvedValue(paidInvoice);

      function Wrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          status: 'PAID',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${paidInvoice.invoiceNumber}" marcada como pagada`
      );
    });

    it('should preserve paidAt when optimistically updating status to non-PAID status', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Pre-populate cache with invoice that has paidAt set (e.g., a paid invoice)
      const invoiceWithPaidAt = { ...mockPaidInvoice, paidAt: '2024-01-15T10:00:00Z' };
      queryClient.setQueryData(['invoices', '2'], invoiceWithPaidAt);

      const cancelledInvoice = { ...invoiceWithPaidAt, status: 'CANCELLED' as const };
      vi.mocked(invoicesService.updateInvoiceStatus).mockResolvedValue(cancelledInvoice);

      function Wrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate({
          id: '2',
          status: 'CANCELLED',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        `Factura "${cancelledInvoice.invoiceNumber}" cancelada`
      );
    });

    it('should rollback optimistic update on error when previousInvoice exists', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Pre-populate the cache with the invoice
      queryClient.setQueryData(['invoices', '1'], mockInvoice);

      const error = new Error('Status update failed');
      vi.mocked(invoicesService.updateInvoiceStatus).mockRejectedValue(error);

      function Wrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate({
          id: '1',
          status: 'PAID',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify rollback occurred - cache should have original invoice
      const cachedInvoice = queryClient.getQueryData(['invoices', '1']);
      expect(cachedInvoice).toEqual(mockInvoice);
      expect(toast.error).toHaveBeenCalledWith('Status update failed');
    });
  });

  describe('useDeleteInvoice - customer invoice invalidation', () => {
    it('should invalidate customer invoices when customerId exists', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Pre-populate the cache with the invoice (which has customerId: '1')
      queryClient.setQueryData(['invoices', '3'], mockDraftInvoice);

      // Also set up customer invoices query
      queryClient.setQueryData(['invoices', 'customer', '1'], [mockDraftInvoice]);

      vi.mocked(invoicesService.deleteInvoice).mockResolvedValue(undefined);

      // Spy on invalidateQueries
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      function Wrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useDeleteInvoice(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate('3');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Factura eliminada exitosamente');

      // Verify that customer invoices were invalidated
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['invoices', 'customer', '1'],
      });

      invalidateQueriesSpy.mockRestore();
    });
  });

  describe('useAddInvoiceItem - success flow with cache invalidation', () => {
    it('should update cache and invalidate queries on success', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Pre-populate the cache with the invoice
      queryClient.setQueryData(['invoices', '1'], mockInvoice);

      const newItem = {
        id: '1-2',
        invoiceId: '1',
        productId: 'prod-2',
        description: 'AirPods Pro',
        quantity: 1,
        unitPrice: 1099000,
        discount: 0,
        tax: 19,
        subtotal: 1099000,
        total: 1307810,
        createdAt: '2024-01-05T10:00:00Z',
        updatedAt: '2024-01-05T10:00:00Z',
      };

      const updatedInvoice = {
        ...mockInvoice,
        items: [...mockInvoice.items, newItem],
        subtotal: 7098000,
        total: 8446620,
      };

      vi.mocked(invoicesService.addInvoiceItem).mockResolvedValue(updatedInvoice);

      // Spy on setQueryData and invalidateQueries
      const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      function Wrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useAddInvoiceItem(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          item: {
            productId: 'prod-2',
            description: 'AirPods Pro',
            quantity: 1,
            unitPrice: 1099000,
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Item agregado a la factura');

      // Verify cache was updated
      expect(setQueryDataSpy).toHaveBeenCalledWith(['invoices', '1'], updatedInvoice);

      // Verify queries were invalidated
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['invoices'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['invoices', 'customer', '1'],
      });

      setQueryDataSpy.mockRestore();
      invalidateQueriesSpy.mockRestore();
    });
  });

  describe('useUpdateInvoiceItem - error with custom message', () => {
    it('should rollback and show custom error message', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Pre-populate the cache with the invoice
      queryClient.setQueryData(['invoices', '1'], mockInvoice);

      const error = new Error('Cantidad no puede ser negativa');
      vi.mocked(invoicesService.updateInvoiceItem).mockRejectedValue(error);

      function Wrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useUpdateInvoiceItem(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-1',
          data: { quantity: -1 },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify rollback occurred
      const cachedInvoice = queryClient.getQueryData(['invoices', '1']);
      expect(cachedInvoice).toEqual(mockInvoice);

      expect(toast.error).toHaveBeenCalledWith('Cantidad no puede ser negativa');
    });
  });

  describe('useUpdateInvoiceItem - optimistic update with multiple items', () => {
    it('should only update the targeted item and leave other items unchanged', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Create an invoice with multiple items
      const secondItem: InvoiceItem = {
        id: '1-2',
        invoiceId: '1',
        productId: 'prod-2',
        description: 'AirPods Pro',
        quantity: 1,
        unitPrice: 1099000,
        discount: 0,
        tax: 19,
        subtotal: 1099000,
        total: 1307810,
        createdAt: '2024-01-05T10:00:00Z',
        updatedAt: '2024-01-05T10:00:00Z',
      };

      const invoiceWithMultipleItems: Invoice = {
        ...mockInvoice,
        items: [mockInvoiceItem, secondItem],
      };

      // Pre-populate the cache with the invoice
      queryClient.setQueryData(['invoices', '1'], invoiceWithMultipleItems);

      // Server response after update
      const updatedInvoice = {
        ...invoiceWithMultipleItems,
        items: [
          { ...mockInvoiceItem, quantity: 5 },
          secondItem, // This item should remain unchanged
        ],
      };
      vi.mocked(invoicesService.updateInvoiceItem).mockResolvedValue(updatedInvoice);

      function Wrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useUpdateInvoiceItem(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-1', // Update only the first item
          data: { quantity: 5 },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Item actualizado');

      // Verify the cache was updated correctly
      const cachedInvoice = queryClient.getQueryData<Invoice>(['invoices', '1']);
      expect(cachedInvoice?.items).toHaveLength(2);
      // The first item should be updated
      expect(cachedInvoice?.items[0].quantity).toBe(5);
      // The second item should remain unchanged
      expect(cachedInvoice?.items[1]).toEqual(secondItem);
    });
  });

  describe('useRemoveInvoiceItem - success flow with cache invalidation', () => {
    it('should update cache and invalidate queries on success', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const invoiceWithMultipleItems = {
        ...mockInvoice,
        items: [
          mockInvoiceItem,
          {
            id: '1-2',
            invoiceId: '1',
            productId: 'prod-2',
            description: 'AirPods Pro',
            quantity: 1,
            unitPrice: 1099000,
            discount: 0,
            tax: 19,
            subtotal: 1099000,
            total: 1307810,
            createdAt: '2024-01-05T10:00:00Z',
            updatedAt: '2024-01-05T10:00:00Z',
          },
        ],
      };

      // Pre-populate the cache with the invoice
      queryClient.setQueryData(['invoices', '1'], invoiceWithMultipleItems);

      const updatedInvoice = {
        ...invoiceWithMultipleItems,
        items: [mockInvoiceItem],
        subtotal: 5999000,
        total: 7138810,
      };

      vi.mocked(invoicesService.removeInvoiceItem).mockResolvedValue(updatedInvoice);

      // Spy on setQueryData and invalidateQueries
      const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      function Wrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useRemoveInvoiceItem(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-2',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Item eliminado de la factura');

      // Verify cache was updated with server response
      expect(setQueryDataSpy).toHaveBeenCalledWith(['invoices', '1'], updatedInvoice);

      // Verify queries were invalidated
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['invoices'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['invoices', 'customer', '1'],
      });

      setQueryDataSpy.mockRestore();
      invalidateQueriesSpy.mockRestore();
    });
  });

  describe('useRemoveInvoiceItem - error with custom message', () => {
    it('should rollback and show custom error message', async () => {
      const { toast } = await import('~/components/ui/Toast');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Pre-populate the cache with the invoice
      queryClient.setQueryData(['invoices', '1'], mockInvoice);

      const error = new Error('No tiene permisos para eliminar items');
      vi.mocked(invoicesService.removeInvoiceItem).mockRejectedValue(error);

      function Wrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useRemoveInvoiceItem(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.mutate({
          invoiceId: '1',
          itemId: '1-1',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify rollback occurred
      const cachedInvoice = queryClient.getQueryData(['invoices', '1']);
      expect(cachedInvoice).toEqual(mockInvoice);

      expect(toast.error).toHaveBeenCalledWith('No tiene permisos para eliminar items');
    });
  });
});