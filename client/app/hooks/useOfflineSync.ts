import { useEffect, useRef, useCallback, useState } from "react";
import { useAuthStore } from "~/stores/auth.store";
import { useNetworkStore } from "~/stores/network.store";
import { syncAll, needsSync } from "~/lib/offline/sync-service";

/**
 * Sync interval: how often to check and sync data when online (10 min).
 */
const SYNC_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Max staleness before triggering a sync (5 min).
 */
const MAX_STALE_MS = 5 * 60 * 1000;

/**
 * useOfflineSync — manages automatic syncing of offline data.
 *
 * - Syncs on mount if data is stale (>5 min old)
 * - Syncs periodically every 10 min when online
 * - Syncs immediately when coming back online after being offline
 * - Exposes manual `syncNow()` for user-triggered sync
 *
 * vercel-react-best-practices:
 * - rerender-use-ref-transient-values: timer in ref
 * - js-early-exit: SSR guard + early exits
 * - async-parallel: syncAll uses Promise.all internally
 */
export function useOfflineSync() {
  const tenant = useAuthStore((s) => s.tenant);
  const { isOnline, lastSyncAt } = useNetworkStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // rerender-use-ref-transient-values
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const wasOfflineRef = useRef(false);

  const tenantId = tenant?.id ?? null;

  /**
   * Performs a full sync of all offline data.
   */
  const syncNow = useCallback(async () => {
    if (!tenantId || !navigator.onLine) return; // js-early-exit
    if (isSyncing) return; // Prevent concurrent syncs

    // Abort any in-flight sync
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsSyncing(true);
    setSyncError(null);

    try {
      await syncAll(tenantId, abortControllerRef.current.signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message =
        error instanceof Error ? error.message : "Error de sincronizacion";
      setSyncError(message);
      console.warn("[OfflineSync] Sync failed:", message);
    } finally {
      setIsSyncing(false);
    }
  }, [tenantId, isSyncing]);

  // Initial sync on mount + periodic sync
  useEffect(() => {
    if (typeof window === "undefined") return; // js-early-exit: SSR
    if (!tenantId) return; // js-early-exit: no tenant
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    // If we were offline and just came back, sync immediately
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      void syncNow();
      return;
    }

    // Check if data is stale and needs initial sync
    void (async () => {
      const stale = await needsSync("products", tenantId, MAX_STALE_MS);
      if (stale) {
        void syncNow();
      }
    })();

    // Set up periodic sync
    syncTimerRef.current = setInterval(() => {
      if (navigator.onLine) {
        void syncNow();
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      abortControllerRef.current?.abort();
    };
  }, [tenantId, isOnline, syncNow]);

  // Track when we go offline
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    }
  }, [isOnline]);

  return {
    isSyncing,
    syncError,
    lastSyncAt,
    syncNow,
  };
}
