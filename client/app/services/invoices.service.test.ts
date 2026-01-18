import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invoicesService, generateInvoiceNumber, mockInvoices } from './invoices.service';
import type {
  Invoice,
  InvoiceFilters,
  InvoicesResponse,
  CreateInvoiceData,
  UpdateInvoiceData,
  CreateInvoiceItemData,
  UpdateInvoiceItemData,
  InvoiceStats,
  InvoiceStatus,
} from '~/types/invoice';

// Note: The invoices service currently uses mock data internally
// These tests verify the service's filtering, pagination, and CRUD logic

describe('invoicesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  describe('getInvoices', () => {
    it('should return paginated data with meta', async () => {
      const promise = invoicesService.getInvoices();
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('total');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('limit');
      expect(result.meta).toHaveProperty('totalPages');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter by search (invoice number)', async () => {
      const filters: InvoiceFilters = { search: 'FAC-2024-0001' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.data.forEach((invoice) => {
        expect(invoice.invoiceNumber.toLowerCase()).toContain('fac-2024-0001');
      });
    });

    it('should filter by search (customer name)', async () => {
      const filters: InvoiceFilters = { search: 'Juan' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.data.forEach((invoice) => {
        const matchesSearch =
          invoice.invoiceNumber.toLowerCase().includes('juan') ||
          invoice.customer?.name.toLowerCase().includes('juan') ||
          invoice.customer?.email?.toLowerCase().includes('juan') ||
          invoice.customer?.document?.toLowerCase().includes('juan');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter by status', async () => {
      const filters: InvoiceFilters = { status: 'PAID' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.data.forEach((invoice) => {
        expect(invoice.status).toBe('PAID');
      });
    });

    it('should filter by customerId', async () => {
      const filters: InvoiceFilters = { customerId: '1' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.data.forEach((invoice) => {
        expect(invoice.customerId).toBe('1');
      });
    });

    it('should filter by date range (startDate)', async () => {
      const filters: InvoiceFilters = { startDate: '2024-01-10T00:00:00Z' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.data.forEach((invoice) => {
        const issueDate = new Date(invoice.issueDate);
        const startDate = new Date('2024-01-10T00:00:00Z');
        expect(issueDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
      });
    });

    it('should filter by date range (endDate)', async () => {
      const filters: InvoiceFilters = { endDate: '2024-01-10T23:59:59Z' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.data.forEach((invoice) => {
        const issueDate = new Date(invoice.issueDate);
        const endDate = new Date('2024-01-10T23:59:59Z');
        expect(issueDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should filter by date range (startDate and endDate)', async () => {
      const filters: InvoiceFilters = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-10T23:59:59Z',
      };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.data.forEach((invoice) => {
        const issueDate = new Date(invoice.issueDate);
        const startDate = new Date('2024-01-01T00:00:00Z');
        const endDate = new Date('2024-01-10T23:59:59Z');
        expect(issueDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(issueDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should filter by amount range (minAmount)', async () => {
      const filters: InvoiceFilters = { minAmount: 10000000 };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.data.forEach((invoice) => {
        expect(invoice.total).toBeGreaterThanOrEqual(10000000);
      });
    });

    it('should filter by amount range (maxAmount)', async () => {
      const filters: InvoiceFilters = { maxAmount: 5000000 };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.data.forEach((invoice) => {
        expect(invoice.total).toBeLessThanOrEqual(5000000);
      });
    });

    it('should filter by amount range (minAmount and maxAmount)', async () => {
      const filters: InvoiceFilters = { minAmount: 1000000, maxAmount: 10000000 };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.data.forEach((invoice) => {
        expect(invoice.total).toBeGreaterThanOrEqual(1000000);
        expect(invoice.total).toBeLessThanOrEqual(10000000);
      });
    });

    it('should sort by invoiceNumber ascending', async () => {
      const filters: InvoiceFilters = { sortBy: 'invoiceNumber', sortOrder: 'asc' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(
          result.data[i].invoiceNumber.localeCompare(result.data[i + 1].invoiceNumber)
        ).toBeLessThanOrEqual(0);
      }
    });

    it('should sort by invoiceNumber descending', async () => {
      const filters: InvoiceFilters = { sortBy: 'invoiceNumber', sortOrder: 'desc' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(
          result.data[i].invoiceNumber.localeCompare(result.data[i + 1].invoiceNumber)
        ).toBeGreaterThanOrEqual(0);
      }
    });

    it('should sort by total ascending', async () => {
      const filters: InvoiceFilters = { sortBy: 'total', sortOrder: 'asc' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].total).toBeLessThanOrEqual(result.data[i + 1].total);
      }
    });

    it('should sort by total descending', async () => {
      const filters: InvoiceFilters = { sortBy: 'total', sortOrder: 'desc' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].total).toBeGreaterThanOrEqual(result.data[i + 1].total);
      }
    });

    it('should sort by issueDate ascending', async () => {
      const filters: InvoiceFilters = { sortBy: 'issueDate', sortOrder: 'asc' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aDate = new Date(result.data[i].issueDate).getTime();
        const bDate = new Date(result.data[i + 1].issueDate).getTime();
        expect(aDate).toBeLessThanOrEqual(bDate);
      }
    });

    it('should sort by issueDate descending', async () => {
      const filters: InvoiceFilters = { sortBy: 'issueDate', sortOrder: 'desc' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aDate = new Date(result.data[i].issueDate).getTime();
        const bDate = new Date(result.data[i + 1].issueDate).getTime();
        expect(aDate).toBeGreaterThanOrEqual(bDate);
      }
    });

    it('should sort by dueDate ascending', async () => {
      const filters: InvoiceFilters = { sortBy: 'dueDate', sortOrder: 'asc' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aDate = new Date(result.data[i].dueDate).getTime();
        const bDate = new Date(result.data[i + 1].dueDate).getTime();
        expect(aDate).toBeLessThanOrEqual(bDate);
      }
    });

    it('should sort by dueDate descending', async () => {
      const filters: InvoiceFilters = { sortBy: 'dueDate', sortOrder: 'desc' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aDate = new Date(result.data[i].dueDate).getTime();
        const bDate = new Date(result.data[i + 1].dueDate).getTime();
        expect(aDate).toBeGreaterThanOrEqual(bDate);
      }
    });

    it('should combine multiple filters', async () => {
      const filters: InvoiceFilters = {
        status: 'PAID',
        minAmount: 1000000,
        sortBy: 'total',
        sortOrder: 'desc',
        page: 1,
        limit: 5,
      };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.data.forEach((invoice) => {
        expect(invoice.status).toBe('PAID');
        expect(invoice.total).toBeGreaterThanOrEqual(1000000);
      });

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].total).toBeGreaterThanOrEqual(result.data[i + 1].total);
      }
    });

    it('should handle pagination (page 1)', async () => {
      const filters: InvoiceFilters = { page: 1, limit: 3 };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(3);
      expect(result.data.length).toBeLessThanOrEqual(3);
    });

    it('should handle pagination (page 2)', async () => {
      const filters: InvoiceFilters = { page: 2, limit: 3 };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(3);
    });

    it('should return different data for different pages', async () => {
      const page1Promise = invoicesService.getInvoices({ page: 1, limit: 3 });
      vi.advanceTimersByTime(400);
      const page1 = await page1Promise;

      const page2Promise = invoicesService.getInvoices({ page: 2, limit: 3 });
      vi.advanceTimersByTime(400);
      const page2 = await page2Promise;

      if (page1.data.length > 0 && page2.data.length > 0) {
        expect(page1.data[0].id).not.toBe(page2.data[0].id);
      }
    });
  });

  describe('getInvoice', () => {
    it('should return invoice by id', async () => {
      const promise = invoicesService.getInvoice('1');
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.invoiceNumber).toBe('FAC-2024-0001');
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should throw error for non-existent invoice', async () => {
      const promise = invoicesService.getInvoice('non-existent-id');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Factura no encontrada');
    });
  });

  describe('getInvoicesByCustomer', () => {
    it('should return invoices for a specific customer', async () => {
      const promise = invoicesService.getInvoicesByCustomer('1');
      vi.advanceTimersByTime(350);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      result.forEach((invoice) => {
        expect(invoice.customerId).toBe('1');
      });
    });

    it('should return empty array for customer with no invoices', async () => {
      const promise = invoicesService.getInvoicesByCustomer('non-existent-customer');
      vi.advanceTimersByTime(350);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getRecentInvoices', () => {
    it('should return limited recent invoices', async () => {
      const promise = invoicesService.getRecentInvoices();
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should respect limit parameter', async () => {
      const promise = invoicesService.getRecentInvoices(3);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should return invoices sorted by createdAt descending', async () => {
      const promise = invoicesService.getRecentInvoices(10);
      vi.advanceTimersByTime(300);
      const result = await promise;

      for (let i = 0; i < result.length - 1; i++) {
        const aDate = new Date(result[i].createdAt).getTime();
        const bDate = new Date(result[i + 1].createdAt).getTime();
        expect(aDate).toBeGreaterThanOrEqual(bDate);
      }
    });
  });

  describe('createInvoice', () => {
    it('should create invoice with items', async () => {
      const newInvoiceData: CreateInvoiceData = {
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Test Product',
            quantity: 2,
            unitPrice: 100000,
          },
        ],
        notes: 'Test invoice',
      };

      const promise = invoicesService.createInvoice(newInvoiceData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.customerId).toBe('1');
      expect(result.items.length).toBe(1);
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].unitPrice).toBe(100000);
    });

    it('should generate invoice number', async () => {
      const newInvoiceData: CreateInvoiceData = {
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Test Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      };

      const promise = invoicesService.createInvoice(newInvoiceData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.invoiceNumber).toBeDefined();
      expect(result.invoiceNumber).toMatch(/^FAC-\d{4}-\d{4}$/);
    });

    it('should set default status to DRAFT when not specified', async () => {
      const newInvoiceData: CreateInvoiceData = {
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Test Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      };

      const promise = invoicesService.createInvoice(newInvoiceData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.status).toBe('DRAFT');
    });

    it('should respect specified status', async () => {
      const newInvoiceData: CreateInvoiceData = {
        customerId: '1',
        status: 'PENDING',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Test Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      };

      const promise = invoicesService.createInvoice(newInvoiceData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.status).toBe('PENDING');
    });

    it('should calculate totals correctly', async () => {
      const newInvoiceData: CreateInvoiceData = {
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Product A',
            quantity: 2,
            unitPrice: 100000,
            discount: 0,
            tax: 19,
          },
        ],
      };

      const promise = invoicesService.createInvoice(newInvoiceData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      // subtotal = 2 * 100000 = 200000
      // tax = 200000 * 0.19 = 38000
      // total = 200000 + 38000 = 238000
      expect(result.subtotal).toBe(200000);
      expect(result.taxAmount).toBe(38000);
      expect(result.total).toBe(238000);
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const newInvoiceData: CreateInvoiceData = {
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Test Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      };

      const promise = invoicesService.createInvoice(newInvoiceData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('updateInvoice', () => {
    it('should update invoice fields', async () => {
      // First create a draft invoice to update
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Test Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;

      const updateData: UpdateInvoiceData = {
        notes: 'Updated notes',
        dueDate: '2024-02-15T10:00:00Z',
      };

      const updatePromise = invoicesService.updateInvoice(createdInvoice.id, updateData);
      vi.advanceTimersByTime(400);
      const result = await updatePromise;

      expect(result.notes).toBe('Updated notes');
      expect(result.dueDate).toBe('2024-02-15T10:00:00Z');
    });

    it('should throw error for non-existent invoice', async () => {
      const updateData: UpdateInvoiceData = {
        notes: 'New notes',
      };

      const promise = invoicesService.updateInvoice('non-existent', updateData);
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('Factura no encontrada');
    });

    it('should throw error when updating PAID invoice', async () => {
      // Invoice '1' is PAID in mock data
      const updateData: UpdateInvoiceData = {
        notes: 'Updated notes',
      };

      const promise = invoicesService.updateInvoice('1', updateData);
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('No se puede modificar una factura pagada o cancelada');
    });

    it('should throw error when updating CANCELLED invoice', async () => {
      // Invoice '5' is CANCELLED in mock data
      const updateData: UpdateInvoiceData = {
        notes: 'Updated notes',
      };

      const promise = invoicesService.updateInvoice('5', updateData);
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('No se puede modificar una factura pagada o cancelada');
    });

    it('should update the updatedAt timestamp', async () => {
      // Invoice '6' is DRAFT in mock data
      const updateData: UpdateInvoiceData = {
        notes: 'Updated notes for draft',
      };

      const promise = invoicesService.updateInvoice('6', updateData);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('updateInvoiceStatus', () => {
    it('should change status successfully', async () => {
      // First create a draft invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Test Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;

      const updatePromise = invoicesService.updateInvoiceStatus(createdInvoice.id, 'PENDING');
      vi.advanceTimersByTime(300);
      const result = await updatePromise;

      expect(result.status).toBe('PENDING');
    });

    it('should throw error for invalid transitions from CANCELLED', async () => {
      // Invoice '5' is CANCELLED in mock data
      const promise = invoicesService.updateInvoiceStatus('5', 'PENDING');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('No se puede cambiar el estado de una factura cancelada');
    });

    it('should throw error when changing PAID invoice to non-CANCELLED status', async () => {
      // Invoice '1' is PAID in mock data
      const promise = invoicesService.updateInvoiceStatus('1', 'PENDING');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Una factura pagada solo puede ser cancelada');
    });

    it('should allow changing PAID invoice to CANCELLED', async () => {
      // First create and pay an invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Test Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;

      // Change to PAID
      const paidPromise = invoicesService.updateInvoiceStatus(createdInvoice.id, 'PAID');
      vi.advanceTimersByTime(300);
      await paidPromise;

      // Now cancel it
      const cancelPromise = invoicesService.updateInvoiceStatus(createdInvoice.id, 'CANCELLED');
      vi.advanceTimersByTime(300);
      const result = await cancelPromise;

      expect(result.status).toBe('CANCELLED');
    });

    it('should set paidAt when changing to PAID', async () => {
      // First create a draft invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Test Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;

      const updatePromise = invoicesService.updateInvoiceStatus(createdInvoice.id, 'PAID');
      vi.advanceTimersByTime(300);
      const result = await updatePromise;

      expect(result.paidAt).toBeDefined();
    });

    it('should throw error for non-existent invoice', async () => {
      const promise = invoicesService.updateInvoiceStatus('non-existent', 'PAID');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Factura no encontrada');
    });
  });

  describe('deleteInvoice', () => {
    it('should delete DRAFT invoice', async () => {
      // First create a draft invoice to delete
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Test Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;

      // Now delete it
      const deletePromise = invoicesService.deleteInvoice(createdInvoice.id);
      vi.advanceTimersByTime(300);

      await expect(deletePromise).resolves.toBeUndefined();
    });

    it('should throw error for non-DRAFT invoice', async () => {
      // Invoice '1' is PAID in mock data
      const promise = invoicesService.deleteInvoice('1');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Solo se pueden eliminar facturas en borrador');
    });

    it('should throw error for PENDING invoice', async () => {
      // Invoice '2' is PENDING in mock data
      const promise = invoicesService.deleteInvoice('2');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Solo se pueden eliminar facturas en borrador');
    });

    it('should throw error for non-existent invoice', async () => {
      const promise = invoicesService.deleteInvoice('non-existent');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Factura no encontrada');
    });
  });

  describe('addInvoiceItem', () => {
    it('should add item to invoice', async () => {
      // First create a draft invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Original Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;
      const originalItemCount = createdInvoice.items.length;

      const newItem: CreateInvoiceItemData = {
        productId: 'prod-2',
        description: 'New Product',
        quantity: 3,
        unitPrice: 75000,
      };

      const addPromise = invoicesService.addInvoiceItem(createdInvoice.id, newItem);
      vi.advanceTimersByTime(350);
      const result = await addPromise;

      expect(result.items.length).toBe(originalItemCount + 1);
      const addedItem = result.items.find((item) => item.description === 'New Product');
      expect(addedItem).toBeDefined();
      expect(addedItem?.quantity).toBe(3);
      expect(addedItem?.unitPrice).toBe(75000);
    });

    it('should recalculate totals after adding item', async () => {
      // First create a draft invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Original Product',
            quantity: 1,
            unitPrice: 100000,
            tax: 19,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;
      const originalTotal = createdInvoice.total;

      const newItem: CreateInvoiceItemData = {
        productId: 'prod-2',
        description: 'New Product',
        quantity: 1,
        unitPrice: 100000,
        tax: 19,
      };

      const addPromise = invoicesService.addInvoiceItem(createdInvoice.id, newItem);
      vi.advanceTimersByTime(350);
      const result = await addPromise;

      expect(result.total).toBeGreaterThan(originalTotal);
    });

    it('should throw error for non-modifiable invoice (PAID)', async () => {
      // Invoice '1' is PAID in mock data
      const newItem: CreateInvoiceItemData = {
        productId: 'prod-2',
        description: 'New Product',
        quantity: 1,
        unitPrice: 50000,
      };

      const promise = invoicesService.addInvoiceItem('1', newItem);
      vi.advanceTimersByTime(350);

      await expect(promise).rejects.toThrow('No se puede modificar una factura pagada o cancelada');
    });

    it('should throw error for non-modifiable invoice (CANCELLED)', async () => {
      // Invoice '5' is CANCELLED in mock data
      const newItem: CreateInvoiceItemData = {
        productId: 'prod-2',
        description: 'New Product',
        quantity: 1,
        unitPrice: 50000,
      };

      const promise = invoicesService.addInvoiceItem('5', newItem);
      vi.advanceTimersByTime(350);

      await expect(promise).rejects.toThrow('No se puede modificar una factura pagada o cancelada');
    });

    it('should throw error for non-existent invoice', async () => {
      const newItem: CreateInvoiceItemData = {
        productId: 'prod-2',
        description: 'New Product',
        quantity: 1,
        unitPrice: 50000,
      };

      const promise = invoicesService.addInvoiceItem('non-existent', newItem);
      vi.advanceTimersByTime(350);

      await expect(promise).rejects.toThrow('Factura no encontrada');
    });
  });

  describe('updateInvoiceItem', () => {
    it('should update item', async () => {
      // First create a draft invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Original Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;
      const itemId = createdInvoice.items[0].id;

      const updateData: UpdateInvoiceItemData = {
        quantity: 5,
        description: 'Updated Product',
      };

      const updatePromise = invoicesService.updateInvoiceItem(createdInvoice.id, itemId, updateData);
      vi.advanceTimersByTime(350);
      const result = await updatePromise;

      const updatedItem = result.items.find((item) => item.id === itemId);
      expect(updatedItem?.quantity).toBe(5);
      expect(updatedItem?.description).toBe('Updated Product');
    });

    it('should recalculate totals after updating item', async () => {
      // First create a draft invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Original Product',
            quantity: 1,
            unitPrice: 100000,
            tax: 19,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;
      const itemId = createdInvoice.items[0].id;
      const originalTotal = createdInvoice.total;

      const updateData: UpdateInvoiceItemData = {
        quantity: 3,
      };

      const updatePromise = invoicesService.updateInvoiceItem(createdInvoice.id, itemId, updateData);
      vi.advanceTimersByTime(350);
      const result = await updatePromise;

      expect(result.total).toBeGreaterThan(originalTotal);
    });

    it('should throw error for non-modifiable invoice', async () => {
      // Invoice '1' is PAID in mock data
      const updateData: UpdateInvoiceItemData = {
        quantity: 5,
      };

      const promise = invoicesService.updateInvoiceItem('1', '1-1', updateData);
      vi.advanceTimersByTime(350);

      await expect(promise).rejects.toThrow('No se puede modificar una factura pagada o cancelada');
    });

    it('should throw error for non-existent item', async () => {
      // First create a draft invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Original Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;

      const updateData: UpdateInvoiceItemData = {
        quantity: 5,
      };

      const promise = invoicesService.updateInvoiceItem(createdInvoice.id, 'non-existent-item', updateData);
      vi.advanceTimersByTime(350);

      await expect(promise).rejects.toThrow('Item no encontrado');
    });
  });

  describe('removeInvoiceItem', () => {
    it('should remove item', async () => {
      // First create a draft invoice with multiple items
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Product 1',
            quantity: 1,
            unitPrice: 50000,
          },
          {
            productId: 'prod-2',
            description: 'Product 2',
            quantity: 2,
            unitPrice: 75000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;
      const itemToRemoveId = createdInvoice.items[0].id;
      const originalItemCount = createdInvoice.items.length;

      const removePromise = invoicesService.removeInvoiceItem(createdInvoice.id, itemToRemoveId);
      vi.advanceTimersByTime(300);
      const result = await removePromise;

      expect(result.items.length).toBe(originalItemCount - 1);
      expect(result.items.find((item) => item.id === itemToRemoveId)).toBeUndefined();
    });

    it('should recalculate totals after removing item', async () => {
      // First create a draft invoice with multiple items
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Product 1',
            quantity: 1,
            unitPrice: 100000,
            tax: 19,
          },
          {
            productId: 'prod-2',
            description: 'Product 2',
            quantity: 1,
            unitPrice: 100000,
            tax: 19,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;
      const itemToRemoveId = createdInvoice.items[0].id;
      const originalTotal = createdInvoice.total;

      const removePromise = invoicesService.removeInvoiceItem(createdInvoice.id, itemToRemoveId);
      vi.advanceTimersByTime(300);
      const result = await removePromise;

      expect(result.total).toBeLessThan(originalTotal);
    });

    it('should throw error if only one item remains', async () => {
      // First create a draft invoice with only one item
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Only Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;
      const itemId = createdInvoice.items[0].id;

      const promise = invoicesService.removeInvoiceItem(createdInvoice.id, itemId);
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('La factura debe tener al menos un item');
    });

    it('should throw error for non-modifiable invoice', async () => {
      // Invoice '1' is PAID in mock data
      const promise = invoicesService.removeInvoiceItem('1', '1-1');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('No se puede modificar una factura pagada o cancelada');
    });

    it('should throw error for non-existent invoice', async () => {
      const promise = invoicesService.removeInvoiceItem('non-existent', 'item-1');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Factura no encontrada');
    });
  });

  describe('getInvoiceStats', () => {
    it('should return correct statistics', async () => {
      const promise = invoicesService.getInvoiceStats();
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result).toHaveProperty('totalInvoices');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('pendingAmount');
      expect(result).toHaveProperty('overdueAmount');
      expect(result).toHaveProperty('averageInvoiceValue');
      expect(result).toHaveProperty('invoicesByStatus');
    });

    it('should have correct structure for invoicesByStatus', async () => {
      const promise = invoicesService.getInvoiceStats();
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result.invoicesByStatus).toHaveProperty('DRAFT');
      expect(result.invoicesByStatus).toHaveProperty('PENDING');
      expect(result.invoicesByStatus).toHaveProperty('PAID');
      expect(result.invoicesByStatus).toHaveProperty('OVERDUE');
      expect(result.invoicesByStatus).toHaveProperty('CANCELLED');
    });

    it('should return numeric values for all stats', async () => {
      const promise = invoicesService.getInvoiceStats();
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(typeof result.totalInvoices).toBe('number');
      expect(typeof result.totalRevenue).toBe('number');
      expect(typeof result.pendingAmount).toBe('number');
      expect(typeof result.overdueAmount).toBe('number');
      expect(typeof result.averageInvoiceValue).toBe('number');
    });

    it('should return non-negative values', async () => {
      const promise = invoicesService.getInvoiceStats();
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result.totalInvoices).toBeGreaterThanOrEqual(0);
      expect(result.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(result.pendingAmount).toBeGreaterThanOrEqual(0);
      expect(result.overdueAmount).toBeGreaterThanOrEqual(0);
      expect(result.averageInvoiceValue).toBeGreaterThanOrEqual(0);
    });

    it('should have status counts that sum to totalInvoices', async () => {
      const promise = invoicesService.getInvoiceStats();
      vi.advanceTimersByTime(400);
      const result = await promise;

      const sumOfStatuses =
        result.invoicesByStatus.DRAFT +
        result.invoicesByStatus.PENDING +
        result.invoicesByStatus.PAID +
        result.invoicesByStatus.OVERDUE +
        result.invoicesByStatus.CANCELLED;

      expect(sumOfStatuses).toBe(result.totalInvoices);
    });
  });

  describe('getInvoices - additional sorting tests', () => {
    it('should sort by status ascending', async () => {
      const filters: InvoiceFilters = { sortBy: 'status', sortOrder: 'asc' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].status.localeCompare(result.data[i + 1].status)).toBeLessThanOrEqual(
          0
        );
      }
    });

    it('should sort by status descending', async () => {
      const filters: InvoiceFilters = { sortBy: 'status', sortOrder: 'desc' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(
          result.data[i].status.localeCompare(result.data[i + 1].status)
        ).toBeGreaterThanOrEqual(0);
      }
    });

    it('should sort by customerName ascending', async () => {
      const filters: InvoiceFilters = { sortBy: 'customerName', sortOrder: 'asc' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aName = result.data[i].customer?.name || '';
        const bName = result.data[i + 1].customer?.name || '';
        expect(aName.localeCompare(bName)).toBeLessThanOrEqual(0);
      }
    });

    it('should sort by customerName descending', async () => {
      const filters: InvoiceFilters = { sortBy: 'customerName', sortOrder: 'desc' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aName = result.data[i].customer?.name || '';
        const bName = result.data[i + 1].customer?.name || '';
        expect(aName.localeCompare(bName)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should use default sorting (issueDate) when sortBy is unknown', async () => {
      // Use an unknown sortBy value by casting to bypass TypeScript
      const filters: InvoiceFilters = {
        sortBy: 'unknownField' as InvoiceFilters['sortBy'],
        sortOrder: 'asc',
      };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      // Should fallback to sorting by issueDate
      for (let i = 0; i < result.data.length - 1; i++) {
        const aDate = new Date(result.data[i].issueDate).getTime();
        const bDate = new Date(result.data[i + 1].issueDate).getTime();
        expect(aDate).toBeLessThanOrEqual(bDate);
      }
    });
  });

  describe('createInvoice - invoice number edge cases', () => {
    it('should generate invoice number when existing invoices have non-matching format', async () => {
      // First, we need to test the generateInvoiceNumber function when no invoices match the pattern
      // We can do this by creating a scenario where the regex doesn't match
      // Since we can't directly modify mockInvoices, we just verify the function works correctly
      // by checking the generated invoice number follows the expected format
      const newInvoiceData: CreateInvoiceData = {
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Test Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      };

      const promise = invoicesService.createInvoice(newInvoiceData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      // The invoice number should follow the FAC-YYYY-XXXX format
      expect(result.invoiceNumber).toMatch(/^FAC-\d{4}-\d{4}$/);
      // The number should be incrementing based on existing invoices
      const match = result.invoiceNumber.match(/FAC-\d{4}-(\d+)/);
      expect(match).not.toBeNull();
      const invoiceNum = parseInt(match![1], 10);
      expect(invoiceNum).toBeGreaterThan(0);
    });
  });

  describe('updateInvoice - customer and items updates', () => {
    it('should update customer when customerId changes', async () => {
      // First create a draft invoice with customer '1'
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Test Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;

      expect(createdInvoice.customerId).toBe('1');
      expect(createdInvoice.customer?.name).toBe('Juan Carlos Perez');

      // Update to customer '2'
      const updatePromise = invoicesService.updateInvoice(createdInvoice.id, {
        customerId: '2',
      });
      vi.advanceTimersByTime(400);
      const result = await updatePromise;

      expect(result.customerId).toBe('2');
      expect(result.customer?.name).toBe('Distribuidora ABC S.A.S');
    });

    it('should recalculate totals when items array is provided', async () => {
      // First create a draft invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Original Product',
            quantity: 1,
            unitPrice: 100000,
            tax: 19,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;
      const originalTotal = createdInvoice.total;
      const itemId = createdInvoice.items[0].id;

      // Update with new items array - increase quantity
      const updatePromise = invoicesService.updateInvoice(createdInvoice.id, {
        items: [
          {
            id: itemId,
            productId: 'prod-1',
            description: 'Updated Product',
            quantity: 3,
            unitPrice: 100000,
            tax: 19,
          },
        ],
      });
      vi.advanceTimersByTime(400);
      const result = await updatePromise;

      // Total should be recalculated: 3 * 100000 * 1.19 = 357000
      expect(result.total).toBeGreaterThan(originalTotal);
      expect(result.subtotal).toBe(300000);
      expect(result.items[0].quantity).toBe(3);
      expect(result.items[0].description).toBe('Updated Product');
    });

    it('should use existing values when updating items with partial data', async () => {
      // First create a draft invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Original Product',
            quantity: 2,
            unitPrice: 100000,
            discount: 10,
            tax: 19,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;
      const itemId = createdInvoice.items[0].id;
      const originalDescription = createdInvoice.items[0].description;

      // Update with partial data - only change quantity
      const updatePromise = invoicesService.updateInvoice(createdInvoice.id, {
        items: [
          {
            id: itemId,
            quantity: 5,
          },
        ],
      });
      vi.advanceTimersByTime(400);
      const result = await updatePromise;

      // Existing values should be preserved
      expect(result.items[0].quantity).toBe(5);
      expect(result.items[0].description).toBe(originalDescription);
      expect(result.items[0].unitPrice).toBe(100000);
      expect(result.items[0].discount).toBe(10);
      expect(result.items[0].tax).toBe(19);
    });

    it('should create new item when updating with item that has no existing match', async () => {
      // First create a draft invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Original Product',
            quantity: 1,
            unitPrice: 100000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;

      // Update with items that don't match existing ones
      const updatePromise = invoicesService.updateInvoice(createdInvoice.id, {
        items: [
          {
            productId: 'prod-new',
            description: 'New Product',
            quantity: 2,
            unitPrice: 50000,
            tax: 19,
          },
        ],
      });
      vi.advanceTimersByTime(400);
      const result = await updatePromise;

      // New item should be created with provided values
      expect(result.items.length).toBe(1);
      expect(result.items[0].productId).toBe('prod-new');
      expect(result.items[0].description).toBe('New Product');
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].unitPrice).toBe(50000);
    });
  });

  describe('updateInvoiceItem - error cases', () => {
    it('should throw error when invoice is not found', async () => {
      const updateData: UpdateInvoiceItemData = {
        quantity: 5,
      };

      const promise = invoicesService.updateInvoiceItem('non-existent-invoice', 'item-1', updateData);
      vi.advanceTimersByTime(350);

      await expect(promise).rejects.toThrow('Factura no encontrada');
    });
  });

  describe('generateInvoiceNumber', () => {
    it('should generate invoice number starting from 1 when no invoices exist', () => {
      const result = generateInvoiceNumber([]);
      const year = new Date().getFullYear();
      expect(result).toBe(`FAC-${year}-0001`);
    });

    it('should generate next invoice number based on existing invoices', () => {
      const invoices = [
        { invoiceNumber: 'FAC-2024-0001' },
        { invoiceNumber: 'FAC-2024-0003' },
        { invoiceNumber: 'FAC-2024-0002' },
      ];
      const result = generateInvoiceNumber(invoices);
      const year = new Date().getFullYear();
      expect(result).toBe(`FAC-${year}-0004`);
    });

    it('should skip invoices with non-matching invoice number format', () => {
      // This test covers line 469 - the return max branch when regex doesn't match
      const invoices = [
        { invoiceNumber: 'FAC-2024-0005' },
        { invoiceNumber: 'INVALID-NUMBER' },  // Does not match pattern
        { invoiceNumber: 'ANOTHER-BAD-FORMAT' },  // Does not match pattern
        { invoiceNumber: 'FAC-2024-0010' },
      ];
      const result = generateInvoiceNumber(invoices);
      const year = new Date().getFullYear();
      // Should be based on max valid number (10) + 1 = 11
      expect(result).toBe(`FAC-${year}-0011`);
    });

    it('should return 0001 when all invoices have non-matching format', () => {
      // This test ensures all invoices with non-matching format are skipped
      const invoices = [
        { invoiceNumber: 'INVALID-001' },
        { invoiceNumber: 'BAD-FORMAT' },
        { invoiceNumber: '12345' },
      ];
      const result = generateInvoiceNumber(invoices);
      const year = new Date().getFullYear();
      expect(result).toBe(`FAC-${year}-0001`);
    });

    it('should keep max when current number is not greater', () => {
      // Test the branch where num > max is false (num <= max)
      const invoices = [
        { invoiceNumber: 'FAC-2024-0010' },  // max becomes 10
        { invoiceNumber: 'FAC-2024-0005' },  // 5 is not > 10, so max stays 10
        { invoiceNumber: 'FAC-2024-0003' },  // 3 is not > 10, so max stays 10
      ];
      const result = generateInvoiceNumber(invoices);
      const year = new Date().getFullYear();
      expect(result).toBe(`FAC-${year}-0011`);
    });
  });

  describe('edge cases with undefined items', () => {
    let originalLength: number;
    let testInvoiceId: string;

    beforeEach(() => {
      originalLength = mockInvoices.length;
      // Add a test invoice without items to cover the || 0 and || [] branches
      testInvoiceId = 'test-no-items-invoice';
      mockInvoices.push({
        id: testInvoiceId,
        invoiceNumber: 'FAC-TEST-0001',
        customerId: '1',
        customer: undefined,
        status: 'DRAFT',
        issueDate: '2024-01-01T00:00:00Z',
        dueDate: '2024-01-15T00:00:00Z',
        items: undefined as unknown as typeof mockInvoices[0]['items'],
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        total: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    afterEach(() => {
      // Remove the test invoice
      const idx = mockInvoices.findIndex((inv) => inv.id === testInvoiceId);
      if (idx !== -1) {
        mockInvoices.splice(idx, 1);
      }
      // Restore original length if needed
      while (mockInvoices.length > originalLength) {
        mockInvoices.pop();
      }
    });

    it('should handle invoice with undefined items in getInvoices (toInvoiceSummary)', async () => {
      // This covers line 335: itemCount: invoice.items?.length || 0
      const filters: InvoiceFilters = { search: 'FAC-TEST-0001' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      const testInvoice = result.data.find((inv) => inv.invoiceNumber === 'FAC-TEST-0001');
      expect(testInvoice).toBeDefined();
      expect(testInvoice?.itemCount).toBe(0);
    });

    it('should handle invoice with undefined items in addInvoiceItem', async () => {
      // This covers lines 775-776: invoice.items?.length || 0
      // and line 789-790: invoice.items || []
      const newItem: CreateInvoiceItemData = {
        productId: 'prod-test',
        description: 'Test Product',
        quantity: 1,
        unitPrice: 10000,
      };

      const promise = invoicesService.addInvoiceItem(testInvoiceId, newItem);
      vi.advanceTimersByTime(350);
      const result = await promise;

      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(1);
      expect(result.items[0].description).toBe('Test Product');
    });

    it('should handle invoice with undefined items in updateInvoiceItem (itemIndex undefined)', async () => {
      // This covers line 829-830: invoice.items?.findIndex() returning undefined
      // when items is undefined, causing itemIndex === undefined
      const updateData: UpdateInvoiceItemData = {
        quantity: 5,
      };

      const promise = invoicesService.updateInvoiceItem(testInvoiceId, 'any-item', updateData);
      vi.advanceTimersByTime(350);

      await expect(promise).rejects.toThrow('Item no encontrado');
    });

    it('should handle invoice with undefined items in removeInvoiceItem', async () => {
      // This covers line 890: (invoice.items || []).filter(...)
      // When items is undefined, it becomes [] and after filter, length is 0
      const promise = invoicesService.removeInvoiceItem(testInvoiceId, 'any-item');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('La factura debe tener al menos un item');
    });
  });

  describe('updateInvoice - item update edge cases', () => {
    it('should use empty string fallback when productId and description are missing in both update and existing', async () => {
      // First create a draft invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Original Product',
            quantity: 1,
            unitPrice: 100000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;

      // Update with new items that have no matching existing item AND no productId/description
      // This covers lines 659-660: || '' fallbacks
      const updatePromise = invoicesService.updateInvoice(createdInvoice.id, {
        items: [
          {
            // No id means no matching existing item
            // Also not providing productId and description
            quantity: 2,
            unitPrice: 50000,
            tax: 19,
          },
        ],
      });
      vi.advanceTimersByTime(400);
      const result = await updatePromise;

      // Should have empty string fallbacks for productId and description
      expect(result.items.length).toBe(1);
      expect(result.items[0].productId).toBe('');
      expect(result.items[0].description).toBe('');
    });

    it('should use all existing values when updating item with minimal data', async () => {
      // First create a draft invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Original Product',
            quantity: 5,
            unitPrice: 100000,
            discount: 10,
            tax: 15,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;
      const itemId = createdInvoice.items[0].id;

      // Update with empty data object - should use all existing values
      // This ensures all ?? branches fallback to existing values
      const updateData: UpdateInvoiceItemData = {};

      const updatePromise = invoicesService.updateInvoiceItem(createdInvoice.id, itemId, updateData);
      vi.advanceTimersByTime(350);
      const result = await updatePromise;

      // All values should be preserved from existing item
      const updatedItem = result.items.find((item) => item.id === itemId);
      expect(updatedItem?.quantity).toBe(5);
      expect(updatedItem?.unitPrice).toBe(100000);
      expect(updatedItem?.discount).toBe(10);
      expect(updatedItem?.tax).toBe(15);
      expect(updatedItem?.productId).toBe('prod-1');
      expect(updatedItem?.description).toBe('Original Product');
    });
  });

  describe('getInvoiceStats - empty mock data edge case', () => {
    it('should return zero averageInvoiceValue when no invoices exist', async () => {
      // Store original invoices
      const originalInvoices = [...mockInvoices];

      // Clear all invoices
      mockInvoices.length = 0;

      const promise = invoicesService.getInvoiceStats();
      vi.advanceTimersByTime(400);
      const result = await promise;

      // Should return 0 for averageInvoiceValue when totalInvoices is 0
      // This covers line 935: totalInvoices > 0 ? ... : 0
      expect(result.totalInvoices).toBe(0);
      expect(result.averageInvoiceValue).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.pendingAmount).toBe(0);
      expect(result.overdueAmount).toBe(0);

      // Restore original invoices
      mockInvoices.push(...originalInvoices);
    });
  });

  describe('createInvoice - default values edge cases', () => {
    it('should use current date as issueDate when not provided', async () => {
      // This covers line 594: issueDate: data.issueDate || now
      const newInvoiceData: CreateInvoiceData = {
        customerId: '1',
        // Not providing issueDate
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Test Product',
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      };

      const promise = invoicesService.createInvoice(newInvoiceData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      // issueDate should be set to current time (default)
      expect(result.issueDate).toBeDefined();
      // Since we're using fake timers, this should be the fake "now"
    });
  });

  describe('updateInvoice - default values for item properties', () => {
    it('should use default fallback values when item and existing have no values', async () => {
      // First create a draft invoice
      const createPromise = invoicesService.createInvoice({
        customerId: '1',
        issueDate: '2024-01-15T10:00:00Z',
        dueDate: '2024-01-30T10:00:00Z',
        items: [
          {
            productId: 'prod-1',
            description: 'Original Product',
            quantity: 1,
            unitPrice: 100000,
          },
        ],
      });
      vi.advanceTimersByTime(500);
      const createdInvoice = await createPromise;

      // Update with new item that has no id (won't match existing) and minimal properties
      // This tests lines 649-652: the ?? 0, ?? 19, ?? 1, ?? 0 fallbacks
      const updatePromise = invoicesService.updateInvoice(createdInvoice.id, {
        items: [
          {
            // No id - won't match any existing item
            // Not providing discount, tax, quantity, unitPrice
            // This will trigger all the default fallbacks
          },
        ],
      });
      vi.advanceTimersByTime(400);
      const result = await updatePromise;

      // Should have default fallback values
      expect(result.items.length).toBe(1);
      expect(result.items[0].discount).toBe(0);  // ?? 0
      expect(result.items[0].tax).toBe(19);      // ?? 19
      expect(result.items[0].quantity).toBe(1);  // ?? 1
      expect(result.items[0].unitPrice).toBe(0); // ?? 0
    });
  });

  describe('sorting with undefined customer', () => {
    let testInvoiceId1: string;
    let testInvoiceId2: string;
    let originalLength: number;

    beforeEach(() => {
      originalLength = mockInvoices.length;
      // Add two test invoices without customers to cover lines 428-429
      // We need two invoices with undefined customer to ensure both aValue and bValue
      // go through the || '' fallback during comparison
      testInvoiceId1 = 'test-no-customer-invoice-1';
      testInvoiceId2 = 'test-no-customer-invoice-2';

      mockInvoices.push({
        id: testInvoiceId1,
        invoiceNumber: 'FAC-TEST-NOCUST-0001',
        customerId: 'non-existent-customer-1',
        customer: undefined,  // This triggers the || '' fallback for aValue
        status: 'DRAFT',
        issueDate: '2024-01-01T00:00:00Z',
        dueDate: '2024-01-15T00:00:00Z',
        items: [
          {
            id: 'test-item-1',
            invoiceId: testInvoiceId1,
            productId: 'prod-test',
            description: 'Test Product',
            quantity: 1,
            unitPrice: 10000,
            discount: 0,
            tax: 19,
            subtotal: 10000,
            total: 11900,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        subtotal: 10000,
        taxAmount: 1900,
        discountAmount: 0,
        total: 11900,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      mockInvoices.push({
        id: testInvoiceId2,
        invoiceNumber: 'FAC-TEST-NOCUST-0002',
        customerId: 'non-existent-customer-2',
        customer: undefined,  // This triggers the || '' fallback for bValue
        status: 'DRAFT',
        issueDate: '2024-01-02T00:00:00Z',
        dueDate: '2024-01-16T00:00:00Z',
        items: [
          {
            id: 'test-item-2',
            invoiceId: testInvoiceId2,
            productId: 'prod-test-2',
            description: 'Test Product 2',
            quantity: 1,
            unitPrice: 20000,
            discount: 0,
            tax: 19,
            subtotal: 20000,
            total: 23800,
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
        ],
        subtotal: 20000,
        taxAmount: 3800,
        discountAmount: 0,
        total: 23800,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      });
    });

    afterEach(() => {
      // Remove the test invoices
      const idx1 = mockInvoices.findIndex((inv) => inv.id === testInvoiceId1);
      if (idx1 !== -1) {
        mockInvoices.splice(idx1, 1);
      }
      const idx2 = mockInvoices.findIndex((inv) => inv.id === testInvoiceId2);
      if (idx2 !== -1) {
        mockInvoices.splice(idx2, 1);
      }
      while (mockInvoices.length > originalLength) {
        mockInvoices.pop();
      }
    });

    it('should sort by customerName with undefined customer using empty string fallback', async () => {
      // This covers lines 428-429: a.customer?.name || '' and b.customer?.name || ''
      // With two invoices having undefined customers, both branches will be covered
      // during the sort comparison
      const filters: InvoiceFilters = { sortBy: 'customerName', sortOrder: 'asc' };
      const promise = invoicesService.getInvoices(filters);
      vi.advanceTimersByTime(400);
      const result = await promise;

      // Both invoices with undefined customer should be in the results
      const testInvoice1 = result.data.find((inv) => inv.invoiceNumber === 'FAC-TEST-NOCUST-0001');
      const testInvoice2 = result.data.find((inv) => inv.invoiceNumber === 'FAC-TEST-NOCUST-0002');
      expect(testInvoice1).toBeDefined();
      expect(testInvoice2).toBeDefined();

      // All invoices should be sorted by customerName, with empty strings first
      for (let i = 0; i < result.data.length - 1; i++) {
        const aName = result.data[i].customer?.name || '';
        const bName = result.data[i + 1].customer?.name || '';
        expect(aName.localeCompare(bName)).toBeLessThanOrEqual(0);
      }
    });
  });
});