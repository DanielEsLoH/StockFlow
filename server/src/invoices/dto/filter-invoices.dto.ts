import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';
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
  @IsEnum(PaymentStatus, {
    message: 'El estado de pago debe ser UNPAID, PARTIALLY_PAID o PAID',
  })
  @IsOptional()
  paymentStatus?: PaymentStatus;

  /**
   * Filter by customer ID
   * @example "cmkcykam80004reya0hsdx337"
   */
  @IsString({ message: 'El ID del cliente debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, { message: 'El ID del cliente debe ser un CUID válido' })
  @IsOptional()
  customerId?: string;

  /**
   * Filter invoices from this date (inclusive)
   * @example "2024-01-01T00:00:00.000Z"
   */
  @IsDate({ message: 'La fecha de inicio debe ser una fecha válida' })
  @Type(() => Date)
  @IsOptional()
  fromDate?: Date;

  /**
   * Filter invoices until this date (inclusive)
   * @example "2024-12-31T23:59:59.000Z"
   */
  @IsDate({ message: 'La fecha de fin debe ser una fecha válida' })
  @Type(() => Date)
  @IsOptional()
  toDate?: Date;
}
