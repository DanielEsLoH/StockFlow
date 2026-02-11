import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceSource, PaymentMethod } from '@prisma/client';

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
  @ApiProperty({
    description: 'Product ID for the invoice item',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del producto debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del producto debe ser un CUID valido',
  })
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
  @IsNumber({}, { message: 'La cantidad debe ser un numero' })
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
  @IsNumber({}, { message: 'El precio unitario debe ser un numero' })
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
  @IsNumber({}, { message: 'La tasa de impuesto debe ser un numero' })
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
  @IsNumber({}, { message: 'El descuento debe ser un numero' })
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
  @ApiPropertyOptional({
    description: 'Customer ID (optional for quick sales without customer)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del cliente debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del cliente debe ser un CUID valido',
  })
  @IsOptional()
  customerId?: string;

  /**
   * Invoice items - at least one item is required
   */
  @ApiProperty({
    description: 'Invoice items - at least one item is required',
    type: [CreateInvoiceItemDto],
    minItems: 1,
  })
  @IsArray({ message: 'Los items deben ser un arreglo' })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'La factura debe tener al menos un item' })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  /**
   * Due date for the invoice (optional)
   * @example "2024-12-31T23:59:59.000Z"
   */
  @ApiPropertyOptional({
    description: 'Due date for the invoice',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de vencimiento debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  dueDate?: Date;

  /**
   * Additional notes for the invoice
   * @example "Payment due within 30 days"
   */
  @ApiPropertyOptional({
    description: 'Additional notes for the invoice',
    example: 'Payment due within 30 days',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;

  /**
   * Invoice source (MANUAL or POS)
   * @example "POS"
   */
  @ApiPropertyOptional({
    description:
      'Invoice source - MANUAL for regular invoices, POS for point of sale',
    enum: InvoiceSource,
    example: 'MANUAL',
    default: 'MANUAL',
  })
  @IsEnum(InvoiceSource, {
    message: 'La fuente debe ser MANUAL o POS',
  })
  @IsOptional()
  source?: InvoiceSource = InvoiceSource.MANUAL;

  /**
   * Warehouse ID for the invoice (optional — inferred from user's assigned warehouse if not provided)
   * @example "cmkcykam80004reya0hsdx337"
   */
  @ApiPropertyOptional({
    description:
      'Warehouse ID for the invoice (optional — inferred from user warehouse if not provided)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID de la bodega debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID de la bodega debe ser un CUID valido',
  })
  @IsOptional()
  warehouseId?: string;
}

/**
 * DTO for POS checkout — creates invoice, marks as SENT, and optionally records payment.
 */
export class CheckoutInvoiceDto extends CreateInvoiceDto {
  /**
   * Whether to record an immediate payment for the full amount
   */
  @ApiPropertyOptional({
    description: 'Record immediate full payment (POS cash sale)',
    example: true,
    default: false,
  })
  @IsBoolean({ message: 'immediatePayment debe ser un booleano' })
  @IsOptional()
  immediatePayment?: boolean = false;

  /**
   * Payment method when immediatePayment is true
   */
  @ApiPropertyOptional({
    description: 'Payment method for immediate payment',
    enum: PaymentMethod,
    example: 'CASH',
    default: 'CASH',
  })
  @IsEnum(PaymentMethod, {
    message: 'El metodo de pago no es valido',
  })
  @IsOptional()
  paymentMethod?: PaymentMethod = PaymentMethod.CASH;
}
