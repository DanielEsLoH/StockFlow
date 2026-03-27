import { AlertTriangle, X, RotateCcw } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/Button";
import type { OfflineInvoice } from "~/lib/offline/schemas";

/**
 * ConflictResolver — modal for resolving sync conflicts on offline invoices.
 *
 * Shows the conflict details and offers actions:
 * - Retry sync (re-send with current data)
 * - Discard invoice (remove from queue)
 */

interface ConflictResolverProps {
  invoice: OfflineInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onRetry: (localId: string) => void;
  onDiscard: (localId: string) => void;
}

export function ConflictResolver({
  invoice,
  isOpen,
  onClose,
  onRetry,
  onDiscard,
}: ConflictResolverProps) {
  if (!invoice || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className={cn(
        "relative w-full max-w-md rounded-2xl",
        "bg-white dark:bg-neutral-900",
        "border border-neutral-200 dark:border-neutral-700",
        "shadow-xl p-6",
      )}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Conflicto de sincronizacion
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

      <div className="space-y-4">
        {/* Invoice summary */}
        <div
          className={cn(
            "rounded-lg p-4",
            "bg-neutral-50 dark:bg-neutral-800/50",
            "border border-neutral-200 dark:border-neutral-700",
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {invoice.invoiceNumber}
            </span>
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              ${invoice.total.toLocaleString("es-CO")}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {invoice.customerName ?? "Sin cliente"} &middot;{" "}
            {invoice.items.length} item{invoice.items.length !== 1 ? "s" : ""} &middot;{" "}
            {new Date(invoice.createdAt).toLocaleString("es-CO")}
          </p>
        </div>

        {/* Conflict details */}
        <div
          className={cn(
            "rounded-lg p-4",
            "bg-error-50 dark:bg-error-950/30",
            "border border-error-200 dark:border-error-800/40",
          )}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-error-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-error-800 dark:text-error-200">
                Detalles del conflicto
              </p>
              <p className="text-sm text-error-700 dark:text-error-300 mt-1">
                {invoice.conflictDetails ?? "Error desconocido durante la sincronizacion."}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="primary"
            onClick={() => {
              onRetry(invoice.localId);
              onClose();
            }}
            leftIcon={<RotateCcw className="h-4 w-4" />}
            className="flex-1"
          >
            Reintentar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onDiscard(invoice.localId);
              onClose();
            }}
            leftIcon={<X className="h-4 w-4" />}
            className="flex-1"
          >
            Descartar
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
