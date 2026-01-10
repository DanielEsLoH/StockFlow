import {
  IsUUID,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsPositive,
} from 'class-validator';

/**
 * Data transfer object for adding an item to an existing DRAFT invoice.
 * Used to add new line items after invoice creation.
 */
export class AddInvoiceItemDto {
  /**
   * Product ID for the invoice item
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @IsUUID('all', { message: 'El ID del producto debe ser un UUID válido' })
  productId: string;

  /**
   * Quantity of the product
   * @example 5
   */
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @IsPositive({ message: 'La cantidad debe ser positiva' })
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
