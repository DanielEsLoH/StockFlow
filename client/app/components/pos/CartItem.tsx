import { memo } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Minus, Plus } from 'lucide-react';
import { cn, formatCurrency } from '~/lib/utils';
import { calculateLineItemTotals, type POSCartItem } from '~/lib/pos-utils';

interface CartItemProps {
  item: POSCartItem;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
}

/**
 * CartItem - Two-row layout with protected prices
 *
 * Layout structure:
 * Row 1: Product name (truncates) + Delete button
 * Row 2: Unit price (can shrink) + Quantity controls (shrink-0) + Line total (shrink-0)
 *
 * THE GOLDEN RULE: Prices and totals MUST NEVER truncate.
 * Only the product name can truncate (via line-clamp-2).
 */
export const CartItem = memo(function CartItem(props: CartItemProps) {
  const { item, onIncrement, onDecrement, onRemove } = props;
  // Null-safe calculation with fallback
  const lineItemTotals = calculateLineItemTotals(item);
  const total = lineItemTotals?.total ?? 0;
  const maxQuantity = item.product?.stock ?? 0;
  const canIncrement = item.quantity < maxQuantity;
  const productName = item.product?.name ?? 'Producto';
  const unitPrice = item.unitPrice ?? 0;
  const discount = item.discount ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800"
    >
      {/* Row 1: Product name + Delete button */}
      <div className="mb-2 flex items-start gap-2">
        {/* Product name - can truncate to 2 lines */}
        <h4 className="min-w-0 flex-1 line-clamp-2 text-sm font-medium leading-tight text-neutral-900 dark:text-white">
          {productName}
        </h4>

        {/* Delete button - always visible */}
        <button
          type="button"
          onClick={() => onRemove(item.productId)}
          className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-900/20"
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Row 2: Unit price + Quantity controls + Line total */}
      <div className="flex items-center gap-2">
        {/* Unit price - can shrink but shows what it can */}
        <div className="min-w-0 flex-1">
          <span
            className="text-xs text-neutral-500 dark:text-neutral-400"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatCurrency(unitPrice)} c/u
          </span>
          {discount > 0 ? (
            <span className="ml-1 text-xs text-error-500">-{discount}%</span>
          ) : null}
        </div>

        {/* Quantity controls - never shrink */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onDecrement(item.productId)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-600 transition-colors hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
          >
            <Minus className="h-3 w-3" />
          </button>

          <span
            className="w-8 text-center text-sm font-semibold text-neutral-900 dark:text-white"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {item.quantity}
          </span>

          <button
            type="button"
            onClick={() => onIncrement(item.productId)}
            disabled={!canIncrement}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md border transition-colors active:scale-95',
              canIncrement
                ? 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                : 'cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-600'
            )}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Line total - NEVER shrink, NEVER truncate */}
        <span
          className="shrink-0 text-sm font-bold text-primary-600 dark:text-primary-400"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatCurrency(total)}
        </span>
      </div>
    </motion.div>
  );
});