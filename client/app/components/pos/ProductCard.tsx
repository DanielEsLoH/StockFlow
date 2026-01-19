import { memo } from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, XCircle } from 'lucide-react';
import { cn, formatCurrency, truncate } from '~/lib/utils';
import { getStockStatusColor } from '~/lib/pos-utils';
import type { Product } from '~/types/product';

interface ProductCardProps {
  product: Product;
  cartQuantity: number;
  onAddToCart: (product: Product) => void;
  disabled?: boolean;
}

export const ProductCard = memo(function ProductCard({
  product,
  cartQuantity,
  onAddToCart,
  disabled = false,
}: ProductCardProps) {
  const stockStatus = getStockStatusColor(product.quantity, product.minStock);
  const isOutOfStock = product.quantity <= 0;
  const isInactive = product.status !== 'ACTIVE';
  const isDisabled = disabled || isOutOfStock || isInactive;

  const handleClick = () => {
    if (!isDisabled) {
      onAddToCart(product);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      whileTap={!isDisabled ? { scale: 0.97 } : undefined}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl border p-4 text-left transition-all',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        isDisabled
          ? 'cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-60 dark:border-neutral-800 dark:bg-neutral-900/50'
          : 'border-neutral-200 bg-white hover:border-primary-300 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-600'
      )}
    >
      {/* Cart quantity badge */}
      {cartQuantity > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white shadow-lg"
        >
          {cartQuantity}
        </motion.div>
      )}

      {/* Product Image/Icon */}
      <div
        className={cn(
          'mb-3 flex h-16 w-full items-center justify-center rounded-xl',
          isDisabled
            ? 'bg-neutral-100 dark:bg-neutral-800'
            : 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20'
        )}
      >
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <Package
            className={cn(
              'h-8 w-8',
              isDisabled
                ? 'text-neutral-400 dark:text-neutral-600'
                : 'text-primary-500 dark:text-primary-400'
            )}
          />
        )}
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col">
        {/* Name */}
        <h3
          className={cn(
            'line-clamp-2 text-sm font-semibold leading-tight',
            isDisabled
              ? 'text-neutral-500 dark:text-neutral-500'
              : 'text-neutral-900 dark:text-white'
          )}
          title={product.name}
        >
          {truncate(product.name, 40)}
        </h3>

        {/* SKU */}
        <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
          {product.sku}
        </p>

        {/* Price */}
        <p
          className={cn(
            'mt-2 text-lg font-bold',
            isDisabled
              ? 'text-neutral-500 dark:text-neutral-500'
              : 'text-neutral-900 dark:text-white'
          )}
        >
          {formatCurrency(product.price)}
        </p>

        {/* Stock Indicator */}
        <div className="mt-2 flex items-center gap-1.5">
          {stockStatus.color === 'green' && (
            <span className="h-2 w-2 rounded-full bg-success-500" />
          )}
          {stockStatus.color === 'yellow' && (
            <AlertTriangle className="h-3.5 w-3.5 text-warning-500" />
          )}
          {stockStatus.color === 'red' && (
            <XCircle className="h-3.5 w-3.5 text-error-500" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              stockStatus.color === 'green' &&
                'text-success-600 dark:text-success-400',
              stockStatus.color === 'yellow' &&
                'text-warning-600 dark:text-warning-400',
              stockStatus.color === 'red' && 'text-error-600 dark:text-error-400'
            )}
          >
            {isOutOfStock
              ? 'Sin stock'
              : `${product.quantity} disponibles`}
          </span>
        </div>
      </div>

      {/* Inactive overlay */}
      {isInactive && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/10 dark:bg-neutral-900/30">
          <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-medium text-white">
            No disponible
          </span>
        </div>
      )}
    </motion.button>
  );
});