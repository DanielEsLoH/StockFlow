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
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

// CUID pattern: starts with 'c' followed by lowercase letters and numbers, typically 25 chars
// Example: clh1234567890abcdefghijkl or cmkcykam80004reya0hsdx337
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * Data transfer object for creating an invoice item.
 * Represents a line item within an invoice.
 */
export class CreateInvoiceItemDto {
  /**
   * Product ID for the invoice item
   * @example "cmkcykam80004reya0hsdx337"
   */
  @IsString({ message: 'El ID del producto debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, { message: 'El ID del producto debe ser un CUID válido' })
  productId: string;

  /**
   * Quantity of the product
   * @example 5
   */
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  /**
   * Unit price for the product
   * @example 99.99
   */
  @IsNumber({}, { message: 'El precio unitario debe ser un número' })
  @Min(0, { message: 'El precio unitario debe ser al menos 0' })
  unitPrice: number;

  /**
   * Tax rate percentage for this item (default: 19%)
   * @example 19
   */
  @IsNumber({}, { message: 'La tasa de impuesto debe ser un número' })
  @Min(0, { message: 'La tasa de impuesto debe ser al menos 0' })
  @Max(100, { message: 'La tasa de impuesto no puede exceder 100' })
  @IsOptional()
  taxRate?: number = 19;

  /**
   * Discount amount for this item (default: 0)
   * @example 10.00
   */
  @IsNumber({}, { message: 'El descuento debe ser un número' })
  @Min(0, { message: 'El descuento debe ser al menos 0' })
  @IsOptional()
  discount?: number = 0;
}

/**
 * Data transfer object for creating a new invoice.
 * Used by ADMIN and MANAGER users to create invoices within their tenant.
 */
export class CreateInvoiceDto {
  /**
   * Customer ID (optional for quick sales without customer)
   * @example "cmkcykam80004reya0hsdx337"
   */
  @IsString({ message: 'El ID del cliente debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, { message: 'El ID del cliente debe ser un CUID válido' })
  @IsOptional()
  customerId?: string;

  /**
   * Invoice items - at least one item is required
   */
  @IsArray({ message: 'Los items deben ser un arreglo' })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'La factura debe tener al menos un item' })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  /**
   * Due date for the invoice (optional)
   * @example "2024-12-31T23:59:59.000Z"
   */
  @IsDate({ message: 'La fecha de vencimiento debe ser una fecha válida' })
  @Type(() => Date)
  @IsOptional()
  dueDate?: Date;

  /**
   * Additional notes for the invoice
   * @example "Payment due within 30 days"
   */
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;
}
