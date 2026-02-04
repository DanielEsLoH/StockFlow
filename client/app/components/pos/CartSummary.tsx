import { memo } from "react";
import { cn, formatCurrency } from "~/lib/utils";
import type { CartTotals } from "~/lib/pos-utils";

interface CartSummaryProps {
  totals: CartTotals;
  className?: string;
}

// Default totals for null-safe rendering
const defaultTotals: CartTotals = {
  itemCount: 0,
  subtotal: 0,
  discountAmount: 0,
  taxAmount: 0,
  total: 0,
};

/**
 * CartSummary - Displays cart totals with guaranteed visible values
 *
 * THE GOLDEN RULE: Monetary values MUST NEVER truncate.
 * All values use shrink-0 and tabular-nums for consistent display.
 */
export const CartSummary = memo(function CartSummary({
  totals,
  className,
}: CartSummaryProps) {
  // Null-safe totals with defaults
  const safeTotals = totals ?? defaultTotals;
  const itemCount = safeTotals.itemCount ?? 0;
  const subtotal = safeTotals.subtotal ?? 0;
  const discountAmount = safeTotals.discountAmount ?? 0;
  const taxAmount = safeTotals.taxAmount ?? 0;
  const total = safeTotals.total ?? 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Item count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500 dark:text-neutral-400">
          Items en carrito
        </span>
        <span
          className="shrink-0 font-medium text-neutral-900 dark:text-white"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {itemCount}
        </span>
      </div>

      {/* Subtotal */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500 dark:text-neutral-400">Subtotal</span>
        <span
          className="shrink-0 font-medium text-neutral-900 dark:text-white"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatCurrency(subtotal)}
        </span>
      </div>

      {/* Discount - only show if there's a discount (explicit conditional) */}
      {discountAmount > 0 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">
            Descuento
          </span>
          <span
            className="shrink-0 text-error-500"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            -{formatCurrency(discountAmount)}
          </span>
        </div>
      ) : null}

      {/* Tax */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500 dark:text-neutral-400">
          IVA (19%)
        </span>
        <span
          className="shrink-0 font-medium text-neutral-900 dark:text-white"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatCurrency(taxAmount)}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-200 pt-2 dark:border-neutral-700" />

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-neutral-900 dark:text-white">
          Total
        </span>
        <span
          className="shrink-0 text-xl font-bold text-primary-600 dark:text-primary-400"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
});
