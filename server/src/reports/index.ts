export { ReportsModule } from './reports.module';
export { ReportsService, type KardexReport, type KardexMovement } from './reports.service';
export { ReportsController } from './reports.controller';
export {
  ReportQueryDto,
  InventoryReportQueryDto,
  KardexQueryDto,
  CustomersReportQueryDto,
  ReportFormat,
} from './dto';
export {
  createInvoiceTemplate,
  createSalesReportTemplate,
  createInventoryReportTemplate,
  createCustomersReportTemplate,
  type InvoiceTemplateData,
  type SalesReportTemplateData,
  type InventoryReportTemplateData,
  type CustomersReportTemplateData,
} from './templates';
