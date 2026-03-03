import { RefreshCw, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/Button";
import { usePWA } from "~/hooks/usePWA";

/**
 * Notification banner shown when a new service worker version is available.
 * Follows vercel-react-best-practices:
 * - rendering-conditional-render: ternary for conditional styles
 * - bundle-barrel-imports: direct import from Button, not barrel
 */
export function UpdateAvailable() {
  const { needsUpdate, updateApp, dismissUpdate } = usePWA();

  // rendering-conditional-render: explicit ternary
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "fixed bottom-20 lg:bottom-4 right-4 z-[60]",
        "transition-all duration-300 ease-out",
        needsUpdate
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none",
      )}
    >
      <div
        className={cn(
          "w-80 rounded-2xl",
          "bg-white dark:bg-neutral-900",
          "border border-neutral-200/60 dark:border-neutral-700/60",
          "shadow-xl shadow-neutral-900/10 dark:shadow-neutral-900/50",
          "p-4",
        )}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              "bg-primary-100 dark:bg-primary-900/30",
            )}
          >
            <RefreshCw className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Actualizacion disponible
            </p>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 leading-tight">
              Hay una nueva version de StockFlow lista para usar.
            </p>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={updateApp}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Actualizar
              </Button>
              <Button variant="ghost" size="sm" onClick={dismissUpdate}>
                Despues
              </Button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={dismissUpdate}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg",
              "text-neutral-400 hover:text-neutral-600",
              "dark:text-neutral-500 dark:hover:text-neutral-300",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800",
              "transition-colors",
            )}
            aria-label="Cerrar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
