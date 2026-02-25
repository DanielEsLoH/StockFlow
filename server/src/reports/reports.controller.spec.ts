import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService, type KardexReport } from './reports.service';
import {
  ReportQueryDto,
  InventoryReportQueryDto,
  CustomersReportQueryDto,
  KardexQueryDto,
  CostCenterBalanceQueryDto,
  ReportFormat,
} from './dto';
import { MovementType } from '@prisma/client';
import type { Response } from 'express';
import { ArcjetService } from '../arcjet/arcjet.service';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: jest.Mocked<ReportsService>;

  // Mock response object
  const mockResponse = (): jest.Mocked<Response> => {
    const res = {
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<Response>;
    return res;
  };

  // Test data
  const mockPdfBuffer = Buffer.from('test-pdf-data');
  const mockExcelBuffer = Buffer.from('test-excel-data');

  const mockSalesQueryPdf: ReportQueryDto = {
    format: ReportFormat.PDF,
    fromDate: new Date('2024-01-01'),
    toDate: new Date('2024-01-31'),
  };

  const mockSalesQueryExcel: ReportQueryDto = {
    format: ReportFormat.EXCEL,
    fromDate: new Date('2024-01-01'),
    toDate: new Date('2024-01-31'),
    categoryId: 'category-123',
  };

  const mockInventoryQueryPdf: InventoryReportQueryDto = {
    format: ReportFormat.PDF,
  };

  const mockInventoryQueryExcel: InventoryReportQueryDto = {
    format: ReportFormat.EXCEL,
    categoryId: 'category-123',
  };

  const mockCustomersQueryPdf: CustomersReportQueryDto = {
    format: ReportFormat.PDF,
  };

  const mockCustomersQueryExcel: CustomersReportQueryDto = {
    format: ReportFormat.EXCEL,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockReportsService = {
      generateSalesReport: jest.fn(),
      generateInventoryReport: jest.fn(),
      generateCustomersReport: jest.fn(),
      generateInvoicePdf: jest.fn(),
      getKardexReport: jest.fn(),
      generateCostCenterBalanceReport: jest.fn(),
    };

    const mockArcjetService = {
      isProtectionEnabled: jest.fn().mockReturnValue(false),
      checkRateLimit: jest
        .fn()
        .mockResolvedValue({ allowed: true, reason: 'DISABLED' }),
      checkBot: jest
        .fn()
        .mockResolvedValue({ allowed: true, reason: 'DISABLED' }),
      getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: mockReportsService },
        { provide: ArcjetService, useValue: mockArcjetService },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    reportsService = module.get(ReportsService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ============================================================================
  // SALES REPORT
  // ============================================================================

  describe('getSalesReport', () => {
    describe('PDF format', () => {
      it('should return PDF buffer from service', async () => {
        reportsService.generateSalesReport.mockResolvedValue(mockPdfBuffer);
        const res = mockResponse();

        await controller.getSalesReport(mockSalesQueryPdf, res);

        expect(reportsService.generateSalesReport).toHaveBeenCalledWith(
          mockSalesQueryPdf.fromDate,
          mockSalesQueryPdf.toDate,
          mockSalesQueryPdf.format,
          undefined,
        );
        expect(res.send).toHaveBeenCalledWith(mockPdfBuffer);
      });

      it('should set correct PDF response headers', async () => {
        reportsService.generateSalesReport.mockResolvedValue(mockPdfBuffer);
        const res = mockResponse();

        await controller.getSalesReport(mockSalesQueryPdf, res);

        expect(res.set).toHaveBeenCalledWith(
          expect.objectContaining({
            'Content-Type': 'application/pdf',
            'Content-Disposition': expect.stringMatching(
              /^attachment; filename="reporte-ventas-\d{4}-\d{2}-\d{2}\.pdf"$/,
            ),
            'Content-Length': mockPdfBuffer.length,
          }),
        );
      });

      it('should log report generation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        reportsService.generateSalesReport.mockResolvedValue(mockPdfBuffer);
        const res = mockResponse();

        await controller.getSalesReport(mockSalesQueryPdf, res);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Generating sales report'),
        );
      });
    });

    describe('Excel format', () => {
      it('should return Excel buffer from service', async () => {
        reportsService.generateSalesReport.mockResolvedValue(mockExcelBuffer);
        const res = mockResponse();

        await controller.getSalesReport(mockSalesQueryExcel, res);

        expect(reportsService.generateSalesReport).toHaveBeenCalledWith(
          mockSalesQueryExcel.fromDate,
          mockSalesQueryExcel.toDate,
          mockSalesQueryExcel.format,
          mockSalesQueryExcel.categoryId,
        );
        expect(res.send).toHaveBeenCalledWith(mockExcelBuffer);
      });

      it('should set correct Excel response headers', async () => {
        reportsService.generateSalesReport.mockResolvedValue(mockExcelBuffer);
        const res = mockResponse();

        await controller.getSalesReport(mockSalesQueryExcel, res);

        expect(res.set).toHaveBeenCalledWith(
          expect.objectContaining({
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': expect.stringMatching(
              /^attachment; filename="reporte-ventas-\d{4}-\d{2}-\d{2}\.xlsx"$/,
            ),
            'Content-Length': mockExcelBuffer.length,
          }),
        );
      });
    });

    describe('with category filter', () => {
      it('should pass categoryId to service', async () => {
        reportsService.generateSalesReport.mockResolvedValue(mockPdfBuffer);
        const res = mockResponse();

        await controller.getSalesReport(mockSalesQueryExcel, res);

        expect(reportsService.generateSalesReport).toHaveBeenCalledWith(
          mockSalesQueryExcel.fromDate,
          mockSalesQueryExcel.toDate,
          mockSalesQueryExcel.format,
          'category-123',
        );
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        const error = new Error('Report generation failed');
        reportsService.generateSalesReport.mockRejectedValue(error);
        const res = mockResponse();

        await expect(
          controller.getSalesReport(mockSalesQueryPdf, res),
        ).rejects.toThrow(error);
      });
    });
  });

  // ============================================================================
  // INVENTORY REPORT
  // ============================================================================

  describe('getInventoryReport', () => {
    describe('PDF format', () => {
      it('should return PDF buffer from service', async () => {
        reportsService.generateInventoryReport.mockResolvedValue(mockPdfBuffer);
        const res = mockResponse();

        await controller.getInventoryReport(mockInventoryQueryPdf, res);

        expect(reportsService.generateInventoryReport).toHaveBeenCalledWith(
          mockInventoryQueryPdf.format,
          undefined,
        );
        expect(res.send).toHaveBeenCalledWith(mockPdfBuffer);
      });

      it('should set correct PDF response headers', async () => {
        reportsService.generateInventoryReport.mockResolvedValue(mockPdfBuffer);
        const res = mockResponse();

        await controller.getInventoryReport(mockInventoryQueryPdf, res);

        expect(res.set).toHaveBeenCalledWith(
          expect.objectContaining({
            'Content-Type': 'application/pdf',
            'Content-Disposition': expect.stringMatching(
              /^attachment; filename="reporte-inventario-\d{4}-\d{2}-\d{2}\.pdf"$/,
            ),
            'Content-Length': mockPdfBuffer.length,
          }),
        );
      });

      it('should log report generation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        reportsService.generateInventoryReport.mockResolvedValue(mockPdfBuffer);
        const res = mockResponse();

        await controller.getInventoryReport(mockInventoryQueryPdf, res);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Generating inventory report'),
        );
      });
    });

    describe('Excel format', () => {
      it('should return Excel buffer from service', async () => {
        reportsService.generateInventoryReport.mockResolvedValue(
          mockExcelBuffer,
        );
        const res = mockResponse();

        await controller.getInventoryReport(mockInventoryQueryExcel, res);

        expect(reportsService.generateInventoryReport).toHaveBeenCalledWith(
          mockInventoryQueryExcel.format,
          mockInventoryQueryExcel.categoryId,
        );
        expect(res.send).toHaveBeenCalledWith(mockExcelBuffer);
      });

      it('should set correct Excel response headers', async () => {
        reportsService.generateInventoryReport.mockResolvedValue(
          mockExcelBuffer,
        );
        const res = mockResponse();

        await controller.getInventoryReport(mockInventoryQueryExcel, res);

        expect(res.set).toHaveBeenCalledWith(
          expect.objectContaining({
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': expect.stringMatching(
              /^attachment; filename="reporte-inventario-\d{4}-\d{2}-\d{2}\.xlsx"$/,
            ),
            'Content-Length': mockExcelBuffer.length,
          }),
        );
      });
    });

    describe('with category filter', () => {
      it('should pass categoryId to service', async () => {
        reportsService.generateInventoryReport.mockResolvedValue(
          mockExcelBuffer,
        );
        const res = mockResponse();

        await controller.getInventoryReport(mockInventoryQueryExcel, res);

        expect(reportsService.generateInventoryReport).toHaveBeenCalledWith(
          mockInventoryQueryExcel.format,
          'category-123',
        );
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        const error = new Error('Inventory report failed');
        reportsService.generateInventoryReport.mockRejectedValue(error);
        const res = mockResponse();

        await expect(
          controller.getInventoryReport(mockInventoryQueryPdf, res),
        ).rejects.toThrow(error);
      });
    });
  });

  // ============================================================================
  // CUSTOMERS REPORT
  // ============================================================================

  describe('getCustomersReport', () => {
    describe('PDF format', () => {
      it('should return PDF buffer from service', async () => {
        reportsService.generateCustomersReport.mockResolvedValue(mockPdfBuffer);
        const res = mockResponse();

        await controller.getCustomersReport(mockCustomersQueryPdf, res);

        expect(reportsService.generateCustomersReport).toHaveBeenCalledWith(
          mockCustomersQueryPdf.format,
        );
        expect(res.send).toHaveBeenCalledWith(mockPdfBuffer);
      });

      it('should set correct PDF response headers', async () => {
        reportsService.generateCustomersReport.mockResolvedValue(mockPdfBuffer);
        const res = mockResponse();

        await controller.getCustomersReport(mockCustomersQueryPdf, res);

        expect(res.set).toHaveBeenCalledWith(
          expect.objectContaining({
            'Content-Type': 'application/pdf',
            'Content-Disposition': expect.stringMatching(
              /^attachment; filename="reporte-clientes-\d{4}-\d{2}-\d{2}\.pdf"$/,
            ),
            'Content-Length': mockPdfBuffer.length,
          }),
        );
      });

      it('should log report generation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        reportsService.generateCustomersReport.mockResolvedValue(mockPdfBuffer);
        const res = mockResponse();

        await controller.getCustomersReport(mockCustomersQueryPdf, res);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Generating customers report'),
        );
      });
    });

    describe('Excel format', () => {
      it('should return Excel buffer from service', async () => {
        reportsService.generateCustomersReport.mockResolvedValue(
          mockExcelBuffer,
        );
        const res = mockResponse();

        await controller.getCustomersReport(mockCustomersQueryExcel, res);

        expect(reportsService.generateCustomersReport).toHaveBeenCalledWith(
          mockCustomersQueryExcel.format,
        );
        expect(res.send).toHaveBeenCalledWith(mockExcelBuffer);
      });

      it('should set correct Excel response headers', async () => {
        reportsService.generateCustomersReport.mockResolvedValue(
          mockExcelBuffer,
        );
        const res = mockResponse();

        await controller.getCustomersReport(mockCustomersQueryExcel, res);

        expect(res.set).toHaveBeenCalledWith(
          expect.objectContaining({
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': expect.stringMatching(
              /^attachment; filename="reporte-clientes-\d{4}-\d{2}-\d{2}\.xlsx"$/,
            ),
            'Content-Length': mockExcelBuffer.length,
          }),
        );
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        const error = new Error('Customers report failed');
        reportsService.generateCustomersReport.mockRejectedValue(error);
        const res = mockResponse();

        await expect(
          controller.getCustomersReport(mockCustomersQueryPdf, res),
        ).rejects.toThrow(error);
      });
    });
  });

  // ============================================================================
  // KARDEX REPORT
  // ============================================================================

  describe('getKardexReport', () => {
    const mockKardexQuery: KardexQueryDto = {
      productId: 'product-123',
    };

    const mockKardexQueryWithFilters: KardexQueryDto = {
      productId: 'product-123',
      warehouseId: 'warehouse-123',
      fromDate: new Date('2024-01-01'),
      toDate: new Date('2024-01-31'),
    };

    const mockKardexResult: KardexReport = {
      product: {
        id: 'product-123',
        sku: 'SKU-001',
        name: 'Test Product',
        currentStock: 50,
        costPrice: 100,
      },
      warehouse: { id: 'warehouse-123', name: 'Bodega Principal' },
      fromDate: '2024-01-01T00:00:00.000Z',
      toDate: '2024-01-31T23:59:59.000Z',
      openingBalance: 70,
      movements: [
        {
          id: 'mov-1',
          date: new Date('2024-01-05T10:00:00.000Z'),
          type: MovementType.PURCHASE,
          description: 'Compra - OC #PO-00012',
          entries: 20,
          exits: 0,
          balance: 90,
          reference: 'PO-00012',
          warehouseName: 'Bodega Principal',
        },
      ],
      closingBalance: 90,
    };

    it('should return Kardex report JSON from service', async () => {
      reportsService.getKardexReport.mockResolvedValue(mockKardexResult);

      const result = await controller.getKardexReport(mockKardexQuery);

      expect(reportsService.getKardexReport).toHaveBeenCalledWith(
        'product-123',
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockKardexResult);
    });

    it('should pass all filter parameters to service', async () => {
      reportsService.getKardexReport.mockResolvedValue(mockKardexResult);

      await controller.getKardexReport(mockKardexQueryWithFilters);

      expect(reportsService.getKardexReport).toHaveBeenCalledWith(
        'product-123',
        'warehouse-123',
        mockKardexQueryWithFilters.fromDate,
        mockKardexQueryWithFilters.toDate,
      );
    });

    it('should log report generation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      reportsService.getKardexReport.mockResolvedValue(mockKardexResult);

      await controller.getKardexReport(mockKardexQuery);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generating Kardex report for product'),
      );
    });

    it('should log warehouse in message when warehouseId is provided', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      reportsService.getKardexReport.mockResolvedValue(mockKardexResult);

      await controller.getKardexReport(mockKardexQueryWithFilters);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('warehouse: warehouse-123'),
      );
    });

    describe('error handling', () => {
      it('should propagate NotFoundException when product not found', async () => {
        const error = new NotFoundException('Producto no encontrado');
        reportsService.getKardexReport.mockRejectedValue(error);

        await expect(
          controller.getKardexReport(mockKardexQuery),
        ).rejects.toThrow(NotFoundException);
      });

      it('should propagate service errors', async () => {
        const error = new Error('Kardex report failed');
        reportsService.getKardexReport.mockRejectedValue(error);

        await expect(
          controller.getKardexReport(mockKardexQuery),
        ).rejects.toThrow(error);
      });
    });
  });

  // ============================================================================
  // INVOICE PDF
  // ============================================================================

  describe('getInvoicePdf', () => {
    const invoiceId = 'invoice-123';

    it('should return PDF buffer from service', async () => {
      reportsService.generateInvoicePdf.mockResolvedValue(mockPdfBuffer);
      const res = mockResponse();

      await controller.getInvoicePdf(invoiceId, res);

      expect(reportsService.generateInvoicePdf).toHaveBeenCalledWith(invoiceId);
      expect(res.send).toHaveBeenCalledWith(mockPdfBuffer);
    });

    it('should set correct PDF response headers', async () => {
      reportsService.generateInvoicePdf.mockResolvedValue(mockPdfBuffer);
      const res = mockResponse();

      await controller.getInvoicePdf(invoiceId, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'Content-Disposition': expect.stringMatching(
            /^attachment; filename="factura-invoice-123-\d{4}-\d{2}-\d{2}\.pdf"$/,
          ),
          'Content-Length': mockPdfBuffer.length,
        }),
      );
    });

    it('should log report generation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      reportsService.generateInvoicePdf.mockResolvedValue(mockPdfBuffer);
      const res = mockResponse();

      await controller.getInvoicePdf(invoiceId, res);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Generating PDF for invoice: ${invoiceId}`),
      );
    });

    describe('error handling', () => {
      it('should propagate NotFoundException when invoice not found', async () => {
        const error = new NotFoundException('Factura no encontrada');
        reportsService.generateInvoicePdf.mockRejectedValue(error);
        const res = mockResponse();

        await expect(controller.getInvoicePdf(invoiceId, res)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should propagate service errors', async () => {
        const error = new Error('Invoice PDF failed');
        reportsService.generateInvoicePdf.mockRejectedValue(error);
        const res = mockResponse();

        await expect(controller.getInvoicePdf(invoiceId, res)).rejects.toThrow(
          error,
        );
      });
    });
  });

  // ============================================================================
  // GUARD APPLICATION
  // ============================================================================

  describe('guard application', () => {
    it('should have JwtAuthGuard applied at class level', () => {
      const guards = Reflect.getMetadata('__guards__', ReportsController) as
        | unknown[]
        | undefined;
      expect(guards).toBeDefined();
      expect(guards?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // RESPONSE HELPER
  // ============================================================================

  describe('sendReportResponse (private method - tested via public methods)', () => {
    it('should handle different buffer sizes correctly for PDF', async () => {
      const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB buffer
      reportsService.generateInvoicePdf.mockResolvedValue(largeBuffer);
      const res = mockResponse();

      await controller.getInvoicePdf('invoice-123', res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Length': largeBuffer.length,
        }),
      );
    });

    it('should handle different buffer sizes correctly for Excel', async () => {
      const largeBuffer = Buffer.alloc(512 * 1024); // 512KB buffer
      reportsService.generateSalesReport.mockResolvedValue(largeBuffer);
      const res = mockResponse();

      await controller.getSalesReport(mockSalesQueryExcel, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Length': largeBuffer.length,
        }),
      );
    });

    it('should include timestamp in filename', async () => {
      reportsService.generateInvoicePdf.mockResolvedValue(mockPdfBuffer);
      const res = mockResponse();

      await controller.getInvoicePdf('invoice-123', res);

      // Verify filename contains today's date
      const today = new Date().toISOString().split('T')[0];
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': expect.stringContaining(today),
        }),
      );
    });
  });

  // ============================================================================
  // ROUTE DEFINITIONS
  // ============================================================================

  describe('route definitions', () => {
    it('should define sales report endpoint at GET /reports/sales', () => {
      const salesPath = Reflect.getMetadata(
        'path',
        ReportsController.prototype.getSalesReport,
      );
      expect(salesPath).toBe('reports/sales');
    });

    it('should define inventory report endpoint at GET /reports/inventory', () => {
      const inventoryPath = Reflect.getMetadata(
        'path',
        ReportsController.prototype.getInventoryReport,
      );
      expect(inventoryPath).toBe('reports/inventory');
    });

    it('should define customers report endpoint at GET /reports/customers', () => {
      const customersPath = Reflect.getMetadata(
        'path',
        ReportsController.prototype.getCustomersReport,
      );
      expect(customersPath).toBe('reports/customers');
    });

    it('should define kardex report endpoint at GET /reports/kardex', () => {
      const kardexPath = Reflect.getMetadata(
        'path',
        ReportsController.prototype.getKardexReport,
      );
      expect(kardexPath).toBe('reports/kardex');
    });

    it('should define invoice PDF endpoint at GET /invoices/:id/pdf', () => {
      const invoicePath = Reflect.getMetadata(
        'path',
        ReportsController.prototype.getInvoicePdf,
      );
      expect(invoicePath).toBe('invoices/:id/pdf');
    });
  });

  // ============================================================================
  // CONTENT-TYPE VALIDATION
  // ============================================================================

  describe('content type validation', () => {
    it('should return application/pdf for PDF format', async () => {
      reportsService.generateSalesReport.mockResolvedValue(mockPdfBuffer);
      const res = mockResponse();

      await controller.getSalesReport(mockSalesQueryPdf, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
        }),
      );
    });

    it('should return correct Excel MIME type for Excel format', async () => {
      reportsService.generateSalesReport.mockResolvedValue(mockExcelBuffer);
      const res = mockResponse();

      await controller.getSalesReport(mockSalesQueryExcel, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );
    });
  });

  // ============================================================================
  // FILENAME VALIDATION
  // ============================================================================

  describe('filename validation', () => {
    it('should use correct filename for sales report', async () => {
      reportsService.generateSalesReport.mockResolvedValue(mockPdfBuffer);
      const res = mockResponse();

      await controller.getSalesReport(mockSalesQueryPdf, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': expect.stringContaining('reporte-ventas'),
        }),
      );
    });

    it('should use correct filename for inventory report', async () => {
      reportsService.generateInventoryReport.mockResolvedValue(mockPdfBuffer);
      const res = mockResponse();

      await controller.getInventoryReport(mockInventoryQueryPdf, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': expect.stringContaining('reporte-inventario'),
        }),
      );
    });

    it('should use correct filename for customers report', async () => {
      reportsService.generateCustomersReport.mockResolvedValue(mockPdfBuffer);
      const res = mockResponse();

      await controller.getCustomersReport(mockCustomersQueryPdf, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': expect.stringContaining('reporte-clientes'),
        }),
      );
    });

    it('should use invoice ID in filename for invoice PDF', async () => {
      reportsService.generateInvoicePdf.mockResolvedValue(mockPdfBuffer);
      const res = mockResponse();

      await controller.getInvoicePdf('invoice-456', res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': expect.stringContaining('factura-invoice-456'),
        }),
      );
    });
  });

  describe('getCostCenterBalanceReport', () => {
    const mockCCBalanceQueryPdf: CostCenterBalanceQueryDto = {
      format: ReportFormat.PDF,
      fromDate: new Date('2024-01-01'),
      toDate: new Date('2024-01-31'),
    };

    const mockCCBalanceQueryExcel: CostCenterBalanceQueryDto = {
      format: ReportFormat.EXCEL,
      fromDate: new Date('2024-01-01'),
      toDate: new Date('2024-01-31'),
      costCenterId: 'cc-123',
    };

    describe('PDF format', () => {
      it('should return PDF buffer from service', async () => {
        reportsService.generateCostCenterBalanceReport.mockResolvedValue(mockPdfBuffer);
        const res = mockResponse();

        await controller.getCostCenterBalanceReport(mockCCBalanceQueryPdf, res);

        expect(reportsService.generateCostCenterBalanceReport).toHaveBeenCalledWith(
          mockCCBalanceQueryPdf.fromDate,
          mockCCBalanceQueryPdf.toDate,
          ReportFormat.PDF,
          undefined,
        );
        expect(res.send).toHaveBeenCalledWith(mockPdfBuffer);
      });

      it('should set correct PDF response headers', async () => {
        reportsService.generateCostCenterBalanceReport.mockResolvedValue(mockPdfBuffer);
        const res = mockResponse();

        await controller.getCostCenterBalanceReport(mockCCBalanceQueryPdf, res);

        expect(res.set).toHaveBeenCalledWith(
          expect.objectContaining({
            'Content-Type': 'application/pdf',
          }),
        );
      });
    });

    describe('Excel format', () => {
      it('should return Excel buffer from service', async () => {
        reportsService.generateCostCenterBalanceReport.mockResolvedValue(mockExcelBuffer);
        const res = mockResponse();

        await controller.getCostCenterBalanceReport(mockCCBalanceQueryExcel, res);

        expect(reportsService.generateCostCenterBalanceReport).toHaveBeenCalledWith(
          mockCCBalanceQueryExcel.fromDate,
          mockCCBalanceQueryExcel.toDate,
          ReportFormat.EXCEL,
          'cc-123',
        );
        expect(res.send).toHaveBeenCalledWith(mockExcelBuffer);
      });

      it('should set correct Excel response headers', async () => {
        reportsService.generateCostCenterBalanceReport.mockResolvedValue(mockExcelBuffer);
        const res = mockResponse();

        await controller.getCostCenterBalanceReport(mockCCBalanceQueryExcel, res);

        expect(res.set).toHaveBeenCalledWith(
          expect.objectContaining({
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
        );
      });
    });

    describe('error handling', () => {
      it('should propagate service errors', async () => {
        reportsService.generateCostCenterBalanceReport.mockRejectedValue(
          new Error('Service error'),
        );
        const res = mockResponse();

        await expect(
          controller.getCostCenterBalanceReport(mockCCBalanceQueryPdf, res),
        ).rejects.toThrow('Service error');
      });
    });
  });
});
