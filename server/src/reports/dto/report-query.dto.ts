import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Supported report formats for export
 */
export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
}

/**
 * Data transfer object for report generation queries.
 * Used across all report endpoints for consistent filtering.
 */
export class ReportQueryDto {
  /**
   * Output format for the report
   * @example "pdf"
   */
  @ApiProperty({
    description: 'Output format for the report',
    enum: ReportFormat,
    example: 'pdf',
  })
  @IsEnum(ReportFormat, {
    message: 'El formato debe ser "pdf" o "excel"',
  })
  format: ReportFormat;

  /**
   * Start date for the report period (inclusive)
   * @example "2024-01-01T00:00:00.000Z"
   */
  @ApiProperty({
    description: 'Start date for the report period (inclusive)',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de inicio debe ser una fecha valida' })
  @Type(() => Date)
  fromDate: Date;

  /**
   * End date for the report period (inclusive)
   * @example "2024-12-31T23:59:59.000Z"
   */
  @ApiProperty({
    description: 'End date for the report period (inclusive)',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de fin debe ser una fecha valida' })
  @Type(() => Date)
  toDate: Date;

  /**
   * Optional category ID to filter results
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @ApiPropertyOptional({
    description: 'Optional category ID to filter results',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('all', { message: 'El ID de categoria debe ser un UUID valido' })
  @IsOptional()
  categoryId?: string;
}

/**
 * Query DTO for inventory report - no date range required
 */
export class InventoryReportQueryDto {
  /**
   * Output format for the report
   * @example "pdf"
   */
  @ApiProperty({
    description: 'Output format for the report',
    enum: ReportFormat,
    example: 'pdf',
  })
  @IsEnum(ReportFormat, {
    message: 'El formato debe ser "pdf" o "excel"',
  })
  format: ReportFormat;

  /**
   * Optional category ID to filter results
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @ApiPropertyOptional({
    description: 'Optional category ID to filter results',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('all', { message: 'El ID de categoria debe ser un UUID valido' })
  @IsOptional()
  categoryId?: string;
}

/**
 * Query DTO for Kardex (inventory card) report.
 * The Kardex is a detailed per-product inventory report showing all entries,
 * exits, and running balance — required by DIAN in Colombia.
 */
export class KardexQueryDto {
  /**
   * Product ID to generate the Kardex for (required)
   * @example "cmkcykam80004reya0hsdx337"
   */
  @ApiProperty({
    description: 'Product ID to generate the Kardex for',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del producto debe ser un texto valido' })
  @IsNotEmpty({ message: 'El ID del producto es requerido' })
  productId: string;

  /**
   * Optional warehouse ID to filter movements by warehouse
   * @example "cmkcykam80004reya0hsdx338"
   */
  @ApiPropertyOptional({
    description: 'Optional warehouse ID to filter movements by warehouse',
    example: 'cmkcykam80004reya0hsdx338',
  })
  @IsString({ message: 'El ID de la bodega debe ser un texto valido' })
  @IsOptional()
  warehouseId?: string;

  /**
   * Start date for the Kardex period (inclusive)
   * @example "2024-01-01T00:00:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Start date for the Kardex period (inclusive)',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de inicio debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  fromDate?: Date;

  /**
   * End date for the Kardex period (inclusive)
   * @example "2024-12-31T23:59:59.000Z"
   */
  @ApiPropertyOptional({
    description: 'End date for the Kardex period (inclusive)',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de fin debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  toDate?: Date;
}

/**
 * Query DTO for cost center balance report
 */
export class CostCenterBalanceQueryDto {
  @ApiProperty({
    description: 'Output format for the report',
    enum: ReportFormat,
    example: 'pdf',
  })
  @IsEnum(ReportFormat, {
    message: 'El formato debe ser "pdf" o "excel"',
  })
  format: ReportFormat;

  @ApiProperty({
    description: 'Start date for the report period (inclusive)',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de inicio debe ser una fecha valida' })
  @Type(() => Date)
  fromDate: Date;

  @ApiProperty({
    description: 'End date for the report period (inclusive)',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de fin debe ser una fecha valida' })
  @Type(() => Date)
  toDate: Date;

  @ApiPropertyOptional({
    description: 'Optional cost center ID to filter results',
  })
  @IsString({ message: 'El ID del centro de costo debe ser un texto valido' })
  @IsOptional()
  costCenterId?: string;
}

/**
 * Query DTO for customers report - no date range required
 */
export class CustomersReportQueryDto {
  /**
   * Output format for the report
   * @example "pdf"
   */
  @ApiProperty({
    description: 'Output format for the report',
    enum: ReportFormat,
    example: 'pdf',
  })
  @IsEnum(ReportFormat, {
    message: 'El formato debe ser "pdf" o "excel"',
  })
  format: ReportFormat;
}
