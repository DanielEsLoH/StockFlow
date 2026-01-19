import { memo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '~/lib/utils';
import type { CartTotals } from '~/lib/pos-utils';

interface CartSummaryProps {
  totals: CartTotals;
  className?: string;
}

// Animated number component for smooth value transitions
function AnimatedNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isIncreasing, setIsIncreasing] = useState(false);
  const previousValue = useRef(value);

  useEffect(() => {
    setIsIncreasing(value > previousValue.current);
    previousValue.current = value;

    // Animate to new value
    const duration = 300;
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;

      setDisplayValue(Math.round(current));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.5, y: isIncreasing ? 10 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {formatCurrency(displayValue)}
    </motion.span>
  );
}

export const CartSummary = memo(function CartSummary({
  totals,
  className,
}: CartSummaryProps) {
  return (
    <div className={className}>
      {/* Item count */}
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-neutral-500 dark:text-neutral-400">
          Items en carrito
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={totals.itemCount}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="font-medium text-neutral-900 dark:text-white"
          >
            {totals.itemCount}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Subtotal */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500 dark:text-neutral-400">Subtotal</span>
        <AnimatedNumber
          value={totals.subtotal}
          className="text-neutral-900 dark:text-white"
        />
      </div>

      {/* Discount */}
      {totals.discountAmount > 0 && (
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">
            Descuento
          </span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-error-500"
          >
            -{formatCurrency(totals.discountAmount)}
          </motion.span>
        </div>
      )}

      {/* Tax */}
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="text-neutral-500 dark:text-neutral-400">
          IVA (19%)
        </span>
        <AnimatedNumber
          value={totals.taxAmount}
          className="text-neutral-900 dark:text-white"
        />
      </div>

      {/* Divider */}
      <div className="my-3 border-t border-neutral-200 dark:border-neutral-700" />

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-neutral-900 dark:text-white">
          Total
        </span>
        <motion.div
          key={totals.total}
          initial={{ scale: 1.05, color: '#10b981' }}
          animate={{ scale: 1, color: 'inherit' }}
          transition={{ duration: 0.3 }}
        >
          <AnimatedNumber
            value={totals.total}
            className="text-2xl font-bold text-neutral-900 dark:text-white"
          />
        </motion.div>
      </div>
    </div>
  );
});