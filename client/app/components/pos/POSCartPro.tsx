import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  User,
  Pencil,
  CreditCard,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Percent,
  X,
} from 'lucide-react';
import { cn, formatCurrency } from '~/lib/utils';
import { calculateLineItemTotals, type POSCartItem, type CartTotals } from '~/lib/pos-utils';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import type { Customer } from '~/types/customer';

// ============================================================================
// TYPES
// ============================================================================

interface POSCartProProps {
  items: POSCartItem[];
  totals: CartTotals;
  notes: string;
  isProcessing: boolean;
  canCheckout: boolean;
  customer?: Customer | null;
  globalDiscount: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdatePrice: (productId: string, price: number) => void;
  onUpdateItemDiscount: (productId: string, discount: number) => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onClearCart: () => void;
  onSetNotes: (notes: string) => void;
  onSetGlobalDiscount: (discount: number) => void;
  onSelectCustomer: () => void;
  onCheckout: (status: 'PENDING' | 'PAID') => void;
  className?: string;
}

// ============================================================================
// CART ITEM ROW COMPONENT
// ============================================================================

interface CartItemRowProps {
  item: POSCartItem;
  index: number;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onUpdatePrice: (productId: string, price: number) => void;
  onUpdateDiscount: (productId: string, discount: number) => void;
}

