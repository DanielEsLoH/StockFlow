import { offlineDb } from "./db";
import type { OfflineProduct, OfflineCustomer, OfflineWarehouse } from "./schemas";

/**
 * Offline data provider — reads from IndexedDB when offline.
 *
 * These functions are used as fallbacks when the API is unreachable.
 * The React Query hooks in useOfflineProducts/useOfflineCustomers
 * decide when to use these vs the normal API.
 */

/**
 * Gets all active products for a tenant from IndexedDB.
 */
export async function getOfflineProducts(
  tenantId: string,
  filters?: { search?: string; categoryId?: string; status?: string },
): Promise<OfflineProduct[]> {
  let collection = offlineDb.products
    .where("[tenantId+status]")
    .equals([tenantId, filters?.status ?? "ACTIVE"]);

  const products = await collection.toArray();

  // Apply client-side filtering for search and category
  let filtered = products;

  if (filters?.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search) ||
        (p.barcode && p.barcode.toLowerCase().includes(search)),
    );
  }

  if (filters?.categoryId) {
    filtered = filtered.filter((p) => p.categoryId === filters.categoryId);
  }

  return filtered;
}

/**
 * Gets a single product by ID from IndexedDB.
 */
export async function getOfflineProduct(
  id: string,
): Promise<OfflineProduct | undefined> {
  return offlineDb.products.get(id);
}

/**
 * Searches products by name or SKU in IndexedDB.
 */
export async function searchOfflineProducts(
  tenantId: string,
  query: string,
): Promise<OfflineProduct[]> {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();

  return offlineDb.products
    .where("tenantId")
    .equals(tenantId)
    .filter(
      (p) =>
        p.status === "ACTIVE" &&
        (p.name.toLowerCase().includes(lowerQuery) ||
          p.sku.toLowerCase().includes(lowerQuery) ||
          (p.barcode != null && p.barcode.toLowerCase().includes(lowerQuery))),
    )
    .limit(20)
    .toArray();
}

/**
 * Gets all active customers for a tenant from IndexedDB.
 */
export async function getOfflineCustomers(
  tenantId: string,
  filters?: { search?: string; status?: string },
): Promise<OfflineCustomer[]> {
  const customers = await offlineDb.customers
    .where("[tenantId+status]")
    .equals([tenantId, filters?.status ?? "ACTIVE"])
    .toArray();

  if (filters?.search) {
    const search = filters.search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.documentNumber.toLowerCase().includes(search) ||
        (c.email && c.email.toLowerCase().includes(search)) ||
        (c.phone && c.phone.includes(search)),
    );
  }

  return customers;
}

/**
 * Gets a single customer by ID from IndexedDB.
 */
export async function getOfflineCustomer(
  id: string,
): Promise<OfflineCustomer | undefined> {
  return offlineDb.customers.get(id);
}

/**
 * Searches customers by name, document, email, or phone in IndexedDB.
 */
export async function searchOfflineCustomers(
  tenantId: string,
  query: string,
): Promise<OfflineCustomer[]> {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();

  return offlineDb.customers
    .where("tenantId")
    .equals(tenantId)
    .filter(
      (c) =>
        c.status === "ACTIVE" &&
        (c.name.toLowerCase().includes(lowerQuery) ||
          c.documentNumber.toLowerCase().includes(lowerQuery) ||
          (c.email != null && c.email.toLowerCase().includes(lowerQuery)) ||
          (c.phone != null && c.phone.includes(lowerQuery))),
    )
    .limit(20)
    .toArray();
}

/**
 * Gets all active warehouses for a tenant from IndexedDB.
 */
export async function getOfflineWarehouses(
  tenantId: string,
): Promise<OfflineWarehouse[]> {
  return offlineDb.warehouses
    .where("[tenantId+status]")
    .equals([tenantId, "ACTIVE"])
    .toArray();
}

/**
 * Gets the count of offline products for a tenant.
 */
export async function getOfflineProductCount(
  tenantId: string,
): Promise<number> {
  return offlineDb.products
    .where("[tenantId+status]")
    .equals([tenantId, "ACTIVE"])
    .count();
}

/**
 * Gets the count of offline customers for a tenant.
 */
export async function getOfflineCustomerCount(
  tenantId: string,
): Promise<number> {
  return offlineDb.customers
    .where("[tenantId+status]")
    .equals([tenantId, "ACTIVE"])
    .count();
}
