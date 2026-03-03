import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import { CurrencyCode } from '@prisma/client';

export class CreateExchangeRateDto {
  @IsEnum(CurrencyCode)
  fromCurrency: CurrencyCode;

  @IsEnum(CurrencyCode)
  toCurrency: CurrencyCode;

  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0.00000001)
  rate: number;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsString()
  source?: string;
}
