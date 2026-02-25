import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// CUID pattern: starts with 'c' followed by lowercase letters and numbers, typically 25 chars
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * Data transfer object for updating a remission item.
 */
export class UpdateRemissionItemDto {
  @ApiPropertyOptional({
    description: 'Product ID for the remission item',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del producto debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del producto debe ser un CUID valido',
  })
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Description of the item',
    example: 'Producto XYZ - Lote 2024',
  })
  @IsString({ message: 'La descripcion debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Quantity of the item',
    example: 10,
    minimum: 1,
  })
  @IsInt({ message: 'La cantidad debe ser un numero entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Unit of measure',
    example: 'kg',
  })
  @IsString({ message: 'La unidad debe ser una cadena de texto' })
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({
    description: 'Additional notes for the item',
    example: 'Fragil - manejar con cuidado',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;
}

/**
 * Data transfer object for updating an existing remission.
 * Only DRAFT remissions can be updated.
 */
export class UpdateRemissionDto {
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

  @ApiPropertyOptional({
    description: 'Warehouse ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID de la bodega debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID de la bodega debe ser un CUID valido',
  })
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional({
    description: 'Invoice ID to link this remission to',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID de la factura debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID de la factura debe ser un CUID valido',
  })
  @IsOptional()
  invoiceId?: string;

  @ApiPropertyOptional({
    description: 'Delivery address',
    example: 'Calle 100 #15-20, Bogota',
  })
  @IsString({ message: 'La direccion de entrega debe ser texto' })
  @IsOptional()
  deliveryAddress?: string;

  @ApiPropertyOptional({
    description: 'Expected delivery date',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de entrega debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  deliveryDate?: Date;

  @ApiPropertyOptional({
    description: 'Transport information',
    example: 'Transportadora XYZ - Placa ABC-123',
  })
  @IsString({ message: 'La informacion de transporte debe ser texto' })
  @IsOptional()
  transportInfo?: string;

  @ApiPropertyOptional({
    description: 'Additional notes for the remission',
    example: 'Entregar en horario de oficina',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Updated remission items (replaces all existing items)',
    type: [UpdateRemissionItemDto],
    minItems: 1,
  })
  @IsArray({ message: 'Los items deben ser un arreglo' })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'La remision debe tener al menos un item' })
  @Type(() => UpdateRemissionItemDto)
  @IsOptional()
  items?: UpdateRemissionItemDto[];
}
