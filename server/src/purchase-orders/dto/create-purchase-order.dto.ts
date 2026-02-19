import { Type } from 'class-transformer';
import {
  IsArray,
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
import { TaxCategory } from '@prisma/client';

const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

export class CreatePurchaseOrderItemDto {
  @ApiProperty({
    description: 'Product ID for the purchase order item',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del producto debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del producto debe ser un CUID valido',
  })
  productId: string;

  @ApiProperty({
    description: 'Quantity of the product to purchase',
    example: 10,
    minimum: 1,
  })
  @IsNumber({}, { message: 'La cantidad debe ser un numero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  @ApiProperty({
    description: 'Unit price from the supplier',
    example: 50.0,
    minimum: 0,
  })
  @IsNumber({}, { message: 'El precio unitario debe ser un numero' })
  @Min(0, { message: 'El precio unitario debe ser al menos 0' })
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'Tax rate percentage',
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

  @ApiPropertyOptional({
    description: 'Discount amount',
    example: 5.0,
    minimum: 0,
    default: 0,
  })
  @IsNumber({}, { message: 'El descuento debe ser un numero' })
  @Min(0, { message: 'El descuento debe ser al menos 0' })
  @IsOptional()
  discount?: number = 0;

  @ApiPropertyOptional({
    description: 'Tax category for DIAN compliance',
    enum: TaxCategory,
    example: 'GRAVADO_19',
  })
  @IsEnum(TaxCategory, {
    message:
      'Tax category must be GRAVADO_19, GRAVADO_5, EXENTO, or EXCLUIDO',
  })
  @IsOptional()
  taxCategory?: TaxCategory;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({
    description: 'Supplier ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del proveedor debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del proveedor debe ser un CUID valido',
  })
  supplierId: string;

  @ApiProperty({
    description: 'Warehouse ID for receiving the products',
    example: 'cmkcykam80004reya0hsdx338',
  })
  @IsString({ message: 'El ID de la bodega debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID de la bodega debe ser un CUID valido',
  })
  warehouseId: string;

  @ApiProperty({
    description: 'Purchase order items - at least one item is required',
    type: [CreatePurchaseOrderItemDto],
    minItems: 1,
  })
  @IsArray({ message: 'Los items deben ser un arreglo' })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, {
    message: 'La orden de compra debe tener al menos un item',
  })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];

  @ApiPropertyOptional({
    description: 'Expected delivery date',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({
    message: 'La fecha de entrega esperada debe ser una fecha valida',
  })
  @Type(() => Date)
  @IsOptional()
  expectedDeliveryDate?: Date;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Entrega en horario de oficina',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;
}