const CartItemRow = memo(function CartItemRow({
  item,
  index,
  onIncrement,
  onDecrement,
  onRemove,
  onUpdatePrice,
  onUpdateDiscount,
}: CartItemRowProps) {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [tempPrice, setTempPrice] = useState(item.unitPrice.toString());
  const [tempDiscount, setTempDiscount] = useState(item.discount.toString());

  const lineItemTotals = calculateLineItemTotals(item);
  const total = lineItemTotals?.total ?? 0;
  const maxQuantity = item.product?.stock ?? 0;
  const canIncrement = item.quantity < maxQuantity;

  const handlePriceSubmit = () => {
    const newPrice = parseFloat(tempPrice);
    if (!isNaN(newPrice) && newPrice >= 0) {
      onUpdatePrice(item.productId, newPrice);
    } else {
      setTempPrice(item.unitPrice.toString());
    }
    setIsEditingPrice(false);
  };

  const handleDiscountSubmit = () => {
    const newDiscount = parseFloat(tempDiscount);
    if (!isNaN(newDiscount) && newDiscount >= 0 && newDiscount <= 100) {
      onUpdateDiscount(item.productId, newDiscount);
    } else {
      setTempDiscount(item.discount.toString());
    }
    setIsEditingDiscount(false);
  };

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="border-b border-neutral-100 dark:border-neutral-700/50 last:border-0"
    >
      {/* Index */}
      <td className="py-2 pr-2 text-center text-xs text-neutral-400 w-6">
        {index + 1}
      </td>

      {/* Product */}
      <td className="py-2 pr-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-1">
            {item.product?.name ?? 'Producto'}
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {item.product?.sku}
          </p>
        </div>
      </td>

      {/* Quantity */}
      <td className="py-2 px-1">
        <div className="flex items-center justify-center gap-0.5">
          <button
            type="button"
            onClick={() => onDecrement(item.productId)}
            className="flex h-6 w-6 items-center justify-center rounded border border-neutral-200 bg-neutral-50 text-neutral-600 transition-colors hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span
            className="w-7 text-center text-sm font-semibold text-neutral-900 dark:text-white"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onIncrement(item.productId)}
            disabled={!canIncrement}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded border transition-colors active:scale-95',
              canIncrement
                ? 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                : 'cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-600'
            )}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </td>

      {/* Unit Price */}
      <td className="py-2 px-1 text-right">
        {isEditingPrice ? (
          <input
            type="number"
            value={tempPrice}
            onChange={(e) => setTempPrice(e.target.value)}
            onBlur={handlePriceSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handlePriceSubmit()}
            className="w-20 rounded border border-primary-400 bg-white px-1 py-0.5 text-right text-xs dark:bg-neutral-800"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTempPrice(item.unitPrice.toString());
              setIsEditingPrice(true);
            }}
            className="group inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-primary-600"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatCurrency(item.unitPrice)}
            <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </td>

      {/* Total */}
      <td className="py-2 pl-2 text-right">
        <div className="flex flex-col items-end">
          <span
            className="text-sm font-bold text-primary-600 dark:text-primary-400"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatCurrency(total)}
          </span>
          {/* Item discount */}
          {isEditingDiscount ? (
            <div className="flex items-center gap-0.5 mt-0.5">
              <input
                type="number"
                value={tempDiscount}
                onChange={(e) => setTempDiscount(e.target.value)}
                onBlur={handleDiscountSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleDiscountSubmit()}
                className="w-10 rounded border border-primary-400 bg-white px-1 py-0.5 text-right text-xs dark:bg-neutral-800"
                autoFocus
                min={0}
                max={100}
              />
              <span className="text-xs text-neutral-400">%</span>
            </div>
          ) : item.discount > 0 ? (
            <button
              type="button"
              onClick={() => {
                setTempDiscount(item.discount.toString());
                setIsEditingDiscount(true);
              }}
              className="text-xs text-error-500 hover:underline"
            >
              -{item.discount}%
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTempDiscount('0');
                setIsEditingDiscount(true);
              }}
              className="text-xs text-neutral-400 hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              +desc
            </button>
          )}
        </div>
      </td>

      {/* Delete */}
      <td className="py-2 pl-1 w-6">
        <button
          type="button"
          onClick={() => onRemove(item.productId)}
          className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-900/20"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </td>
    </motion.tr>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function POSCartPro({
  items,
  totals,
  notes,
  isProcessing,
  canCheckout,
  customer,
  globalDiscount,
  onUpdateQuantity,
  onUpdatePrice,
  onUpdateItemDiscount,
  onIncrement,
  onDecrement,
  onRemove,
  onClearCart,
  onSetNotes,
  onSetGlobalDiscount,
  onSelectCustomer,
  onCheckout,
  className,
}: POSCartProProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isEditingGlobalDiscount, setIsEditingGlobalDiscount] = useState(false);
  const [tempGlobalDiscount, setTempGlobalDiscount] = useState(globalDiscount.toString());

  const handleClearCart = useCallback(() => {
    if (showClearConfirm) {
      onClearCart();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  }, [showClearConfirm, onClearCart]);

  const handleGlobalDiscountSubmit = () => {
    const newDiscount = parseFloat(tempGlobalDiscount);
    if (!isNaN(newDiscount) && newDiscount >= 0 && newDiscount <= 100) {
      onSetGlobalDiscount(newDiscount);
    } else {
      setTempGlobalDiscount(globalDiscount.toString());
    }
    setIsEditingGlobalDiscount(false);
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800',
        className
      )}
    >
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-700">
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

      {/* ================================================================== */}
      {/* CUSTOMER SECTION */}
      {/* ================================================================== */}
      <div className={cn(
        "shrink-0 border-b px-4 py-2",
        !customer && items.length > 0
          ? "border-warning-300 bg-warning-50 dark:border-warning-700 dark:bg-warning-900/20"
          : "border-neutral-100 dark:border-neutral-700/50"
      )}>
        <button
          type="button"
          onClick={onSelectCustomer}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors",
            !customer && items.length > 0
              ? "hover:bg-warning-100 dark:hover:bg-warning-900/30"
              : "hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
          )}
        >
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            !customer && items.length > 0
              ? "bg-warning-200 dark:bg-warning-800"
              : "bg-neutral-100 dark:bg-neutral-700"
          )}>
            <User className={cn(
              "h-4 w-4",
              !customer && items.length > 0
                ? "text-warning-700 dark:text-warning-300"
                : "text-neutral-500 dark:text-neutral-400"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            {customer ? (
              <>
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {customer.name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {customer.documentType}: {customer.document}
                </p>
              </>
            ) : (
              <p className={cn(
                "text-sm",
                items.length > 0
                  ? "font-medium text-warning-700 dark:text-warning-300"
                  : "text-neutral-500 dark:text-neutral-400"
              )}>
                {items.length > 0 ? "⚠️ Seleccionar cliente para facturar" : "Seleccionar cliente..."}
              </p>
            )}
          </div>
          <Pencil className={cn(
            "h-4 w-4",
            !customer && items.length > 0 ? "text-warning-600" : "text-neutral-400"
          )} />
        </button>
      </div>

      {/* ================================================================== */}
      {/* CART ITEMS TABLE */}
      {/* ================================================================== */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-12 text-center px-4"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
                <ShoppingCart className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="mt-4 font-medium text-neutral-900 dark:text-white">
                Carrito vacio
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                Selecciona productos para agregar
              </p>
            </motion.div>
          ) : (
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-800/80 backdrop-blur-sm">
                <tr className="text-xs text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="py-2 px-4 font-medium w-6">#</th>
                  <th className="py-2 font-medium">Producto</th>
                  <th className="py-2 px-1 font-medium text-center">Cant</th>
                  <th className="py-2 px-1 font-medium text-right">Precio</th>
                  <th className="py-2 px-2 font-medium text-right">Total</th>
                  <th className="py-2 w-6"></th>
                </tr>
              </thead>
              <tbody className="px-4">
                <AnimatePresence mode="popLayout">
                  {items.map((item, index) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      onIncrement={onIncrement}
                      onDecrement={onDecrement}
                      onRemove={onRemove}
                      onUpdatePrice={onUpdatePrice}
                      onUpdateDiscount={onUpdateItemDiscount}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </AnimatePresence>
      </div>

      {/* ================================================================== */}
      {/* NOTES SECTION (collapsible) */}
      {/* ================================================================== */}
      {items.length > 0 && (
        <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="flex w-full items-center justify-between px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-700/50"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notas
              {notes && (
                <span className="h-2 w-2 rounded-full bg-primary-500"></span>
              )}
            </span>
            {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                <div className="px-4 pb-3">
                  <textarea
                    value={notes}
                    onChange={(e) => onSetNotes(e.target.value)}
                    placeholder="Agregar notas..."
                    rows={2}
                    className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ================================================================== */}
      {/* TOTALS SECTION */}
      {/* ================================================================== */}
      {items.length > 0 && (
        <div className="shrink-0 border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
          {/* Subtotal */}
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-neutral-500 dark:text-neutral-400">Subtotal</span>
            <span className="font-medium text-neutral-900 dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(totals.subtotal)}
            </span>
          </div>

          {/* Global Discount */}
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
              <Percent className="h-3 w-3" />
              Descuento
            </span>
            <div className="flex items-center gap-2">
              {isEditingGlobalDiscount ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={tempGlobalDiscount}
                    onChange={(e) => setTempGlobalDiscount(e.target.value)}
                    onBlur={handleGlobalDiscountSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleGlobalDiscountSubmit()}
                    className="w-12 rounded border border-primary-400 bg-white px-1 py-0.5 text-right text-sm dark:bg-neutral-800"
                    autoFocus
                    min={0}
                    max={100}
                  />
                  <span className="text-neutral-400">%</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTempGlobalDiscount(globalDiscount.toString());
                    setIsEditingGlobalDiscount(true);
                  }}
                  className="flex items-center gap-1 text-error-500 hover:underline"
                >
                  {globalDiscount > 0 ? `-${globalDiscount}%` : '0%'}
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              {totals.discountAmount > 0 && (
                <span className="text-error-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  -{formatCurrency(totals.discountAmount)}
                </span>
              )}
            </div>
          </div>

          {/* Tax */}
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-neutral-500 dark:text-neutral-400">IVA (19%)</span>
            <span className="font-medium text-neutral-900 dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(totals.taxAmount)}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-200 dark:border-neutral-700 my-2" />

          {/* Total */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold text-neutral-900 dark:text-white">
              TOTAL
            </span>
            <span
              className="text-2xl font-bold text-primary-600 dark:text-primary-400"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatCurrency(totals.total)}
            </span>
          </div>

          {/* ================================================================== */}
          {/* ACTION BUTTONS */}
          {/* ================================================================== */}
          <div className="space-y-2">
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

            <Button
              type="button"
              variant="outline"
              onClick={() => onCheckout('PENDING')}
              disabled={!canCheckout || isProcessing}
              className="w-full"
              size="sm"
            >
              <FileText className="mr-2 h-4 w-4" />
              Guardar Pendiente (F8)
            </Button>

            {/* Warning message when checkout is disabled */}
            {!canCheckout && items.length > 0 && !customer && (
              <p className="text-center text-xs text-warning-600 dark:text-warning-400">
                Selecciona un cliente para habilitar el cobro
              </p>
            )}
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs text-neutral-400">
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
