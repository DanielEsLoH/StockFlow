import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DIAN Nómina de Ajuste - Tipo de Nota
 * 1 = Reemplazar (Replace entire document)
 * 2 = Eliminar (Void/delete document)
 */
export enum AdjustmentNoteType {
  REPLACE = '1',
  DELETE = '2',
}

export class CreatePayrollAdjustmentDto {
  @ApiProperty({
    description: 'Tipo de nota de ajuste: 1=Reemplazar, 2=Eliminar',
    enum: AdjustmentNoteType,
    default: AdjustmentNoteType.REPLACE,
  })
  @IsEnum(AdjustmentNoteType)
  tipoNota: AdjustmentNoteType;

  @ApiPropertyOptional({ description: 'Razón del ajuste' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  // Override fields for REPLACE adjustments
  @ApiPropertyOptional({ description: 'Días trabajados corregidos' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  daysWorked?: number;

  @ApiPropertyOptional({ description: 'Bonificaciones corregidas' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bonificaciones?: number;

  @ApiPropertyOptional({ description: 'Comisiones corregidas' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  comisiones?: number;

  @ApiPropertyOptional({ description: 'Viáticos corregidos' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  viaticos?: number;

  @ApiPropertyOptional({ description: 'Sindicato corregido' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sindicato?: number;

  @ApiPropertyOptional({ description: 'Libranzas corregidas' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  libranzas?: number;

  @ApiPropertyOptional({ description: 'Otras deducciones corregidas' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otrasDeducciones?: number;

  @ApiPropertyOptional({ description: 'Otros devengados corregidos' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otrosDevengados?: number;
}
