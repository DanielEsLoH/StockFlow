import { IsDate, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PurchaseOrderStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto';

const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

export class FilterPurchaseOrdersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by purchase order status',
    enum: PurchaseOrderStatus,
    example: 'DRAFT',
  })
  @IsEnum(PurchaseOrderStatus, {
    message:
      'El estado debe ser DRAFT, SENT, CONFIRMED, RECEIVED o CANCELLED',
  })
  @IsOptional()
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({
    description: 'Filter by supplier ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del proveedor debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del proveedor debe ser un CUID valido',
  })
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Filter by warehouse ID',
    example: 'cmkcykam80004reya0hsdx338',
  })
  @IsString({ message: 'El ID de la bodega debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID de la bodega debe ser un CUID valido',
  })
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional({
    description: 'Filter purchase orders from this date (inclusive)',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de inicio debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  fromDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter purchase orders until this date (inclusive)',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de fin debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  toDate?: Date;

  @ApiPropertyOptional({
    description: 'Search by purchase order number or supplier name',
    example: 'OC-00001',
  })
  @IsString({ message: 'La busqueda debe ser texto' })
  @IsOptional()
  search?: string;
}
