import { IsIn, IsInt, IsString, Matches, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * DTO for generating a withholding certificate for a single supplier.
 */
export class GenerateCertificateDto {
  @ApiProperty({
    description: 'ID del proveedor',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del proveedor debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del proveedor debe ser un CUID valido',
  })
  supplierId: string;

  @ApiProperty({
    description: 'Ano fiscal del certificado',
    example: 2025,
    minimum: 2000,
  })
  @IsInt({ message: 'El ano debe ser un numero entero' })
  @Min(2000, { message: 'El ano debe ser mayor o igual a 2000' })
  year: number;

  @ApiProperty({
    description: 'Tipo de retencion',
    enum: ['RENTA', 'ICA', 'IVA'],
    example: 'RENTA',
  })
  @IsString({ message: 'El tipo de retencion debe ser texto' })
  @IsIn(['RENTA', 'ICA', 'IVA'], {
    message: 'El tipo de retencion debe ser RENTA, ICA o IVA',
  })
  withholdingType: string;
}
