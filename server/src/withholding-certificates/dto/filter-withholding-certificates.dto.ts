import { IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto';

const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * DTO for filtering withholding certificates.
 * Extends PaginationDto for page-based pagination.
 */
export class FilterWithholdingCertificatesDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ano fiscal',
    example: 2025,
    minimum: 2000,
  })
  @IsInt({ message: 'El ano debe ser un numero entero' })
  @Min(2000, { message: 'El ano debe ser mayor o igual a 2000' })
  @Type(() => Number)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por ID del proveedor',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del proveedor debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del proveedor debe ser un CUID valido',
  })
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de retencion',
    enum: ['RENTA', 'ICA', 'IVA'],
    example: 'RENTA',
  })
  @IsString({ message: 'El tipo de retencion debe ser texto' })
  @IsIn(['RENTA', 'ICA', 'IVA'], {
    message: 'El tipo de retencion debe ser RENTA, ICA o IVA',
  })
  @IsOptional()
  withholdingType?: string;
}
