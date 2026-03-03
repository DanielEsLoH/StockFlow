import { useState, useEffect, useCallback, useRef } from "react";

/**
 * PWA hook — manages service worker, online/offline, install prompt, and updates.
 *
 * vercel-react-best-practices applied:
 * - client-event-listeners: all global listeners have cleanup
 * - rerender-use-ref-transient-values: refs for non-rendering values
 * - rerender-functional-setstate: functional setState for stable callbacks
 * - js-early-exit: SSR guard clauses
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isOffline: boolean;
  needsUpdate: boolean;
  isInstalled: boolean;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isOffline: false,
    needsUpdate: false,
    isInstalled: false,
  });

  // rerender-use-ref-transient-values: store non-rendering values in refs
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return; // js-early-exit: SSR guard

    // Detect if already installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    setState((prev) => ({
      ...prev,
      isInstalled: isStandalone,
      isOffline: !navigator.onLine,
    }));

    // client-event-listeners: all listeners registered and cleaned up together
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setState((prev) => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setState((prev) => ({
        ...prev,
        isInstallable: false,
        isInstalled: true,
      }));
    };

    const handleOnline = () =>
      setState((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () =>
      setState((prev) => ({ ...prev, isOffline: true }));

    // Reload page when a new SW takes over (must be cleaned up)
    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleControllerChange,
      );

      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          registrationRef.current = registration;

          // Check if there's already a waiting SW
          if (registration.waiting) {
            setState((prev) => ({ ...prev, needsUpdate: true }));
          }

          // Listen for new SW installing
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setState((prev) => ({ ...prev, needsUpdate: true }));
              }
            });
          });
        })
        .catch((error) => {
          console.warn("Service worker registration failed:", error);
        });
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleControllerChange,
        );
      }
    };
  }, []);

  const installApp = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === "accepted") {
      deferredPromptRef.current = null;
      setState((prev) => ({ ...prev, isInstallable: false }));
    }
  }, []);

  const updateApp = useCallback(() => {
    const registration = registrationRef.current;
    if (!registration?.waiting) return;

    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }, []);

  const dismissUpdate = useCallback(() => {
    setState((prev) => ({ ...prev, needsUpdate: false }));
  }, []);

  return {
    isInstallable: state.isInstallable,
    isOffline: state.isOffline,
    needsUpdate: state.needsUpdate,
    isInstalled: state.isInstalled,
    installApp,
    updateApp,
    dismissUpdate,
  };
}
