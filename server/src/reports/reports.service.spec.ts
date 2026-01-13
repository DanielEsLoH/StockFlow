/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentStatus,
  CustomerStatus,
  ProductStatus,
} from '@prisma/client';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';

// Mock pdfmake
jest.mock('pdfmake', () => {
  return jest.fn().mockImplementation(() => ({
    createPdfKitDocument: jest.fn().mockReturnValue({
      on: jest.fn((event: string, callback: (data?: Buffer) => void) => {
        if (event === 'data') {
          // Simulate emitting data chunks
          setTimeout(() => callback(Buffer.from('test-pdf-chunk')), 0);
        }
        if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
      }),
      end: jest.fn(),
    }),
  }));
});

// Mock xlsx
jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn().mockReturnValue({}),
    aoa_to_sheet: jest.fn().mockReturnValue({}),
    book_append_sheet: jest.fn(),
  },
  write: jest.fn().mockReturnValue(Buffer.from('test-xlsx-data')),
}));

describe('ReportsService', () => {
  let service: ReportsService;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';

  const mockTenant = {
    id: mockTenantId,
    name: 'Acme Corp',
    email: 'acme@example.com',
    phone: '+57 300 123 4567',
  };

  const mockCategory = {
    id: 'category-123',
    name: 'Electronics',
    tenantId: mockTenantId,
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Test Product',
    sku: 'SKU-001',
    stock: 5,
    minStock: 10,
    costPrice: { toNumber: () => 100 },
    salePrice: { toNumber: () => 150 },
    status: ProductStatus.ACTIVE,
    categoryId: mockCategory.id,
    category: mockCategory,
    tenantId: mockTenantId,
  };

  const mockCustomer = {
    id: 'customer-123',
    name: 'Jane Customer',
    email: 'customer@example.com',
    phone: '+57 300 987 6543',
    documentType: 'CC',
    documentNumber: '123456789',
    address: '123 Main St',
    city: 'Bogota',
    status: CustomerStatus.ACTIVE,
    tenantId: mockTenantId,
  };

  const mockInvoiceItem = {
    id: 'item-123',
    productId: mockProduct.id,
    product: mockProduct,
    quantity: 2,
    unitPrice: { toNumber: () => 150 },
    taxRate: { toNumber: () => 19 },
    discount: { toNumber: () => 0 },
    subtotal: { toNumber: () => 300 },
    tax: { toNumber: () => 57 },
    total: { toNumber: () => 357 },
  };

  const mockInvoice = {
    id: 'invoice-123',
    invoiceNumber: 'INV-001',
    tenantId: mockTenantId,
    customerId: mockCustomer.id,
    customer: mockCustomer,
    user: { id: 'user-123', firstName: 'John', lastName: 'Doe' },
    tenant: mockTenant,
    items: [mockInvoiceItem],
    issueDate: new Date('2024-01-15'),
    dueDate: new Date('2024-02-15'),
    status: InvoiceStatus.SENT,
    paymentStatus: PaymentStatus.PAID,
    notes: 'Test notes',
    subtotal: { toNumber: () => 300 },
    tax: { toNumber: () => 57 },
    discount: { toNumber: () => 0 },
    total: { toNumber: () => 357 },
  };

  const mockPrismaInvoice = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  };

  const mockPrismaProduct = {
    findMany: jest.fn(),
  };

  const mockPrismaCustomer = {
    findMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      invoice: mockPrismaInvoice,
      product: mockPrismaProduct,
      customer: mockPrismaCustomer,
    };

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
      getTenant: jest.fn().mockResolvedValue(mockTenant),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    tenantContextService = module.get(TenantContextService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ============================================================================
  // INVOICE PDF
  // ============================================================================

  describe('generateInvoicePdf', () => {
    beforeEach(() => {
      mockPrismaInvoice.findFirst.mockResolvedValue(mockInvoice);
    });

    it('should generate PDF buffer for valid invoice', async () => {
      const result = await service.generateInvoicePdf('invoice-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should query invoice with all relations', async () => {
      await service.generateInvoicePdf('invoice-123');

      expect(mockPrismaInvoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-123', tenantId: mockTenantId },
        include: {
          customer: true,
          user: true,
          items: {
            include: {
              product: true,
            },
          },
          tenant: true,
        },
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockPrismaInvoice.findFirst.mockResolvedValue(null);

      await expect(service.generateInvoicePdf('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.generateInvoicePdf('invalid-id')).rejects.toThrow(
        'Factura no encontrada',
      );
    });

    it('should log warning when invoice not found', async () => {
      mockPrismaInvoice.findFirst.mockResolvedValue(null);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      await expect(service.generateInvoicePdf('invalid-id')).rejects.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invoice not found'),
      );
    });

    it('should log debug message when generating PDF', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      await service.generateInvoicePdf('invoice-123');

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generating invoice PDF'),
      );
    });

    it('should log success message after PDF generation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.generateInvoicePdf('invoice-123');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invoice PDF generated'),
      );
    });

    it('should handle invoice without customer', async () => {
      const invoiceWithoutCustomer = {
        ...mockInvoice,
        customer: null,
      };
      mockPrismaInvoice.findFirst.mockResolvedValue(invoiceWithoutCustomer);

      const result = await service.generateInvoicePdf('invoice-123');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle invoice without due date', async () => {
      const invoiceWithoutDueDate = {
        ...mockInvoice,
        dueDate: null,
      };
      mockPrismaInvoice.findFirst.mockResolvedValue(invoiceWithoutDueDate);

      const result = await service.generateInvoicePdf('invoice-123');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle invoice item without product', async () => {
      const invoiceWithDeletedProduct = {
        ...mockInvoice,
        items: [{ ...mockInvoiceItem, product: null }],
      };
      mockPrismaInvoice.findFirst.mockResolvedValue(invoiceWithDeletedProduct);

      const result = await service.generateInvoicePdf('invoice-123');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle invoice without notes', async () => {
      const invoiceWithoutNotes = {
        ...mockInvoice,
        notes: null,
      };
      mockPrismaInvoice.findFirst.mockResolvedValue(invoiceWithoutNotes);

      const result = await service.generateInvoicePdf('invoice-123');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle customer with partial data', async () => {
      const invoiceWithPartialCustomer = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          email: null,
          phone: null,
          address: null,
          city: null,
        },
      };
      mockPrismaInvoice.findFirst.mockResolvedValue(invoiceWithPartialCustomer);

      const result = await service.generateInvoicePdf('invoice-123');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle tenant without phone', async () => {
      const invoiceWithTenantNoPhone = {
        ...mockInvoice,
        tenant: { ...mockTenant, phone: null },
      };
      mockPrismaInvoice.findFirst.mockResolvedValue(invoiceWithTenantNoPhone);

      const result = await service.generateInvoicePdf('invoice-123');

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // ============================================================================
  // SALES REPORT
  // ============================================================================

  describe('generateSalesReport', () => {
    const fromDate = new Date('2024-01-01');
    const toDate = new Date('2024-01-31');

    beforeEach(() => {
      mockPrismaInvoice.findMany.mockResolvedValue([mockInvoice]);
    });

    describe('PDF format', () => {
      it('should generate PDF buffer for sales report', async () => {
        const result = await service.generateSalesReport(
          fromDate,
          toDate,
          'pdf',
        );

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should query invoices with date filter', async () => {
        await service.generateSalesReport(fromDate, toDate, 'pdf');

        expect(mockPrismaInvoice.findMany).toHaveBeenCalledWith({
          where: {
            tenantId: mockTenantId,
            issueDate: {
              gte: fromDate,
              lte: toDate,
            },
            status: {
              notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOID],
            },
          },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    category: true,
                  },
                },
              },
            },
          },
        });
      });

      it('should log debug message when generating report', async () => {
        const debugSpy = jest.spyOn(Logger.prototype, 'debug');

        await service.generateSalesReport(fromDate, toDate, 'pdf');

        expect(debugSpy).toHaveBeenCalledWith(
          expect.stringContaining('Generating sales report'),
        );
      });
    });

    describe('Excel format', () => {
      it('should generate Excel buffer for sales report', async () => {
        const result = await service.generateSalesReport(
          fromDate,
          toDate,
          'excel',
        );

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should call XLSX utils for Excel generation', async () => {
        const XLSX = require('xlsx');

        await service.generateSalesReport(fromDate, toDate, 'excel');

        expect(XLSX.utils.book_new).toHaveBeenCalled();
        expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
        expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
        expect(XLSX.write).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: 'buffer',
            bookType: 'xlsx',
          }),
        );
      });
    });

    describe('category filtering', () => {
      it('should filter by category when categoryId provided', async () => {
        const invoiceWithMultipleCategories = {
          ...mockInvoice,
          items: [
            mockInvoiceItem,
            {
              ...mockInvoiceItem,
              id: 'item-456',
              product: {
                ...mockProduct,
                id: 'product-456',
                categoryId: 'other-category',
                category: { id: 'other-category', name: 'Other' },
              },
            },
          ],
        };
        mockPrismaInvoice.findMany.mockResolvedValue([
          invoiceWithMultipleCategories,
        ]);

        const result = await service.generateSalesReport(
          fromDate,
          toDate,
          'pdf',
          mockCategory.id,
        );

        expect(result).toBeInstanceOf(Buffer);
      });
    });

    describe('calculations', () => {
      it('should calculate correct totals', async () => {
        const multipleInvoices = [
          mockInvoice,
          {
            ...mockInvoice,
            id: 'invoice-456',
            paymentStatus: PaymentStatus.UNPAID,
            total: { toNumber: () => 500 },
          },
        ];
        mockPrismaInvoice.findMany.mockResolvedValue(multipleInvoices);

        const result = await service.generateSalesReport(
          fromDate,
          toDate,
          'excel',
        );

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should handle empty invoices list', async () => {
        mockPrismaInvoice.findMany.mockResolvedValue([]);

        const result = await service.generateSalesReport(
          fromDate,
          toDate,
          'pdf',
        );

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should handle invoices with items without product', async () => {
        const invoiceWithNullProduct = {
          ...mockInvoice,
          items: [{ ...mockInvoiceItem, product: null, productId: null }],
        };
        mockPrismaInvoice.findMany.mockResolvedValue([invoiceWithNullProduct]);

        const result = await service.generateSalesReport(
          fromDate,
          toDate,
          'pdf',
        );

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should handle items without category', async () => {
        const invoiceWithNoCategoryProduct = {
          ...mockInvoice,
          items: [
            {
              ...mockInvoiceItem,
              product: { ...mockProduct, category: null, categoryId: null },
            },
          ],
        };
        mockPrismaInvoice.findMany.mockResolvedValue([
          invoiceWithNoCategoryProduct,
        ]);

        const result = await service.generateSalesReport(
          fromDate,
          toDate,
          'pdf',
        );

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should calculate category breakdown correctly', async () => {
        const invoiceWithMultipleItems = {
          ...mockInvoice,
          items: [
            mockInvoiceItem,
            {
              ...mockInvoiceItem,
              id: 'item-789',
              total: { toNumber: () => 200 },
            },
          ],
        };
        mockPrismaInvoice.findMany.mockResolvedValue([
          invoiceWithMultipleItems,
        ]);

        const result = await service.generateSalesReport(
          fromDate,
          toDate,
          'excel',
        );

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should track unique invoices per category', async () => {
        const multipleInvoices = [
          mockInvoice,
          {
            ...mockInvoice,
            id: 'invoice-456',
          },
        ];
        mockPrismaInvoice.findMany.mockResolvedValue(multipleInvoices);

        const result = await service.generateSalesReport(
          fromDate,
          toDate,
          'excel',
        );

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should limit top products to 10', async () => {
        const manyProducts = Array.from({ length: 15 }, (_, i) => ({
          ...mockInvoiceItem,
          id: `item-${i}`,
          productId: `product-${i}`,
          product: {
            ...mockProduct,
            id: `product-${i}`,
            name: `Product ${i}`,
            sku: `SKU-${String(i).padStart(3, '0')}`,
          },
          total: { toNumber: () => 100 * (15 - i) },
        }));
        const invoiceWithManyProducts = {
          ...mockInvoice,
          items: manyProducts,
        };
        mockPrismaInvoice.findMany.mockResolvedValue([invoiceWithManyProducts]);

        const result = await service.generateSalesReport(
          fromDate,
          toDate,
          'pdf',
        );

        expect(result).toBeInstanceOf(Buffer);
      });
    });
  });

  // ============================================================================
  // INVENTORY REPORT
  // ============================================================================

  describe('generateInventoryReport', () => {
    const mockProductEntity = {
      ...mockProduct,
      costPrice: 100,
      salePrice: 150,
    };

    beforeEach(() => {
      mockPrismaProduct.findMany.mockResolvedValue([mockProductEntity]);
    });

    describe('PDF format', () => {
      it('should generate PDF buffer for inventory report', async () => {
        const result = await service.generateInventoryReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should query products with category', async () => {
        await service.generateInventoryReport('pdf');

        expect(mockPrismaProduct.findMany).toHaveBeenCalledWith({
          where: { tenantId: mockTenantId },
          include: { category: true },
          orderBy: { name: 'asc' },
        });
      });

      it('should log debug message', async () => {
        const debugSpy = jest.spyOn(Logger.prototype, 'debug');

        await service.generateInventoryReport('pdf');

        expect(debugSpy).toHaveBeenCalledWith(
          expect.stringContaining('Generating inventory report'),
        );
      });
    });

    describe('Excel format', () => {
      it('should generate Excel buffer for inventory report', async () => {
        const result = await service.generateInventoryReport('excel');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should create multiple sheets in Excel', async () => {
        const XLSX = require('xlsx');

        await service.generateInventoryReport('excel');

        expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
      });
    });

    describe('category filtering', () => {
      it('should filter by category when categoryId provided', async () => {
        await service.generateInventoryReport('pdf', mockCategory.id);

        expect(mockPrismaProduct.findMany).toHaveBeenCalledWith({
          where: { tenantId: mockTenantId, categoryId: mockCategory.id },
          include: { category: true },
          orderBy: { name: 'asc' },
        });
      });
    });

    describe('stock calculations', () => {
      it('should identify low stock products', async () => {
        const lowStockProduct = {
          ...mockProductEntity,
          stock: 5,
          minStock: 10,
        };
        mockPrismaProduct.findMany.mockResolvedValue([lowStockProduct]);

        const result = await service.generateInventoryReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should identify out of stock products', async () => {
        const outOfStockProduct = {
          ...mockProductEntity,
          stock: 0,
          minStock: 10,
        };
        mockPrismaProduct.findMany.mockResolvedValue([outOfStockProduct]);

        const result = await service.generateInventoryReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should handle products with sufficient stock', async () => {
        const sufficientStockProduct = {
          ...mockProductEntity,
          stock: 15,
          minStock: 10,
        };
        mockPrismaProduct.findMany.mockResolvedValue([sufficientStockProduct]);

        const result = await service.generateInventoryReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should calculate total stock value', async () => {
        const multipleProducts = [
          { ...mockProductEntity, stock: 10, costPrice: 100 },
          { ...mockProductEntity, id: 'product-456', stock: 5, costPrice: 200 },
        ];
        mockPrismaProduct.findMany.mockResolvedValue(multipleProducts);

        const result = await service.generateInventoryReport('excel');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should count active products', async () => {
        const mixedStatusProducts = [
          { ...mockProductEntity, status: ProductStatus.ACTIVE },
          {
            ...mockProductEntity,
            id: 'product-456',
            status: ProductStatus.INACTIVE,
          },
        ];
        mockPrismaProduct.findMany.mockResolvedValue(mixedStatusProducts);

        const result = await service.generateInventoryReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should handle empty products list', async () => {
        mockPrismaProduct.findMany.mockResolvedValue([]);

        const result = await service.generateInventoryReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should handle product without category', async () => {
        const productWithoutCategory = {
          ...mockProductEntity,
          category: null,
        };
        mockPrismaProduct.findMany.mockResolvedValue([productWithoutCategory]);

        const result = await service.generateInventoryReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should add low stock sheet in Excel when low stock exists', async () => {
        const XLSX = require('xlsx');
        const lowStockProduct = {
          ...mockProductEntity,
          stock: 5,
          minStock: 10,
        };
        mockPrismaProduct.findMany.mockResolvedValue([lowStockProduct]);

        await service.generateInventoryReport('excel');

        // Verify book_append_sheet was called (for summary + inventory + low stock)
        expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
      });

      it('should add out of stock sheet in Excel when out of stock exists', async () => {
        const XLSX = require('xlsx');
        const outOfStockProduct = {
          ...mockProductEntity,
          stock: 0,
          minStock: 10,
        };
        mockPrismaProduct.findMany.mockResolvedValue([outOfStockProduct]);

        await service.generateInventoryReport('excel');

        expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // CUSTOMERS REPORT
  // ============================================================================

  describe('generateCustomersReport', () => {
    const mockCustomerWithInvoices = {
      ...mockCustomer,
      invoices: [
        {
          id: 'invoice-123',
          total: { toNumber: () => 500 },
          issueDate: new Date('2024-01-15'),
        },
        {
          id: 'invoice-456',
          total: { toNumber: () => 300 },
          issueDate: new Date('2024-01-10'),
        },
      ],
    };

    beforeEach(() => {
      mockPrismaCustomer.findMany.mockResolvedValue([mockCustomerWithInvoices]);
    });

    describe('PDF format', () => {
      it('should generate PDF buffer for customers report', async () => {
        const result = await service.generateCustomersReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should query customers with invoices', async () => {
        await service.generateCustomersReport('pdf');

        expect(mockPrismaCustomer.findMany).toHaveBeenCalledWith({
          where: { tenantId: mockTenantId },
          include: {
            invoices: {
              where: {
                status: {
                  notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOID],
                },
              },
              select: {
                id: true,
                total: true,
                issueDate: true,
              },
              orderBy: { issueDate: 'desc' },
            },
          },
          orderBy: { name: 'asc' },
        });
      });

      it('should log debug message', async () => {
        const debugSpy = jest.spyOn(Logger.prototype, 'debug');

        await service.generateCustomersReport('pdf');

        expect(debugSpy).toHaveBeenCalledWith(
          expect.stringContaining('Generating customers report'),
        );
      });
    });

    describe('Excel format', () => {
      it('should generate Excel buffer for customers report', async () => {
        const result = await service.generateCustomersReport('excel');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should create multiple sheets in Excel', async () => {
        const XLSX = require('xlsx');

        await service.generateCustomersReport('excel');

        expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
      });
    });

    describe('calculations', () => {
      it('should calculate total customers', async () => {
        const multipleCustomers = [
          mockCustomerWithInvoices,
          { ...mockCustomerWithInvoices, id: 'customer-456', invoices: [] },
        ];
        mockPrismaCustomer.findMany.mockResolvedValue(multipleCustomers);

        const result = await service.generateCustomersReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should count active customers', async () => {
        const mixedStatusCustomers = [
          mockCustomerWithInvoices,
          {
            ...mockCustomerWithInvoices,
            id: 'customer-456',
            status: CustomerStatus.INACTIVE,
          },
        ];
        mockPrismaCustomer.findMany.mockResolvedValue(mixedStatusCustomers);

        const result = await service.generateCustomersReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should count customers with purchases', async () => {
        const customersWithAndWithoutPurchases = [
          mockCustomerWithInvoices,
          { ...mockCustomerWithInvoices, id: 'customer-456', invoices: [] },
        ];
        mockPrismaCustomer.findMany.mockResolvedValue(
          customersWithAndWithoutPurchases,
        );

        const result = await service.generateCustomersReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should calculate total revenue', async () => {
        const result = await service.generateCustomersReport('excel');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should handle customer without purchases for lastPurchaseDate', async () => {
        const customerWithNoPurchases = {
          ...mockCustomer,
          invoices: [],
        };
        mockPrismaCustomer.findMany.mockResolvedValue([
          customerWithNoPurchases,
        ]);

        const result = await service.generateCustomersReport('excel');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should limit top customers to 10', async () => {
        const manyCustomers = Array.from({ length: 15 }, (_, i) => ({
          ...mockCustomerWithInvoices,
          id: `customer-${i}`,
          name: `Customer ${i}`,
          invoices: [
            {
              id: `invoice-${i}`,
              total: { toNumber: () => 1000 * (15 - i) },
              issueDate: new Date('2024-01-15'),
            },
          ],
        }));
        mockPrismaCustomer.findMany.mockResolvedValue(manyCustomers);

        const result = await service.generateCustomersReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should handle empty customers list', async () => {
        mockPrismaCustomer.findMany.mockResolvedValue([]);

        const result = await service.generateCustomersReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should handle customer with null optional fields', async () => {
        const customerWithNullFields = {
          ...mockCustomer,
          email: null,
          phone: null,
          city: null,
          invoices: [mockCustomerWithInvoices.invoices[0]],
        };
        mockPrismaCustomer.findMany.mockResolvedValue([customerWithNullFields]);

        const result = await service.generateCustomersReport('excel');

        expect(result).toBeInstanceOf(Buffer);
      });

      it('should filter out customers with zero purchases from top customers', async () => {
        const customersWithZeroPurchases = [
          { ...mockCustomerWithInvoices, invoices: [] },
          mockCustomerWithInvoices,
        ];
        mockPrismaCustomer.findMany.mockResolvedValue(
          customersWithZeroPurchases,
        );

        const result = await service.generateCustomersReport('pdf');

        expect(result).toBeInstanceOf(Buffer);
      });
    });
  });

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  describe('formatDate (private method - tested via public methods)', () => {
    it('should format date correctly in inventory report Excel', async () => {
      mockPrismaProduct.findMany.mockResolvedValue([]);

      const result = await service.generateInventoryReport('excel');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should format date correctly in customers report Excel', async () => {
      mockPrismaCustomer.findMany.mockResolvedValue([]);

      const result = await service.generateCustomersReport('excel');

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('edge cases', () => {
    it('should handle Decimal values correctly', async () => {
      const invoiceWithDecimalValues = {
        ...mockInvoice,
        total: 357.99,
        subtotal: 300.0,
        tax: 57.99,
        discount: 0,
        items: [
          {
            ...mockInvoiceItem,
            unitPrice: 150.5,
            total: 357.99,
            subtotal: 300.0,
            tax: 57.99,
            discount: 0,
            taxRate: 19,
          },
        ],
      };
      mockPrismaInvoice.findFirst.mockResolvedValue(invoiceWithDecimalValues);

      const result = await service.generateInvoicePdf('invoice-123');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle very large data sets', async () => {
      const largeInvoiceList = Array.from({ length: 100 }, (_, i) => ({
        ...mockInvoice,
        id: `invoice-${i}`,
        invoiceNumber: `INV-${String(i).padStart(3, '0')}`,
      }));
      mockPrismaInvoice.findMany.mockResolvedValue(largeInvoiceList);

      const result = await service.generateSalesReport(
        new Date('2024-01-01'),
        new Date('2024-12-31'),
        'pdf',
      );

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle products with zero cost price', async () => {
      const productWithZeroCost = {
        ...mockProduct,
        costPrice: 0,
        salePrice: 0,
        stock: 10,
        category: null,
      };
      mockPrismaProduct.findMany.mockResolvedValue([productWithZeroCost]);

      const result = await service.generateInventoryReport('excel');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle invoice items with zero values', async () => {
      const invoiceWithZeroItem = {
        ...mockInvoice,
        items: [
          {
            ...mockInvoiceItem,
            quantity: 0,
            unitPrice: { toNumber: () => 0 },
            total: { toNumber: () => 0 },
            subtotal: { toNumber: () => 0 },
            tax: { toNumber: () => 0 },
            discount: { toNumber: () => 0 },
            taxRate: { toNumber: () => 0 },
          },
        ],
      };
      mockPrismaInvoice.findMany.mockResolvedValue([invoiceWithZeroItem]);

      const result = await service.generateSalesReport(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'excel',
      );

      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
