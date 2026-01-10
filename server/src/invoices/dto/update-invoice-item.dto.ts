import { IsNumber, IsOptional, Min, Max, IsPositive } from 'class-validator';

/**
 * Data transfer object for updating an existing item on a DRAFT invoice.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateInvoiceItemDto {
  /**
   * New quantity of the product
   * @example 10
   */
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @IsPositive({ message: 'La cantidad debe ser positiva' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @IsOptional()
  quantity?: number;

  /**
   * New unit price for the product
   * @example 149.99
   */
  @IsNumber({}, { message: 'El precio unitario debe ser un número' })
  @Min(0, { message: 'El precio unitario debe ser al menos 0' })
  @IsOptional()
  unitPrice?: number;

  /**
   * New tax rate percentage for this item
   * @example 19
   */
  @IsNumber({}, { message: 'La tasa de impuesto debe ser un número' })
  @Min(0, { message: 'La tasa de impuesto debe ser al menos 0' })
  @Max(100, { message: 'La tasa de impuesto no puede exceder 100' })
  @IsOptional()
  taxRate?: number;

  /**
   * New discount amount for this item
   * @example 15.00
   */
  @IsNumber({}, { message: 'El descuento debe ser un número' })
  @Min(0, { message: 'El descuento debe ser al menos 0' })
  @IsOptional()
  discount?: number;
}
