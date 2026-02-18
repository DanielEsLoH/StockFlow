import { IsDate, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

export class UpdateQuotationDto {
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
