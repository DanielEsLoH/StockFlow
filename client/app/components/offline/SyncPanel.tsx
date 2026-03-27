import { useState } from "react";
import {
  CloudOff,
  Cloud,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Hash,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/Button";
import { useNetworkStore } from "~/stores/network.store";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { OfflineInvoiceTag } from "./OfflineInvoiceTag";
import { getAvailableCount } from "~/lib/offline/number-pool";
import type { OfflineInvoice } from "~/lib/offline/schemas";

/**
 * SyncPanel — expandable panel showing offline sync status and pending invoices.
 *
 * Compact by default (one-line summary), expands to show:
 * - List of pending/conflict/synced invoices
 * - "Sync now" button
 * - Available number count from pool
 * - Last sync timestamp
 */

interface SyncPanelProps {
  invoices: OfflineInvoice[];
  onSyncNow: () => void;
  isSyncing: boolean;
  className?: string;
}

export function SyncPanel({
  invoices,
  onSyncNow,
  isSyncing,
  className,
}: SyncPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isOnline } = useNetworkStatus();
  const lastSyncAt = useNetworkStore((s) => s.lastSyncAt);

  const pending = invoices.filter((i) => i.syncStatus === "pending").length;
  const conflicts = invoices.filter((i) => i.syncStatus === "conflict").length;
  const synced = invoices.filter((i) => i.syncStatus === "synced").length;
  const errors = invoices.filter((i) => i.syncStatus === "error").length;
  const numbersAvailable = getAvailableCount();

  const hasIssues = conflicts > 0 || errors > 0;

  // Don't show if nothing to display
  if (invoices.length === 0 && numbersAvailable === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border",
        hasIssues
          ? "border-error-200 dark:border-error-800/40 bg-error-50/50 dark:bg-error-950/20"
          : pending > 0
            ? "border-warning-200 dark:border-warning-800/40 bg-warning-50/50 dark:bg-warning-950/20"
            : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900",
        className,
      )}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3",
          "text-left transition-colors rounded-xl",
          "hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              hasIssues
                ? "bg-error-100 dark:bg-error-900/30"
                : pending > 0
                  ? "bg-warning-100 dark:bg-warning-900/30"
                  : "bg-success-100 dark:bg-success-900/30",
            )}
          >
            {hasIssues ? (
              <AlertTriangle className="h-4 w-4 text-error-600 dark:text-error-400" />
            ) : pending > 0 ? (
              <CloudOff className="h-4 w-4 text-warning-600 dark:text-warning-400" />
            ) : (
              <Cloud className="h-4 w-4 text-success-600 dark:text-success-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {hasIssues
                ? `${conflicts + errors} factura${conflicts + errors === 1 ? "" : "s"} con problemas`
                : pending > 0
                  ? `${pending} factura${pending === 1 ? "" : "s"} pendiente${pending === 1 ? "" : "s"}`
                  : "Todo sincronizado"}
            </p>
            {lastSyncAt ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Ultima sync: {new Date(lastSyncAt).toLocaleTimeString("es-CO")}
              </p>
            ) : null}
          </div>
        </div>

        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-neutral-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded ? (
        <div className="px-4 pb-4 space-y-3">
          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Pendientes: {pending}
            </span>
            <span className="flex items-center gap-1">
              <Cloud className="h-3 w-3" />
              Sincronizadas: {synced}
            </span>
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Numeros: {numbersAvailable}
            </span>
          </div>

          {/* Invoice list */}
          {invoices.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {invoices.slice(0, 10).map((inv) => (
                <div
                  key={inv.localId}
                  className={cn(
                    "flex items-center justify-between",
                    "px-3 py-2 rounded-lg",
                    "bg-white dark:bg-neutral-800/50",
                    "border border-neutral-200/60 dark:border-neutral-700/40",
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {inv.invoiceNumber}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {inv.customerName ?? "Sin cliente"} &middot; $
                      {inv.total.toLocaleString("es-CO")}
                    </p>
                  </div>
                  <OfflineInvoiceTag syncStatus={inv.syncStatus} />
                </div>
              ))}
            </div>
          ) : null}

          {/* Sync button */}
          {pending > 0 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={onSyncNow}
              disabled={!isOnline || isSyncing}
              leftIcon={
                <RefreshCw
                  className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
                />
              }
              className="w-full"
            >
              {isSyncing
                ? "Sincronizando..."
                : !isOnline
                  ? "Sin conexion"
                  : "Sincronizar ahora"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
