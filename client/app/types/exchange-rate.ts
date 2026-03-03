/**
 * Supported currency codes.
 * Mirrors the backend CurrencyCode enum.
 */
export type CurrencyCode = 'COP' | 'USD' | 'EUR' | 'MXN' | 'PEN' | 'BRL';

/**
 * Currency display info returned by the API.
 */
export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimals: number;
}

/**
 * Exchange rate record from the API.
 */
export interface ExchangeRate {
  id: string;
  tenantId: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  effectiveDate: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for creating an exchange rate.
 */
export interface CreateExchangeRateDto {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  effectiveDate?: string;
  source?: string;
}

/**
 * Filters for listing exchange rates.
 */
export interface FilterExchangeRatesDto {
  fromCurrency?: CurrencyCode;
  toCurrency?: CurrencyCode;
  startDate?: string;
  endDate?: string;
}

/**
 * DTO for currency conversion.
 */
export interface ConvertAmountDto {
  amount: number;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
}

/**
 * Result of a currency conversion.
 */
export interface ConversionResult {
  originalAmount: number;
  convertedAmount: number;
  rate: number;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  source: string;
}
