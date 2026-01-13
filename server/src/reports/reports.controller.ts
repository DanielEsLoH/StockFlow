import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import {
  ReportQueryDto,
  InventoryReportQueryDto,
  CustomersReportQueryDto,
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
   * Generates a PDF for a specific invoice.
   *
   * @param id - Invoice ID
   * @param res - Express response object for file download
   *
   * @example
   * GET /invoices/:id/pdf
   */
  @Get('invoices/:id/pdf')
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
