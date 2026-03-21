import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TaxCategory, AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';
import { CacheService } from '../cache';
import { CACHE_KEYS } from '../cache/cache.constants';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { taxRateFromCategory } from '../products/dto/create-product.dto';
import { FileParserService } from './file-parser.service';
import { ProductImportValidator } from './validators/product-import.validator';
import { CustomerImportValidator } from './validators/customer-import.validator';
import { SupplierImportValidator } from './validators/supplier-import.validator';
import { ImportValidator } from './validators/import-validator.interface';
import {
  ImportModule,
  DuplicateStrategy,
  type ImportValidationResult,
  type ImportValidationRow,
  type ImportResult,
} from './dto/import-file.dto';

/**
 * ImportsService orchestrates file import operations for products, customers,
 * and suppliers. It handles parsing, validation, duplicate detection, and
 * transactional database writes.
 */
@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly cacheService: CacheService,
    private readonly auditLogsService: AuditLogsService,
    private readonly fileParserService: FileParserService,
    private readonly productValidator: ProductImportValidator,
    private readonly customerValidator: CustomerImportValidator,
    private readonly supplierValidator: SupplierImportValidator,
  ) {}

  /**
   * Validates an import file without persisting any data.
   *
   * Steps:
   * 1. Parse the file into row objects
   * 2. Resolve header aliases to canonical names
   * 3. Validate required columns exist
   * 4. Validate each row
   * 5. Check for duplicates against existing DB records
   *
   * @param file - The uploaded file
   * @param module - The target import module
   * @returns Validation result with per-row details
   */
  async validateImport(
    file: Express.Multer.File,
    module: ImportModule,
  ): Promise<ImportValidationResult> {
    const tenantId = this.tenantContext.requireTenantId();
    const validator = this.getValidator(module);

    this.logger.log(
      `Validating import file for ${module} in tenant ${tenantId}`,
    );

    // 1. Parse file
    const rawRows = this.fileParserService.parseFile(file);

    // 2. Resolve header aliases
    const rows = this.resolveAliases(rawRows, validator);

    // 3. Validate required columns exist
    this.validateRequiredColumns(rows[0] ?? {}, validator, module);

    // 4. Validate each row
    const validationRows: ImportValidationRow[] = rows.map((row, index) => {
      const rowIndex = index + 2; // 1-based, skip header row
      const { data, errors } = validator.validateRow(row, rowIndex);
      return {
        row: rowIndex,
        data,
        errors,
        isDuplicate: false,
      };
    });

    // 5. Check for duplicates
    await this.markDuplicates(validationRows, module, tenantId);

    const validRows = validationRows.filter(
      (r) => r.errors.length === 0,
    ).length;
    const invalidRows = validationRows.filter(
      (r) => r.errors.length > 0,
    ).length;
    const duplicateRows = validationRows.filter(
      (r) => r.isDuplicate,
    ).length;

    this.logger.log(
      `Validation complete for ${module}: ${validRows} valid, ${invalidRows} invalid, ${duplicateRows} duplicates out of ${validationRows.length} rows`,
    );

    return {
      totalRows: validationRows.length,
      validRows,
      invalidRows,
      duplicateRows,
      rows: validationRows,
    };
  }

  /**
   * Executes an import operation, persisting data to the database.
   *
   * Steps:
   * 1. Re-parse and re-validate the file
   * 2. Reject if any rows have errors
   * 3. Create/update records in a Prisma transaction
   * 4. Log the import in audit logs
   * 5. Invalidate relevant caches
   *
   * @param file - The uploaded file
   * @param module - The target import module
   * @param strategy - How to handle duplicate records
   * @param userId - The ID of the user performing the import
   * @returns Import result with counts
   */
  async executeImport(
    file: Express.Multer.File,
    module: ImportModule,
    strategy: DuplicateStrategy,
    userId: string,
  ): Promise<ImportResult> {
    const tenantId = this.tenantContext.requireTenantId();
    const validator = this.getValidator(module);

    this.logger.log(
      `Executing import for ${module} in tenant ${tenantId} with strategy ${strategy}`,
    );

    // 1. Re-parse and validate
    const rawRows = this.fileParserService.parseFile(file);
    const rows = this.resolveAliases(rawRows, validator);
    this.validateRequiredColumns(rows[0] ?? {}, validator, module);

    const validationRows: ImportValidationRow[] = rows.map((row, index) => {
      const rowIndex = index + 2;
      const { data, errors } = validator.validateRow(row, rowIndex);
      return { row: rowIndex, data, errors, isDuplicate: false };
    });

    // 2. Reject if any rows have errors
    const rowsWithErrors = validationRows.filter(
      (r) => r.errors.length > 0,
    );
    if (rowsWithErrors.length > 0) {
      const allErrors = rowsWithErrors.flatMap((r) => r.errors);
      throw new BadRequestException({
        message: `Se encontraron ${rowsWithErrors.length} filas con errores. Corrija los errores y vuelva a intentar.`,
        errors: allErrors.slice(0, 50), // Limit error list
      });
    }

    // Mark duplicates
    await this.markDuplicates(validationRows, module, tenantId);

    // 3. Execute in a transaction
    const result = await this.prisma.$transaction(
      async (tx) => {
        return this.processRows(
          tx,
          validationRows,
          module,
          strategy,
          tenantId,
        );
      },
      { timeout: 60000 },
    );

    // 4. Audit log
    await this.auditLogsService.create({
      tenantId,
      userId,
      action: AuditAction.IMPORT,
      entityType: this.getEntityType(module),
      entityId: tenantId,
      metadata: {
        module,
        strategy,
        fileName: file.originalname,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        total: result.total,
      },
    });

    // 5. Invalidate caches
    await this.invalidateCaches(module, tenantId);

    this.logger.log(
      `Import complete for ${module}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
    );

    return result;
  }

  /**
   * Returns the appropriate validator for the given module.
   */
  private getValidator(module: ImportModule): ImportValidator {
    switch (module) {
      case ImportModule.PRODUCTS:
        return this.productValidator;
      case ImportModule.CUSTOMERS:
        return this.customerValidator;
      case ImportModule.SUPPLIERS:
        return this.supplierValidator;
    }
  }

  /**
   * Resolves header aliases in all rows.
   *
   * For each row, if a column name matches an alias for a canonical name,
   * the value is reassigned to the canonical column name.
   */
  private resolveAliases(
    rows: Record<string, string>[],
    validator: ImportValidator,
  ): Record<string, string>[] {
    const aliases = validator.getHeaderAliases();

    // Build a reverse lookup: alias -> canonical
    const aliasMap = new Map<string, string>();
    for (const [canonical, aliasList] of Object.entries(aliases)) {
      for (const alias of aliasList) {
        aliasMap.set(alias.toLowerCase().replace(/\s+/g, '_'), canonical);
      }
    }

    return rows.map((row) => {
      const resolved: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        const canonical = aliasMap.get(key) ?? key;
        resolved[canonical] = value;
      }
      return resolved;
    });
  }

  /**
   * Validates that all required columns are present in the first row.
   */
  private validateRequiredColumns(
    firstRow: Record<string, string>,
    validator: ImportValidator,
    module: ImportModule,
  ): void {
    const requiredColumns = validator.getRequiredColumns();
    const presentColumns = Object.keys(firstRow);

    const missingColumns = requiredColumns.filter(
      (col) => !presentColumns.includes(col),
    );

    if (missingColumns.length > 0) {
      throw new BadRequestException(
        `Faltan columnas obligatorias para ${module}: ${missingColumns.join(', ')}. ` +
          `Descargue la plantilla para ver las columnas requeridas.`,
      );
    }
  }

  /**
   * Marks rows as duplicates by checking against existing database records.
   *
   * - Products: matched by SKU + tenantId
   * - Customers/Suppliers: matched by documentNumber + tenantId
   */
  private async markDuplicates(
    rows: ImportValidationRow[],
    module: ImportModule,
    tenantId: string,
  ): Promise<void> {
    if (module === ImportModule.PRODUCTS) {
      const skus = rows
        .map((r) => r.data.sku as string | undefined)
        .filter((sku): sku is string => !!sku);

      if (skus.length === 0) return;

      const existing = await this.prisma.product.findMany({
        where: { tenantId, sku: { in: skus } },
        select: { sku: true },
      });

      const existingSkus = new Set(existing.map((p) => p.sku));

      for (const row of rows) {
        if (row.data.sku && existingSkus.has(row.data.sku as string)) {
          row.isDuplicate = true;
        }
      }
    } else {
      // Customers and Suppliers both use documentNumber
      const docNumbers = rows
        .map((r) => r.data.documentNumber as string | undefined)
        .filter((doc): doc is string => !!doc);

      if (docNumbers.length === 0) return;

      const model =
        module === ImportModule.CUSTOMERS
          ? this.prisma.customer
          : this.prisma.supplier;

      const existing = await (model as any).findMany({
        where: { tenantId, documentNumber: { in: docNumbers } },
        select: { documentNumber: true },
      });

      const existingDocs = new Set(
        existing.map((r: { documentNumber: string }) => r.documentNumber),
      );

      for (const row of rows) {
        if (
          row.data.documentNumber &&
          existingDocs.has(row.data.documentNumber as string)
        ) {
          row.isDuplicate = true;
        }
      }
    }
  }

  /**
   * Processes all rows within a Prisma transaction.
   */
  private async processRows(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    rows: ImportValidationRow[],
    module: ImportModule,
    strategy: DuplicateStrategy,
    tenantId: string,
  ): Promise<ImportResult> {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        if (row.isDuplicate) {
          if (strategy === DuplicateStrategy.SKIP) {
            skipped++;
            continue;
          }
          // strategy === UPDATE
          await this.updateRecord(tx, row.data, module, tenantId);
          updated++;
        } else {
          await this.createRecord(tx, row.data, module, tenantId);
          created++;
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : 'Error desconocido';
        errors.push(`Fila ${row.row}: ${msg}`);
        this.logger.error(
          `Error processing row ${row.row}: ${msg}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return {
      created,
      updated,
      skipped,
      total: rows.length,
      errors,
    };
  }

  /**
   * Creates a new record in the database.
   */
  private async createRecord(
    tx: any,
    data: Record<string, unknown>,
    module: ImportModule,
    tenantId: string,
  ): Promise<void> {
    switch (module) {
      case ImportModule.PRODUCTS: {
        const sku =
          (data.sku as string) ?? (await this.generateSku(tx, tenantId));
        const taxCategory =
          (data.taxCategory as TaxCategory) ?? TaxCategory.GRAVADO_19;

        await tx.product.create({
          data: {
            tenantId,
            sku,
            name: data.name as string,
            description: data.description as string | undefined,
            costPrice: data.costPrice as number,
            salePrice: data.salePrice as number,
            taxCategory,
            taxRate: taxRateFromCategory(taxCategory),
            stock: (data.stock as number) ?? 0,
            minStock: (data.minStock as number) ?? 0,
            barcode: data.barcode as string | undefined,
            brand: data.brand as string | undefined,
            unit: (data.unit as string) ?? 'UND',
          },
        });
        break;
      }

      case ImportModule.CUSTOMERS: {
        await tx.customer.create({
          data: {
            tenantId,
            name: data.name as string,
            documentType: data.documentType as any,
            documentNumber: data.documentNumber as string,
            email: data.email as string | undefined,
            phone: data.phone as string | undefined,
            address: data.address as string | undefined,
            city: data.city as string | undefined,
            notes: data.notes as string | undefined,
          },
        });
        break;
      }

      case ImportModule.SUPPLIERS: {
        await tx.supplier.create({
          data: {
            tenantId,
            name: data.name as string,
            documentType: (data.documentType as any) ?? 'NIT',
            documentNumber: data.documentNumber as string,
            email: data.email as string | undefined,
            phone: data.phone as string | undefined,
            address: data.address as string | undefined,
            city: data.city as string | undefined,
            notes: data.notes as string | undefined,
            paymentTerms: (data.paymentTerms as any) ?? 'NET_30',
            contactName: data.contactName as string | undefined,
            contactPhone: data.contactPhone as string | undefined,
          },
        });
        break;
      }
    }
  }

  /**
   * Updates an existing record in the database.
   */
  private async updateRecord(
    tx: any,
    data: Record<string, unknown>,
    module: ImportModule,
    tenantId: string,
  ): Promise<void> {
    switch (module) {
      case ImportModule.PRODUCTS: {
        const sku = data.sku as string;
        if (!sku) return; // Cannot update without SKU identifier

        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined)
          updateData.description = data.description;
        if (data.costPrice !== undefined)
          updateData.costPrice = data.costPrice;
        if (data.salePrice !== undefined)
          updateData.salePrice = data.salePrice;
        if (data.taxCategory !== undefined) {
          updateData.taxCategory = data.taxCategory;
          updateData.taxRate = taxRateFromCategory(
            data.taxCategory as TaxCategory,
          );
        }
        if (data.stock !== undefined) updateData.stock = data.stock;
        if (data.minStock !== undefined) updateData.minStock = data.minStock;
        if (data.barcode !== undefined) updateData.barcode = data.barcode;
        if (data.brand !== undefined) updateData.brand = data.brand;
        if (data.unit !== undefined) updateData.unit = data.unit;

        await tx.product.update({
          where: { tenantId_sku: { tenantId, sku } },
          data: updateData,
        });
        break;
      }

      case ImportModule.CUSTOMERS: {
        const docNumber = data.documentNumber as string;
        if (!docNumber) return;

        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.documentType !== undefined)
          updateData.documentType = data.documentType;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.city !== undefined) updateData.city = data.city;
        if (data.notes !== undefined) updateData.notes = data.notes;

        await tx.customer.update({
          where: {
            tenantId_documentNumber: { tenantId, documentNumber: docNumber },
          },
          data: updateData,
        });
        break;
      }

      case ImportModule.SUPPLIERS: {
        const docNumber = data.documentNumber as string;
        if (!docNumber) return;

        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.documentType !== undefined)
          updateData.documentType = data.documentType;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.city !== undefined) updateData.city = data.city;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.paymentTerms !== undefined)
          updateData.paymentTerms = data.paymentTerms;
        if (data.contactName !== undefined)
          updateData.contactName = data.contactName;
        if (data.contactPhone !== undefined)
          updateData.contactPhone = data.contactPhone;

        await tx.supplier.update({
          where: {
            tenantId_documentNumber: { tenantId, documentNumber: docNumber },
          },
          data: updateData,
        });
        break;
      }
    }
  }

  /**
   * Generates a sequential SKU for products when one is not provided.
   * Uses the same PROD-XXXXX pattern as the products service.
   */
  private async generateSku(tx: any, tenantId: string): Promise<string> {
    const lastProduct = await tx.product.findFirst({
      where: { tenantId, sku: { startsWith: 'PROD-' } },
      orderBy: { sku: 'desc' },
      select: { sku: true },
    });

    let nextNumber = 1;
    if (lastProduct) {
      const match = (lastProduct.sku as string).match(/PROD-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const sku = `PROD-${String(nextNumber).padStart(5, '0')}`;

    // Check for collision
    const existing = await tx.product.findUnique({
      where: { tenantId_sku: { tenantId, sku } },
      select: { id: true },
    });

    if (existing) {
      // Increment and retry
      const nextSku = `PROD-${String(nextNumber + 1).padStart(5, '0')}`;
      return nextSku;
    }

    return sku;
  }

  /**
   * Returns the entity type string for audit logging.
   */
  private getEntityType(module: ImportModule): string {
    switch (module) {
      case ImportModule.PRODUCTS:
        return 'Product';
      case ImportModule.CUSTOMERS:
        return 'Customer';
      case ImportModule.SUPPLIERS:
        return 'Supplier';
    }
  }

  /**
   * Invalidates relevant cache entries after an import.
   */
  private async invalidateCaches(
    module: ImportModule,
    tenantId: string,
  ): Promise<void> {
    try {
      switch (module) {
        case ImportModule.PRODUCTS:
          await this.cacheService.invalidateMultiple(
            [CACHE_KEYS.PRODUCTS, CACHE_KEYS.PRODUCT, CACHE_KEYS.DASHBOARD],
            tenantId,
          );
          break;
        case ImportModule.CUSTOMERS:
          await this.cacheService.invalidateMultiple(
            [CACHE_KEYS.CUSTOMERS, CACHE_KEYS.CUSTOMER, CACHE_KEYS.DASHBOARD],
            tenantId,
          );
          break;
        case ImportModule.SUPPLIERS:
          await this.cacheService.invalidateMultiple(
            [CACHE_KEYS.SUPPLIERS, CACHE_KEYS.SUPPLIER],
            tenantId,
          );
          break;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate caches after import: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
