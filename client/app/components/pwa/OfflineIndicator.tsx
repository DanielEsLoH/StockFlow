import { WifiOff } from "lucide-react";
import { cn } from "~/lib/utils";
import { usePWA } from "~/hooks/usePWA";

export function OfflineIndicator() {
  const { isOffline } = usePWA();

  return (
    <div
      role="status"
      aria-live="assertive"
      className={cn(
        "fixed top-0 inset-x-0 z-[70]",
        "transition-all duration-300 ease-out",
        isOffline
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none",
      )}
    >
      <div className="bg-warning-500 dark:bg-warning-600">
        <div className="mx-auto flex items-center justify-center gap-2 px-4 py-2">
          <WifiOff className="h-4 w-4 text-white shrink-0" />
          <p className="text-sm font-medium text-white">
            Sin conexion a internet
          </p>
        </div>
      </div>
    </div>
  );
}
