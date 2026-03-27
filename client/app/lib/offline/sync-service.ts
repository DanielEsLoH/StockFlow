import { offlineDb } from "./db";
import type {
  OfflineProduct,
  OfflineCustomer,
  OfflineWarehouse,
  OfflineTenantConfig,
} from "./schemas";
import { useNetworkStore } from "~/stores/network.store";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/** Max age before a table is considered stale and needs re-sync */
const DEFAULT_STALE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * API response types for offline bundles
 */
interface BundleResponse<T> {
  data: T[];
  syncTimestamp: string;
  totalCount: number;
}

interface TenantConfigResponse {
  data: OfflineTenantConfig;
  syncTimestamp: string;
}

/**
 * Gets the auth token from localStorage for API requests.
 * Matches the pattern from lib/api.ts.
 */
function getAuthToken(): string | null {
  try {
    const storage = localStorage.getItem("refreshToken")
      ? localStorage
      : sessionStorage;
    // The access token is stored in memory by the auth interceptor,
    // but for offline sync we need to read it from the auth store
    const authData = localStorage.getItem("auth-storage");
    if (!authData) return null;
    const parsed = JSON.parse(authData) as {
      state?: { accessToken?: string };
    };
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Makes an authenticated fetch request to the API.
 */
async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Syncs products from the server to IndexedDB.
 */
export async function syncProducts(
  tenantId: string,
  signal?: AbortSignal,
): Promise<number> {
  const response = await apiFetch<BundleResponse<OfflineProduct>>(
    `/products/offline-bundle`,
    signal,
  );

  await offlineDb.transaction("rw", offlineDb.products, async () => {
    // Clear old products for this tenant and bulk insert new ones
    await offlineDb.products.where("tenantId").equals(tenantId).delete();
    await offlineDb.products.bulkPut(response.data);
  });

  // Update sync metadata
  await offlineDb.syncMeta.put({
    key: `products:${tenantId}`,
    lastSyncAt: Date.now(),
    recordCount: response.totalCount,
  });

  return response.totalCount;
}

/**
 * Syncs customers from the server to IndexedDB.
 */
export async function syncCustomers(
  tenantId: string,
  signal?: AbortSignal,
): Promise<number> {
  const response = await apiFetch<BundleResponse<OfflineCustomer>>(
    `/customers/offline-bundle`,
    signal,
  );

  await offlineDb.transaction("rw", offlineDb.customers, async () => {
    await offlineDb.customers.where("tenantId").equals(tenantId).delete();
    await offlineDb.customers.bulkPut(response.data);
  });

  await offlineDb.syncMeta.put({
    key: `customers:${tenantId}`,
    lastSyncAt: Date.now(),
    recordCount: response.totalCount,
  });

  return response.totalCount;
}

/**
 * Syncs warehouses from the server to IndexedDB.
 */
export async function syncWarehouses(
  tenantId: string,
  signal?: AbortSignal,
): Promise<number> {
  const response = await apiFetch<BundleResponse<OfflineWarehouse>>(
    `/warehouses/offline-bundle`,
    signal,
  );

  await offlineDb.transaction("rw", offlineDb.warehouses, async () => {
    await offlineDb.warehouses.where("tenantId").equals(tenantId).delete();
    await offlineDb.warehouses.bulkPut(response.data);
  });

  await offlineDb.syncMeta.put({
    key: `warehouses:${tenantId}`,
    lastSyncAt: Date.now(),
    recordCount: response.totalCount,
  });

  return response.totalCount;
}

/**
 * Syncs tenant configuration from the server to IndexedDB.
 */
export async function syncTenantConfig(
  tenantId: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await apiFetch<TenantConfigResponse>(
    `/auth/tenant/offline-config`,
    signal,
  );

  await offlineDb.tenantConfig.put(response.data);

  await offlineDb.syncMeta.put({
    key: `tenantConfig:${tenantId}`,
    lastSyncAt: Date.now(),
    recordCount: 1,
  });
}

/**
 * Syncs all offline data: products, customers, warehouses, tenant config.
 * Uses Promise.all for parallel execution (async-parallel best practice).
 */
export async function syncAll(
  tenantId: string,
  signal?: AbortSignal,
): Promise<{
  products: number;
  customers: number;
  warehouses: number;
}> {
  // async-parallel: run all syncs in parallel since they're independent
  const [products, customers, warehouses] = await Promise.all([
    syncProducts(tenantId, signal),
    syncCustomers(tenantId, signal),
    syncWarehouses(tenantId, signal),
    syncTenantConfig(tenantId, signal),
  ]);

  // Update network store with sync timestamp
  useNetworkStore.getState().setLastSyncAt(Date.now());

  return { products, customers, warehouses };
}

/**
 * Gets the timestamp of the last sync for a given table.
 */
export async function getLastSyncTime(
  table: string,
  tenantId: string,
): Promise<number | null> {
  const meta = await offlineDb.syncMeta.get(`${table}:${tenantId}`);
  return meta?.lastSyncAt ?? null;
}

/**
 * Checks if a table needs to be re-synced based on staleness.
 */
export async function needsSync(
  table: string,
  tenantId: string,
  maxAgeMs = DEFAULT_STALE_MS,
): Promise<boolean> {
  const lastSync = await getLastSyncTime(table, tenantId);
  if (lastSync === null) return true; // Never synced
  return Date.now() - lastSync > maxAgeMs;
}

/**
 * Clears all offline data for a tenant.
 */
export async function clearOfflineData(tenantId: string): Promise<void> {
  await Promise.all([
    offlineDb.products.where("tenantId").equals(tenantId).delete(),
    offlineDb.customers.where("tenantId").equals(tenantId).delete(),
    offlineDb.warehouses.where("tenantId").equals(tenantId).delete(),
    offlineDb.tenantConfig.delete(tenantId),
    offlineDb.syncMeta
      .where("key")
      .startsWithIgnoreCase(`products:${tenantId}`)
      .delete(),
    offlineDb.syncMeta
      .where("key")
      .startsWithIgnoreCase(`customers:${tenantId}`)
      .delete(),
    offlineDb.syncMeta
      .where("key")
      .startsWithIgnoreCase(`warehouses:${tenantId}`)
      .delete(),
    offlineDb.syncMeta
      .where("key")
      .startsWithIgnoreCase(`tenantConfig:${tenantId}`)
      .delete(),
  ]);
}
