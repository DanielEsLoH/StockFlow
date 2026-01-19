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

export const CartItem = memo(function CartItem({
  item,
  onUpdateQuantity,
  onIncrement,
  onDecrement,
  onRemove,
}: CartItemProps) {
  const { subtotal, total } = calculateLineItemTotals(item);
  const maxQuantity = item.product.quantity;
  const canIncrement = item.quantity < maxQuantity;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800"
    >
      {/* Delete Button */}
      <button
        type="button"
        onClick={() => onRemove(item.productId)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-900/20"
        title="Eliminar"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Product Info */}
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium text-neutral-900 dark:text-white">
          {item.product.name}
        </h4>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
          <span>{formatCurrency(item.unitPrice)} c/u</span>
          <span className="text-neutral-300 dark:text-neutral-600">|</span>
          <span
            className={cn(
              maxQuantity <= 5 ? 'text-warning-500' : 'text-neutral-500'
            )}
          >
            {maxQuantity} disp.
          </span>
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onDecrement(item.productId)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600 transition-colors hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
        >
          <Minus className="h-4 w-4" />
        </button>

        <input
          type="number"
          value={item.quantity}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            if (!isNaN(value) && value >= 0) {
              onUpdateQuantity(item.productId, Math.min(value, maxQuantity));
            }
          }}
          min={1}
          max={maxQuantity}
          className="h-9 w-14 rounded-lg border border-neutral-200 bg-white text-center text-sm font-medium text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
        />

        <button
          type="button"
          onClick={() => onIncrement(item.productId)}
          disabled={!canIncrement}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors active:scale-95',
            canIncrement
              ? 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'
              : 'cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-600'
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Subtotal */}
      <div className="w-24 shrink-0 text-right">
        <p className="text-sm font-semibold text-neutral-900 dark:text-white">
          {formatCurrency(total)}
        </p>
        {item.discount > 0 && (
          <p className="text-xs text-error-500">-{item.discount}%</p>
        )}
      </div>
    </motion.div>
  );
});