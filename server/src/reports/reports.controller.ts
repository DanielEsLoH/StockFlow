import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService, type KardexReport } from './reports.service';
import {
  ReportQueryDto,
  InventoryReportQueryDto,
  CustomersReportQueryDto,
  KardexQueryDto,
  CostCenterBalanceQueryDto,
  ReportFormat,
} from './dto';
import { JwtAuthGuard } from '../auth';
import { RateLimitGuard, RateLimit } from '../arcjet';

/**
 * ReportsController handles all report generation endpoints.
 *
 * All endpoints require JWT authentication and return downloadable files.
 * Reports are scoped to the current tenant for data isolation.
 *
 * Rate limit: 50 reports per hour per user (heavy operation)
 *
 * Response formats:
 * - PDF: application/pdf
 * - Excel: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 */
@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit({ requests: 50, window: '1h', byUser: true })
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Generates a sales report for the specified date range.
   *
   * @param query - Report query parameters (format, fromDate, toDate, categoryId)
   * @param res - Express response object for file download
   *
   * @example
   * GET /reports/sales?format=pdf&fromDate=2024-01-01&toDate=2024-12-31
   * GET /reports/sales?format=excel&fromDate=2024-01-01&toDate=2024-12-31&categoryId=uuid
   */
  @Get('reports/sales')
  @ApiOperation({
    summary: 'Generate sales report',
    description:
      'Generates a sales report for the specified date range. Can optionally filter by category. Returns a downloadable PDF or Excel file. Rate limited to 50 reports per hour.',
  })
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiResponse({
    status: 200,
    description: 'Sales report generated successfully (file download)',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  async getSalesReport(
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `Generating sales report: ${query.format} from ${query.fromDate.toISOString()} to ${query.toDate.toISOString()}`,
    );

    const buffer = await this.reportsService.generateSalesReport(
      query.fromDate,
      query.toDate,
      query.format,
      query.categoryId,
    );

    this.sendReportResponse(res, buffer, 'reporte-ventas', query.format);
  }

  /**
   * Generates an inventory report.
   *
   * @param query - Report query parameters (format, categoryId)
   * @param res - Express response object for file download
   *
   * @example
   * GET /reports/inventory?format=pdf
   * GET /reports/inventory?format=excel&categoryId=uuid
   */
  @Get('reports/inventory')
  @ApiOperation({
    summary: 'Generate inventory report',
    description:
      'Generates an inventory report showing all products and their stock levels. Can optionally filter by category. Returns a downloadable PDF or Excel file. Rate limited to 50 reports per hour.',
  })
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiResponse({
    status: 200,
    description: 'Inventory report generated successfully (file download)',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  async getInventoryReport(
    @Query() query: InventoryReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Generating inventory report: ${query.format}`);

    const buffer = await this.reportsService.generateInventoryReport(
      query.format,
      query.categoryId,
    );

    this.sendReportResponse(res, buffer, 'reporte-inventario', query.format);
  }

  /**
   * Generates a customers report.
   *
   * @param query - Report query parameters (format)
   * @param res - Express response object for file download
   *
   * @example
   * GET /reports/customers?format=pdf
   * GET /reports/customers?format=excel
   */
  @Get('reports/customers')
  @ApiOperation({
    summary: 'Generate customers report',
    description:
      'Generates a customers report showing all customers and their details. Returns a downloadable PDF or Excel file. Rate limited to 50 reports per hour.',
  })
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiResponse({
    status: 200,
    description: 'Customers report generated successfully (file download)',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  async getCustomersReport(
    @Query() query: CustomersReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Generating customers report: ${query.format}`);

    const buffer = await this.reportsService.generateCustomersReport(
      query.format,
    );

    this.sendReportResponse(res, buffer, 'reporte-clientes', query.format);
  }

  /**
   * Generates a Kardex (inventory card) report for a specific product.
   *
   * The Kardex shows all entries, exits, and running balance for a product,
   * which is a DIAN requirement in Colombia.
   *
   * @param query - Kardex query parameters (productId, warehouseId, fromDate, toDate)
   * @returns KardexReport JSON with opening balance, movements, and closing balance
   *
   * @example
   * GET /reports/kardex?productId=abc123
   * GET /reports/kardex?productId=abc123&warehouseId=wh456&fromDate=2024-01-01&toDate=2024-12-31
   */
  @Get('reports/kardex')
  @ApiOperation({
    summary: 'Generate Kardex (inventory card) report',
    description:
      'Generates a Kardex report for a specific product showing all entries, exits, and running balance. Can optionally filter by warehouse and date range. Required by DIAN in Colombia. Rate limited to 50 reports per hour.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Kardex report generated successfully (JSON with movements and balances)',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Product or warehouse not found',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  async getKardexReport(
    @Query() query: KardexQueryDto,
  ): Promise<KardexReport> {
    this.logger.log(
      `Generating Kardex report for product: ${query.productId}${query.warehouseId ? `, warehouse: ${query.warehouseId}` : ''}`,
    );

    return this.reportsService.getKardexReport(
      query.productId,
      query.warehouseId,
      query.fromDate,
      query.toDate,
    );
  }

  /**
   * Generates a cost center balance report for the specified date range.
   */
  @Get('reports/cost-center-balance')
  @ApiOperation({
    summary: 'Generate cost center balance report',
    description:
      'Generates a report showing account balances grouped by cost center for the specified date range. Returns a downloadable PDF or Excel file.',
  })
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiResponse({
    status: 200,
    description: 'Cost center balance report generated successfully (file download)',
  })
  async getCostCenterBalanceReport(
    @Query() query: CostCenterBalanceQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `Generating cost center balance report: ${query.format} from ${query.fromDate.toISOString()} to ${query.toDate.toISOString()}`,
    );

    const buffer = await this.reportsService.generateCostCenterBalanceReport(
      query.fromDate,
      query.toDate,
      query.format,
      query.costCenterId,
    );

    this.sendReportResponse(res, buffer, 'balance-centros-costo', query.format);
  }

  /**
   * Generates a PDF for a specific invoice.
   *
   * @param id - Invoice ID
   * @param res - Express response object for file download
   *
   * @example
   * GET /invoices/:id/pdf
   */
  @Get('invoices/:id/pdf')
  @ApiOperation({
    summary: 'Generate invoice PDF',
    description:
      'Generates a PDF for a specific invoice. Returns a downloadable PDF file. Rate limited to 50 reports per hour.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'Invoice PDF generated successfully (file download)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  async getInvoicePdf(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Generating PDF for invoice: ${id}`);

    const buffer = await this.reportsService.generateInvoicePdf(id);

    // Get the invoice number for the filename
    const filename = `factura-${id}`;

    this.sendReportResponse(res, buffer, filename, ReportFormat.PDF);
  }

  /**
   * Sends the report buffer as a downloadable file response.
   *
   * @param res - Express response object
   * @param buffer - Report buffer
   * @param filename - Base filename (without extension)
   * @param format - Report format
   */
  private sendReportResponse(
    res: Response,
    buffer: Buffer,
    filename: string,
    format: ReportFormat,
  ): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}-${timestamp}`;

    if (format === ReportFormat.PDF) {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fullFilename}.pdf"`,
        'Content-Length': buffer.length,
      });
    } else {
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fullFilename}.xlsx"`,
        'Content-Length': buffer.length,
      });
    }

    res.send(buffer);
  }
}
