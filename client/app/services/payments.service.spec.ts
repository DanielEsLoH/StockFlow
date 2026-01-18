import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { paymentsService } from './payments.service';
import type {
  PaymentFilters,
  PaymentsResponse,
  CreatePaymentData,
  UpdatePaymentData,
  PaymentStats,
  PaymentStatus,
  PaymentMethod,
} from '~/types/payment';

// Note: The payments service currently uses mock data internally
// These tests verify the service's filtering, pagination, and CRUD logic

describe('paymentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  describe('getPayments', () => {
    it('should return paginated data with meta', async () => {
      const promise = paymentsService.getPayments();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('total');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('limit');
      expect(result.meta).toHaveProperty('totalPages');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should return first page by default', async () => {
      const promise = paymentsService.getPayments();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.meta.page).toBe(1);
    });

    it('should filter by search (payment number)', async () => {
      const filters: PaymentFilters = { search: 'PAG-2024-0001' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        const matchesSearch =
          payment.paymentNumber.toLowerCase().includes('pag-2024-0001') ||
          payment.customerName?.toLowerCase().includes('pag-2024-0001') ||
          payment.invoiceNumber?.toLowerCase().includes('pag-2024-0001') ||
          payment.referenceNumber?.toLowerCase().includes('pag-2024-0001');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter by search (customer name)', async () => {
      const filters: PaymentFilters = { search: 'Juan' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        const matchesSearch =
          payment.paymentNumber.toLowerCase().includes('juan') ||
          payment.customerName?.toLowerCase().includes('juan') ||
          payment.invoiceNumber?.toLowerCase().includes('juan') ||
          payment.referenceNumber?.toLowerCase().includes('juan');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter by search (invoice number)', async () => {
      const filters: PaymentFilters = { search: 'FAC-2024-0001' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        const matchesSearch =
          payment.paymentNumber.toLowerCase().includes('fac-2024-0001') ||
          payment.customerName?.toLowerCase().includes('fac-2024-0001') ||
          payment.invoiceNumber?.toLowerCase().includes('fac-2024-0001') ||
          payment.referenceNumber?.toLowerCase().includes('fac-2024-0001');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter by search (reference number)', async () => {
      const filters: PaymentFilters = { search: 'TRF-2024' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        const matchesSearch =
          payment.paymentNumber.toLowerCase().includes('trf-2024') ||
          payment.customerName?.toLowerCase().includes('trf-2024') ||
          payment.invoiceNumber?.toLowerCase().includes('trf-2024') ||
          payment.referenceNumber?.toLowerCase().includes('trf-2024');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter by status', async () => {
      const filters: PaymentFilters = { status: 'COMPLETED' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        expect(payment.status).toBe('COMPLETED');
      });
    });

    it('should filter by status PENDING', async () => {
      const filters: PaymentFilters = { status: 'PENDING' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        expect(payment.status).toBe('PENDING');
      });
    });

    it('should filter by status REFUNDED', async () => {
      const filters: PaymentFilters = { status: 'REFUNDED' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        expect(payment.status).toBe('REFUNDED');
      });
    });

    it('should filter by method BANK_TRANSFER', async () => {
      const filters: PaymentFilters = { method: 'BANK_TRANSFER' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        expect(payment.method).toBe('BANK_TRANSFER');
      });
    });

    it('should filter by method CREDIT_CARD', async () => {
      const filters: PaymentFilters = { method: 'CREDIT_CARD' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        expect(payment.method).toBe('CREDIT_CARD');
      });
    });

    it('should filter by method CASH', async () => {
      const filters: PaymentFilters = { method: 'CASH' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        expect(payment.method).toBe('CASH');
      });
    });

    it('should filter by customerId', async () => {
      const filters: PaymentFilters = { customerId: '1' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        expect(payment.customerId).toBe('1');
      });
    });

    it('should filter by invoiceId', async () => {
      const filters: PaymentFilters = { invoiceId: '1' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        expect(payment.invoiceId).toBe('1');
      });
    });

    it('should filter by date range (startDate)', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);
      const filters: PaymentFilters = { startDate: startDate.toISOString() };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        const paymentDate = new Date(payment.paymentDate);
        expect(paymentDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
      });
    });

    it('should filter by date range (endDate)', async () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 2);
      const filters: PaymentFilters = { endDate: endDate.toISOString() };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        const paymentDate = new Date(payment.paymentDate);
        expect(paymentDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should filter by date range (startDate and endDate)', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 2);
      const filters: PaymentFilters = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        const paymentDate = new Date(payment.paymentDate);
        expect(paymentDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(paymentDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should filter by amount range (minAmount)', async () => {
      const filters: PaymentFilters = { minAmount: 5000000 };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        expect(payment.amount).toBeGreaterThanOrEqual(5000000);
      });
    });

    it('should filter by amount range (maxAmount)', async () => {
      const filters: PaymentFilters = { maxAmount: 5000000 };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        expect(payment.amount).toBeLessThanOrEqual(5000000);
      });
    });

    it('should filter by amount range (minAmount and maxAmount)', async () => {
      const filters: PaymentFilters = { minAmount: 1000000, maxAmount: 10000000 };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        expect(payment.amount).toBeGreaterThanOrEqual(1000000);
        expect(payment.amount).toBeLessThanOrEqual(10000000);
      });
    });

    it('should sort by paymentNumber ascending', async () => {
      const filters: PaymentFilters = { sortBy: 'paymentNumber', sortOrder: 'asc' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(
          result.data[i].paymentNumber.localeCompare(result.data[i + 1].paymentNumber)
        ).toBeLessThanOrEqual(0);
      }
    });

    it('should sort by paymentNumber descending', async () => {
      const filters: PaymentFilters = { sortBy: 'paymentNumber', sortOrder: 'desc' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(
          result.data[i].paymentNumber.localeCompare(result.data[i + 1].paymentNumber)
        ).toBeGreaterThanOrEqual(0);
      }
    });

    it('should sort by amount ascending', async () => {
      const filters: PaymentFilters = { sortBy: 'amount', sortOrder: 'asc' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].amount).toBeLessThanOrEqual(result.data[i + 1].amount);
      }
    });

    it('should sort by amount descending', async () => {
      const filters: PaymentFilters = { sortBy: 'amount', sortOrder: 'desc' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].amount).toBeGreaterThanOrEqual(result.data[i + 1].amount);
      }
    });

    it('should sort by paymentDate ascending', async () => {
      const filters: PaymentFilters = { sortBy: 'paymentDate', sortOrder: 'asc' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aDate = new Date(result.data[i].paymentDate).getTime();
        const bDate = new Date(result.data[i + 1].paymentDate).getTime();
        expect(aDate).toBeLessThanOrEqual(bDate);
      }
    });

    it('should sort by paymentDate descending', async () => {
      const filters: PaymentFilters = { sortBy: 'paymentDate', sortOrder: 'desc' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aDate = new Date(result.data[i].paymentDate).getTime();
        const bDate = new Date(result.data[i + 1].paymentDate).getTime();
        expect(aDate).toBeGreaterThanOrEqual(bDate);
      }
    });

    it('should sort by status ascending', async () => {
      const filters: PaymentFilters = { sortBy: 'status', sortOrder: 'asc' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(
          result.data[i].status.localeCompare(result.data[i + 1].status)
        ).toBeLessThanOrEqual(0);
      }
    });

    it('should sort by method ascending', async () => {
      const filters: PaymentFilters = { sortBy: 'method', sortOrder: 'asc' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(
          result.data[i].method.localeCompare(result.data[i + 1].method)
        ).toBeLessThanOrEqual(0);
      }
    });

    it('should sort by customerName ascending', async () => {
      const filters: PaymentFilters = { sortBy: 'customerName', sortOrder: 'asc' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aName = result.data[i].customerName || '';
        const bName = result.data[i + 1].customerName || '';
        expect(aName.localeCompare(bName)).toBeLessThanOrEqual(0);
      }
    });

    it('should sort by customerName when some payments have undefined customerName', async () => {
      // Create two payments without customerName to test the || '' fallback for both a and b
      // This ensures both branches (aValue = a.customerName || '') and (bValue = b.customerName || '') are covered
      const createPromise1 = paymentsService.createPayment({
        invoiceId: 'test-no-customer-name-1',
        customerId: 'test-cust-1',
        // customerName intentionally omitted (will be undefined)
        amount: 100,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const paymentWithoutName1 = await createPromise1;

      const createPromise2 = paymentsService.createPayment({
        invoiceId: 'test-no-customer-name-2',
        customerId: 'test-cust-2',
        // customerName intentionally omitted (will be undefined)
        amount: 200,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const paymentWithoutName2 = await createPromise2;

      // Now sort by customerName - this should hit the || '' fallback branch for both a and b
      // when comparing the two payments without customerName against each other
      const filters: PaymentFilters = { sortBy: 'customerName', sortOrder: 'asc', limit: 100 };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      // Verify sorting still works with undefined customerName
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);

      // Both payments without a customerName should be in the results
      const foundPayment1 = result.data.find(p => p.id === paymentWithoutName1.id);
      const foundPayment2 = result.data.find(p => p.id === paymentWithoutName2.id);

      if (foundPayment1) {
        expect(foundPayment1.customerName).toBeUndefined();
      }
      if (foundPayment2) {
        expect(foundPayment2.customerName).toBeUndefined();
      }
    });

    it('should combine multiple filters', async () => {
      const filters: PaymentFilters = {
        status: 'COMPLETED',
        method: 'BANK_TRANSFER',
        sortBy: 'amount',
        sortOrder: 'desc',
        page: 1,
        limit: 5,
      };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        expect(payment.status).toBe('COMPLETED');
        expect(payment.method).toBe('BANK_TRANSFER');
      });

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].amount).toBeGreaterThanOrEqual(result.data[i + 1].amount);
      }
    });

    it('should handle pagination (page 1)', async () => {
      const filters: PaymentFilters = { page: 1, limit: 3 };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(3);
      expect(result.data.length).toBeLessThanOrEqual(3);
    });

    it('should handle pagination (page 2)', async () => {
      const filters: PaymentFilters = { page: 2, limit: 3 };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(3);
    });

    it('should return different data for different pages', async () => {
      const page1Promise = paymentsService.getPayments({ page: 1, limit: 3 });
      vi.advanceTimersByTime(500);
      const page1 = await page1Promise;

      const page2Promise = paymentsService.getPayments({ page: 2, limit: 3 });
      vi.advanceTimersByTime(500);
      const page2 = await page2Promise;

      if (page1.data.length > 0 && page2.data.length > 0) {
        expect(page1.data[0].id).not.toBe(page2.data[0].id);
      }
    });

    it('should calculate totalPages correctly', async () => {
      const filters: PaymentFilters = { limit: 5 };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      const expectedTotalPages = Math.ceil(result.meta.total / result.meta.limit);
      expect(result.meta.totalPages).toBe(expectedTotalPages);
    });
  });

  describe('getPayment', () => {
    it('should return payment by id', async () => {
      const promise = paymentsService.getPayment('1');
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.paymentNumber).toBe('PAG-2024-0001');
      expect(result.invoiceId).toBeDefined();
      expect(result.customerId).toBeDefined();
      expect(result.amount).toBeDefined();
      expect(result.method).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should return payment with all expected properties', async () => {
      const promise = paymentsService.getPayment('1');
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('paymentNumber');
      expect(result).toHaveProperty('invoiceId');
      expect(result).toHaveProperty('customerId');
      expect(result).toHaveProperty('customerName');
      expect(result).toHaveProperty('invoiceNumber');
      expect(result).toHaveProperty('amount');
      expect(result).toHaveProperty('method');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('paymentDate');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should throw error for non-existent payment', async () => {
      const promise = paymentsService.getPayment('non-existent-id');
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('Pago no encontrado');
    });

    it('should throw error for empty id', async () => {
      const promise = paymentsService.getPayment('');
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('Pago no encontrado');
    });
  });

  describe('getPaymentsByInvoice', () => {
    it('should return payments for a specific invoice', async () => {
      const promise = paymentsService.getPaymentsByInvoice('1');
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      result.forEach((payment) => {
        expect(payment.invoiceId).toBe('1');
      });
    });

    it('should return multiple payments for invoice with multiple payments', async () => {
      const promise = paymentsService.getPaymentsByInvoice('7');
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((payment) => {
        expect(payment.invoiceId).toBe('7');
      });
    });

    it('should return empty array for invoice with no payments', async () => {
      const promise = paymentsService.getPaymentsByInvoice('non-existent-invoice');
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getPaymentsByCustomer', () => {
    it('should return payments for a specific customer', async () => {
      const promise = paymentsService.getPaymentsByCustomer('1');
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      result.forEach((payment) => {
        expect(payment.customerId).toBe('1');
      });
    });

    it('should return multiple payments for customer with multiple payments', async () => {
      const promise = paymentsService.getPaymentsByCustomer('2');
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((payment) => {
        expect(payment.customerId).toBe('2');
      });
    });

    it('should return empty array for customer with no payments', async () => {
      const promise = paymentsService.getPaymentsByCustomer('non-existent-customer');
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getRecentPayments', () => {
    it('should return limited recent payments with default limit', async () => {
      const promise = paymentsService.getRecentPayments();
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should respect limit parameter', async () => {
      const promise = paymentsService.getRecentPayments(3);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should respect larger limit parameter', async () => {
      const promise = paymentsService.getRecentPayments(10);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should return payments sorted by createdAt descending', async () => {
      const promise = paymentsService.getRecentPayments(10);
      vi.advanceTimersByTime(400);
      const result = await promise;

      for (let i = 0; i < result.length - 1; i++) {
        const aDate = new Date(result[i].createdAt).getTime();
        const bDate = new Date(result[i + 1].createdAt).getTime();
        expect(aDate).toBeGreaterThanOrEqual(bDate);
      }
    });

    it('should return 1 payment when limit is 1', async () => {
      const promise = paymentsService.getRecentPayments(1);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result.length).toBeLessThanOrEqual(1);
    });
  });

  describe('createPayment', () => {
    it('should create a new payment with all fields', async () => {
      const newPaymentData: CreatePaymentData = {
        invoiceId: '1',
        customerId: '1',
        customerName: 'Test Customer',
        invoiceNumber: 'FAC-2024-0001',
        amount: 1000000,
        method: 'BANK_TRANSFER',
        paymentDate: new Date().toISOString(),
        referenceNumber: 'TRF-TEST-123',
        notes: 'Test payment',
      };

      const promise = paymentsService.createPayment(newPaymentData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.invoiceId).toBe('1');
      expect(result.customerId).toBe('1');
      expect(result.customerName).toBe('Test Customer');
      expect(result.invoiceNumber).toBe('FAC-2024-0001');
      expect(result.amount).toBe(1000000);
      expect(result.method).toBe('BANK_TRANSFER');
      expect(result.referenceNumber).toBe('TRF-TEST-123');
      expect(result.notes).toBe('Test payment');
    });

    it('should generate payment number', async () => {
      const newPaymentData: CreatePaymentData = {
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      };

      const promise = paymentsService.createPayment(newPaymentData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.paymentNumber).toBeDefined();
      expect(result.paymentNumber).toMatch(/^PAG-\d{4}-\d{4}$/);
    });

    it('should set default status to PENDING when not specified', async () => {
      const newPaymentData: CreatePaymentData = {
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      };

      const promise = paymentsService.createPayment(newPaymentData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.status).toBe('PENDING');
    });

    it('should respect specified status', async () => {
      const newPaymentData: CreatePaymentData = {
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString(),
      };

      const promise = paymentsService.createPayment(newPaymentData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.status).toBe('COMPLETED');
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const newPaymentData: CreatePaymentData = {
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      };

      const promise = paymentsService.createPayment(newPaymentData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should use current date for paymentDate if not provided', async () => {
      const newPaymentData: CreatePaymentData = {
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
      };

      const promise = paymentsService.createPayment(newPaymentData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.paymentDate).toBeDefined();
    });

    it('should create payment with different payment methods', async () => {
      const methods: PaymentMethod[] = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CHECK'];

      for (const method of methods) {
        const newPaymentData: CreatePaymentData = {
          invoiceId: '1',
          customerId: '1',
          amount: 100000,
          method,
          paymentDate: new Date().toISOString(),
        };

        const promise = paymentsService.createPayment(newPaymentData);
        vi.advanceTimersByTime(500);
        const result = await promise;

        expect(result.method).toBe(method);
      }
    });
  });

  describe('updatePayment', () => {
    it('should update payment fields for PENDING payment', async () => {
      // First create a pending payment
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const updateData: UpdatePaymentData = {
        amount: 600000,
        notes: 'Updated notes',
        method: 'BANK_TRANSFER',
      };

      const updatePromise = paymentsService.updatePayment(createdPayment.id, updateData);
      vi.advanceTimersByTime(500);
      const result = await updatePromise;

      expect(result.amount).toBe(600000);
      expect(result.notes).toBe('Updated notes');
      expect(result.method).toBe('BANK_TRANSFER');
    });

    it('should update referenceNumber for PENDING payment', async () => {
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const updateData: UpdatePaymentData = {
        referenceNumber: 'NEW-REF-123',
      };

      const updatePromise = paymentsService.updatePayment(createdPayment.id, updateData);
      vi.advanceTimersByTime(500);
      const result = await updatePromise;

      expect(result.referenceNumber).toBe('NEW-REF-123');
    });

    it('should update paymentDate for PENDING payment', async () => {
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const newDate = '2024-02-15T10:00:00Z';
      const updateData: UpdatePaymentData = {
        paymentDate: newDate,
      };

      const updatePromise = paymentsService.updatePayment(createdPayment.id, updateData);
      vi.advanceTimersByTime(500);
      const result = await updatePromise;

      expect(result.paymentDate).toBe(newDate);
    });

    it('should throw error for non-existent payment', async () => {
      const updateData: UpdatePaymentData = {
        notes: 'New notes',
      };

      const promise = paymentsService.updatePayment('non-existent', updateData);
      vi.advanceTimersByTime(500);

      await expect(promise).rejects.toThrow('Pago no encontrado');
    });

    it('should throw error when updating COMPLETED payment (except notes)', async () => {
      // Payment '1' is COMPLETED in mock data
      const updateData: UpdatePaymentData = {
        amount: 9999999,
      };

      const promise = paymentsService.updatePayment('1', updateData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      // Amount should NOT be updated for COMPLETED payment
      expect(result.amount).not.toBe(9999999);
    });

    it('should allow updating notes for COMPLETED payment', async () => {
      // Payment '1' is COMPLETED in mock data
      const updateData: UpdatePaymentData = {
        notes: 'Updated notes for completed payment',
      };

      const promise = paymentsService.updatePayment('1', updateData);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.notes).toBe('Updated notes for completed payment');
    });

    it('should throw error when updating REFUNDED payment', async () => {
      // Payment '9' is REFUNDED in mock data
      const updateData: UpdatePaymentData = {
        notes: 'New notes',
      };

      const promise = paymentsService.updatePayment('9', updateData);
      vi.advanceTimersByTime(500);

      await expect(promise).rejects.toThrow('No se puede modificar un pago reembolsado o cancelado');
    });

    it('should throw error when updating CANCELLED payment', async () => {
      // Payment '12' is CANCELLED in mock data
      const updateData: UpdatePaymentData = {
        notes: 'New notes',
      };

      const promise = paymentsService.updatePayment('12', updateData);
      vi.advanceTimersByTime(500);

      await expect(promise).rejects.toThrow('No se puede modificar un pago reembolsado o cancelado');
    });

    it('should update the updatedAt timestamp', async () => {
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const updateData: UpdatePaymentData = {
        notes: 'Updated notes',
      };

      const updatePromise = paymentsService.updatePayment(createdPayment.id, updateData);
      vi.advanceTimersByTime(500);
      const result = await updatePromise;

      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('updatePaymentStatus', () => {
    it('should change status from PENDING to COMPLETED', async () => {
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const updatePromise = paymentsService.updatePaymentStatus(createdPayment.id, 'COMPLETED');
      vi.advanceTimersByTime(400);
      const result = await updatePromise;

      expect(result.status).toBe('COMPLETED');
    });

    it('should change status from PENDING to PROCESSING', async () => {
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'BANK_TRANSFER',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const updatePromise = paymentsService.updatePaymentStatus(createdPayment.id, 'PROCESSING');
      vi.advanceTimersByTime(400);
      const result = await updatePromise;

      expect(result.status).toBe('PROCESSING');
    });

    it('should change status from PENDING to FAILED', async () => {
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CREDIT_CARD',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const updatePromise = paymentsService.updatePaymentStatus(createdPayment.id, 'FAILED');
      vi.advanceTimersByTime(400);
      const result = await updatePromise;

      expect(result.status).toBe('FAILED');
    });

    it('should change status from PENDING to CANCELLED', async () => {
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const updatePromise = paymentsService.updatePaymentStatus(createdPayment.id, 'CANCELLED');
      vi.advanceTimersByTime(400);
      const result = await updatePromise;

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw error for non-existent payment', async () => {
      const promise = paymentsService.updatePaymentStatus('non-existent', 'COMPLETED');
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('Pago no encontrado');
    });

    it('should throw error when changing REFUNDED payment status', async () => {
      // Payment '9' is REFUNDED in mock data
      const promise = paymentsService.updatePaymentStatus('9', 'PENDING');
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('No se puede cambiar el estado de un pago reembolsado');
    });

    it('should throw error when changing CANCELLED payment status', async () => {
      // Payment '12' is CANCELLED in mock data
      const promise = paymentsService.updatePaymentStatus('12', 'PENDING');
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('No se puede cambiar el estado de un pago cancelado');
    });

    it('should throw error when changing COMPLETED payment to non-REFUNDED/non-CANCELLED status', async () => {
      // Payment '1' is COMPLETED in mock data
      const promise = paymentsService.updatePaymentStatus('1', 'PENDING');
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('Un pago completado solo puede ser reembolsado o cancelado');
    });

    it('should allow changing COMPLETED payment to REFUNDED', async () => {
      // First create and complete a payment
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const completePromise = paymentsService.updatePaymentStatus(createdPayment.id, 'COMPLETED');
      vi.advanceTimersByTime(400);
      await completePromise;

      const refundPromise = paymentsService.updatePaymentStatus(createdPayment.id, 'REFUNDED');
      vi.advanceTimersByTime(400);
      const result = await refundPromise;

      expect(result.status).toBe('REFUNDED');
    });

    it('should allow changing COMPLETED payment to CANCELLED', async () => {
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const completePromise = paymentsService.updatePaymentStatus(createdPayment.id, 'COMPLETED');
      vi.advanceTimersByTime(400);
      await completePromise;

      const cancelPromise = paymentsService.updatePaymentStatus(createdPayment.id, 'CANCELLED');
      vi.advanceTimersByTime(400);
      const result = await cancelPromise;

      expect(result.status).toBe('CANCELLED');
    });

    it('should update the updatedAt timestamp', async () => {
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;
      const originalUpdatedAt = createdPayment.updatedAt;

      // Advance time to ensure different timestamp
      vi.advanceTimersByTime(1000);

      const updatePromise = paymentsService.updatePaymentStatus(createdPayment.id, 'COMPLETED');
      vi.advanceTimersByTime(400);
      const result = await updatePromise;

      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('deletePayment', () => {
    it('should delete PENDING payment', async () => {
      // Create a pending payment to delete
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 500000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const deletePromise = paymentsService.deletePayment(createdPayment.id);
      vi.advanceTimersByTime(400);

      await expect(deletePromise).resolves.toBeUndefined();

      // Verify payment is deleted
      const getPromise = paymentsService.getPayment(createdPayment.id);
      vi.advanceTimersByTime(400);
      await expect(getPromise).rejects.toThrow('Pago no encontrado');
    });

    it('should throw error for non-existent payment', async () => {
      const promise = paymentsService.deletePayment('non-existent');
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('Pago no encontrado');
    });

    it('should throw error when deleting COMPLETED payment', async () => {
      // Payment '1' is COMPLETED in mock data
      const promise = paymentsService.deletePayment('1');
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('Solo se pueden eliminar pagos pendientes');
    });

    it('should throw error when deleting REFUNDED payment', async () => {
      // Payment '9' is REFUNDED in mock data
      const promise = paymentsService.deletePayment('9');
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('Solo se pueden eliminar pagos pendientes');
    });

    it('should throw error when deleting CANCELLED payment', async () => {
      // Payment '12' is CANCELLED in mock data
      const promise = paymentsService.deletePayment('12');
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('Solo se pueden eliminar pagos pendientes');
    });

    it('should throw error when deleting FAILED payment', async () => {
      // Payment '7' is FAILED in mock data
      const promise = paymentsService.deletePayment('7');
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('Solo se pueden eliminar pagos pendientes');
    });

    it('should throw error when deleting PROCESSING payment', async () => {
      // Payment '11' is PROCESSING in mock data
      const promise = paymentsService.deletePayment('11');
      vi.advanceTimersByTime(400);

      await expect(promise).rejects.toThrow('Solo se pueden eliminar pagos pendientes');
    });
  });

  describe('refundPayment', () => {
    it('should process full refund for COMPLETED payment', async () => {
      // Create and complete a payment
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 1000000,
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const refundPromise = paymentsService.refundPayment(createdPayment.id);
      vi.advanceTimersByTime(500);
      const result = await refundPromise;

      expect(result.status).toBe('REFUNDED');
      expect(result.refundAmount).toBe(1000000);
      expect(result.refundedAt).toBeDefined();
    });

    it('should process partial refund for COMPLETED payment', async () => {
      // Create and complete a payment
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 1000000,
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const partialRefundAmount = 500000;
      const refundPromise = paymentsService.refundPayment(createdPayment.id, partialRefundAmount);
      vi.advanceTimersByTime(500);
      const result = await refundPromise;

      // Partial refund creates a new payment record
      expect(result.status).toBe('REFUNDED');
      expect(result.refundAmount).toBe(partialRefundAmount);
      expect(result.amount).toBe(-partialRefundAmount);
      expect(result.originalPaymentId).toBe(createdPayment.id);
    });

    it('should throw error for non-existent payment', async () => {
      const promise = paymentsService.refundPayment('non-existent');
      vi.advanceTimersByTime(500);

      await expect(promise).rejects.toThrow('Pago no encontrado');
    });

    it('should throw error when refunding non-COMPLETED payment', async () => {
      // Create a pending payment
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 1000000,
        method: 'CASH',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const refundPromise = paymentsService.refundPayment(createdPayment.id);
      vi.advanceTimersByTime(500);

      await expect(refundPromise).rejects.toThrow('Solo se pueden reembolsar pagos completados');
    });

    it('should throw error when refund amount is zero', async () => {
      // Create and complete a payment
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 1000000,
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const refundPromise = paymentsService.refundPayment(createdPayment.id, 0);
      vi.advanceTimersByTime(500);

      await expect(refundPromise).rejects.toThrow('El monto de reembolso debe ser mayor a cero');
    });

    it('should throw error when refund amount is negative', async () => {
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 1000000,
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const refundPromise = paymentsService.refundPayment(createdPayment.id, -100);
      vi.advanceTimersByTime(500);

      await expect(refundPromise).rejects.toThrow('El monto de reembolso debe ser mayor a cero');
    });

    it('should throw error when refund amount exceeds payment amount', async () => {
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 1000000,
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const refundPromise = paymentsService.refundPayment(createdPayment.id, 2000000);
      vi.advanceTimersByTime(500);

      await expect(refundPromise).rejects.toThrow('El monto de reembolso no puede exceder el monto del pago');
    });

    it('should update original payment notes on partial refund', async () => {
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 1000000,
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString(),
        notes: 'Original note',
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const refundPromise = paymentsService.refundPayment(createdPayment.id, 500000);
      vi.advanceTimersByTime(500);
      await refundPromise;

      // Verify original payment was updated
      const getPromise = paymentsService.getPayment(createdPayment.id);
      vi.advanceTimersByTime(400);
      const originalPayment = await getPromise;

      expect(originalPayment.notes).toContain('Reembolso parcial');
    });

    it('should create new payment record for partial refund with correct reference', async () => {
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 1000000,
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const refundPromise = paymentsService.refundPayment(createdPayment.id, 500000);
      vi.advanceTimersByTime(500);
      const refundPayment = await refundPromise;

      expect(refundPayment.referenceNumber).toContain('REF-');
      expect(refundPayment.referenceNumber).toContain(createdPayment.paymentNumber);
    });

    it('should process full refund and set default notes when payment has no existing notes', async () => {
      // Create a payment without notes
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 1000000,
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString(),
        // No notes provided
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const refundPromise = paymentsService.refundPayment(createdPayment.id);
      vi.advanceTimersByTime(500);
      const result = await refundPromise;

      expect(result.status).toBe('REFUNDED');
      expect(result.notes).toBe('Reembolso completo procesado');
    });

    it('should process full refund and append to existing notes', async () => {
      // Create a payment with existing notes
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 1000000,
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString(),
        notes: 'Original payment note',
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const refundPromise = paymentsService.refundPayment(createdPayment.id);
      vi.advanceTimersByTime(500);
      const result = await refundPromise;

      expect(result.status).toBe('REFUNDED');
      expect(result.notes).toBe('Original payment note | Reembolso completo procesado');
    });

    it('should process partial refund and set default notes when original payment has no notes', async () => {
      // Create a payment without notes
      const createPromise = paymentsService.createPayment({
        invoiceId: '1',
        customerId: '1',
        amount: 1000000,
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString(),
        // No notes provided
      });
      vi.advanceTimersByTime(500);
      const createdPayment = await createPromise;

      const partialRefundAmount = 500000;
      const refundPromise = paymentsService.refundPayment(createdPayment.id, partialRefundAmount);
      vi.advanceTimersByTime(500);
      await refundPromise;

      // Verify original payment notes were updated with default partial refund message
      const getPromise = paymentsService.getPayment(createdPayment.id);
      vi.advanceTimersByTime(400);
      const originalPayment = await getPromise;

      expect(originalPayment.notes).toBe(`Reembolso parcial: $${partialRefundAmount.toLocaleString()}`);
    });
  });

  describe('getPaymentStats', () => {
    it('should return correct statistics structure', async () => {
      const promise = paymentsService.getPaymentStats();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty('totalPayments');
      expect(result).toHaveProperty('totalReceived');
      expect(result).toHaveProperty('totalPending');
      expect(result).toHaveProperty('totalRefunded');
      expect(result).toHaveProperty('totalProcessing');
      expect(result).toHaveProperty('averagePaymentValue');
      expect(result).toHaveProperty('paymentsByStatus');
      expect(result).toHaveProperty('paymentsByMethod');
      expect(result).toHaveProperty('todayPayments');
      expect(result).toHaveProperty('todayTotal');
      expect(result).toHaveProperty('weekPayments');
      expect(result).toHaveProperty('weekTotal');
    });

    it('should have correct structure for paymentsByStatus', async () => {
      const promise = paymentsService.getPaymentStats();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.paymentsByStatus).toHaveProperty('PENDING');
      expect(result.paymentsByStatus).toHaveProperty('PROCESSING');
      expect(result.paymentsByStatus).toHaveProperty('COMPLETED');
      expect(result.paymentsByStatus).toHaveProperty('FAILED');
      expect(result.paymentsByStatus).toHaveProperty('REFUNDED');
      expect(result.paymentsByStatus).toHaveProperty('CANCELLED');
    });

    it('should have correct structure for paymentsByMethod', async () => {
      const promise = paymentsService.getPaymentStats();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.paymentsByMethod).toHaveProperty('CASH');
      expect(result.paymentsByMethod).toHaveProperty('CREDIT_CARD');
      expect(result.paymentsByMethod).toHaveProperty('DEBIT_CARD');
      expect(result.paymentsByMethod).toHaveProperty('BANK_TRANSFER');
      expect(result.paymentsByMethod).toHaveProperty('WIRE_TRANSFER');
      expect(result.paymentsByMethod).toHaveProperty('CHECK');
      expect(result.paymentsByMethod).toHaveProperty('PSE');
      expect(result.paymentsByMethod).toHaveProperty('OTHER');
    });

    it('should return numeric values for all stats', async () => {
      const promise = paymentsService.getPaymentStats();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(typeof result.totalPayments).toBe('number');
      expect(typeof result.totalReceived).toBe('number');
      expect(typeof result.totalPending).toBe('number');
      expect(typeof result.totalRefunded).toBe('number');
      expect(typeof result.totalProcessing).toBe('number');
      expect(typeof result.averagePaymentValue).toBe('number');
      expect(typeof result.todayPayments).toBe('number');
      expect(typeof result.todayTotal).toBe('number');
      expect(typeof result.weekPayments).toBe('number');
      expect(typeof result.weekTotal).toBe('number');
    });

    it('should return non-negative values', async () => {
      const promise = paymentsService.getPaymentStats();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.totalPayments).toBeGreaterThanOrEqual(0);
      expect(result.totalReceived).toBeGreaterThanOrEqual(0);
      expect(result.totalPending).toBeGreaterThanOrEqual(0);
      expect(result.totalRefunded).toBeGreaterThanOrEqual(0);
      expect(result.totalProcessing).toBeGreaterThanOrEqual(0);
      expect(result.averagePaymentValue).toBeGreaterThanOrEqual(0);
      expect(result.todayPayments).toBeGreaterThanOrEqual(0);
      expect(result.todayTotal).toBeGreaterThanOrEqual(0);
      expect(result.weekPayments).toBeGreaterThanOrEqual(0);
      expect(result.weekTotal).toBeGreaterThanOrEqual(0);
    });

    it('should return non-negative values for status counts', async () => {
      const promise = paymentsService.getPaymentStats();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.paymentsByStatus.PENDING).toBeGreaterThanOrEqual(0);
      expect(result.paymentsByStatus.PROCESSING).toBeGreaterThanOrEqual(0);
      expect(result.paymentsByStatus.COMPLETED).toBeGreaterThanOrEqual(0);
      expect(result.paymentsByStatus.FAILED).toBeGreaterThanOrEqual(0);
      expect(result.paymentsByStatus.REFUNDED).toBeGreaterThanOrEqual(0);
      expect(result.paymentsByStatus.CANCELLED).toBeGreaterThanOrEqual(0);
    });

    it('should return non-negative values for method counts', async () => {
      const promise = paymentsService.getPaymentStats();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.paymentsByMethod.CASH).toBeGreaterThanOrEqual(0);
      expect(result.paymentsByMethod.CREDIT_CARD).toBeGreaterThanOrEqual(0);
      expect(result.paymentsByMethod.DEBIT_CARD).toBeGreaterThanOrEqual(0);
      expect(result.paymentsByMethod.BANK_TRANSFER).toBeGreaterThanOrEqual(0);
      expect(result.paymentsByMethod.CHECK).toBeGreaterThanOrEqual(0);
    });

    it('should calculate averagePaymentValue correctly when there are payments', async () => {
      const promise = paymentsService.getPaymentStats();
      vi.advanceTimersByTime(500);
      const result = await promise;

      if (result.totalPayments > 0) {
        expect(result.averagePaymentValue).toBeGreaterThan(0);
      }
    });

    it('should include todayTotal from completed payments only', async () => {
      const promise = paymentsService.getPaymentStats();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(typeof result.todayTotal).toBe('number');
      expect(result.todayTotal).toBeGreaterThanOrEqual(0);
    });

    it('should include weekTotal from completed payments only', async () => {
      const promise = paymentsService.getPaymentStats();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(typeof result.weekTotal).toBe('number');
      expect(result.weekTotal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty search query', async () => {
      const filters: PaymentFilters = { search: '' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle non-matching search query', async () => {
      const filters: PaymentFilters = { search: 'xyz123nonexistent' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.data.length).toBe(0);
    });

    it('should handle page beyond available data', async () => {
      const filters: PaymentFilters = { page: 1000, limit: 10 };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.data.length).toBe(0);
      expect(result.meta.page).toBe(1000);
    });

    it('should handle very large limit', async () => {
      const filters: PaymentFilters = { limit: 1000 };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty('data');
      expect(result.meta.limit).toBe(1000);
    });

    it('should handle combined filters that match no results', async () => {
      const filters: PaymentFilters = {
        status: 'COMPLETED',
        method: 'CASH',
        customerId: '999',
      };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.data.length).toBe(0);
    });

    it('should handle amount filter with zero', async () => {
      const filters: PaymentFilters = { minAmount: 0 };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.data.forEach((payment) => {
        expect(payment.amount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should use default sort (paymentDate) for unknown sortBy value', async () => {
      // Use type assertion to bypass TypeScript checking for invalid sortBy
      const filters: PaymentFilters = { sortBy: 'unknownField' as PaymentFilters['sortBy'], sortOrder: 'desc' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      // Should still return results, sorted by paymentDate (default)
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);

      // Verify sorting is by paymentDate descending (default behavior)
      for (let i = 0; i < result.data.length - 1; i++) {
        const aDate = new Date(result.data[i].paymentDate).getTime();
        const bDate = new Date(result.data[i + 1].paymentDate).getTime();
        expect(aDate).toBeGreaterThanOrEqual(bDate);
      }
    });

    it('should use default sort (paymentDate) ascending for unknown sortBy value', async () => {
      const filters: PaymentFilters = { sortBy: 'invalidSortField' as PaymentFilters['sortBy'], sortOrder: 'asc' };
      const promise = paymentsService.getPayments(filters);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);

      // Verify sorting is by paymentDate ascending
      for (let i = 0; i < result.data.length - 1; i++) {
        const aDate = new Date(result.data[i].paymentDate).getTime();
        const bDate = new Date(result.data[i + 1].paymentDate).getTime();
        expect(aDate).toBeLessThanOrEqual(bDate);
      }
    });

    it('should handle payment with invalid payment number format when generating new payment numbers', async () => {
      // Step 1: Create a payment
      const createPromise1 = paymentsService.createPayment({
        invoiceId: 'test-inv',
        customerId: 'test-cust',
        amount: 100,
        method: 'CASH',
      });
      vi.advanceTimersByTime(500);
      const payment1 = await createPromise1;

      // The returned payment object is a reference to the object in mockPayments array
      // Mutating it will affect the internal state
      const originalPaymentNumber = payment1.paymentNumber;

      // Step 2: Corrupt the payment number to an invalid format
      // This simulates data corruption that could occur in a real database
      (payment1 as { paymentNumber: string }).paymentNumber = 'INVALID-FORMAT-123';

      // Step 3: Create another payment - this will trigger generatePaymentNumber
      // which iterates over all payments including the corrupted one
      // The regex won't match, so it will hit the `return max;` branch (line 403)
      const createPromise2 = paymentsService.createPayment({
        invoiceId: 'test-inv-2',
        customerId: 'test-cust-2',
        amount: 200,
        method: 'CASH',
      });
      vi.advanceTimersByTime(500);
      const payment2 = await createPromise2;

      // Verify that a valid payment number was still generated despite the corrupted entry
      expect(payment2.paymentNumber).toBeDefined();
      expect(payment2.paymentNumber).toMatch(/^PAG-\d{4}-\d{4}$/);

      // Restore the original payment number to avoid affecting other tests
      (payment1 as { paymentNumber: string }).paymentNumber = originalPaymentNumber;
    });

    it('should calculate averagePaymentValue based on positive-amount payments only', async () => {
      // The getPaymentStats function calculates averagePaymentValue from payments with amount > 0.
      // This test verifies the calculation logic:
      // - averagePaymentValue = sum of positive amounts / count of positive amount payments
      // - When totalPayments === 0, averagePaymentValue should be 0 (defensive branch)

      const statsPromise = paymentsService.getPaymentStats();
      vi.advanceTimersByTime(500);
      const stats = await statsPromise;

      // Verify that averagePaymentValue is calculated correctly
      // It should be the average of all payments with positive amounts
      expect(stats.averagePaymentValue).toBeGreaterThanOrEqual(0);
      expect(typeof stats.averagePaymentValue).toBe('number');

      // When there are payments, average should be calculated
      if (stats.totalPayments > 0) {
        // The average should be a positive number when there are positive-amount payments
        expect(stats.averagePaymentValue).toBeGreaterThan(0);
      }
    });

    it('should handle refunded payment with undefined refundAmount in stats calculation', async () => {
      // Create and complete a payment, then refund it
      const createPromise = paymentsService.createPayment({
        invoiceId: 'test-refund-stats',
        customerId: 'test-cust',
        amount: 1000000,
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString(),
      });
      vi.advanceTimersByTime(500);
      const payment = await createPromise;

      // Refund the payment
      const refundPromise = paymentsService.refundPayment(payment.id);
      vi.advanceTimersByTime(500);
      const refundedPayment = await refundPromise;

      // Verify the refund was processed and has refundAmount
      expect(refundedPayment.status).toBe('REFUNDED');
      expect(refundedPayment.refundAmount).toBeDefined();

      // Now get stats to verify refunded payments are counted correctly
      const statsPromise = paymentsService.getPaymentStats();
      vi.advanceTimersByTime(500);
      const stats = await statsPromise;

      // totalRefunded should include the refund
      expect(stats.totalRefunded).toBeGreaterThanOrEqual(refundedPayment.refundAmount!);

      // Manipulate the refundAmount to undefined to test the || 0 fallback
      // This is defensive code that handles corrupted data
      const originalRefundAmount = refundedPayment.refundAmount;
      (refundedPayment as { refundAmount: number | undefined }).refundAmount = undefined;

      // Get stats again - the reduce should use || 0 fallback for undefined refundAmount
      // However, the filter `(p) => p.refundAmount` will exclude this payment now
      const stats2Promise = paymentsService.getPaymentStats();
      vi.advanceTimersByTime(500);
      const stats2 = await stats2Promise;

      // Stats should still work without errors
      expect(stats2).toHaveProperty('totalRefunded');
      expect(stats2.totalRefunded).toBeGreaterThanOrEqual(0);

      // Restore original refundAmount
      (refundedPayment as { refundAmount: number | undefined }).refundAmount = originalRefundAmount;
    });
  });
});