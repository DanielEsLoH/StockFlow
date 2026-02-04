import { IsDate, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvoiceStatus, InvoiceSource, PaymentStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto';

// CUID pattern: starts with 'c' followed by lowercase letters and numbers, typically 25 chars
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * Data transfer object for filtering and paginating invoices.
 * Extends PaginationDto for page-based pagination support.
 */
export class FilterInvoicesDto extends PaginationDto {
  /**
   * Filter by invoice status
   * @example "SENT"
   */
  @ApiPropertyOptional({
    description: 'Filter by invoice status',
    enum: InvoiceStatus,
    example: 'SENT',
  })
  @IsEnum(InvoiceStatus, {
    message:
      'El estado debe ser DRAFT, PENDING, SENT, OVERDUE, CANCELLED o VOID',
  })
  @IsOptional()
  status?: InvoiceStatus;

  /**
   * Filter by payment status
   * @example "UNPAID"
   */
  @ApiPropertyOptional({
    description: 'Filter by payment status',
    enum: PaymentStatus,
    example: 'UNPAID',
  })
  @IsEnum(PaymentStatus, {
    message: 'El estado de pago debe ser UNPAID, PARTIALLY_PAID o PAID',
  })
  @IsOptional()
  paymentStatus?: PaymentStatus;

  /**
   * Filter by customer ID
   * @example "cmkcykam80004reya0hsdx337"
   */
  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID del cliente debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, {
    message: 'El ID del cliente debe ser un CUID valido',
  })
  @IsOptional()
  customerId?: string;

  /**
   * Filter invoices from this date (inclusive)
   * @example "2024-01-01T00:00:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Filter invoices from this date (inclusive)',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de inicio debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  fromDate?: Date;

  /**
   * Filter invoices until this date (inclusive)
   * @example "2024-12-31T23:59:59.000Z"
   */
  @ApiPropertyOptional({
    description: 'Filter invoices until this date (inclusive)',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de fin debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  toDate?: Date;

  /**
   * Filter by invoice source (MANUAL or POS)
   * @example "POS"
   */
  @ApiPropertyOptional({
    description: 'Filter by invoice source',
    enum: InvoiceSource,
    example: 'POS',
  })
  @IsEnum(InvoiceSource, {
    message: 'El origen debe ser MANUAL o POS',
  })
  @IsOptional()
  source?: InvoiceSource;
}
