import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para la actualización de un centro de costos existente.
 * Todos los campos son opcionales - solo los campos proporcionados serán actualizados.
 */
export class UpdateCostCenterDto {
  /**
   * Código único del centro de costos (mínimo 1 carácter, máximo 20)
   * @example "CC-001"
   */
  @ApiPropertyOptional({
    description: 'Código único del centro de costos (debe ser único dentro del tenant)',
    example: 'CC-001',
    minLength: 1,
    maxLength: 20,
  })
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @MinLength(1, { message: 'El código debe tener al menos 1 carácter' })
  @MaxLength(20, { message: 'El código no puede exceder 20 caracteres' })
  @IsOptional()
  code?: string;

  /**
   * Nombre del centro de costos (mínimo 2 caracteres)
   * @example "Administración"
   */
  @ApiPropertyOptional({
    description: 'Nombre del centro de costos',
    example: 'Administración',
    minLength: 2,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @IsOptional()
  name?: string;

  /**
   * Descripción del centro de costos
   * @example "Centro de costos para gastos administrativos"
   */
  @ApiPropertyOptional({
    description: 'Descripción del centro de costos',
    example: 'Centro de costos para gastos administrativos',
  })
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  /**
   * Estado activo/inactivo del centro de costos
   * @example true
   */
  @ApiPropertyOptional({
    description: 'Estado activo/inactivo del centro de costos',
    example: true,
  })
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  @IsOptional()
  isActive?: boolean;
}
