import { IsEnum, IsNumber, Min } from 'class-validator';
import { CurrencyCode } from '@prisma/client';

export class ConvertAmountDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsEnum(CurrencyCode)
  fromCurrency: CurrencyCode;

  @IsEnum(CurrencyCode)
  toCurrency: CurrencyCode;
}
