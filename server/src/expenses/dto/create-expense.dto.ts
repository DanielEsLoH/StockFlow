import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  @ApiProperty({
    description: 'Expense category',
    enum: ExpenseCategory,
    example: 'SERVICIOS_PUBLICOS',
  })
  @IsEnum(ExpenseCategory, {
    message:
      'La categoria debe ser SERVICIOS_PUBLICOS, ARRIENDO, HONORARIOS, SEGUROS, PAPELERIA, MANTENIMIENTO, TRANSPORTE, PUBLICIDAD, IMPUESTOS_TASAS, ASEO_CAFETERIA u OTROS',
  })
  category: ExpenseCategory;

  @ApiProperty({
    description: 'Expense description',
    example: 'Pago servicio de energia electrica - Enero 2026',
  })
  @IsString({ message: 'La descripcion debe ser texto' })
  @IsNotEmpty({ message: 'La descripcion es requerida' })
  description: string;

  @ApiProperty({
    description: 'Expense subtotal (before tax)',
    example: 150000,
    minimum: 0,
  })
  @IsNumber({}, { message: 'El subtotal debe ser un numero' })
  @Min(0, { message: 'El subtotal debe ser al menos 0' })
  subtotal: number;

  @ApiPropertyOptional({
    description: 'Tax rate percentage (0-100)',
    example: 19,
    minimum: 0,
    maximum: 100,
    default: 0,
  })
  @IsNumber({}, { message: 'La tasa de impuesto debe ser un numero' })
  @Min(0, { message: 'La tasa de impuesto debe ser al menos 0' })
  @Max(100, { message: 'La tasa de impuesto no puede exceder 100' })
  @IsOptional()
  taxRate?: number = 0;

  @ApiPropertyOptional({
    description: 'Supplier ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del proveedor debe ser texto' })
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Accounting account ID',
    example: 'cmkcykam80004reya0hsdx338',
  })
  @IsString({ message: 'El ID de la cuenta debe ser texto' })
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Cost center ID',
    example: 'cmkcykam80004reya0hsdx339',
  })
  @IsString({ message: 'El ID del centro de costo debe ser texto' })
  @IsOptional()
  costCenterId?: string;

  @ApiPropertyOptional({
    description: 'Issue date (defaults to now)',
    example: '2026-01-15T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de emision debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  issueDate?: Date;

  @ApiPropertyOptional({
    description: 'Due date for payment',
    example: '2026-02-15T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de vencimiento debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  dueDate?: Date;

  @ApiPropertyOptional({
    description: 'Supplier invoice number',
    example: 'FAC-001234',
  })
  @IsString({ message: 'El numero de factura debe ser texto' })
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Pago correspondiente al periodo enero 2026',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;
}
