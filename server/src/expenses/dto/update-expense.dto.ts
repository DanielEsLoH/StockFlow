import { PartialType } from '@nestjs/swagger';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { CreateExpenseDto } from './create-expense.dto';

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {
  @ApiPropertyOptional({
    description: 'Payment method',
    enum: PaymentMethod,
    example: 'BANK_TRANSFER',
  })
  @IsEnum(PaymentMethod, {
    message:
      'El metodo de pago debe ser CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PSE, NEQUI, DAVIPLATA u OTHER',
  })
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment reference (transfer number, check number, etc.)',
    example: 'TRF-987654',
  })
  @IsString({ message: 'La referencia de pago debe ser texto' })
  @IsOptional()
  paymentReference?: string;

  @ApiPropertyOptional({
    description: 'Date when the payment was made',
    type: String,
    format: 'date-time',
  })
  @IsDate({ message: 'La fecha de pago debe ser una fecha valida' })
  @Type(() => Date)
  @IsOptional()
  paymentDate?: Date;
}
