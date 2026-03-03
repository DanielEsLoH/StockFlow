import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query-client";
import { exchangeRatesService } from "~/services/exchange-rates.service";
import type {
  CreateExchangeRateDto,
  FilterExchangeRatesDto,
} from "~/types/exchange-rate";
import { toast } from "~/components/ui/Toast";

/**
 * Hook to fetch supported currencies.
 *
 * vercel-react-best-practices applied:
 * - rerender-functional-setstate: stable callbacks via React Query
 * - bundle-barrel-imports: direct imports only
 */
export function useCurrencies() {
  return useQuery({
    queryKey: queryKeys.exchangeRates.currencies(),
    queryFn: exchangeRatesService.getCurrencies,
    staleTime: 1000 * 60 * 60, // currencies rarely change — 1 hour
  });
}

/**
 * Hook to fetch exchange rates with optional filters.
 */
export function useExchangeRates(filters?: FilterExchangeRatesDto) {
  return useQuery({
    queryKey: queryKeys.exchangeRates.list(filters as Record<string, unknown>),
    queryFn: () => exchangeRatesService.getExchangeRates(filters),
  });
}

/**
 * Hook to fetch the latest exchange rate for a currency pair.
 */
export function useLatestRate(fromCurrency: string, toCurrency: string) {
  return useQuery({
    queryKey: queryKeys.exchangeRates.latest(fromCurrency, toCurrency),
    queryFn: () =>
      exchangeRatesService.getLatestRate(fromCurrency, toCurrency),
    enabled: !!fromCurrency && !!toCurrency && fromCurrency !== toCurrency,
  });
}

/**
 * Mutation hook to create a new exchange rate.
 */
export function useCreateExchangeRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateExchangeRateDto) =>
      exchangeRatesService.createExchangeRate(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.exchangeRates.all,
      });
      toast.success("Tasa de cambio creada");
    },
  });
}

/**
 * Mutation hook to delete an exchange rate.
 */
export function useDeleteExchangeRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => exchangeRatesService.deleteExchangeRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.exchangeRates.all,
      });
      toast.success("Tasa de cambio eliminada");
    },
  });
}
