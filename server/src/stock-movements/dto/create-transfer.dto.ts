import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// CUID pattern: starts with 'c' followed by lowercase letters and numbers, typically 25 chars
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * DTO for creating a stock transfer between warehouses.
 *
 * Transfers move stock from one warehouse to another without
 * changing the total product stock (net zero change).
 */
export class CreateTransferDto {
  @ApiProperty({
    description: 'ID of the product to transfer',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del producto debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, { message: 'El ID del producto debe ser un CUID valido' })
  productId: string;

  @ApiProperty({
    description: 'ID of the source warehouse (where stock is taken from)',
    example: 'cmkcykam80004reya0hsdx338',
  })
  @IsString({ message: 'El ID del almacen origen debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del almacen origen debe ser un CUID valido',
  })
  sourceWarehouseId: string;

  @ApiProperty({
    description: 'ID of the destination warehouse (where stock is added)',
    example: 'cmkcykam80004reya0hsdx339',
  })
  @IsString({ message: 'El ID del almacen destino debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del almacen destino debe ser un CUID valido',
  })
  destinationWarehouseId: string;

  @ApiProperty({
    description: 'Quantity to transfer (must be positive)',
    example: 10,
    minimum: 1,
  })
  @IsInt({ message: 'La cantidad debe ser un numero entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Reason for the transfer',
    example: 'Reposicion de inventario',
    maxLength: 255,
  })
  @IsString({ message: 'La razon debe ser texto' })
  @MaxLength(255, { message: 'La razon no puede exceder 255 caracteres' })
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the transfer',
    example: 'Transferencia solicitada por gerente de sucursal',
    maxLength: 1000,
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @MaxLength(1000, { message: 'Las notas no pueden exceder 1000 caracteres' })
  @IsOptional()
  notes?: string;
}
