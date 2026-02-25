import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for generating withholding certificates for all suppliers in a given year.
 */
export class GenerateAllCertificatesDto {
  @ApiProperty({
    description: 'Ano fiscal del certificado',
    example: 2025,
    minimum: 2000,
  })
  @IsInt({ message: 'El ano debe ser un numero entero' })
  @Min(2000, { message: 'El ano debe ser mayor o igual a 2000' })
  year: number;

  @ApiPropertyOptional({
    description: 'Tipo de retencion (por defecto RENTA)',
    enum: ['RENTA', 'ICA', 'IVA'],
    example: 'RENTA',
    default: 'RENTA',
  })
  @IsString({ message: 'El tipo de retencion debe ser texto' })
  @IsIn(['RENTA', 'ICA', 'IVA'], {
    message: 'El tipo de retencion debe ser RENTA, ICA o IVA',
  })
  @IsOptional()
  withholdingType?: string = 'RENTA';
}
