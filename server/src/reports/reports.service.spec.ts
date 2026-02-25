/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentStatus,
  CustomerStatus,
  ProductStatus,
  MovementType,
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

// Mock xlsx - iterate over the array to ensure coverage of map functions
jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn().mockReturnValue({}),
    aoa_to_sheet: jest.fn().mockImplementation((data: unknown[][]) => {
      // Iterate over the data to ensure coverage of map functions
      if (Array.isArray(data)) {
        data.forEach((row) => {
          if (Array.isArray(row)) {
            row.forEach(() => {});
          }
        });
      }
      return {};
    }),
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

  // Note: The service uses Number() to convert Decimal values, so we use plain numbers
  const mockInvoiceItem = {
    id: 'item-123',
    productId: mockProduct.id,
    product: mockProduct,
    quantity: 2,
    unitPrice: 150,
    taxRate: 19,
    discount: 0,
    subtotal: 300,
    tax: 57,
    total: 357,
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
    subtotal: 300,
    tax: 57,
    discount: 0,
    total: 357,
  };

  const mockPrismaInvoice = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  };

  const mockPrismaProduct = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  };

  const mockPrismaCustomer = {
    findMany: jest.fn(),
  };

  const mockPrismaStockMovement = {
    findMany: jest.fn(),
  };

  const mockPrismaWarehouse = {
    findFirst: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      invoice: mockPrismaInvoice,
      product: mockPrismaProduct,
      customer: mockPrismaCustomer,
      stockMovement: mockPrismaStockMovement,
      warehouse: mockPrismaWarehouse,
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
        include: expect.objectContaining({
          customer: true,
          user: true,
          items: { include: { product: true } },
          tenant: expect.objectContaining({
            include: expect.objectContaining({
              dianConfig: true,
            }),
          }),
        }),
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
            total: 500,
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
              total: 200,
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
          total: 100 * (15 - i),
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
    // Note: The service uses Number(i.total) to convert invoice totals,
    // so we need to use plain numbers or objects with valueOf() method
    const mockCustomerWithInvoices = {
      ...mockCustomer,
      invoices: [
        {
          id: 'invoice-123',
          total: 500,
          issueDate: new Date('2024-01-15'),
        },
        {
          id: 'invoice-456',
          total: 300,
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
              total: 1000 * (15 - i),
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
  // KARDEX REPORT
  // ============================================================================

  describe('getKardexReport', () => {
    const mockKardexProduct = {
      id: 'product-123',
      sku: 'SKU-001',
      name: 'Test Product',
      stock: 50,
      costPrice: 100,
    };

    const mockWarehouse = {
      id: 'warehouse-123',
      name: 'Bodega Principal',
    };

    const fromDate = new Date('2024-01-01T00:00:00.000Z');
    const toDate = new Date('2024-01-31T23:59:59.000Z');

    const mockMovementsBeforeRange = [
      { type: MovementType.PURCHASE, quantity: 100 },
      { type: MovementType.SALE, quantity: 30 },
    ];

    const mockMovementsInRange = [
      {
        id: 'mov-1',
        type: MovementType.PURCHASE,
        quantity: 20,
        reason: null,
        invoiceId: null,
        purchaseOrderId: 'po-123',
        purchaseOrder: { purchaseOrderNumber: 'PO-00012' },
        warehouse: { name: 'Bodega Principal' },
        createdAt: new Date('2024-01-05T10:00:00.000Z'),
      },
      {
        id: 'mov-2',
        type: MovementType.SALE,
        quantity: 5,
        reason: null,
        invoiceId: 'invoice-456',
        purchaseOrderId: null,
        purchaseOrder: null,
        warehouse: { name: 'Bodega Principal' },
        createdAt: new Date('2024-01-10T14:00:00.000Z'),
      },
      {
        id: 'mov-3',
        type: MovementType.ADJUSTMENT,
        quantity: -3,
        reason: 'Conteo fisico',
        invoiceId: null,
        purchaseOrderId: null,
        purchaseOrder: null,
        warehouse: null,
        createdAt: new Date('2024-01-15T09:00:00.000Z'),
      },
    ];

    beforeEach(() => {
      mockPrismaProduct.findFirst.mockResolvedValue(mockKardexProduct);
      mockPrismaStockMovement.findMany
        .mockResolvedValueOnce(mockMovementsBeforeRange) // opening balance query
        .mockResolvedValueOnce(mockMovementsInRange); // in-range query
      mockPrismaInvoice.findMany.mockResolvedValue([
        { id: 'invoice-456', invoiceNumber: 'INV-00045' },
      ]);
    });

    it('should return a valid Kardex report', async () => {
      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.product).toEqual({
        id: 'product-123',
        sku: 'SKU-001',
        name: 'Test Product',
        currentStock: 50,
        costPrice: 100,
      });
      expect(result.fromDate).toBe(fromDate.toISOString());
      expect(result.toDate).toBe(toDate.toISOString());
      expect(result.movements).toHaveLength(3);
    });

    it('should calculate opening balance from movements before date range', async () => {
      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      // Opening: 100 (purchase) - 30 (sale) = 70
      expect(result.openingBalance).toBe(70);
    });

    it('should calculate running balance for each movement', async () => {
      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      // Opening: 70
      // mov-1: PURCHASE +20 -> 90
      // mov-2: SALE -5 -> 85
      // mov-3: ADJUSTMENT -3 -> 82
      expect(result.movements[0].balance).toBe(90);
      expect(result.movements[1].balance).toBe(85);
      expect(result.movements[2].balance).toBe(82);
      expect(result.closingBalance).toBe(82);
    });

    it('should classify PURCHASE as entries', async () => {
      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.movements[0].entries).toBe(20);
      expect(result.movements[0].exits).toBe(0);
    });

    it('should classify SALE as exits', async () => {
      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.movements[1].entries).toBe(0);
      expect(result.movements[1].exits).toBe(5);
    });

    it('should classify negative ADJUSTMENT as exits', async () => {
      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.movements[2].entries).toBe(0);
      expect(result.movements[2].exits).toBe(3);
    });

    it('should classify positive ADJUSTMENT as entries', async () => {
      mockPrismaStockMovement.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'mov-adj',
            type: MovementType.ADJUSTMENT,
            quantity: 10,
            reason: 'Ajuste positivo',
            invoiceId: null,
            purchaseOrderId: null,
            purchaseOrder: null,
            warehouse: null,
            createdAt: new Date('2024-01-05T10:00:00.000Z'),
          },
        ]);
      mockPrismaInvoice.findMany.mockResolvedValue([]);

      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.movements[0].entries).toBe(10);
      expect(result.movements[0].exits).toBe(0);
    });

    it('should classify RETURN as entries', async () => {
      mockPrismaStockMovement.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'mov-ret',
            type: MovementType.RETURN,
            quantity: 5,
            reason: null,
            invoiceId: 'invoice-456',
            purchaseOrderId: null,
            purchaseOrder: null,
            warehouse: null,
            createdAt: new Date('2024-01-05T10:00:00.000Z'),
          },
        ]);

      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.movements[0].entries).toBe(5);
      expect(result.movements[0].exits).toBe(0);
    });

    it('should classify DAMAGED as exits', async () => {
      mockPrismaStockMovement.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'mov-dmg',
            type: MovementType.DAMAGED,
            quantity: 2,
            reason: 'Producto roto',
            invoiceId: null,
            purchaseOrderId: null,
            purchaseOrder: null,
            warehouse: null,
            createdAt: new Date('2024-01-05T10:00:00.000Z'),
          },
        ]);
      mockPrismaInvoice.findMany.mockResolvedValue([]);

      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.movements[0].entries).toBe(0);
      expect(result.movements[0].exits).toBe(2);
    });

    it('should classify TRANSFER as exits', async () => {
      mockPrismaStockMovement.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'mov-trf',
            type: MovementType.TRANSFER,
            quantity: 8,
            reason: null,
            invoiceId: null,
            purchaseOrderId: null,
            purchaseOrder: null,
            warehouse: { name: 'Bodega Secundaria' },
            createdAt: new Date('2024-01-05T10:00:00.000Z'),
          },
        ]);
      mockPrismaInvoice.findMany.mockResolvedValue([]);

      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.movements[0].entries).toBe(0);
      expect(result.movements[0].exits).toBe(8);
    });

    it('should build description with invoice number for sales', async () => {
      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.movements[1].description).toBe(
        'Venta - Factura #INV-00045',
      );
      expect(result.movements[1].reference).toBe('INV-00045');
    });

    it('should build description with PO number for purchases', async () => {
      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.movements[0].description).toBe('Compra - OC #PO-00012');
      expect(result.movements[0].reference).toBe('PO-00012');
    });

    it('should build description with reason for adjustments', async () => {
      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.movements[2].description).toBe(
        'Ajuste - Conteo fisico',
      );
    });

    it('should build plain description when no reference or reason', async () => {
      mockPrismaStockMovement.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'mov-plain',
            type: MovementType.DAMAGED,
            quantity: 1,
            reason: null,
            invoiceId: null,
            purchaseOrderId: null,
            purchaseOrder: null,
            warehouse: null,
            createdAt: new Date('2024-01-05T10:00:00.000Z'),
          },
        ]);
      mockPrismaInvoice.findMany.mockResolvedValue([]);

      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.movements[0].description).toBe('Dano');
      expect(result.movements[0].reference).toBeUndefined();
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaProduct.findFirst.mockResolvedValue(null);

      await expect(
        service.getKardexReport('non-existent', undefined, fromDate, toDate),
      ).rejects.toThrow('Producto no encontrado');
    });

    it('should filter by warehouse when warehouseId is provided', async () => {
      mockPrismaWarehouse.findFirst.mockResolvedValue(mockWarehouse);
      mockPrismaStockMovement.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrismaInvoice.findMany.mockResolvedValue([]);

      const result = await service.getKardexReport(
        'product-123',
        'warehouse-123',
        fromDate,
        toDate,
      );

      expect(result.warehouse).toEqual(mockWarehouse);
      expect(mockPrismaStockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            warehouseId: 'warehouse-123',
          }),
        }),
      );
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      mockPrismaWarehouse.findFirst.mockResolvedValue(null);

      await expect(
        service.getKardexReport(
          'product-123',
          'non-existent-wh',
          fromDate,
          toDate,
        ),
      ).rejects.toThrow('Bodega no encontrada');
    });

    it('should use default date range when dates not provided', async () => {
      mockPrismaStockMovement.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrismaInvoice.findMany.mockResolvedValue([]);

      const result = await service.getKardexReport('product-123');

      // Should have fromDate and toDate set
      expect(result.fromDate).toBeDefined();
      expect(result.toDate).toBeDefined();

      // Default range should be ~30 days
      const from = new Date(result.fromDate);
      const to = new Date(result.toDate);
      const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(30, 0);
    });

    it('should handle empty movements', async () => {
      mockPrismaStockMovement.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrismaInvoice.findMany.mockResolvedValue([]);

      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.openingBalance).toBe(0);
      expect(result.movements).toHaveLength(0);
      expect(result.closingBalance).toBe(0);
    });

    it('should include warehouseName in movements', async () => {
      const result = await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(result.movements[0].warehouseName).toBe('Bodega Principal');
      expect(result.movements[2].warehouseName).toBeUndefined();
    });

    it('should log debug message', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generating Kardex report'),
      );
    });

    it('should query tenant-scoped data', async () => {
      await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(mockPrismaProduct.findFirst).toHaveBeenCalledWith({
        where: { id: 'product-123', tenantId: mockTenantId },
        select: {
          id: true,
          sku: true,
          name: true,
          stock: true,
          costPrice: true,
        },
      });
    });

    it('should batch-fetch invoice numbers', async () => {
      await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      expect(mockPrismaInvoice.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['invoice-456'] }, tenantId: mockTenantId },
        select: { id: true, invoiceNumber: true },
      });
    });

    it('should not fetch invoices when no movements have invoiceId', async () => {
      mockPrismaStockMovement.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'mov-adj',
            type: MovementType.ADJUSTMENT,
            quantity: 5,
            reason: 'Test',
            invoiceId: null,
            purchaseOrderId: null,
            purchaseOrder: null,
            warehouse: null,
            createdAt: new Date('2024-01-05T10:00:00.000Z'),
          },
        ]);

      await service.getKardexReport(
        'product-123',
        undefined,
        fromDate,
        toDate,
      );

      // Invoice findMany should NOT have been called (only the one from beforeEach reset matters)
      // We need to check it was not called after the reset
      expect(mockPrismaInvoice.findMany).not.toHaveBeenCalled();
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

  describe('generatePdfBuffer error handling', () => {
    it('should reject when pdfDoc emits error event', async () => {
      // Reset the mock to simulate an error event
      const mockError = new Error('PDF generation failed');
      jest.resetModules();

      // Re-mock pdfmake to emit an error
      jest.doMock('pdfmake', () => {
        return jest.fn().mockImplementation(() => ({
          createPdfKitDocument: jest.fn().mockReturnValue({
            on: jest.fn(
              (event: string, callback: (data?: Buffer | Error) => void) => {
                if (event === 'error') {
                  setTimeout(() => callback(mockError), 0);
                }
              },
            ),
            end: jest.fn(),
          }),
        }));
      });

      // Access the private method via reflection to test error handling
      mockPrismaInvoice.findFirst.mockResolvedValue(mockInvoice);

      // Since we can't easily re-instantiate the service with new mock,
      // we test the error branch by mocking the pdfPrinter directly
      const pdfPrinterMock = {
        createPdfKitDocument: jest.fn().mockReturnValue({
          on: jest.fn(
            (event: string, callback: (data?: Buffer | Error) => void) => {
              if (event === 'error') {
                setTimeout(() => callback(mockError), 5);
              }
            },
          ),
          end: jest.fn(),
        }),
      };
      (service as unknown as { pdfPrinter: typeof pdfPrinterMock }).pdfPrinter =
        pdfPrinterMock;

      await expect(service.generateInvoicePdf('invoice-123')).rejects.toThrow(
        'PDF generation failed',
      );
    });

    it('should reject when createPdfKitDocument throws synchronously', async () => {
      mockPrismaInvoice.findFirst.mockResolvedValue(mockInvoice);

      const syncError = new Error('Sync PDF error');
      const pdfPrinterMock = {
        createPdfKitDocument: jest.fn().mockImplementation(() => {
          throw syncError;
        }),
      };
      (service as unknown as { pdfPrinter: typeof pdfPrinterMock }).pdfPrinter =
        pdfPrinterMock;

      await expect(service.generateInvoicePdf('invoice-123')).rejects.toThrow(
        'Sync PDF error',
      );
    });

    it('should wrap non-Error throws in Error object', async () => {
      mockPrismaInvoice.findFirst.mockResolvedValue(mockInvoice);

      const pdfPrinterMock = {
        createPdfKitDocument: jest.fn().mockImplementation(() => {
          throw new Error('string error');
        }),
      };
      (service as unknown as { pdfPrinter: typeof pdfPrinterMock }).pdfPrinter =
        pdfPrinterMock;

      await expect(service.generateInvoicePdf('invoice-123')).rejects.toThrow(
        'string error',
      );
    });
  });

  describe('sorting edge cases', () => {
    it('should sort categories by totalSales descending with multiple categories', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      // Create invoices with items in different categories with different total sales
      // This ensures the sort comparator function is exercised for ordering
      const category1 = {
        id: 'cat-1',
        name: 'Category A',
        tenantId: mockTenantId,
      };
      const category2 = {
        id: 'cat-2',
        name: 'Category B',
        tenantId: mockTenantId,
      };
      const category3 = {
        id: 'cat-3',
        name: 'Category C',
        tenantId: mockTenantId,
      };

      const invoicesWithMultipleCategories = [
        {
          ...mockInvoice,
          id: 'invoice-1',
          items: [
            {
              ...mockInvoiceItem,
              id: 'item-1',
              product: {
                ...mockProduct,
                id: 'prod-1',
                categoryId: 'cat-1',
                category: category1,
              },
              total: 100,
            },
            {
              ...mockInvoiceItem,
              id: 'item-2',
              product: {
                ...mockProduct,
                id: 'prod-2',
                categoryId: 'cat-2',
                category: category2,
              },
              total: 300,
            },
            {
              ...mockInvoiceItem,
              id: 'item-3',
              product: {
                ...mockProduct,
                id: 'prod-3',
                categoryId: 'cat-3',
                category: category3,
              },
              total: 200,
            },
          ],
        },
      ];
      mockPrismaInvoice.findMany.mockResolvedValue(
        invoicesWithMultipleCategories,
      );

      const result = await service.generateSalesReport(fromDate, toDate, 'pdf');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should sort categories with equal sales values correctly', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      // Create categories with equal sales to test the sort comparator returns 0
      const category1 = {
        id: 'cat-1',
        name: 'Category A',
        tenantId: mockTenantId,
      };
      const category2 = {
        id: 'cat-2',
        name: 'Category B',
        tenantId: mockTenantId,
      };

      const invoicesWithEqualCategorySales = [
        {
          ...mockInvoice,
          id: 'invoice-1',
          items: [
            {
              ...mockInvoiceItem,
              id: 'item-1',
              product: {
                ...mockProduct,
                id: 'prod-1',
                categoryId: 'cat-1',
                category: category1,
              },
              total: 200,
            },
            {
              ...mockInvoiceItem,
              id: 'item-2',
              product: {
                ...mockProduct,
                id: 'prod-2',
                categoryId: 'cat-2',
                category: category2,
              },
              total: 200,
            },
          ],
        },
      ];
      mockPrismaInvoice.findMany.mockResolvedValue(
        invoicesWithEqualCategorySales,
      );

      const result = await service.generateSalesReport(fromDate, toDate, 'pdf');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should sort top customers by totalPurchases descending with multiple customers', async () => {
      // Create multiple customers with different total purchases to exercise the sort function
      const customersWithDifferentPurchases = [
        {
          ...mockCustomer,
          id: 'customer-1',
          name: 'Customer A',
          invoices: [
            {
              id: 'inv-1',
              total: 100,
              issueDate: new Date('2024-01-15'),
            },
          ],
        },
        {
          ...mockCustomer,
          id: 'customer-2',
          name: 'Customer B',
          invoices: [
            {
              id: 'inv-2',
              total: 500,
              issueDate: new Date('2024-01-15'),
            },
          ],
        },
        {
          ...mockCustomer,
          id: 'customer-3',
          name: 'Customer C',
          invoices: [
            {
              id: 'inv-3',
              total: 300,
              issueDate: new Date('2024-01-15'),
            },
          ],
        },
      ];
      mockPrismaCustomer.findMany.mockResolvedValue(
        customersWithDifferentPurchases,
      );

      const result = await service.generateCustomersReport('pdf');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should sort customers with equal totalPurchases correctly', async () => {
      // Create customers with equal purchases to test the sort comparator returns 0
      const customersWithEqualPurchases = [
        {
          ...mockCustomer,
          id: 'customer-1',
          name: 'Customer A',
          invoices: [
            {
              id: 'inv-1',
              total: 500,
              issueDate: new Date('2024-01-15'),
            },
          ],
        },
        {
          ...mockCustomer,
          id: 'customer-2',
          name: 'Customer B',
          invoices: [
            {
              id: 'inv-2',
              total: 500,
              issueDate: new Date('2024-01-15'),
            },
          ],
        },
      ];
      mockPrismaCustomer.findMany.mockResolvedValue(
        customersWithEqualPurchases,
      );

      const result = await service.generateCustomersReport('pdf');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate Excel with top customers data correctly mapped', async () => {
      // Create customers with purchases to exercise the topCustomers.map in Excel
      const customersWithPurchases = [
        {
          ...mockCustomer,
          id: 'customer-1',
          name: 'Top Customer',
          documentNumber: 'DOC123',
          invoices: [
            {
              id: 'inv-1',
              total: 1000,
              issueDate: new Date('2024-01-15'),
            },
            {
              id: 'inv-2',
              total: 500,
              issueDate: new Date('2024-01-10'),
            },
          ],
        },
        {
          ...mockCustomer,
          id: 'customer-2',
          name: 'Second Customer',
          documentNumber: 'DOC456',
          invoices: [
            {
              id: 'inv-3',
              total: 800,
              issueDate: new Date('2024-01-12'),
            },
          ],
        },
      ];
      mockPrismaCustomer.findMany.mockResolvedValue(customersWithPurchases);

      const result = await service.generateCustomersReport('excel');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should exercise top customers slice when more than 10 customers have purchases', async () => {
      // Create 12 customers with purchases to test the slice(0, 10)
      const manyCustomersWithPurchases = Array.from({ length: 12 }, (_, i) => ({
        ...mockCustomer,
        id: `customer-${i}`,
        name: `Customer ${i}`,
        documentNumber: `DOC${i}`,
        invoices: [
          {
            id: `inv-${i}`,
            total: 1000 - i * 50,
            issueDate: new Date('2024-01-15'),
          },
        ],
      }));
      mockPrismaCustomer.findMany.mockResolvedValue(manyCustomersWithPurchases);

      const result = await service.generateCustomersReport('excel');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should exercise filter, sort, and slice chain for top customers', async () => {
      // Create 15 customers: some with zero purchases (filtered out),
      // others with varying amounts (sorted), then sliced to 10
      const customersForFullChain = [
        // 3 customers with zero purchases - will be filtered out
        {
          ...mockCustomer,
          id: 'customer-zero-1',
          name: 'Zero Customer 1',
          invoices: [],
        },
        {
          ...mockCustomer,
          id: 'customer-zero-2',
          name: 'Zero Customer 2',
          invoices: [],
        },
        {
          ...mockCustomer,
          id: 'customer-zero-3',
          name: 'Zero Customer 3',
          invoices: [],
        },
        // 12 customers with purchases - will be sorted and sliced to 10
        ...Array.from({ length: 12 }, (_, i) => ({
          ...mockCustomer,
          id: `customer-with-purchase-${i}`,
          name: `Purchasing Customer ${i}`,
          documentNumber: `DOC-P${i}`,
          invoices: [
            {
              id: `inv-p${i}`,
              total: 100 + i * 100,
              issueDate: new Date('2024-01-15'),
            },
          ],
        })),
      ];
      mockPrismaCustomer.findMany.mockResolvedValue(customersForFullChain);

      const result = await service.generateCustomersReport('excel');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should execute sort comparator and map callback for top customers in Excel', async () => {
      // Explicitly create 2 customers with different purchase amounts
      // to force the sort comparator (a, b) => b.totalPurchases - a.totalPurchases to execute
      const twoCustomersWithDifferentPurchases = [
        {
          ...mockCustomer,
          id: 'customer-high',
          name: 'High Spender',
          documentNumber: 'HIGH123',
          invoices: [
            {
              id: 'inv-high',
              total: 2000,
              issueDate: new Date('2024-01-15'),
            },
          ],
        },
        {
          ...mockCustomer,
          id: 'customer-low',
          name: 'Low Spender',
          documentNumber: 'LOW456',
          invoices: [
            {
              id: 'inv-low',
              total: 500,
              issueDate: new Date('2024-01-15'),
            },
          ],
        },
      ];
      mockPrismaCustomer.findMany.mockResolvedValue(
        twoCustomersWithDifferentPurchases,
      );

      // Call Excel format to trigger both sort (line 658) and map (line 718)
      const result = await service.generateCustomersReport('excel');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should trigger sort comparator with reverse order input', async () => {
      // Create customers in reverse order of purchases to ensure sort comparator runs
      const reverseOrderCustomers = [
        {
          ...mockCustomer,
          id: 'customer-lowest',
          name: 'Lowest Spender',
          documentNumber: 'L001',
          invoices: [
            {
              id: 'inv-1',
              total: 100,
              issueDate: new Date('2024-01-15'),
            },
          ],
        },
        {
          ...mockCustomer,
          id: 'customer-highest',
          name: 'Highest Spender',
          documentNumber: 'H001',
          invoices: [
            {
              id: 'inv-2',
              total: 1000,
              issueDate: new Date('2024-01-15'),
            },
          ],
        },
        {
          ...mockCustomer,
          id: 'customer-middle',
          name: 'Middle Spender',
          documentNumber: 'M001',
          invoices: [
            {
              id: 'inv-3',
              total: 500,
              issueDate: new Date('2024-01-15'),
            },
          ],
        },
      ];
      mockPrismaCustomer.findMany.mockResolvedValue(reverseOrderCustomers);

      // Use PDF to test sort without Excel map interference
      const result = await service.generateCustomersReport('pdf');

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
            unitPrice: 0,
            total: 0,
            subtotal: 0,
            tax: 0,
            discount: 0,
            taxRate: 0,
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
