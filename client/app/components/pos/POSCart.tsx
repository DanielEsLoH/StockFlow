import { useState, useCallback, useMemo } from 'react';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
  Percent,
} from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Card } from '~/components/ui/Card';
import { Input } from '~/components/ui/Input';
import { formatCurrency } from '~/lib/utils';
import type { CartItem } from '~/types/pos';

interface POSCartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  globalDiscount: number;
  onGlobalDiscountChange: (discount: number) => void;
  isProcessing?: boolean;
}

export function POSCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  globalDiscount,
  onGlobalDiscountChange,
  isProcessing = false,
}: POSCartProps) {
  const [showDiscount, setShowDiscount] = useState(false);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxBeforeDiscount = items.reduce((sum, item) => sum + item.tax, 0);
    const globalDiscountAmount = subtotal * (globalDiscount / 100);
    const subtotalAfterDiscount = subtotal - globalDiscountAmount;
    // Recalculate tax after global discount (proportional)
    const taxAfterDiscount =
      taxBeforeDiscount * (subtotalAfterDiscount / subtotal) || 0;
    const total = subtotalAfterDiscount + taxAfterDiscount;

    return {
      subtotal,
      tax: taxAfterDiscount,
      discount: globalDiscountAmount,
      total,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [items, globalDiscount]);

  const handleQuantityChange = useCallback(
    (productId: string, delta: number) => {
      const item = items.find((i) => i.productId === productId);
      if (item) {
        const newQuantity = Math.max(0, item.quantity + delta);
        if (newQuantity === 0) {
          onRemoveItem(productId);
        } else if (newQuantity <= item.maxStock) {
          onUpdateQuantity(productId, newQuantity);
        }
      }
    },
    [items, onUpdateQuantity, onRemoveItem]
  );

  if (items.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrito
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
          <div className="text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>El carrito esta vacio</p>
            <p className="text-sm mt-1">Busca o escanea productos</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Carrito ({totals.itemCount})
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearCart}
          className="text-error-500 hover:text-error-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-neutral-900 dark:text-white truncate">
                {item.productName}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {item.productSku} - {formatCurrency(item.unitPrice)}
              </p>
              {item.discountPercent > 0 && (
                <p className="text-xs text-success-600">
                  -{item.discountPercent}% descuento
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleQuantityChange(item.productId, -1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">
                {item.quantity}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleQuantityChange(item.productId, 1)}
                disabled={item.quantity >= item.maxStock}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-right min-w-[80px]">
              <p className="font-medium text-neutral-900 dark:text-white">
                {formatCurrency(item.total)}
              </p>
              <button
                onClick={() => onRemoveItem(item.productId)}
                className="text-xs text-error-500 hover:text-error-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 space-y-3">
        {/* Global Discount */}
        {showDiscount ? (
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-neutral-500" />
            <Input
              type="number"
              min="0"
              max="100"
              value={globalDiscount}
              onChange={(e) =>
                onGlobalDiscountChange(
                  Math.min(100, Math.max(0, Number(e.target.value)))
                )
              }
              className="w-20"
              placeholder="0"
            />
            <span className="text-sm text-neutral-500">% descuento global</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowDiscount(false);
                onGlobalDiscountChange(0);
              }}
            >
              Quitar
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowDiscount(true)}
            className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
          >
            <Percent className="h-4 w-4" />
            Agregar descuento
          </button>
        )}

        {/* Subtotals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-success-600">
              <span>Descuento ({globalDiscount}%)</span>
              <span>-{formatCurrency(totals.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-neutral-500">IVA</span>
            <span>{formatCurrency(totals.tax)}</span>
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-3 border-t border-neutral-200 dark:border-neutral-700">
          <span className="text-lg font-bold">Total</span>
          <span className="text-2xl font-bold text-primary-600">
            {formatCurrency(totals.total)}
          </span>
        </div>

        {/* Checkout Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={onCheckout}
          disabled={isProcessing || items.length === 0}
        >
          <CreditCard className="h-5 w-5 mr-2" />
          {isProcessing ? 'Procesando...' : 'Cobrar (F4)'}
        </Button>
      </div>
    </Card>
  );
}
