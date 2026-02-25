import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreatePurchasePaymentDto {
  @ApiProperty({
    description: 'Payment amount',
    example: 500000,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'El monto debe ser un numero' })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: 'BANK_TRANSFER',
  })
  @IsEnum(PaymentMethod, {
    message:
      'El metodo de pago debe ser CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PSE, NEQUI, DAVIPLATA u OTHER',
  })
  method: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment reference (transfer number, check number, etc.)',
    example: 'TRF-987654',
  })
  @IsString({ message: 'La referencia debe ser texto' })
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Pago parcial - saldo a 30 dias',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Date when the payment was made (defaults to now)',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de pago debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  paymentDate?: Date;
}
