import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

// CUID pattern: starts with 'c' followed by lowercase letters and numbers, typically 25 chars
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

/**
 * Data transfer object for recording a new payment against an invoice.
 * Validates payment data before processing the transaction.
 */
export class CreatePaymentDto {
  /**
   * Invoice ID to apply the payment to
   * @example "cmkcykam80004reya0hsdx337"
   */
  @ApiProperty({
    description: 'Invoice ID to apply the payment to',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @IsString({ message: 'El ID de la factura debe ser una cadena de texto' })
  @Matches(CUID_PATTERN, { message: 'El ID de la factura debe ser un CUID valido' })
  invoiceId: string;

  /**
   * Payment amount in the invoice currency
   * @example 150.50
   */
  @ApiProperty({
    description: 'Payment amount in the invoice currency',
    example: 150.5,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'El monto debe ser un numero' })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  amount: number;

  /**
   * Payment method used
   * @example "CASH"
   */
  @ApiProperty({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: 'CASH',
  })
  @IsEnum(PaymentMethod, {
    message:
      'El metodo de pago debe ser CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PSE, NEQUI, DAVIPLATA u OTHER',
  })
  method: PaymentMethod;

  /**
   * Payment reference number (transaction ID, check number, etc.)
   * @example "TXN-123456789"
   */
  @ApiPropertyOptional({
    description: 'Payment reference number (transaction ID, check number, etc.)',
    example: 'TXN-123456789',
  })
  @IsString({ message: 'La referencia debe ser texto' })
  @IsOptional()
  reference?: string;

  /**
   * Additional notes about the payment
   * @example "Partial payment - remaining balance due next month"
   */
  @ApiPropertyOptional({
    description: 'Additional notes about the payment',
    example: 'Partial payment - remaining balance due next month',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;

  /**
   * Date when the payment was made (defaults to current date/time)
   * @example "2024-01-15T10:30:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Date when the payment was made (defaults to current date/time)',
    example: '2024-01-15T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de pago debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  paymentDate?: Date;
}