import Dexie, { type EntityTable } from "dexie";
import type {
  OfflineProduct,
  OfflineCustomer,
  OfflineWarehouse,
  OfflineTenantConfig,
  SyncMeta,
  OfflineInvoice,
  SyncQueueEntry,
} from "./schemas";

/**
 * StockFlow offline database — Dexie.js wrapper for IndexedDB.
 *
 * Stores products, customers, warehouses, and tenant config for offline access.
 * Also manages the sync queue for offline-created invoices.
 *
 * Schema format: 'primaryKey, index1, index2, [compound+index]'
 * Only indexed fields are listed — all other fields are stored but not indexed.
 */
class StockFlowOfflineDB extends Dexie {
  products!: EntityTable<OfflineProduct, "id">;
  customers!: EntityTable<OfflineCustomer, "id">;
  warehouses!: EntityTable<OfflineWarehouse, "id">;
  tenantConfig!: EntityTable<OfflineTenantConfig, "tenantId">;
  syncMeta!: EntityTable<SyncMeta, "key">;
  offlineInvoices!: EntityTable<OfflineInvoice, "localId">;
  syncQueue!: EntityTable<SyncQueueEntry, "id">;

  constructor() {
    super("stockflow-offline");

    this.version(1).stores({
      products: "id, tenantId, sku, name, status, [tenantId+status]",
      customers:
        "id, tenantId, name, documentNumber, status, [tenantId+status]",
      warehouses: "id, tenantId, status, [tenantId+status]",
      tenantConfig: "tenantId",
      syncMeta: "key",
      offlineInvoices:
        "localId, tenantId, syncStatus, createdAt, [tenantId+syncStatus]",
      syncQueue: "++id, type, status, createdAt",
    });
  }
}

/** Singleton database instance */
export const offlineDb = new StockFlowOfflineDB();
