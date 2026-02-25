import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  Max,
  MinLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// CUID pattern: starts with 'c' followed by lowercase letters and numbers, typically 25 chars
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * Data transfer object for updating a support document item.
 */
export class UpdateSupportDocumentItemDto {
  /**
   * Description of the item or service
   * @example "Servicio de transporte actualizado"
   */
  @ApiPropertyOptional({
    description: 'Description of the item or service',
    example: 'Servicio de transporte actualizado',
  })
  @IsString({ message: 'La descripcion debe ser una cadena de texto' })
  @MinLength(1, { message: 'La descripcion no puede estar vacia' })
  @IsOptional()
  description?: string;

  /**
   * Quantity of the item
   * @example 2
   */
  @ApiPropertyOptional({
    description: 'Quantity of the item',
    example: 2,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'La cantidad debe ser un numero' })
  @Min(0.01, { message: 'La cantidad debe ser mayor a 0' })
  @IsOptional()
  quantity?: number;

  /**
   * Unit price for the item
   * @example 200000
   */
  @ApiPropertyOptional({
    description: 'Unit price for the item',
    example: 200000,
    minimum: 0,
  })
  @IsNumber({}, { message: 'El precio unitario debe ser un numero' })
  @Min(0, { message: 'El precio unitario debe ser al menos 0' })
  @IsOptional()
  unitPrice?: number;

  /**
   * Tax rate percentage for this item
   * @example 0
   */
  @ApiPropertyOptional({
    description: 'Tax rate percentage for this item',
    example: 0,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber({}, { message: 'La tasa de impuesto debe ser un numero' })
  @Min(0, { message: 'La tasa de impuesto debe ser al menos 0' })
  @Max(100, { message: 'La tasa de impuesto no puede exceder 100' })
  @IsOptional()
  taxRate?: number;
}

/**
 * Data transfer object for updating an existing support document.
 * Only DRAFT support documents can be updated.
 * When items are provided, they replace all existing items entirely.
 */
export class UpdateSupportDocumentDto {
  /**
   * Supplier ID if supplier exists in the system
   * @example "cmkcykam80004reya0hsdx337"
   */
  @ApiPropertyOptional({
    description: 'Supplier ID if supplier exists in the system',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del proveedor debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del proveedor debe ser un CUID valido',
  })
  @IsOptional()
  supplierId?: string;

  /**
   * Full name of the supplier
   * @example "Juan Carlos Perez"
   */
  @ApiPropertyOptional({
    description: 'Full name of the supplier',
    example: 'Juan Carlos Perez',
  })
  @IsString({ message: 'El nombre del proveedor debe ser una cadena de texto' })
  @MinLength(2, {
    message: 'El nombre del proveedor debe tener al menos 2 caracteres',
  })
  @IsOptional()
  supplierName?: string;

  /**
   * Supplier document number
   * @example "1234567890"
   */
  @ApiPropertyOptional({
    description: 'Supplier document number',
    example: '1234567890',
  })
  @IsString({
    message: 'El documento del proveedor debe ser una cadena de texto',
  })
  @MinLength(1, {
    message: 'El documento del proveedor no puede estar vacio',
  })
  @IsOptional()
  supplierDocument?: string;

  /**
   * Supplier document type
   * @example "CC"
   */
  @ApiPropertyOptional({
    description: 'Supplier document type: CC, CE, NIT, TI, PP',
    example: 'CC',
  })
  @IsString({
    message: 'El tipo de documento debe ser una cadena de texto',
  })
  @IsOptional()
  supplierDocType?: string;

  /**
   * Issue date of the support document
   * @example "2024-06-15T00:00:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Issue date of the support document',
    example: '2024-06-15T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de emision debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  issueDate?: Date;

  /**
   * Additional notes
   * @example "Compra de servicios actualizada"
   */
  @ApiPropertyOptional({
    description: 'Additional notes for the support document',
    example: 'Compra de servicios actualizada',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;

  /**
   * Updated items - replaces all existing items when provided
   */
  @ApiPropertyOptional({
    description:
      'Updated items list - replaces all existing items when provided',
    type: [UpdateSupportDocumentItemDto],
    minItems: 1,
  })
  @IsArray({ message: 'Los items deben ser un arreglo' })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, {
    message: 'El documento soporte debe tener al menos un item',
  })
  @Type(() => UpdateSupportDocumentItemDto)
  @IsOptional()
  items?: UpdateSupportDocumentItemDto[];
}
