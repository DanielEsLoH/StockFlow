/**
 * POS-specific utility functions
 */

import type { Product } from "~/types/product";

// Default Colombia VAT rate (used as fallback when product has no taxRate)
export const COLOMBIA_VAT_RATE = 19;

// Stock threshold for low stock warning
export const LOW_STOCK_THRESHOLD = 10;

/**
 * Cart item interface for POS
 */
export interface POSCartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
}

/**
 * Cart totals interface
 */
export interface CartTotals {
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

/**
 * Calculate line item totals
 */
export function calculateLineItemTotals(item: POSCartItem): {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
} {
  const subtotal = item.quantity * item.unitPrice;
  const discountAmount = subtotal * (item.discount / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (item.tax / 100);
  const total = taxableAmount + taxAmount;
  return { subtotal, discountAmount, taxAmount, total };
}

/**
 * Calculate cart totals from items
 * @param items - Cart items
 * @param globalDiscount - Optional global discount percentage (0-100)
 */
export function calculateCartTotals(
  items: POSCartItem[],
  globalDiscount: number = 0,
): CartTotals {
  // First calculate item-level totals (before global discount)
  const itemTotals = items.reduce(
    (acc, item) => {
      const { subtotal, discountAmount, taxAmount, total } =
        calculateLineItemTotals(item);
      return {
        itemCount: acc.itemCount + item.quantity,
        subtotal: acc.subtotal + subtotal,
        itemDiscountAmount: acc.itemDiscountAmount + discountAmount,
        taxAmount: acc.taxAmount + taxAmount,
        total: acc.total + total,
      };
    },
    {
      itemCount: 0,
      subtotal: 0,
      itemDiscountAmount: 0,
      taxAmount: 0,
      total: 0,
    },
  );

  // Apply global discount to the total after item discounts
  const clampedGlobalDiscount = Math.max(0, Math.min(100, globalDiscount));
  const globalDiscountAmount = itemTotals.total * (clampedGlobalDiscount / 100);
  const finalTotal = itemTotals.total - globalDiscountAmount;

  return {
    itemCount: itemTotals.itemCount,
    subtotal: itemTotals.subtotal,
    discountAmount: itemTotals.itemDiscountAmount + globalDiscountAmount,
    taxAmount: itemTotals.taxAmount,
    total: finalTotal,
  };
}

/**
 * Get stock status color
 */
export function getStockStatusColor(
  quantity: number,
  minStock: number,
): {
  color: "green" | "yellow" | "red";
  label: string;
} {
  if (quantity <= 0) {
    return { color: "red", label: "Sin stock" };
  }
  if (quantity <= minStock || quantity <= LOW_STOCK_THRESHOLD) {
    return { color: "yellow", label: "Stock bajo" };
  }
  return { color: "green", label: "Disponible" };
}

/**
 * Check if product can be added to cart
 */
export function canAddToCart(
  product: Product,
  currentCartQuantity: number = 0,
  requestedQuantity: number = 1,
): { canAdd: boolean; reason?: string } {
  if (product.status !== "ACTIVE") {
    return { canAdd: false, reason: "Producto no disponible" };
  }

  const totalRequested = currentCartQuantity + requestedQuantity;
  if (totalRequested > product.stock) {
    return {
      canAdd: false,
      reason: `Solo hay ${product.stock} unidades disponibles`,
    };
  }

  return { canAdd: true };
}

/**
 * Create a new cart item from product.
 * Tax rate always comes from the product's taxRate (derived from taxCategory).
 */
export function createCartItem(
  product: Product,
  quantity: number = 1,
): POSCartItem {
  return {
    id: `cart-${product.id}-${Date.now()}`,
    productId: product.id,
    product,
    quantity,
    unitPrice: product.salePrice,
    discount: 0,
    tax: product.taxRate ?? COLOMBIA_VAT_RATE,
  };
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get date N days from now
 */
export function getDateFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

/**
 * Filter products by search query
 */
export function filterProductsBySearch(
  products: Product[],
  query: string,
): Product[] {
  if (!query.trim()) return products;

  const lowerQuery = query.toLowerCase().trim();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.sku.toLowerCase().includes(lowerQuery) ||
      p.barcode?.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Filter products by category
 */
export function filterProductsByCategory(
  products: Product[],
  categoryId: string | null,
): Product[] {
  if (!categoryId) return products;
  return products.filter((p) => p.categoryId === categoryId);
}

/**
 * Sort products for POS display (in stock first, then by name)
 */
export function sortProductsForPOS(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    // Active products first
    if (a.status !== b.status) {
      return a.status === "ACTIVE" ? -1 : 1;
    }
    // In stock first
    if (a.stock > 0 !== b.stock > 0) {
      return a.stock > 0 ? -1 : 1;
    }
    // Then by name
    return a.name.localeCompare(b.name);
  });
}
