import { memo } from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle, XCircle } from "lucide-react";
import { cn, formatCurrency, truncate } from "~/lib/utils";
import { getStockStatusColor } from "~/lib/pos-utils";
import type { Product } from "~/types/product";

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
  const stockStatus = getStockStatusColor(product.stock, product.minStock);
  const isOutOfStock = product.stock <= 0;
  const isInactive = product.status !== "ACTIVE";
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
        // Base styles - mobile-first with compact padding
        // min-w-0 is CRUCIAL for flex/grid children to allow shrinking below content size
        // w-full ensures card takes full grid cell width
        "relative flex w-full min-w-0 flex-col rounded-xl border text-left transition-all",
        // Padding: compact on mobile (p-2), normal on sm+ (p-3)
        "p-2 sm:p-3",
        // Touch-friendly minimum height for tap targets (44px+ effective)
        "min-h-[140px] sm:min-h-[180px]",
        "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
        isDisabled
          ? "cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-60 dark:border-neutral-800 dark:bg-neutral-900/50"
          : "border-neutral-200 bg-white hover:border-primary-300 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-600",
      )}
    >
      {/* Cart quantity badge */}
      {cartQuantity > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-1 -top-1 z-10 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary-600 text-[10px] sm:text-xs font-bold text-white shadow-lg"
        >
          {cartQuantity}
        </motion.div>
      )}

      {/* Product Image/Icon - smaller on mobile */}
      <div
        className={cn(
          // Height: h-10 on mobile, h-14 on sm+
          "mb-2 sm:mb-3 flex h-10 sm:h-14 w-full items-center justify-center rounded-lg sm:rounded-xl",
          isDisabled
            ? "bg-neutral-100 dark:bg-neutral-800"
            : "bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20",
        )}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-md sm:rounded-lg object-cover"
          />
        ) : (
          <Package
            className={cn(
              "h-5 w-5 sm:h-7 sm:w-7",
              isDisabled
                ? "text-neutral-400 dark:text-neutral-600"
                : "text-primary-500 dark:text-primary-400",
            )}
          />
        )}
      </div>

      {/* Product Info - min-w-0 allows text to shrink and truncate properly */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Name - smaller line-clamp on mobile */}
        <h3
          className={cn(
            "line-clamp-2 text-xs sm:text-sm font-semibold leading-tight",
            isDisabled
              ? "text-neutral-500 dark:text-neutral-500"
              : "text-neutral-900 dark:text-white",
          )}
          title={product.name}
        >
          {truncate(product.name, 40)}
        </h3>

        {/* SKU - hidden on very small screens, visible on sm+ */}
        <p className="mt-0.5 text-[10px] sm:text-xs text-neutral-400 dark:text-neutral-500 truncate">
          {product.sku}
        </p>

        {/* Price - NEVER truncate prices, use smaller font on mobile instead */}
        <p
          className={cn(
            // shrink-0 prevents price from being compressed
            // text-sm on mobile, text-base on sm, text-lg on larger screens
            "mt-1.5 sm:mt-2 shrink-0 text-sm font-bold sm:text-base lg:text-lg",
            isDisabled
              ? "text-neutral-500 dark:text-neutral-500"
              : "text-neutral-900 dark:text-white",
          )}
        >
          {formatCurrency(product.salePrice)}
        </p>

        {/* Stock Indicator - compact on mobile */}
        <div className="mt-1 sm:mt-2 flex items-center gap-1">
          {stockStatus.color === "green" && (
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-success-500" />
          )}
          {stockStatus.color === "yellow" && (
            <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-warning-500" />
          )}
          {stockStatus.color === "red" && (
            <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-error-500" />
          )}
          <span
            className={cn(
              "text-[10px] sm:text-xs font-medium truncate",
              stockStatus.color === "green" &&
                "text-success-600 dark:text-success-400",
              stockStatus.color === "yellow" &&
                "text-warning-600 dark:text-warning-400",
              stockStatus.color === "red" &&
                "text-error-600 dark:text-error-400",
            )}
          >
            {isOutOfStock ? "Sin stock" : `${product.stock} disp.`}
          </span>
        </div>
      </div>

      {/* Inactive overlay */}
      {isInactive && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/10 dark:bg-neutral-900/30">
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-medium text-white">
            No disponible
          </span>
        </div>
      )}
    </motion.button>
  );
});
