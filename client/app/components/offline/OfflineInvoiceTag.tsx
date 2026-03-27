import { CloudOff, Cloud, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import type { OfflineInvoiceSyncStatus } from "~/lib/offline/schemas";

/**
 * OfflineInvoiceTag — visual tag in invoice list showing sync status.
 *
 * Compact pill that communicates at a glance:
 * - pending: amber "Pendiente" with cloud-off icon
 * - syncing: indigo "Sincronizando" with spinning loader
 * - synced: green "Sincronizada" with cloud-check
 * - conflict: red "Conflicto" with alert triangle
 * - error: red "Error" with alert triangle
 */

const statusConfig: Record<
  OfflineInvoiceSyncStatus,
  {
    label: string;
    icon: typeof CloudOff;
    bg: string;
    text: string;
    animate?: boolean;
  }
> = {
  pending: {
    label: "Pendiente",
    icon: CloudOff,
    bg: "bg-warning-100 dark:bg-warning-900/20",
    text: "text-warning-700 dark:text-warning-300",
  },
  syncing: {
    label: "Sincronizando",
    icon: Loader2,
    bg: "bg-primary-100 dark:bg-primary-900/20",
    text: "text-primary-700 dark:text-primary-300",
    animate: true,
  },
  synced: {
    label: "Sincronizada",
    icon: Cloud,
    bg: "bg-success-100 dark:bg-success-900/20",
    text: "text-success-700 dark:text-success-300",
  },
  conflict: {
    label: "Conflicto",
    icon: AlertTriangle,
    bg: "bg-error-100 dark:bg-error-900/20",
    text: "text-error-700 dark:text-error-300",
  },
  error: {
    label: "Error",
    icon: AlertTriangle,
    bg: "bg-error-100 dark:bg-error-900/20",
    text: "text-error-700 dark:text-error-300",
  },
};

interface OfflineInvoiceTagProps {
  syncStatus: OfflineInvoiceSyncStatus;
  className?: string;
}

export function OfflineInvoiceTag({
  syncStatus,
  className,
}: OfflineInvoiceTagProps) {
  const config = statusConfig[syncStatus];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "text-xs font-medium whitespace-nowrap",
        config.bg,
        config.text,
        className,
      )}
    >
      <Icon
        className={cn("h-3 w-3", config.animate && "animate-spin")}
      />
      {config.label}
    </span>
  );
}
