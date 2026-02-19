import { IsString, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportStatementDto {
  @ApiProperty({ description: 'Bank account ID' })
  @IsString({ message: 'El ID de la cuenta bancaria es requerido' })
  bankAccountId: string;

  @ApiProperty({ description: 'Statement period start date', example: '2025-01-01' })
  @IsDateString({}, { message: 'La fecha de inicio debe ser valida' })
  periodStart: string;

  @ApiProperty({ description: 'Statement period end date', example: '2025-01-31' })
  @IsDateString({}, { message: 'La fecha de fin debe ser valida' })
  periodEnd: string;

  @ApiPropertyOptional({ description: 'Column name for date', default: 'Fecha' })
  @IsString()
  @IsOptional()
  dateColumn?: string;

  @ApiPropertyOptional({ description: 'Column name for description', default: 'Descripcion' })
  @IsString()
  @IsOptional()
  descriptionColumn?: string;

  @ApiPropertyOptional({ description: 'Column name for debit amounts', default: 'Debito' })
  @IsString()
  @IsOptional()
  debitColumn?: string;

  @ApiPropertyOptional({ description: 'Column name for credit amounts', default: 'Credito' })
  @IsString()
  @IsOptional()
  creditColumn?: string;

  @ApiPropertyOptional({ description: 'Column name for reference', default: 'Referencia' })
  @IsString()
  @IsOptional()
  referenceColumn?: string;

  @ApiPropertyOptional({ description: 'Column name for balance' })
  @IsString()
  @IsOptional()
  balanceColumn?: string;

  @ApiPropertyOptional({ description: 'Header row number (0-indexed)', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  headerRow?: number;
}
