import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { FileParserService } from './file-parser.service';
import { TemplateGeneratorService } from './templates/template-generator.service';
import { ProductImportValidator } from './validators/product-import.validator';
import { CustomerImportValidator } from './validators/customer-import.validator';
import { SupplierImportValidator } from './validators/supplier-import.validator';
import { AuditLogsModule } from '../audit-logs';

/**
 * ImportsModule provides bulk data import capabilities for products,
 * customers, and suppliers via CSV and Excel file uploads.
 *
 * Features:
 * - File parsing (CSV/XLSX) with header normalization and alias resolution
 * - Per-row validation with module-specific validators
 * - Duplicate detection against existing database records
 * - Transactional batch create/update with configurable duplicate strategy
 * - Downloadable Excel templates with example data and instructions
 * - Audit logging of all import operations
 * - Cache invalidation after successful imports
 */
@Module({
  imports: [AuditLogsModule],
  controllers: [ImportsController],
  providers: [
    ImportsService,
    FileParserService,
    TemplateGeneratorService,
    ProductImportValidator,
    CustomerImportValidator,
    SupplierImportValidator,
  ],
})
export class ImportsModule {}
