import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data transfer object for creating a manual stock movement (ADJUSTMENT type).
 * This DTO is used for manual inventory adjustments only.
 * Other movement types (PURCHASE, SALE, TRANSFER, etc.) are created by their respective modules.
 */
export class CreateMovementDto {
  /**
   * Product ID to adjust stock for
   * @example "clxxxxxxxxxxxxxxxxxxxxxxxxx"
   */
  @ApiProperty({
    description: 'Product ID to adjust stock for',
    example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsUUID('all', { message: 'El ID del producto debe ser un UUID valido' })
  productId: string;

  /**
   * Warehouse ID where the adjustment occurs (optional)
   * @example "clxxxxxxxxxxxxxxxxxxxxxxxxx"
   */
  @ApiPropertyOptional({
    description: 'Warehouse ID where the adjustment occurs',
    example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsUUID('all', { message: 'El ID del almacen debe ser un UUID valido' })
  @IsOptional()
  warehouseId?: string;

  /**
   * Quantity to adjust (positive = add stock, negative = subtract stock)
   * @example 10
   * @example -5
   */
  @ApiProperty({
    description: 'Quantity to adjust (positive = add stock, negative = subtract stock)',
    example: 10,
  })
  @IsInt({ message: 'La cantidad debe ser un numero entero' })
  quantity: number;

  /**
   * Reason for the adjustment
   * @example "Inventory count correction"
   */
  @ApiProperty({
    description: 'Reason for the adjustment',
    example: 'Inventory count correction',
    maxLength: 255,
  })
  @IsString({ message: 'La razon debe ser texto' })
  @MaxLength(255, { message: 'La razon no puede exceder 255 caracteres' })
  reason: string;

  /**
   * Additional notes about the adjustment
   * @example "Found 10 extra units during physical inventory count"
   */
  @ApiPropertyOptional({
    description: 'Additional notes about the adjustment',
    example: 'Found 10 extra units during physical inventory count',
    maxLength: 1000,
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @MaxLength(1000, { message: 'Las notas no pueden exceder 1000 caracteres' })
  @IsOptional()
  notes?: string;
}