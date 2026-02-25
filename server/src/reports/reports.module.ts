import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../prisma';
import { CommonModule } from '../common';
import { AccountingReportsService } from '../accounting/reports/accounting-reports.service';

/**
 * ReportsModule provides report generation functionality for the application.
 *
 * Features:
 * - PDF generation using pdfmake
 * - Excel generation using xlsx
 * - Invoice PDF export
 * - Sales reports with date range filtering
 * - Inventory reports with stock alerts
 * - Customer reports with purchase history
 *
 * All reports are tenant-scoped for data isolation.
 */
@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ReportsController],
  providers: [ReportsService, AccountingReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
