import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory, ExpenseStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto';

export class FilterExpensesDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by expense status',
    enum: ExpenseStatus,
    example: 'DRAFT',
  })
  @IsEnum(ExpenseStatus, {
    message: 'El estado debe ser DRAFT, APPROVED, PAID o CANCELLED',
  })
  @IsOptional()
  status?: ExpenseStatus;

  @ApiPropertyOptional({
    description: 'Filter by expense category',
    enum: ExpenseCategory,
    example: 'SERVICIOS_PUBLICOS',
  })
  @IsEnum(ExpenseCategory, {
    message:
      'La categoria debe ser SERVICIOS_PUBLICOS, ARRIENDO, HONORARIOS, SEGUROS, PAPELERIA, MANTENIMIENTO, TRANSPORTE, PUBLICIDAD, IMPUESTOS_TASAS, ASEO_CAFETERIA u OTROS',
  })
  @IsOptional()
  category?: ExpenseCategory;

  @ApiPropertyOptional({
    description: 'Filter by supplier ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del proveedor debe ser texto' })
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Filter expenses from this date (ISO string)',
    example: '2026-01-01',
  })
  @IsString({ message: 'La fecha de inicio debe ser texto' })
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter expenses until this date (ISO string)',
    example: '2026-12-31',
  })
  @IsString({ message: 'La fecha de fin debe ser texto' })
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Search by expense number or description',
    example: 'GTO-00001',
  })
  @IsString({ message: 'La busqueda debe ser texto' })
  @IsOptional()
  search?: string;
}
