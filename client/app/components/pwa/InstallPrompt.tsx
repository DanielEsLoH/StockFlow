import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/Button";
import { usePWA } from "~/hooks/usePWA";

const SESSION_STORAGE_KEY = "pwa-install-dismissed";

export function InstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [dismissed, setDismissed] = useState(true);
  const [visible, setVisible] = useState(false);

  // Check sessionStorage on mount (client only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const wasDismissed = sessionStorage.getItem(SESSION_STORAGE_KEY) === "true";
    setDismissed(wasDismissed);
  }, []);

  // Animate in when conditions are met
  useEffect(() => {
    if (isInstallable && !isInstalled && !dismissed) {
      // Small delay for the slide-up animation to be visible
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [isInstallable, isInstalled, dismissed]);

  const handleDismiss = () => {
    setVisible(false);
    // Wait for exit animation before fully hiding
    setTimeout(() => {
      setDismissed(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
      }
    }, 300);
  };

  const handleInstall = async () => {
    await installApp();
  };

  // Don't render at all if dismissed, already installed, or not installable
  if (dismissed || isInstalled || !isInstallable) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-20 lg:bottom-4 inset-x-4 z-[60]",
        "transition-all duration-300 ease-out",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0 pointer-events-none",
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-lg rounded-2xl",
          "bg-white dark:bg-neutral-900",
          "border border-neutral-200/60 dark:border-neutral-700/60",
          "shadow-xl shadow-neutral-900/10 dark:shadow-neutral-900/50",
          "p-4",
        )}
      >
        <div className="flex items-center gap-3">
          {/* App icon */}
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              "bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600",
              "shadow-lg shadow-primary-500/30",
            )}
          >
            <Download className="h-5 w-5 text-white" />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Instala StockFlow
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-tight">
              Instala StockFlow en tu dispositivo para acceso rapido
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={handleInstall}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Instalar
            </Button>
            <button
              onClick={handleDismiss}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                "text-neutral-400 hover:text-neutral-600",
                "dark:text-neutral-500 dark:hover:text-neutral-300",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                "transition-colors",
              )}
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
