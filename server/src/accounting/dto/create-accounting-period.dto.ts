import { IsString, IsDateString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateAccountingPeriodDto {
  @ApiProperty({
    description: 'Period name',
    example: 'Enero 2025',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @ApiProperty({
    description: 'Period start date',
    example: '2025-01-01',
  })
  @IsDateString({}, { message: 'La fecha de inicio debe ser valida' })
  startDate: string;

  @ApiProperty({
    description: 'Period end date',
    example: '2025-01-31',
  })
  @IsDateString({}, { message: 'La fecha de fin debe ser valida' })
  endDate: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  notes?: string;
}
