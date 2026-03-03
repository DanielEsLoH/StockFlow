import { useCurrencies } from "~/hooks/useExchangeRates";
import type { CurrencyCode } from "~/types/exchange-rate";

interface CurrencySelectorProps {
  value?: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Dropdown selector for supported currencies.
 *
 * vercel-react-best-practices applied:
 * - bundle-barrel-imports: direct import from hooks
 * - rendering-conditional-render: ternary over && for loading state
 */
export function CurrencySelector({
  value,
  onChange,
  disabled,
  className = "",
}: CurrencySelectorProps) {
  const { data: currencies, isLoading } = useCurrencies();

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value as CurrencyCode)}
      disabled={disabled || isLoading}
      className={`rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 ${className}`}
    >
      {isLoading ? (
        <option>Cargando...</option>
      ) : (
        currencies?.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.code} — {c.name}
          </option>
        ))
      )}
    </select>
  );
}
