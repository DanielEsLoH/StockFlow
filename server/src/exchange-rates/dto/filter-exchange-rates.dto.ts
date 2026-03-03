import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { CurrencyCode } from '@prisma/client';

export class FilterExchangeRatesDto {
  @IsOptional()
  @IsEnum(CurrencyCode)
  fromCurrency?: CurrencyCode;

  @IsOptional()
  @IsEnum(CurrencyCode)
  toCurrency?: CurrencyCode;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
