import { WifiOff, Gauge } from "lucide-react";
import { cn } from "~/lib/utils";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";

/**
 * OfflineIndicator — shows connection status banner at top of viewport.
 *
 * States:
 * - offline: red banner "Sin conexion a internet"
 * - slow: amber banner "Conexion lenta — modo offline activo"
 * - online/good: hidden
 *
 * vercel-react-best-practices:
 * - rendering-conditional-render: ternary for conditional values
 * - bundle-barrel-imports: direct imports (WifiOff, Gauge)
 */
export function OfflineIndicator() {
  const { isOnline, connectionQuality, pendingSyncCount } = useNetworkStatus();

  const isVisible = !isOnline || connectionQuality === "slow";

  // rendering-conditional-render: ternary for derived values
  const bgColor = !isOnline
    ? "bg-error-500 dark:bg-error-600"
    : "bg-warning-500 dark:bg-warning-600";

  const Icon = !isOnline ? WifiOff : Gauge;

  const message = !isOnline
    ? "Sin conexion a internet — modo offline activo"
    : "Conexion lenta — modo offline activo";

  return (
    <div
      role="status"
      aria-live="assertive"
      className={cn(
        "fixed top-0 inset-x-0 z-[70]",
        "transition-all duration-300 ease-out",
        isVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none",
      )}
    >
      <div className={bgColor}>
        <div className="mx-auto flex items-center justify-center gap-2 px-4 py-2">
          <Icon className="h-4 w-4 text-white shrink-0" />
          <p className="text-sm font-medium text-white">{message}</p>
          {pendingSyncCount > 0 ? (
            <span
              className={cn(
                "ml-2 inline-flex items-center justify-center",
                "min-w-[20px] h-5 px-1.5 rounded-full",
                "bg-white/25 text-xs font-bold text-white",
              )}
            >
              {pendingSyncCount}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
