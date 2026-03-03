import { api } from "~/lib/api";
import type {
  ExchangeRate,
  CurrencyInfo,
  CreateExchangeRateDto,
  FilterExchangeRatesDto,
  ConvertAmountDto,
  ConversionResult,
} from "~/types/exchange-rate";

/**
 * Exchange rates service — API calls for currency management.
 *
 * vercel-react-best-practices applied:
 * - bundle-barrel-imports: direct import of api from ~/lib/api
 */
export const exchangeRatesService = {
  /** Get all supported currencies with display info. */
  async getCurrencies(): Promise<CurrencyInfo[]> {
    const { data } = await api.get<CurrencyInfo[]>(
      "/exchange-rates/currencies",
    );
    return data;
  },

  /** List exchange rates with optional filters. */
  async getExchangeRates(
    filters?: FilterExchangeRatesDto,
  ): Promise<ExchangeRate[]> {
    const params = new URLSearchParams();
    if (filters?.fromCurrency) params.set("fromCurrency", filters.fromCurrency);
    if (filters?.toCurrency) params.set("toCurrency", filters.toCurrency);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);

    const { data } = await api.get<ExchangeRate[]>(
      `/exchange-rates?${params.toString()}`,
    );
    return data;
  },

  /** Get the latest rate for a currency pair. */
  async getLatestRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<{ rate: number; source: string }> {
    const params = new URLSearchParams({ fromCurrency, toCurrency });
    const { data } = await api.get<{ rate: number; source: string }>(
      `/exchange-rates/latest?${params.toString()}`,
    );
    return data;
  },

  /** Create a new exchange rate entry. */
  async createExchangeRate(
    dto: CreateExchangeRateDto,
  ): Promise<ExchangeRate> {
    const { data } = await api.post<ExchangeRate>("/exchange-rates", dto);
    return data;
  },

  /** Convert an amount between currencies. */
  async convertAmount(dto: ConvertAmountDto): Promise<ConversionResult> {
    const { data } = await api.post<ConversionResult>(
      "/exchange-rates/convert",
      dto,
    );
    return data;
  },

  /** Delete an exchange rate by ID. */
  async deleteExchangeRate(id: string): Promise<void> {
    await api.delete(`/exchange-rates/${id}`);
  },
};
