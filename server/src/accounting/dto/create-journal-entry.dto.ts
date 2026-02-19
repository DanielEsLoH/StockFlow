import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  ArrayMinSize,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class JournalEntryLineDto {
  @ApiProperty({
    description: 'Account ID',
    example: 'clxxx...',
  })
  @IsString({ message: 'El ID de cuenta es requerido' })
  accountId: string;

  @ApiPropertyOptional({ description: 'Line description' })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  description?: string;

  @ApiProperty({
    description: 'Debit amount (0 if credit line)',
    example: 100000,
  })
  @IsNumber({}, { message: 'El debito debe ser un numero' })
  @Min(0, { message: 'El debito no puede ser negativo' })
  debit: number;

  @ApiProperty({
    description: 'Credit amount (0 if debit line)',
    example: 0,
  })
  @IsNumber({}, { message: 'El credito debe ser un numero' })
  @Min(0, { message: 'El credito no puede ser negativo' })
  credit: number;
}

export class CreateJournalEntryDto {
  @ApiProperty({
    description: 'Entry date',
    example: '2025-01-15',
  })
  @IsDateString({}, { message: 'La fecha debe ser una fecha valida' })
  date: string;

  @ApiProperty({
    description: 'Entry description',
    example: 'Venta de mercancia - Factura #001',
    minLength: 3,
    maxLength: 500,
  })
  @IsString({ message: 'La descripcion es requerida' })
  @MinLength(3, { message: 'La descripcion debe tener al menos 3 caracteres' })
  @MaxLength(500, { message: 'La descripcion no puede exceder 500 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  description: string;

  @ApiPropertyOptional({ description: 'Accounting period ID' })
  @IsString()
  @IsOptional()
  periodId?: string;

  @ApiProperty({
    description: 'Journal entry lines (must have at least 2)',
    type: [JournalEntryLineDto],
  })
  @IsArray({ message: 'Las lineas son requeridas' })
  @ArrayMinSize(2, { message: 'Debe tener al menos 2 lineas' })
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines: JournalEntryLineDto[];
}
