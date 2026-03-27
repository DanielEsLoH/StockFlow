import { offlineDb } from "./db";
import type { OfflineInvoice, OfflineInvoiceSyncStatus } from "./schemas";
import { useNetworkStore } from "~/stores/network.store";

/**
 * Invoice Queue — Outbox Pattern for offline invoice creation.
 *
 * Manages offline-created invoices in IndexedDB until they can be
 * synced to the server. Each invoice has a syncStatus that tracks
 * its lifecycle: pending → syncing → synced (or conflict/error).
 */

/**
 * Adds an invoice to the offline queue.
 */
export async function queueInvoice(
  invoice: Omit<OfflineInvoice, "syncStatus" | "serverInvoiceId" | "conflictDetails" | "syncedAt">,
): Promise<string> {
  const offlineInvoice: OfflineInvoice = {
    ...invoice,
    syncStatus: "pending",
    serverInvoiceId: null,
    conflictDetails: null,
    syncedAt: null,
  };

  await offlineDb.offlineInvoices.put(offlineInvoice);

  // Update pending count in network store
  const count = await getQueuedCount(invoice.tenantId);
  useNetworkStore.getState().setPendingSyncCount(count);

  return invoice.localId;
}

/**
 * Gets all queued invoices for a tenant (pending sync).
 */
export async function getQueuedInvoices(
  tenantId: string,
): Promise<OfflineInvoice[]> {
  return offlineDb.offlineInvoices
    .where("[tenantId+syncStatus]")
    .equals([tenantId, "pending"])
    .toArray();
}

/**
 * Gets all offline invoices for a tenant (all statuses).
 */
export async function getAllOfflineInvoices(
  tenantId: string,
): Promise<OfflineInvoice[]> {
  return offlineDb.offlineInvoices
    .where("tenantId")
    .equals(tenantId)
    .reverse()
    .sortBy("createdAt");
}

/**
 * Gets the count of pending invoices.
 */
export async function getQueuedCount(tenantId: string): Promise<number> {
  return offlineDb.offlineInvoices
    .where("[tenantId+syncStatus]")
    .equals([tenantId, "pending"])
    .count();
}

/**
 * Updates the sync status of an offline invoice.
 */
export async function updateSyncStatus(
  localId: string,
  status: OfflineInvoiceSyncStatus,
  extra?: {
    serverInvoiceId?: string;
    conflictDetails?: string;
    syncedAt?: string;
  },
): Promise<void> {
  await offlineDb.offlineInvoices.update(localId, {
    syncStatus: status,
    ...extra,
  });
}

/**
 * Marks an invoice as successfully synced.
 */
export async function markAsSynced(
  localId: string,
  serverInvoiceId: string,
): Promise<void> {
  await updateSyncStatus(localId, "synced", {
    serverInvoiceId,
    syncedAt: new Date().toISOString(),
  });
}

/**
 * Marks an invoice as having a conflict.
 */
export async function markAsConflict(
  localId: string,
  details: string,
): Promise<void> {
  await updateSyncStatus(localId, "conflict", {
    conflictDetails: details,
  });
}

/**
 * Retries syncing an invoice by resetting it to pending.
 */
export async function retryInvoice(localId: string): Promise<void> {
  await updateSyncStatus(localId, "pending", {
    conflictDetails: undefined,
  });
}

/**
 * Removes synced invoices older than 7 days.
 */
export async function cleanupSyncedInvoices(
  tenantId: string,
): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const old = await offlineDb.offlineInvoices
    .where("tenantId")
    .equals(tenantId)
    .filter((inv) => inv.syncStatus === "synced" && inv.createdAt < cutoff)
    .toArray();

  const ids = old.map((inv) => inv.localId);
  await offlineDb.offlineInvoices.bulkDelete(ids);
  return ids.length;
}
