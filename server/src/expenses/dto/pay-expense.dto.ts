import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class PayExpenseDto {
  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: 'BANK_TRANSFER',
  })
  @IsEnum(PaymentMethod, {
    message:
      'El metodo de pago debe ser CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PSE, NEQUI, DAVIPLATA u OTHER',
  })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment reference (transfer number, check number, etc.)',
    example: 'TRF-987654',
  })
  @IsString({ message: 'La referencia de pago debe ser texto' })
  @IsOptional()
  paymentReference?: string;

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
