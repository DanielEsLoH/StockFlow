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
}
