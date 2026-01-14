import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { PaginationDto } from '../../common/dto';

/**
 * Data transfer object for filtering and paginating payments.
 * Extends PaginationDto for page-based pagination support.
 */
export class FilterPaymentsDto extends PaginationDto {
  /**
   * Filter by invoice ID
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @ApiPropertyOptional({
    description: 'Filter by invoice ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('all', { message: 'El ID de la factura debe ser un UUID valido' })
  @IsOptional()
  invoiceId?: string;

  /**
   * Filter by payment method
   * @example "CASH"
   */
  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: PaymentMethod,
    example: 'CASH',
  })
  @IsEnum(PaymentMethod, {
    message:
      'El metodo de pago debe ser CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PSE, NEQUI, DAVIPLATA u OTHER',
  })
  @IsOptional()
  method?: PaymentMethod;

  /**
   * Filter payments from this date (inclusive)
   * @example "2024-01-01T00:00:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Filter payments from this date (inclusive)',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de inicio debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  fromDate?: Date;

  /**
   * Filter payments until this date (inclusive)
   * @example "2024-12-31T23:59:59.000Z"
   */
  @ApiPropertyOptional({
    description: 'Filter payments until this date (inclusive)',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de fin debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  toDate?: Date;
}