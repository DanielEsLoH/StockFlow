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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// CUID pattern: starts with 'c' followed by lowercase letters and numbers, typically 25 chars
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * Data transfer object for creating a support document item.
 * Represents a line item within a support document.
 */
export class CreateSupportDocumentItemDto {
  /**
   * Description of the item or service
   * @example "Servicio de transporte"
   */
  @ApiProperty({
    description: 'Description of the item or service',
    example: 'Servicio de transporte',
  })
  @IsString({ message: 'La descripcion debe ser una cadena de texto' })
  @MinLength(1, { message: 'La descripcion no puede estar vacia' })
  description: string;

  /**
   * Quantity of the item
   * @example 1
   */
  @ApiProperty({
    description: 'Quantity of the item',
    example: 1,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'La cantidad debe ser un numero' })
  @Min(0.01, { message: 'La cantidad debe ser mayor a 0' })
  quantity: number;

  /**
   * Unit price for the item
   * @example 150000
   */
  @ApiProperty({
    description: 'Unit price for the item',
    example: 150000,
    minimum: 0,
  })
  @IsNumber({}, { message: 'El precio unitario debe ser un numero' })
  @Min(0, { message: 'El precio unitario debe ser al menos 0' })
  unitPrice: number;

  /**
   * Tax rate percentage for this item (default: 0%)
   * Support documents from non-invoicers typically have 0% tax
   * @example 0
   */
  @ApiPropertyOptional({
    description:
      'Tax rate percentage for this item (default: 0 for non-invoicers)',
    example: 0,
    minimum: 0,
    maximum: 100,
    default: 0,
  })
  @IsNumber({}, { message: 'La tasa de impuesto debe ser un numero' })
  @Min(0, { message: 'La tasa de impuesto debe ser al menos 0' })
  @Max(100, { message: 'La tasa de impuesto no puede exceder 100' })
  @IsOptional()
  taxRate?: number = 0;
}

/**
 * Data transfer object for creating a new support document (Documento Soporte).
 * Used for purchases from non-invoicers (no obligados a facturar) as required by DIAN.
 */
export class CreateSupportDocumentDto {
  /**
   * Supplier ID if supplier exists in the system (optional)
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
   * Full name of the supplier (non-invoicer)
   * @example "Juan Carlos Perez"
   */
  @ApiProperty({
    description: 'Full name of the supplier (non-invoicer)',
    example: 'Juan Carlos Perez',
  })
  @IsString({ message: 'El nombre del proveedor debe ser una cadena de texto' })
  @MinLength(2, {
    message: 'El nombre del proveedor debe tener al menos 2 caracteres',
  })
  supplierName: string;

  /**
   * Supplier document number (CC, CE, NIT, etc.)
   * @example "1234567890"
   */
  @ApiProperty({
    description: 'Supplier document number',
    example: '1234567890',
  })
  @IsString({
    message: 'El documento del proveedor debe ser una cadena de texto',
  })
  @MinLength(1, {
    message: 'El documento del proveedor no puede estar vacio',
  })
  supplierDocument: string;

  /**
   * Supplier document type (default: CC)
   * @example "CC"
   */
  @ApiPropertyOptional({
    description:
      'Supplier document type: CC (Cedula), CE (Cedula Extranjeria), NIT, TI, PP',
    example: 'CC',
    default: 'CC',
  })
  @IsString({
    message: 'El tipo de documento debe ser una cadena de texto',
  })
  @IsOptional()
  supplierDocType?: string = 'CC';

  /**
   * Issue date of the support document (defaults to now)
   * @example "2024-06-15T00:00:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Issue date of the support document (defaults to now)',
    example: '2024-06-15T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de emision debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  issueDate?: Date;

  /**
   * Additional notes for the support document
   * @example "Compra de servicios de limpieza"
   */
  @ApiPropertyOptional({
    description: 'Additional notes for the support document',
    example: 'Compra de servicios de limpieza',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;

  /**
   * Support document items - at least one item is required
   */
  @ApiProperty({
    description: 'Support document items - at least one item is required',
    type: [CreateSupportDocumentItemDto],
    minItems: 1,
  })
  @IsArray({ message: 'Los items deben ser un arreglo' })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, {
    message: 'El documento soporte debe tener al menos un item',
  })
  @Type(() => CreateSupportDocumentItemDto)
  items: CreateSupportDocumentItemDto[];
}
