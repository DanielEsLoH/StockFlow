import { getQueuedInvoices, markAsSynced, updateSyncStatus, getQueuedCount } from "./invoice-queue";
import { useNetworkStore } from "~/stores/network.store";
import { queryClient } from "~/lib/query-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/** Polling interval for Safari fallback (60s) */
const POLLING_INTERVAL_MS = 60_000;

/**
 * Gets auth token for API requests.
 */
function getAuthToken(): string | null {
  try {
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

interface BatchSyncResponse {
  results: Array<{
    index: number;
    invoiceNumber: string;
    status: "synced" | "conflict" | "error";
    serverInvoiceId?: string;
    error?: string;
    conflictDetails?: string;
  }>;
  synced: number;
  failed: number;
  total: number;
}

/**
 * Syncs all pending offline invoices to the server.
 *
 * @param tenantId - Current tenant ID
 * @returns Number of successfully synced invoices
 */
export async function syncPendingInvoices(
  tenantId: string,
): Promise<{ synced: number; failed: number }> {
  const pending = await getQueuedInvoices(tenantId);
  if (pending.length === 0) return { synced: 0, failed: 0 };

  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  // Mark all as syncing
  for (const inv of pending) {
    await updateSyncStatus(inv.localId, "syncing");
  }

  // Convert to API format
  const invoices = pending.map((inv) => ({
    offlineInvoiceNumber: inv.invoiceNumber,
    customerId: inv.customerId ?? undefined,
    source: inv.source,
    warehouseId: inv.warehouseId ?? undefined,
    notes: inv.notes ?? undefined,
    items: inv.items.map((item) => ({
      productId: item.productId ?? undefined,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
    })),
  }));

  try {
    const response = await fetch(`${API_URL}/invoices/batch-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ invoices }),
    });

    if (!response.ok) {
      // Revert all back to pending
      for (const inv of pending) {
        await updateSyncStatus(inv.localId, "pending");
      }
      throw new Error(`Batch sync failed: ${response.status}`);
    }

    const data = (await response.json()) as BatchSyncResponse;

    // Process results
    for (const result of data.results) {
      const inv = pending[result.index];
      if (!inv) continue;

      if (result.status === "synced" && result.serverInvoiceId) {
        await markAsSynced(inv.localId, result.serverInvoiceId);
      } else if (result.status === "conflict") {
        await updateSyncStatus(inv.localId, "conflict", {
          conflictDetails: result.conflictDetails ?? result.error,
        });
      } else {
        await updateSyncStatus(inv.localId, "error", {
          conflictDetails: result.error,
        });
      }
    }

    // Update pending count
    const remaining = await getQueuedCount(tenantId);
    useNetworkStore.getState().setPendingSyncCount(remaining);

    // Invalidate React Query invoice cache so the list refreshes
    void queryClient.invalidateQueries({ queryKey: ["invoices"] });

    return { synced: data.synced, failed: data.failed };
  } catch (error) {
    // On network error, revert to pending
    for (const inv of pending) {
      await updateSyncStatus(inv.localId, "pending");
    }
    throw error;
  }
}

/**
 * Starts polling-based sync for browsers without Background Sync API (Safari).
 * Returns a cleanup function to stop polling.
 */
export function startPollingSync(tenantId: string): () => void {
  const timer = setInterval(async () => {
    if (!navigator.onLine) return;

    try {
      const count = await getQueuedCount(tenantId);
      if (count > 0) {
        await syncPendingInvoices(tenantId);
      }
    } catch (error) {
      console.warn("[InvoiceSync] Polling sync failed:", error);
    }
  }, POLLING_INTERVAL_MS);

  return () => clearInterval(timer);
}
