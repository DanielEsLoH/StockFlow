/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentStatus,
  PurchaseOrderStatus,
} from '@prisma/client';
import { ExogenaService, ExogenaReport } from './exogena.service';
import { PrismaService } from '../../prisma';
import { TenantContextService } from '../../common';

describe('ExogenaService', () => {
  let service: ExogenaService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';

  // ─── Mock third-party entities ─────────────────────────────

  const mockSupplierA = {
    id: 'supplier-a',
    documentType: 'NIT',
    documentNumber: '900111222',
    dv: '3',
    name: 'Supplier A Name',
    businessName: 'Supplier A Business',
    address: 'Calle 10 #20-30',
    city: 'Bogota',
  };

  const mockSupplierB = {
    id: 'supplier-b',
    documentType: 'CC',
    documentNumber: '1234567890',
    dv: null,
    name: 'Supplier B Name',
    businessName: null,
    address: null,
    city: null,
  };

  const mockCustomerA = {
    id: 'customer-a',
    documentType: 'NIT',
    documentNumber: '800999888',
    dv: '1',
    name: 'Customer A Name',
    businessName: 'Customer A Business',
    address: 'Carrera 5 #15-10',
    city: 'Medellin',
  };

  const mockCustomerB = {
    id: 'customer-b',
    documentType: 'CC',
    documentNumber: '9876543210',
    dv: null,
    name: 'Customer B Name',
    businessName: null,
    address: null,
    city: null,
  };

  // ─── Prisma mock setup ─────────────────────────────────────

  const mockPrismaService = {
    tenant: { findUnique: jest.fn() },
    purchaseOrder: { findMany: jest.fn() },
    invoice: { findMany: jest.fn() },
  };

  const mockTenantContextService = {
    requireTenantId: jest.fn().mockReturnValue(mockTenantId),
  };

  // ─── Test module setup ─────────────────────────────────────

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExogenaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<ExogenaService>(ExogenaService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jest.clearAllMocks();
    mockTenantContextService.requireTenantId.mockReturnValue(mockTenantId);
  });

  // ─── Helpers ───────────────────────────────────────────────

  /** Build a mock purchase order for Formato 1001 / 1009 */
  function makePurchaseOrder(
    overrides: {
      supplierId?: string;
      supplier?: typeof mockSupplierA;
      subtotal?: number;
      tax?: number;
      total?: number;
      issueDate?: Date;
      status?: PurchaseOrderStatus;
      paymentStatus?: PaymentStatus;
      items?: { taxRate: number; subtotal: number; tax: number }[];
      purchasePayments?: { amount: number }[];
    } = {},
  ) {
    return {
      tenantId: mockTenantId,
      supplier: overrides.supplier ?? mockSupplierA,
      subtotal: overrides.subtotal ?? 1000,
      tax: overrides.tax ?? 190,
      total: overrides.total ?? 1190,
      issueDate: overrides.issueDate ?? new Date('2024-06-15'),
      status: overrides.status ?? PurchaseOrderStatus.RECEIVED,
      paymentStatus: overrides.paymentStatus ?? PaymentStatus.PENDING,
      items: overrides.items ?? [
        { taxRate: 19, subtotal: 1000, tax: 190 },
      ],
      purchasePayments: overrides.purchasePayments ?? [],
    };
  }

  /** Build a mock invoice for Formato 1006 / 1007 / 1008 */
  function makeInvoice(
    overrides: {
      customerId?: string | null;
      customer?: typeof mockCustomerA | null;
      subtotal?: number;
      tax?: number;
      total?: number;
      issueDate?: Date;
      status?: InvoiceStatus;
      paymentStatus?: PaymentStatus;
      items?: { taxRate: number; subtotal: number; tax: number }[];
      payments?: { amount: number }[];
    } = {},
  ) {
    return {
      tenantId: mockTenantId,
      customerId: 'customerId' in overrides ? overrides.customerId : 'customer-a',
      customer: 'customer' in overrides ? overrides.customer : mockCustomerA,
      subtotal: overrides.subtotal ?? 500,
      tax: overrides.tax ?? 95,
      total: overrides.total ?? 595,
      issueDate: overrides.issueDate ?? new Date('2024-06-15'),
      status: overrides.status ?? InvoiceStatus.SENT,
      paymentStatus: overrides.paymentStatus ?? PaymentStatus.PAID,
      items: overrides.items ?? [
        { taxRate: 19, subtotal: 500, tax: 95 },
      ],
      payments: overrides.payments ?? [],
    };
  }

  /** Set default empty stubs for all Prisma calls used by generateExogena */
  function stubAllEmpty() {
    mockPrismaService.tenant.findUnique.mockResolvedValue({
      id: mockTenantId,
      name: 'Test Tenant',
      dianConfig: { nit: '900123456', businessName: 'Test Business S.A.S.' },
    });
    mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);
    mockPrismaService.invoice.findMany.mockResolvedValue([]);
  }

  /** Finds a formato by number from an ExogenaReport */
  function findFormato(report: ExogenaReport, formatNumber: string) {
    return report.formatos.find((f) => f.formatNumber === formatNumber);
  }

  // =========================================================================
  // generateExogena
  // =========================================================================

  describe('generateExogena', () => {
    it('should require tenant context', async () => {
      mockTenantContextService.requireTenantId.mockImplementation(() => {
        throw new Error('Tenant not found');
      });

      await expect(service.generateExogena(2024)).rejects.toThrow(
        'Tenant not found',
      );
    });

    it('should return correct year and tenant info from dianConfig', async () => {
      stubAllEmpty();

      const result = await service.generateExogena(2024);

      expect(result.year).toBe(2024);
      expect(result.tenantNit).toBe('900123456');
      expect(result.tenantName).toBe('Test Business S.A.S.');
      expect(result.generatedAt).toBeDefined();
    });

    it('should fall back to tenant name when dianConfig.businessName is missing', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'Fallback Tenant Name',
        dianConfig: { nit: '111222333', businessName: null },
      });
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.generateExogena(2024);

      expect(result.tenantName).toBe('Fallback Tenant Name');
    });

    it('should use empty strings when tenant has no dianConfig', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'No Config Tenant',
        dianConfig: null,
      });
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.generateExogena(2024);

      expect(result.tenantNit).toBe('');
      expect(result.tenantName).toBe('No Config Tenant');
    });

    it('should handle null tenant gracefully', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.generateExogena(2024);

      expect(result.tenantNit).toBe('');
      expect(result.tenantName).toBe('');
    });

    it('should return all 6 formatos', async () => {
      stubAllEmpty();

      const result = await service.generateExogena(2024);

      expect(result.formatos).toHaveLength(6);
      const numbers = result.formatos.map((f) => f.formatNumber);
      expect(numbers).toEqual(['1001', '1005', '1006', '1007', '1008', '1009']);
    });

    it('should scope all queries to the tenant', async () => {
      stubAllEmpty();

      await service.generateExogena(2024);

      expect(mockTenantContextService.requireTenantId).toHaveBeenCalled();

      // Tenant lookup
      expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTenantId },
        }),
      );

      // All purchaseOrder.findMany calls should include tenantId
      for (const call of mockPrismaService.purchaseOrder.findMany.mock.calls) {
        expect(call[0].where.tenantId).toBe(mockTenantId);
      }

      // All invoice.findMany calls should include tenantId
      for (const call of mockPrismaService.invoice.findMany.mock.calls) {
        expect(call[0].where.tenantId).toBe(mockTenantId);
      }
    });

    it('should query with correct date range for the given year', async () => {
      stubAllEmpty();

      await service.generateExogena(2024);

      // purchaseOrder is called for formatos 1001, 1005, 1009
      // Check one of the date-range calls (1001 or 1005)
      const poCall = mockPrismaService.purchaseOrder.findMany.mock.calls[0];
      expect(poCall[0].where.issueDate).toEqual({
        gte: new Date(2024, 0, 1),
        lte: new Date(2024, 11, 31, 23, 59, 59, 999),
      });

      // invoice is called for formatos 1006, 1007, 1008
      const invCall = mockPrismaService.invoice.findMany.mock.calls[0];
      expect(invCall[0].where.issueDate).toEqual({
        gte: new Date(2024, 0, 1),
        lte: new Date(2024, 11, 31, 23, 59, 59, 999),
      });
    });

    it('should set generatedAt as a valid ISO string', async () => {
      stubAllEmpty();

      const before = new Date().toISOString();
      const result = await service.generateExogena(2024);
      const after = new Date().toISOString();

      expect(result.generatedAt >= before).toBe(true);
      expect(result.generatedAt <= after).toBe(true);
    });
  });

  // =========================================================================
  // Formato 1001: Pagos a terceros
  // =========================================================================

  describe('Formato 1001 - Pagos a terceros', () => {
    beforeEach(() => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'Test',
        dianConfig: { nit: '900123456', businessName: 'Test S.A.S.' },
      });
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
    });

    it('should return empty rows when no purchase orders exist', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);

      const result = await service.generateExogena(2024);
      const f1001 = findFormato(result, '1001')!;

      expect(f1001.formatNumber).toBe('1001');
      expect(f1001.name).toBe('Pagos a terceros');
      expect(f1001.rows).toHaveLength(0);
      expect(f1001.totalAmount).toBe(0);
      expect(f1001.totalTaxAmount).toBe(0);
    });

    it('should aggregate subtotals and taxes per supplier', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({ supplier: mockSupplierA, subtotal: 1000, tax: 190 }),
        makePurchaseOrder({ supplier: mockSupplierA, subtotal: 2000, tax: 380 }),
        makePurchaseOrder({ supplier: mockSupplierB, subtotal: 500, tax: 95 }),
      ]);

      const result = await service.generateExogena(2024);
      const f1001 = findFormato(result, '1001')!;

      expect(f1001.rows).toHaveLength(2);

      const rowA = f1001.rows.find((r) => r.documentNumber === '900111222')!;
      expect(rowA.conceptCode).toBe('5001');
      expect(rowA.amount).toBe(3000);
      expect(rowA.taxAmount).toBe(570);
      expect(rowA.businessName).toBe('Supplier A Business');
      expect(rowA.dv).toBe('3');

      const rowB = f1001.rows.find((r) => r.documentNumber === '1234567890')!;
      expect(rowB.amount).toBe(500);
      expect(rowB.taxAmount).toBe(95);
    });

    it('should use supplier.name when businessName is null', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({ supplier: mockSupplierB, subtotal: 100, tax: 19 }),
      ]);

      const result = await service.generateExogena(2024);
      const f1001 = findFormato(result, '1001')!;

      expect(f1001.rows[0].businessName).toBe('Supplier B Name');
      expect(f1001.rows[0].dv).toBe('');
      expect(f1001.rows[0].address).toBe('');
      expect(f1001.rows[0].city).toBe('');
    });

    it('should compute correct totals across all rows', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({ supplier: mockSupplierA, subtotal: 1000, tax: 190 }),
        makePurchaseOrder({ supplier: mockSupplierB, subtotal: 500, tax: 95 }),
      ]);

      const result = await service.generateExogena(2024);
      const f1001 = findFormato(result, '1001')!;

      expect(f1001.totalAmount).toBe(1500);
      expect(f1001.totalTaxAmount).toBe(285);
    });
  });

  // =========================================================================
  // Formato 1005: IVA descontable
  // =========================================================================

  describe('Formato 1005 - IVA descontable', () => {
    beforeEach(() => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'Test',
        dianConfig: { nit: '900123456', businessName: 'Test S.A.S.' },
      });
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
    });

    it('should return empty rows when no purchase orders exist', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);

      const result = await service.generateExogena(2024);
      const f1005 = findFormato(result, '1005')!;

      expect(f1005.formatNumber).toBe('1005');
      expect(f1005.name).toBe('IVA descontable');
      expect(f1005.rows).toHaveLength(0);
      expect(f1005.totalAmount).toBe(0);
      expect(f1005.totalTaxAmount).toBe(0);
    });

    it('should only include items with taxRate > 0', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({
          supplier: mockSupplierA,
          items: [
            { taxRate: 19, subtotal: 1000, tax: 190 },
            { taxRate: 0, subtotal: 500, tax: 0 },
          ],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1005 = findFormato(result, '1005')!;

      expect(f1005.rows).toHaveLength(1);
      expect(f1005.rows[0].amount).toBe(1000); // only taxable item
      expect(f1005.rows[0].taxAmount).toBe(190);
    });

    it('should exclude items with negative taxRate', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({
          supplier: mockSupplierA,
          items: [
            { taxRate: -1, subtotal: 200, tax: -2 },
            { taxRate: 19, subtotal: 300, tax: 57 },
          ],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1005 = findFormato(result, '1005')!;

      expect(f1005.rows[0].amount).toBe(300);
      expect(f1005.rows[0].taxAmount).toBe(57);
    });

    it('should aggregate taxable items across multiple orders per supplier', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({
          supplier: mockSupplierA,
          items: [{ taxRate: 19, subtotal: 1000, tax: 190 }],
        }),
        makePurchaseOrder({
          supplier: mockSupplierA,
          items: [{ taxRate: 5, subtotal: 2000, tax: 100 }],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1005 = findFormato(result, '1005')!;

      expect(f1005.rows).toHaveLength(1);
      expect(f1005.rows[0].conceptCode).toBe('5005');
      expect(f1005.rows[0].amount).toBe(3000);
      expect(f1005.rows[0].taxAmount).toBe(290);
    });

    it('should return no rows when all items have taxRate 0', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({
          supplier: mockSupplierA,
          items: [{ taxRate: 0, subtotal: 5000, tax: 0 }],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1005 = findFormato(result, '1005')!;

      expect(f1005.rows).toHaveLength(0);
      expect(f1005.totalAmount).toBe(0);
      expect(f1005.totalTaxAmount).toBe(0);
    });
  });

  // =========================================================================
  // Formato 1006: IVA generado
  // =========================================================================

  describe('Formato 1006 - IVA generado', () => {
    beforeEach(() => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'Test',
        dianConfig: { nit: '900123456', businessName: 'Test S.A.S.' },
      });
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);
    });

    it('should return empty rows when no invoices exist', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.generateExogena(2024);
      const f1006 = findFormato(result, '1006')!;

      expect(f1006.formatNumber).toBe('1006');
      expect(f1006.name).toBe('IVA generado');
      expect(f1006.rows).toHaveLength(0);
      expect(f1006.totalAmount).toBe(0);
      expect(f1006.totalTaxAmount).toBe(0);
    });

    it('should only include items with taxRate > 0', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({
          customer: mockCustomerA,
          customerId: 'customer-a',
          items: [
            { taxRate: 19, subtotal: 1000, tax: 190 },
            { taxRate: 0, subtotal: 500, tax: 0 },
          ],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1006 = findFormato(result, '1006')!;

      expect(f1006.rows).toHaveLength(1);
      expect(f1006.rows[0].amount).toBe(1000);
      expect(f1006.rows[0].taxAmount).toBe(190);
    });

    it('should aggregate by customer across invoices', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({
          customer: mockCustomerA,
          customerId: 'customer-a',
          items: [{ taxRate: 19, subtotal: 1000, tax: 190 }],
        }),
        makeInvoice({
          customer: mockCustomerA,
          customerId: 'customer-a',
          items: [{ taxRate: 19, subtotal: 2000, tax: 380 }],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1006 = findFormato(result, '1006')!;

      expect(f1006.rows).toHaveLength(1);
      expect(f1006.rows[0].conceptCode).toBe('5006');
      expect(f1006.rows[0].amount).toBe(3000);
      expect(f1006.rows[0].taxAmount).toBe(570);
    });

    it('should handle null customer gracefully', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({
          customerId: null,
          customer: null,
          items: [{ taxRate: 19, subtotal: 800, tax: 152 }],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1006 = findFormato(result, '1006')!;

      expect(f1006.rows).toHaveLength(1);
      expect(f1006.rows[0].documentType).toBe('');
      expect(f1006.rows[0].documentNumber).toBe('');
      expect(f1006.rows[0].dv).toBe('');
      expect(f1006.rows[0].businessName).toBe('Sin cliente');
    });

    it('should use customer.name when businessName is null', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({
          customer: mockCustomerB,
          customerId: 'customer-b',
          items: [{ taxRate: 19, subtotal: 500, tax: 95 }],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1006 = findFormato(result, '1006')!;

      expect(f1006.rows[0].businessName).toBe('Customer B Name');
    });

    it('should filter invoices excluding CANCELLED, VOID, and DRAFT statuses', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      await service.generateExogena(2024);

      // The first invoice.findMany call is for 1006
      const call1006 = mockPrismaService.invoice.findMany.mock.calls[0];
      expect(call1006[0].where.status.notIn).toEqual(
        expect.arrayContaining([
          InvoiceStatus.CANCELLED,
          InvoiceStatus.VOID,
          InvoiceStatus.DRAFT,
        ]),
      );
    });
  });

  // =========================================================================
  // Formato 1007: Ingresos recibidos de terceros
  // =========================================================================

  describe('Formato 1007 - Ingresos recibidos', () => {
    beforeEach(() => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'Test',
        dianConfig: { nit: '900123456', businessName: 'Test S.A.S.' },
      });
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);
    });

    it('should return empty rows when no invoices exist', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.generateExogena(2024);
      const f1007 = findFormato(result, '1007')!;

      expect(f1007.formatNumber).toBe('1007');
      expect(f1007.name).toBe('Ingresos recibidos');
      expect(f1007.rows).toHaveLength(0);
      expect(f1007.totalAmount).toBe(0);
      expect(f1007.totalTaxAmount).toBe(0);
    });

    it('should aggregate invoice totals per customer', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({ customer: mockCustomerA, customerId: 'customer-a', total: 1000 }),
        makeInvoice({ customer: mockCustomerA, customerId: 'customer-a', total: 2000 }),
        makeInvoice({ customer: mockCustomerB, customerId: 'customer-b', total: 500 }),
      ]);

      const result = await service.generateExogena(2024);
      const f1007 = findFormato(result, '1007')!;

      expect(f1007.rows).toHaveLength(2);

      const rowA = f1007.rows.find((r) => r.documentNumber === '800999888')!;
      expect(rowA.conceptCode).toBe('5007');
      expect(rowA.amount).toBe(3000);
      expect(rowA.taxAmount).toBe(0);

      const rowB = f1007.rows.find((r) => r.documentNumber === '9876543210')!;
      expect(rowB.amount).toBe(500);
    });

    it('should always set taxAmount to 0 for all rows', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({ customer: mockCustomerA, customerId: 'customer-a', total: 1190 }),
      ]);

      const result = await service.generateExogena(2024);
      const f1007 = findFormato(result, '1007')!;

      expect(f1007.rows[0].taxAmount).toBe(0);
      expect(f1007.totalTaxAmount).toBe(0);
    });

    it('should handle null customerId using "unknown" key', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({ customerId: null, customer: null, total: 300 }),
        makeInvoice({ customerId: null, customer: null, total: 700 }),
      ]);

      const result = await service.generateExogena(2024);
      const f1007 = findFormato(result, '1007')!;

      // Both null-customer invoices should be aggregated under one row
      expect(f1007.rows).toHaveLength(1);
      expect(f1007.rows[0].amount).toBe(1000);
      expect(f1007.rows[0].businessName).toBe('Sin cliente');
    });

    it('should use customer.name when businessName is null', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({ customer: mockCustomerB, customerId: 'customer-b', total: 500 }),
      ]);

      const result = await service.generateExogena(2024);
      const f1007 = findFormato(result, '1007')!;

      expect(f1007.rows[0].businessName).toBe('Customer B Name');
    });
  });

  // =========================================================================
  // Formato 1008: Cuentas por cobrar al cierre
  // =========================================================================

  describe('Formato 1008 - Cuentas por cobrar', () => {
    beforeEach(() => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'Test',
        dianConfig: { nit: '900123456', businessName: 'Test S.A.S.' },
      });
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);
    });

    it('should return empty rows when no unpaid invoices exist', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.generateExogena(2024);
      const f1008 = findFormato(result, '1008')!;

      expect(f1008.formatNumber).toBe('1008');
      expect(f1008.name).toBe('Cuentas por cobrar');
      expect(f1008.rows).toHaveLength(0);
      expect(f1008.totalAmount).toBe(0);
      expect(f1008.totalTaxAmount).toBe(0);
    });

    it('should compute outstanding balance as total minus payments', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({
          customer: mockCustomerA,
          customerId: 'customer-a',
          total: 1000,
          paymentStatus: PaymentStatus.PENDING,
          payments: [{ amount: 300 }],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1008 = findFormato(result, '1008')!;

      expect(f1008.rows).toHaveLength(1);
      expect(f1008.rows[0].conceptCode).toBe('5008');
      expect(f1008.rows[0].amount).toBe(700); // 1000 - 300
    });

    it('should skip invoices where balance is zero or negative', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({
          customer: mockCustomerA,
          customerId: 'customer-a',
          total: 500,
          paymentStatus: PaymentStatus.PARTIAL,
          payments: [{ amount: 500 }], // fully paid
        }),
        makeInvoice({
          customer: mockCustomerB,
          customerId: 'customer-b',
          total: 300,
          paymentStatus: PaymentStatus.PARTIAL,
          payments: [{ amount: 400 }], // overpaid
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1008 = findFormato(result, '1008')!;

      expect(f1008.rows).toHaveLength(0);
      expect(f1008.totalAmount).toBe(0);
    });

    it('should aggregate outstanding balances per customer', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({
          customer: mockCustomerA,
          customerId: 'customer-a',
          total: 1000,
          paymentStatus: PaymentStatus.PENDING,
          payments: [{ amount: 200 }],
        }),
        makeInvoice({
          customer: mockCustomerA,
          customerId: 'customer-a',
          total: 500,
          paymentStatus: PaymentStatus.PENDING,
          payments: [],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1008 = findFormato(result, '1008')!;

      expect(f1008.rows).toHaveLength(1);
      expect(f1008.rows[0].amount).toBe(1300); // (1000-200) + 500
    });

    it('should handle invoices with no payments', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({
          customer: mockCustomerA,
          customerId: 'customer-a',
          total: 2000,
          paymentStatus: PaymentStatus.PENDING,
          payments: [],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1008 = findFormato(result, '1008')!;

      expect(f1008.rows[0].amount).toBe(2000);
    });

    it('should handle invoices with multiple partial payments', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({
          customer: mockCustomerA,
          customerId: 'customer-a',
          total: 1000,
          paymentStatus: PaymentStatus.PARTIAL,
          payments: [{ amount: 100 }, { amount: 200 }, { amount: 150 }],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1008 = findFormato(result, '1008')!;

      expect(f1008.rows[0].amount).toBe(550); // 1000 - (100+200+150)
    });

    it('should always set taxAmount to 0', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({
          customer: mockCustomerA,
          customerId: 'customer-a',
          total: 1000,
          paymentStatus: PaymentStatus.PENDING,
          payments: [],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1008 = findFormato(result, '1008')!;

      expect(f1008.rows[0].taxAmount).toBe(0);
      expect(f1008.totalTaxAmount).toBe(0);
    });

    it('should exclude CANCELLED and VOID invoices', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      await service.generateExogena(2024);

      // Formato 1008 is the 3rd invoice.findMany call (after 1006 and 1007)
      const call1008 = mockPrismaService.invoice.findMany.mock.calls[2];
      expect(call1008[0].where.status.notIn).toEqual(
        expect.arrayContaining([InvoiceStatus.CANCELLED, InvoiceStatus.VOID]),
      );
    });

    it('should only include invoices not fully paid', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      await service.generateExogena(2024);

      const call1008 = mockPrismaService.invoice.findMany.mock.calls[2];
      expect(call1008[0].where.paymentStatus).toEqual({ not: PaymentStatus.PAID });
    });
  });

  // =========================================================================
  // Formato 1009: Cuentas por pagar al cierre
  // =========================================================================

  describe('Formato 1009 - Cuentas por pagar', () => {
    beforeEach(() => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'Test',
        dianConfig: { nit: '900123456', businessName: 'Test S.A.S.' },
      });
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
    });

    it('should return empty rows when no unpaid purchase orders exist', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);

      const result = await service.generateExogena(2024);
      const f1009 = findFormato(result, '1009')!;

      expect(f1009.formatNumber).toBe('1009');
      expect(f1009.name).toBe('Cuentas por pagar');
      expect(f1009.rows).toHaveLength(0);
      expect(f1009.totalAmount).toBe(0);
      expect(f1009.totalTaxAmount).toBe(0);
    });

    it('should compute outstanding balance as total minus purchasePayments', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({
          supplier: mockSupplierA,
          total: 5000,
          paymentStatus: PaymentStatus.PARTIAL,
          purchasePayments: [{ amount: 2000 }],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1009 = findFormato(result, '1009')!;

      expect(f1009.rows).toHaveLength(1);
      expect(f1009.rows[0].conceptCode).toBe('5009');
      expect(f1009.rows[0].amount).toBe(3000); // 5000 - 2000
    });

    it('should skip orders where balance is zero or negative', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({
          supplier: mockSupplierA,
          total: 1000,
          purchasePayments: [{ amount: 1000 }], // fully paid
        }),
        makePurchaseOrder({
          supplier: mockSupplierB,
          total: 500,
          purchasePayments: [{ amount: 600 }], // overpaid
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1009 = findFormato(result, '1009')!;

      expect(f1009.rows).toHaveLength(0);
      expect(f1009.totalAmount).toBe(0);
    });

    it('should aggregate outstanding balances per supplier', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({
          supplier: mockSupplierA,
          total: 2000,
          purchasePayments: [{ amount: 500 }],
        }),
        makePurchaseOrder({
          supplier: mockSupplierA,
          total: 3000,
          purchasePayments: [{ amount: 1000 }],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1009 = findFormato(result, '1009')!;

      expect(f1009.rows).toHaveLength(1);
      expect(f1009.rows[0].amount).toBe(3500); // (2000-500) + (3000-1000)
      expect(f1009.rows[0].documentNumber).toBe('900111222');
    });

    it('should handle orders with no payments', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({
          supplier: mockSupplierA,
          total: 7500,
          purchasePayments: [],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1009 = findFormato(result, '1009')!;

      expect(f1009.rows[0].amount).toBe(7500);
    });

    it('should handle orders with multiple partial payments', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({
          supplier: mockSupplierA,
          total: 10000,
          purchasePayments: [
            { amount: 1000 },
            { amount: 2000 },
            { amount: 3000 },
          ],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1009 = findFormato(result, '1009')!;

      expect(f1009.rows[0].amount).toBe(4000); // 10000 - 6000
    });

    it('should always set taxAmount to 0', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({
          supplier: mockSupplierA,
          total: 1000,
          purchasePayments: [],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1009 = findFormato(result, '1009')!;

      expect(f1009.rows[0].taxAmount).toBe(0);
      expect(f1009.totalTaxAmount).toBe(0);
    });

    it('should use supplier.name when businessName is null', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({
          supplier: mockSupplierB,
          total: 500,
          purchasePayments: [],
        }),
      ]);

      const result = await service.generateExogena(2024);
      const f1009 = findFormato(result, '1009')!;

      expect(f1009.rows[0].businessName).toBe('Supplier B Name');
      expect(f1009.rows[0].dv).toBe('');
      expect(f1009.rows[0].address).toBe('');
      expect(f1009.rows[0].city).toBe('');
    });

    it('should only query RECEIVED purchase orders not fully paid', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);

      await service.generateExogena(2024);

      // Formato 1009 is the 3rd purchaseOrder.findMany call (after 1001 and 1005)
      const call1009 = mockPrismaService.purchaseOrder.findMany.mock.calls[2];
      expect(call1009[0].where.status).toBe(PurchaseOrderStatus.RECEIVED);
      expect(call1009[0].where.paymentStatus).toEqual({ not: PaymentStatus.PAID });
    });
  });

  // =========================================================================
  // Integration / cross-formato scenarios
  // =========================================================================

  describe('Cross-formato scenarios', () => {
    it('should produce a complete report with data across all formatos', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'Full Report Tenant',
        dianConfig: { nit: '900555666', businessName: 'Full Report S.A.S.' },
      });

      // Purchase orders: used by 1001, 1005, and 1009
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePurchaseOrder({
          supplier: mockSupplierA,
          subtotal: 1000,
          tax: 190,
          total: 1190,
          items: [{ taxRate: 19, subtotal: 1000, tax: 190 }],
          purchasePayments: [{ amount: 500 }],
        }),
      ]);

      // Invoices: used by 1006, 1007, and 1008
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice({
          customer: mockCustomerA,
          customerId: 'customer-a',
          total: 595,
          items: [{ taxRate: 19, subtotal: 500, tax: 95 }],
          paymentStatus: PaymentStatus.PARTIAL,
          payments: [{ amount: 200 }],
        }),
      ]);

      const result = await service.generateExogena(2024);

      expect(result.year).toBe(2024);
      expect(result.tenantNit).toBe('900555666');
      expect(result.formatos).toHaveLength(6);

      // Each formato should have data
      const f1001 = findFormato(result, '1001')!;
      expect(f1001.rows.length).toBeGreaterThan(0);

      const f1005 = findFormato(result, '1005')!;
      expect(f1005.rows.length).toBeGreaterThan(0);

      const f1006 = findFormato(result, '1006')!;
      expect(f1006.rows.length).toBeGreaterThan(0);

      const f1007 = findFormato(result, '1007')!;
      expect(f1007.rows.length).toBeGreaterThan(0);

      const f1008 = findFormato(result, '1008')!;
      expect(f1008.rows.length).toBeGreaterThan(0);

      const f1009 = findFormato(result, '1009')!;
      expect(f1009.rows.length).toBeGreaterThan(0);
    });

    it('should handle different years correctly', async () => {
      stubAllEmpty();

      const result2023 = await service.generateExogena(2023);
      expect(result2023.year).toBe(2023);

      // Verify date range for 2023
      const poCall = mockPrismaService.purchaseOrder.findMany.mock.calls[0];
      expect(poCall[0].where.issueDate.gte).toEqual(new Date(2023, 0, 1));
      expect(poCall[0].where.issueDate.lte).toEqual(
        new Date(2023, 11, 31, 23, 59, 59, 999),
      );
    });
  });
});
