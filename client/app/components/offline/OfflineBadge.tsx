import { CloudOff, RefreshCw } from "lucide-react";
import { cn } from "~/lib/utils";
import { useNetworkStore } from "~/stores/network.store";

/**
 * OfflineBadge — small indicator shown in sidebar next to "Facturas".
 *
 * Shows count of pending offline invoices. Amber when pending,
 * green pulse when syncing, hidden when zero.
 */
export function OfflineBadge({ className }: { className?: string }) {
  const pendingSyncCount = useNetworkStore((s) => s.pendingSyncCount);

  if (pendingSyncCount === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        "min-w-[20px] h-5 px-1.5 rounded-full",
        "bg-warning-100 dark:bg-warning-900/30",
        "text-warning-700 dark:text-warning-300",
        "text-xs font-semibold",
        "transition-all duration-200",
        className,
      )}
      title={`${pendingSyncCount} factura${pendingSyncCount === 1 ? "" : "s"} pendiente${pendingSyncCount === 1 ? "" : "s"} de sincronizacion`}
    >
      <CloudOff className="h-3 w-3" />
      {pendingSyncCount}
    </span>
  );
}
