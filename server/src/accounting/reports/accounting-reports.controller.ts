import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AccountingReportsService } from './accounting-reports.service';
import { JwtAuthGuard } from '../../auth';
import { RequirePermissions, PermissionsGuard } from '../../common';
import { Permission } from '../../common/permissions/permission.enum';

@ApiTags('accounting-reports')
@ApiBearerAuth('JWT-auth')
@Controller('accounting/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountingReportsController {
  private readonly logger = new Logger(AccountingReportsController.name);

  constructor(
    private readonly reportsService: AccountingReportsService,
  ) {}

  @Get('trial-balance')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get trial balance (Balance de Prueba)' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'As-of date (YYYY-MM-DD), defaults to today' })
  @ApiResponse({ status: 200, description: 'Trial balance report' })
  async getTrialBalance(
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? this.parseDate(asOfDate) : new Date();
    return this.reportsService.getTrialBalance(date);
  }

  @Get('general-journal')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get general journal (Libro Diario)' })
  @ApiQuery({ name: 'fromDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'General journal report' })
  async getGeneralJournal(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    this.validateDateRange(fromDate, toDate);
    return this.reportsService.getGeneralJournal(
      this.parseDate(fromDate),
      this.parseDate(toDate),
    );
  }

  @Get('general-ledger')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get general ledger (Libro Mayor)' })
  @ApiQuery({ name: 'fromDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'accountId', required: false, description: 'Filter by specific account ID' })
  @ApiResponse({ status: 200, description: 'General ledger report' })
  async getGeneralLedger(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('accountId') accountId?: string,
  ) {
    this.validateDateRange(fromDate, toDate);
    return this.reportsService.getGeneralLedger(
      this.parseDate(fromDate),
      this.parseDate(toDate),
      accountId,
    );
  }

  @Get('balance-sheet')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get balance sheet (Balance General)' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'As-of date (YYYY-MM-DD), defaults to today' })
  @ApiResponse({ status: 200, description: 'Balance sheet report' })
  async getBalanceSheet(
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? this.parseDate(asOfDate) : new Date();
    return this.reportsService.getBalanceSheet(date);
  }

  @Get('income-statement')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get income statement (Estado de Resultados)' })
  @ApiQuery({ name: 'fromDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Income statement report' })
  async getIncomeStatement(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    this.validateDateRange(fromDate, toDate);
    return this.reportsService.getIncomeStatement(
      this.parseDate(fromDate),
      this.parseDate(toDate),
    );
  }

  @Get('cash-flow')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get cash flow statement (Flujo de Efectivo)' })
  @ApiQuery({ name: 'fromDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Cash flow report' })
  async getCashFlow(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    this.validateDateRange(fromDate, toDate);
    return this.reportsService.getCashFlow(
      this.parseDate(fromDate),
      this.parseDate(toDate),
    );
  }

  @Get('ar-aging')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get AR aging report (Cartera CxC por Edades)' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'As-of date (YYYY-MM-DD), defaults to today' })
  @ApiResponse({ status: 200, description: 'AR aging report' })
  async getARAgingReport(
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? this.parseDate(asOfDate) : new Date();
    return this.reportsService.getARAgingReport(date);
  }

  @Get('ap-aging')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get AP aging report (Cartera CxP por Edades)' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'As-of date (YYYY-MM-DD), defaults to today' })
  @ApiResponse({ status: 200, description: 'AP aging report' })
  async getAPAgingReport(
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? this.parseDate(asOfDate) : new Date();
    return this.reportsService.getAPAgingReport(date);
  }

  // ─── TAX REPORTS ──────────────────────────────────────────────

  @Get('iva-declaration')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get IVA declaration (Declaracion de IVA bimestral)' })
  @ApiQuery({ name: 'year', required: true, description: 'Year (e.g. 2026)' })
  @ApiQuery({ name: 'period', required: true, description: 'Bimonthly period 1-6 (1=Jan-Feb, 2=Mar-Apr, etc.)' })
  @ApiResponse({ status: 200, description: 'IVA declaration report' })
  async getIvaDeclaration(
    @Query('year') year: string,
    @Query('period') period: string,
  ) {
    const y = this.parseYear(year);
    const p = this.parseBimonthlyPeriod(period);
    return this.reportsService.getIvaDeclaration(y, p);
  }

  @Get('retefuente-summary')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get ReteFuente summary (Resumen ReteFuente mensual)' })
  @ApiQuery({ name: 'year', required: true, description: 'Year (e.g. 2026)' })
  @ApiQuery({ name: 'month', required: true, description: 'Month 1-12' })
  @ApiResponse({ status: 200, description: 'ReteFuente summary report' })
  async getReteFuenteSummary(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = this.parseYear(year);
    const m = this.parseMonth(month);
    return this.reportsService.getReteFuenteSummary(y, m);
  }

  @Get('tax-summary')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get YTD tax summary (Resumen Tributario)' })
  @ApiQuery({ name: 'year', required: true, description: 'Year (e.g. 2026)' })
  @ApiResponse({ status: 200, description: 'Year-to-date tax summary' })
  async getYtdTaxSummary(
    @Query('year') year: string,
  ) {
    const y = this.parseYear(year);
    return this.reportsService.getYtdTaxSummary(y);
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────

  private parseDate(dateStr: string): Date {
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) {
      throw new BadRequestException(
        `Fecha invalida: ${dateStr}. Use formato YYYY-MM-DD`,
      );
    }
    return date;
  }

  private validateDateRange(fromDate: string, toDate: string): void {
    if (!fromDate || !toDate) {
      throw new BadRequestException(
        'Los parametros fromDate y toDate son requeridos',
      );
    }
    const from = this.parseDate(fromDate);
    const to = this.parseDate(toDate);
    if (from > to) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser mayor a la fecha final',
      );
    }
  }

  private parseYear(yearStr: string): number {
    const year = parseInt(yearStr, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      throw new BadRequestException(
        `Ano invalido: ${yearStr}. Debe ser un numero entre 2000 y 2100`,
      );
    }
    return year;
  }

  private parseBimonthlyPeriod(periodStr: string): number {
    const period = parseInt(periodStr, 10);
    if (isNaN(period) || period < 1 || period > 6) {
      throw new BadRequestException(
        `Periodo invalido: ${periodStr}. Debe ser un numero entre 1 y 6`,
      );
    }
    return period;
  }

  private parseMonth(monthStr: string): number {
    const month = parseInt(monthStr, 10);
    if (isNaN(month) || month < 1 || month > 12) {
      throw new BadRequestException(
        `Mes invalido: ${monthStr}. Debe ser un numero entre 1 y 12`,
      );
    }
    return month;
  }
}
