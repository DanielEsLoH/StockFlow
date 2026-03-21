import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Supported modules for data import.
 */
export enum ImportModule {
  PRODUCTS = 'products',
  CUSTOMERS = 'customers',
  SUPPLIERS = 'suppliers',
}

/**
 * Strategy for handling duplicate records found during import.
 */
export enum DuplicateStrategy {
  /** Skip rows that match existing records */
  SKIP = 'skip',
  /** Update existing records with imported data */
  UPDATE = 'update',
}

/**
 * DTO for file import operations (validate and execute).
 */
export class ImportFileDto {
  @ApiProperty({
    description: 'Target module for the import',
    enum: ImportModule,
    example: ImportModule.PRODUCTS,
  })
  @IsEnum(ImportModule, {
    message: 'El modulo debe ser products, customers o suppliers',
  })
  module: ImportModule;

  @ApiPropertyOptional({
    description: 'Strategy for handling duplicate records',
    enum: DuplicateStrategy,
    example: DuplicateStrategy.SKIP,
    default: DuplicateStrategy.SKIP,
  })
  @IsEnum(DuplicateStrategy, {
    message: 'La estrategia de duplicados debe ser skip o update',
  })
  @IsOptional()
  duplicateStrategy?: DuplicateStrategy = DuplicateStrategy.SKIP;
}

/**
 * Validation result for a single row in the import file.
 */
export interface ImportValidationRow {
  /** 1-based row number in the file */
  row: number;
  /** Parsed and mapped data for this row */
  data: Record<string, unknown>;
  /** Validation errors for this row (empty if valid) */
  errors: string[];
  /** Whether this row matches an existing record */
  isDuplicate: boolean;
}

/**
 * Complete validation result for an import file.
 */
export interface ImportValidationResult {
  /** Total number of rows in the file */
  totalRows: number;
  /** Number of rows that passed validation */
  validRows: number;
  /** Number of rows with validation errors */
  invalidRows: number;
  /** Number of rows that match existing records */
  duplicateRows: number;
  /** Per-row validation details */
  rows: ImportValidationRow[];
}

/**
 * Result of executing an import operation.
 */
export interface ImportResult {
  /** Number of records successfully created */
  created: number;
  /** Number of records updated (when strategy is UPDATE) */
  updated: number;
  /** Number of records skipped (duplicates with SKIP strategy) */
  skipped: number;
  /** Total number of records processed */
  total: number;
  /** Errors encountered during execution, if any */
  errors: string[];
}
