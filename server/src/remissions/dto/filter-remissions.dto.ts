import { IsDate, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RemissionStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto';

// CUID pattern: starts with 'c' followed by lowercase letters and numbers, typically 25 chars
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * Data transfer object for filtering and paginating remissions.
 * Extends PaginationDto for page-based pagination support.
 */
export class FilterRemissionsDto extends PaginationDto {
  /**
   * Filter by remission status
   * @example "DRAFT"
   */
  @ApiPropertyOptional({
    description: 'Filter by remission status',
    enum: RemissionStatus,
    example: 'DRAFT',
  })
  @IsEnum(RemissionStatus, {
    message:
      'El estado debe ser DRAFT, DISPATCHED, DELIVERED o CANCELLED',
  })
  @IsOptional()
  status?: RemissionStatus;

  /**
   * Filter by customer ID
   * @example "cmkcykam80004reya0hsdx337"
   */
  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del cliente debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del cliente debe ser un CUID valido',
  })
  @IsOptional()
  customerId?: string;

  /**
   * Filter by warehouse ID
   * @example "cmkcykam80004reya0hsdx337"
   */
  @ApiPropertyOptional({
    description: 'Filter by warehouse ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID de la bodega debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID de la bodega debe ser un CUID valido',
  })
  @IsOptional()
  warehouseId?: string;

  /**
   * Search in remission number, customer name, or delivery address
   * @example "REM-00001"
   */
  @ApiPropertyOptional({
    description:
      'Search in remission number, customer name, or delivery address',
    example: 'REM-00001',
  })
  @IsString({ message: 'La busqueda debe ser texto' })
  @IsOptional()
  search?: string;

  /**
   * Filter remissions from this date (inclusive)
   * @example "2024-01-01T00:00:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Filter remissions from this date (inclusive)',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de inicio debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  fromDate?: Date;

  /**
   * Filter remissions until this date (inclusive)
   * @example "2024-12-31T23:59:59.000Z"
   */
  @ApiPropertyOptional({
    description: 'Filter remissions until this date (inclusive)',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de fin debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  toDate?: Date;
}
