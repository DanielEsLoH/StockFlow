/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { RecurringInterval, InvoiceStatus } from '@prisma/client';
import { RecurringInvoicesCronService } from './recurring-invoices-cron.service';
import { PrismaService } from '../prisma';

describe('RecurringInvoicesCronService', () => {
  let service: RecurringInvoicesCronService;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-123';

  const mockItems = [
    {
      productId: 'product-1',
      quantity: 2,
      unitPrice: 100,
      taxRate: 19,
      discount: 0,
    },
  ];

  const mockRecurring = {
    id: 'rec-123',
    tenantId: mockTenantId,
    customerId: mockCustomerId,
    warehouseId: null,
    notes: null,
    items: mockItems,
    interval: RecurringInterval.MONTHLY,
    nextIssueDate: new Date('2026-03-01'),
    endDate: null,
    lastIssuedAt: null,
    autoSend: false,
    autoEmail: false,
    isActive: true,
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-01'),
    customer: {
      id: mockCustomerId,
      tenantId: mockTenantId,
      name: 'Cliente Test',
      email: 'cliente@test.com',
    },
  };

  const mockPrisma = {
    recurringInvoice: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringInvoicesCronService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    module.useLogger(false);

    service = module.get<RecurringInvoicesCronService>(
      RecurringInvoicesCronService,
    );

    jest.clearAllMocks();
  });

  describe('calculateNextIssueDate', () => {
    const baseDate = new Date('2026-01-15T12:00:00Z');

    it('should add 7 days for WEEKLY', () => {
      const result = service.calculateNextIssueDate(
        baseDate,
        RecurringInterval.WEEKLY,
      );
      expect(result.getDate()).toBe(22);
      expect(result.getMonth()).toBe(0);
    });

    it('should add 14 days for BIWEEKLY', () => {
      const result = service.calculateNextIssueDate(
        baseDate,
        RecurringInterval.BIWEEKLY,
      );
      expect(result.getDate()).toBe(29);
      expect(result.getMonth()).toBe(0);
    });

    it('should add 1 month for MONTHLY', () => {
      const result = service.calculateNextIssueDate(
        baseDate,
        RecurringInterval.MONTHLY,
      );
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(15);
    });

    it('should add 3 months for QUARTERLY', () => {
      const result = service.calculateNextIssueDate(
        baseDate,
        RecurringInterval.QUARTERLY,
      );
      expect(result.getMonth()).toBe(3);
      expect(result.getDate()).toBe(15);
    });

    it('should add 1 year for ANNUAL', () => {
      const result = service.calculateNextIssueDate(
        baseDate,
        RecurringInterval.ANNUAL,
      );
      expect(result.getFullYear()).toBe(2027);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });
  });

  describe('processRecurringInvoices (cron)', () => {
    it('should process due templates', async () => {
      const template = {
        ...mockRecurring,
        tenant: { id: mockTenantId, name: 'Test Tenant' },
      };
      mockPrisma.recurringInvoice.findMany.mockResolvedValue([template]);
      mockPrisma.invoice.findFirst.mockResolvedValue({
        invoiceNumber: 'INV-00005',
      });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv-new',
        items: [
          {
            subtotal: 200,
            tax: 38,
            total: 238,
          },
        ],
      });
      mockPrisma.invoice.update.mockResolvedValue({});
      mockPrisma.recurringInvoice.update.mockResolvedValue({});

      await service.processRecurringInvoices();

      expect(mockPrisma.recurringInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
      expect(mockPrisma.invoice.create).toHaveBeenCalled();
      expect(mockPrisma.recurringInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastIssuedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should skip when no due templates', async () => {
      mockPrisma.recurringInvoice.findMany.mockResolvedValue([]);

      await service.processRecurringInvoices();

      expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    });

    it('should continue processing other templates when one fails', async () => {
      const template1 = {
        ...mockRecurring,
        id: 'rec-1',
        tenant: { id: mockTenantId, name: 'Test' },
      };
      const template2 = {
        ...mockRecurring,
        id: 'rec-2',
        tenant: { id: mockTenantId, name: 'Test' },
      };
      mockPrisma.recurringInvoice.findMany.mockResolvedValue([
        template1,
        template2,
      ]);

      mockPrisma.invoice.findFirst
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ invoiceNumber: 'INV-00001' });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv-new',
        items: [{ subtotal: 200, tax: 38, total: 238 }],
      });
      mockPrisma.invoice.update.mockResolvedValue({});
      mockPrisma.recurringInvoice.update.mockResolvedValue({});

      await expect(service.processRecurringInvoices()).resolves.not.toThrow();

      expect(mockPrisma.invoice.create).toHaveBeenCalledTimes(1);
    });

    it('should set invoice as SENT when autoSend is true', async () => {
      const template = {
        ...mockRecurring,
        autoSend: true,
        tenant: { id: mockTenantId, name: 'Test' },
      };
      mockPrisma.recurringInvoice.findMany.mockResolvedValue([template]);
      mockPrisma.invoice.findFirst.mockResolvedValue({
        invoiceNumber: 'INV-00001',
      });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv-new',
        items: [{ subtotal: 200, tax: 38, total: 238 }],
      });
      mockPrisma.invoice.update.mockResolvedValue({});
      mockPrisma.recurringInvoice.update.mockResolvedValue({});

      await service.processRecurringInvoices();

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: InvoiceStatus.SENT,
          }),
        }),
      );
    });

    it('should generate correct invoice number', async () => {
      const template = {
        ...mockRecurring,
        tenant: { id: mockTenantId, name: 'Test' },
      };
      mockPrisma.recurringInvoice.findMany.mockResolvedValue([template]);
      mockPrisma.invoice.findFirst.mockResolvedValue({
        invoiceNumber: 'INV-00042',
      });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv-new',
        items: [{ subtotal: 200, tax: 38, total: 238 }],
      });
      mockPrisma.invoice.update.mockResolvedValue({});
      mockPrisma.recurringInvoice.update.mockResolvedValue({});

      await service.processRecurringInvoices();

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: 'INV-00043',
          }),
        }),
      );
    });
  });
});
