import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para la creación de un nuevo centro de costos.
 * Utilizado por usuarios ADMIN para crear centros de costos dentro de su tenant.
 */
export class CreateCostCenterDto {
  /**
   * Código único del centro de costos dentro del tenant (mínimo 1 carácter, máximo 20)
   * @example "CC-001"
   */
  @ApiProperty({
    description: 'Código único del centro de costos (debe ser único dentro del tenant)',
    example: 'CC-001',
    minLength: 1,
    maxLength: 20,
  })
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @MinLength(1, { message: 'El código debe tener al menos 1 carácter' })
  @MaxLength(20, { message: 'El código no puede exceder 20 caracteres' })
  code: string;

  /**
   * Nombre del centro de costos (mínimo 2 caracteres)
   * @example "Administración"
   */
  @ApiProperty({
    description: 'Nombre del centro de costos',
    example: 'Administración',
    minLength: 2,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  /**
   * Descripción del centro de costos (opcional)
   * @example "Centro de costos para gastos administrativos"
   */
  @ApiPropertyOptional({
    description: 'Descripción del centro de costos',
    example: 'Centro de costos para gastos administrativos',
  })
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;
}
