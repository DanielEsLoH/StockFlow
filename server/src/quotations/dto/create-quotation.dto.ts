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

export class CreateQuotationItemDto {
  @ApiProperty({
    description: 'Product ID for the quotation item',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del producto debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del producto debe ser un CUID valido',
  })
  productId: string;

  @ApiProperty({
    description: 'Quantity of the product',
    example: 5,
    minimum: 1,
  })
  @IsNumber({}, { message: 'La cantidad debe ser un numero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  @ApiProperty({
    description: 'Unit price for the product',
    example: 99.99,
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
    example: 10.0,
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

export class CreateQuotationDto {
  @ApiPropertyOptional({
    description: 'Customer ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del cliente debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del cliente debe ser un CUID valido',
  })
  @IsOptional()
  customerId?: string;

  @ApiProperty({
    description: 'Quotation items - at least one item is required',
    type: [CreateQuotationItemDto],
    minItems: 1,
  })
  @IsArray({ message: 'Los items deben ser un arreglo' })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'La cotizacion debe tener al menos un item' })
  @Type(() => CreateQuotationItemDto)
  items: CreateQuotationItemDto[];

  @ApiPropertyOptional({
    description: 'Valid until date',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de validez debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  validUntil?: Date;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Cotizacion valida por 30 dias',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;
}
