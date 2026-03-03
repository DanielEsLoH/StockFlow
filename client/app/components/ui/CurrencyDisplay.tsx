import type { CurrencyCode } from "~/types/exchange-rate";

/** Static currency info for formatting — avoids API call. */
const CURRENCY_INFO: Record<
  CurrencyCode,
  { symbol: string; decimals: number; locale: string }
> = {
  COP: { symbol: "$", decimals: 0, locale: "es-CO" },
  USD: { symbol: "US$", decimals: 2, locale: "en-US" },
  EUR: { symbol: "€", decimals: 2, locale: "de-DE" },
  MXN: { symbol: "MX$", decimals: 2, locale: "es-MX" },
  PEN: { symbol: "S/", decimals: 2, locale: "es-PE" },
  BRL: { symbol: "R$", decimals: 2, locale: "pt-BR" },
};

interface CurrencyDisplayProps {
  amount: number;
  currency?: CurrencyCode;
  /** Show currency code after amount (e.g. "$ 1,000 COP"). Default false. */
  showCode?: boolean;
  className?: string;
}

/**
 * Formats and displays an amount in its currency.
 *
 * vercel-react-best-practices applied:
 * - js-cache-property-access: CURRENCY_INFO is a static constant
 */
export function CurrencyDisplay({
  amount,
  currency = "COP",
  showCode = false,
  className = "",
}: CurrencyDisplayProps) {
  const info = CURRENCY_INFO[currency] ?? CURRENCY_INFO.COP;

  const formatted = new Intl.NumberFormat(info.locale, {
    minimumFractionDigits: info.decimals,
    maximumFractionDigits: info.decimals,
  }).format(amount);

  return (
    <span className={className}>
      {info.symbol} {formatted}
      {showCode ? ` ${currency}` : ""}
    </span>
  );
}

/**
 * Utility function to format currency amount (for non-component use).
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "COP",
): string {
  const info = CURRENCY_INFO[currency] ?? CURRENCY_INFO.COP;

  const formatted = new Intl.NumberFormat(info.locale, {
    minimumFractionDigits: info.decimals,
    maximumFractionDigits: info.decimals,
  }).format(amount);

  return `${info.symbol} ${formatted}`;
}
