import type { OfflineInvoice, OfflineInvoiceItem, OfflineProduct } from "./schemas";
import { getNextNumber } from "./number-pool";

/**
 * Creates an offline invoice with all calculations done locally.
 *
 * This is a pure function that computes subtotals, taxes, discounts,
 * and totals using locally cached product data.
 */

interface CreateOfflineInvoiceInput {
  tenantId: string;
  customerId: string | null;
  customerName: string | null;
  source: "MANUAL" | "POS";
  warehouseId: string | null;
  notes: string | null;
  currency: string;
  items: Array<{
    product: OfflineProduct;
    quantity: number;
    discount: number; // percentage
  }>;
}

/**
 * Calculates invoice item totals from product data.
 */
function calculateItem(
  product: OfflineProduct,
  quantity: number,
  discountPercent: number,
): OfflineInvoiceItem {
  const unitPrice = product.salePrice;
  const subtotalBeforeDiscount = unitPrice * quantity;
  const discount = subtotalBeforeDiscount * (discountPercent / 100);
  const subtotal = subtotalBeforeDiscount - discount;
  const taxRate = product.taxRate;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  return {
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    quantity,
    unitPrice,
    taxRate,
    taxCategory: product.taxCategory,
    discount,
    subtotal,
    tax,
    total,
  };
}

/**
 * Creates a complete offline invoice ready to be queued.
 *
 * @returns The invoice object, or null if no numbers are available
 */
export function createOfflineInvoice(
  input: CreateOfflineInvoiceInput,
): OfflineInvoice | null {
  // Get a pre-assigned invoice number
  const invoiceNumber = getNextNumber();
  if (!invoiceNumber) {
    return null; // No numbers available — cannot create offline
  }

  // Calculate all items
  const items = input.items.map((item) =>
    calculateItem(item.product, item.quantity, item.discount),
  );

  // Calculate invoice totals
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = items.reduce((sum, item) => sum + item.tax, 0);
  const discount = items.reduce((sum, item) => sum + item.discount, 0);
  const total = items.reduce((sum, item) => sum + item.total, 0);

  const invoice: OfflineInvoice = {
    localId: crypto.randomUUID(),
    tenantId: input.tenantId,
    customerId: input.customerId,
    customerName: input.customerName,
    invoiceNumber,
    source: input.source,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency: input.currency,
    warehouseId: input.warehouseId,
    notes: input.notes,
    syncStatus: "pending",
    serverInvoiceId: null,
    conflictDetails: null,
    createdAt: new Date().toISOString(),
    syncedAt: null,
  };

  return invoice;
}
