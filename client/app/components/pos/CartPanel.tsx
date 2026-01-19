import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  CreditCard,
  FileText,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/Button';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import type { POSCartItem, CartTotals } from '~/lib/pos-utils';

interface CartPanelProps {
  items: POSCartItem[];
  totals: CartTotals;
  notes: string;
  isProcessing: boolean;
  canCheckout: boolean;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onClearCart: () => void;
  onSetNotes: (notes: string) => void;
  onCheckout: (status: 'PENDING' | 'PAID') => void;
  className?: string;
}

export function CartPanel({
  items,
  totals,
  notes,
  isProcessing,
  canCheckout,
  onUpdateQuantity,
  onIncrement,
  onDecrement,
  onRemove,
  onClearCart,
  onSetNotes,
  onCheckout,
  className,
}: CartPanelProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearCart = () => {
    if (showClearConfirm) {
      onClearCart();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
      // Auto-dismiss after 3 seconds
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h2 className="font-semibold text-neutral-900 dark:text-white">
            Carrito
          </h2>
          {items.length > 0 && (
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              {totals.itemCount}
            </span>
          )}
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={handleClearCart}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
              showClearConfirm
                ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-300'
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {showClearConfirm ? 'Confirmar' : 'Limpiar'}
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex h-full flex-col items-center justify-center py-12 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
                <ShoppingCart className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="mt-4 font-medium text-neutral-900 dark:text-white">
                Carrito vacio
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                Selecciona productos para agregar al carrito
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onIncrement={onIncrement}
                  onDecrement={onDecrement}
                  onRemove={onRemove}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Notes Section (collapsible) */}
      {items.length > 0 && (
        <div className="border-t border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-700/50"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notas
              {notes && (
                <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-xs text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  1
                </span>
              )}
            </span>
            {showNotes ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4">
                  <textarea
                    value={notes}
                    onChange={(e) => onSetNotes(e.target.value)}
                    placeholder="Agregar notas a la factura..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Summary & Actions */}
      {items.length > 0 && (
        <div className="border-t border-neutral-200 p-4 dark:border-neutral-700">
          {/* Summary */}
          <CartSummary totals={totals} className="mb-4" />

          {/* Actions */}
          <div className="space-y-2">
            {/* Checkout - Create Invoice as PAID */}
            <Button
              type="button"
              onClick={() => onCheckout('PAID')}
              disabled={!canCheckout || isProcessing}
              isLoading={isProcessing}
              className="w-full"
              size="lg"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Cobrar (F4)
            </Button>

            {/* Save as Draft */}
            <Button
              type="button"
              variant="outline"
              onClick={() => onCheckout('PENDING')}
              disabled={!canCheckout || isProcessing}
              className="w-full"
              size="lg"
            >
              <FileText className="mr-2 h-5 w-5" />
              Guardar Pendiente (F8)
            </Button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-neutral-400">
            <span>F2: Buscar</span>
            <span className="text-neutral-300 dark:text-neutral-600">|</span>
            <span>F9: Limpiar</span>
            <span className="text-neutral-300 dark:text-neutral-600">|</span>
            <span>F11: Pantalla</span>
          </div>
        </div>
      )}
    </div>
  );
}