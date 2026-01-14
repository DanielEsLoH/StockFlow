import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '@prisma/client';
import { PaginationDto } from '../../common/dto';

/**
 * Data transfer object for filtering and paginating stock movements.
 * Extends PaginationDto for page-based pagination support.
 */
export class FilterMovementsDto extends PaginationDto {
  /**
   * Filter by product ID
   * @example "clxxxxxxxxxxxxxxxxxxxxxxxxx"
   */
  @ApiPropertyOptional({
    description: 'Filter by product ID',
    example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsUUID('all', { message: 'El ID del producto debe ser un UUID valido' })
  @IsOptional()
  productId?: string;

  /**
   * Filter by warehouse ID
   * @example "clxxxxxxxxxxxxxxxxxxxxxxxxx"
   */
  @ApiPropertyOptional({
    description: 'Filter by warehouse ID',
    example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsUUID('all', { message: 'El ID del almacen debe ser un UUID valido' })
  @IsOptional()
  warehouseId?: string;

  /**
   * Filter by movement type
   * @example "ADJUSTMENT"
   */
  @ApiPropertyOptional({
    description: 'Filter by movement type',
    enum: MovementType,
    example: 'ADJUSTMENT',
  })
  @IsEnum(MovementType, {
    message:
      'El tipo de movimiento debe ser PURCHASE, SALE, ADJUSTMENT, TRANSFER, RETURN o DAMAGED',
  })
  @IsOptional()
  type?: MovementType;

  /**
   * Filter movements from this date (inclusive)
   * @example "2024-01-01T00:00:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Filter movements from this date (inclusive)',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de inicio debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  fromDate?: Date;

  /**
   * Filter movements until this date (inclusive)
   * @example "2024-12-31T23:59:59.000Z"
   */
  @ApiPropertyOptional({
    description: 'Filter movements until this date (inclusive)',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de fin debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  toDate?: Date;
}