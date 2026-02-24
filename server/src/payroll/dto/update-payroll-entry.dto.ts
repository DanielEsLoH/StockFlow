import {
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OvertimeType } from '@prisma/client';

export class OvertimeDetailDto {
  @IsEnum(OvertimeType)
  type: OvertimeType;

  @IsNumber()
  @Min(0)
  @Max(240)
  hours: number;
}

export class UpdatePayrollEntryDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(30)
  daysWorked?: number;

  @ApiPropertyOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OvertimeDetailDto)
  @IsOptional()
  overtimeDetails?: OvertimeDetailDto[];

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  bonificaciones?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  comisiones?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  viaticos?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  incapacidadDias?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  licenciaDias?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  vacacionesDias?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  sindicato?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  libranzas?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  otrasDeducciones?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  otrosDevengados?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
