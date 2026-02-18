import { IsDate, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { QuotationStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto';

const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

export class FilterQuotationsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by quotation status',
    enum: QuotationStatus,
    example: 'SENT',
  })
  @IsEnum(QuotationStatus, {
    message:
      'El estado debe ser DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED o CONVERTED',
  })
  @IsOptional()
  status?: QuotationStatus;

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

  @ApiPropertyOptional({
    description: 'Filter quotations from this date (inclusive)',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de inicio debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  fromDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter quotations until this date (inclusive)',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de fin debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  toDate?: Date;

  @ApiPropertyOptional({
    description: 'Search by quotation number or customer name',
    example: 'COT-00001',
  })
  @IsString({ message: 'La busqueda debe ser texto' })
  @IsOptional()
  search?: string;
}
