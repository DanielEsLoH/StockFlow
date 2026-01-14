import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsPositive,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// CUID pattern: starts with 'c' followed by lowercase letters and numbers, typically 25 chars
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * Data transfer object for adding an item to an existing DRAFT invoice.
 * Used to add new line items after invoice creation.
 */
export class AddInvoiceItemDto {
  /**
   * Product ID for the invoice item
   * @example "cmkcykam80004reya0hsdx337"
   */
  @ApiProperty({
    description: 'Product ID for the invoice item',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del producto debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, { message: 'El ID del producto debe ser un CUID válido' })
  productId: string;

  /**
   * Quantity of the product
   * @example 5
   */
  @ApiProperty({
    description: 'Quantity of the product',
    example: 5,
    minimum: 1,
  })
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @IsPositive({ message: 'La cantidad debe ser positiva' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  /**
   * Unit price for the product
   * @example 99.99
   */
  @ApiProperty({
    description: 'Unit price for the product',
    example: 99.99,
    minimum: 0,
  })
  @IsNumber({}, { message: 'El precio unitario debe ser un número' })
  @Min(0, { message: 'El precio unitario debe ser al menos 0' })
  unitPrice: number;

  /**
   * Tax rate percentage for this item (default: 19%)
   * @example 19
   */
  @ApiPropertyOptional({
    description: 'Tax rate percentage for this item',
    example: 19,
    minimum: 0,
    maximum: 100,
    default: 19,
  })
  @IsNumber({}, { message: 'La tasa de impuesto debe ser un número' })
  @Min(0, { message: 'La tasa de impuesto debe ser al menos 0' })
  @Max(100, { message: 'La tasa de impuesto no puede exceder 100' })
  @IsOptional()
  taxRate?: number = 19;

  /**
   * Discount amount for this item (default: 0)
   * @example 10.00
   */
  @ApiPropertyOptional({
    description: 'Discount amount for this item',
    example: 10.0,
    minimum: 0,
    default: 0,
  })
  @IsNumber({}, { message: 'El descuento debe ser un número' })
  @Min(0, { message: 'El descuento debe ser al menos 0' })
  @IsOptional()
  discount?: number = 0;
}