import { useEffect, useRef, useCallback } from "react";
import {
  useNetworkStore,
  type ConnectionQuality,
} from "~/stores/network.store";

/**
 * Network Connection API types (not fully typed in lib.dom.d.ts)
 */
interface NetworkInformation extends EventTarget {
  readonly effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  readonly downlink?: number;
  readonly rtt?: number;
  readonly saveData?: boolean;
  onchange?: EventListener;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/** Ping interval in ms — check connection quality every 30s */
const PING_INTERVAL_MS = 30_000;

/** Latency threshold: >3000ms = slow connection */
const SLOW_LATENCY_THRESHOLD_MS = 3_000;

/** Effective types considered slow */
const SLOW_EFFECTIVE_TYPES = new Set(["slow-2g", "2g"]);

/**
 * useNetworkStatus — monitors connection quality beyond simple online/offline.
 *
 * Extends the basic navigator.onLine detection with:
 * - Navigator.connection API (effectiveType, rtt, downlink)
 * - Active latency measurement via periodic ping to API health endpoint
 * - Derived `isEffectivelyOffline` (offline OR too slow to be usable)
 *
 * vercel-react-best-practices applied:
 * - rerender-use-ref-transient-values: ping timer in ref, not state
 * - client-event-listeners: all listeners cleaned up
 * - js-early-exit: SSR guard
 * - rerender-functional-setstate: N/A (uses Zustand)
 */
export function useNetworkStatus() {
  const {
    isOnline,
    connectionQuality,
    pendingSyncCount,
    setOnline,
    setConnectionQuality,
  } = useNetworkStore();

  // rerender-use-ref-transient-values: timer doesn't affect rendering
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Determines connection quality from Navigator.connection API.
   * Returns null if API is not available.
   */
  const getConnectionApiQuality = useCallback((): ConnectionQuality | null => {
    const conn =
      navigator.connection ??
      navigator.mozConnection ??
      navigator.webkitConnection;

    if (!conn) return null; // js-early-exit

    // Check effectiveType
    if (conn.effectiveType && SLOW_EFFECTIVE_TYPES.has(conn.effectiveType)) {
      return "slow";
    }

    // Check RTT (round-trip time) if available
    if (conn.rtt != null && conn.rtt > SLOW_LATENCY_THRESHOLD_MS) {
      return "slow";
    }

    return "good";
  }, []);

  /**
   * Measures actual latency by pinging the API health endpoint.
   * Uses HEAD request for minimal payload.
   */
  const measureLatency = useCallback(async (): Promise<ConnectionQuality> => {
    if (!navigator.onLine) return "offline"; // js-early-exit

    // Abort any in-flight ping
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const start = performance.now();
      await fetch(`${API_URL}/health`, {
        method: "HEAD",
        signal: abortControllerRef.current.signal,
        cache: "no-store",
      });
      const latency = performance.now() - start;

      if (latency > SLOW_LATENCY_THRESHOLD_MS) return "slow";

      // Also check connection API for more granular info
      const apiQuality = getConnectionApiQuality();
      return apiQuality ?? "good";
    } catch (error) {
      // AbortError means we cancelled it intentionally
      if (error instanceof DOMException && error.name === "AbortError") {
        return connectionQuality; // Keep current quality
      }
      // Network error = effectively offline or very slow
      return navigator.onLine ? "slow" : "offline";
    }
  }, [getConnectionApiQuality, connectionQuality]);

  useEffect(() => {
    if (typeof window === "undefined") return; // js-early-exit: SSR guard

    // --- Online/Offline listeners ---
    const handleOnline = () => {
      setOnline(true);
      // Immediately check quality when coming back online
      void measureLatency().then(setConnectionQuality);
    };

    const handleOffline = () => {
      setOnline(false);
    };

    // --- Navigator.connection change listener ---
    const conn =
      navigator.connection ??
      navigator.mozConnection ??
      navigator.webkitConnection;

    const handleConnectionChange = () => {
      if (!navigator.onLine) return; // js-early-exit
      const quality = getConnectionApiQuality();
      if (quality) setConnectionQuality(quality);
    };

    // client-event-listeners: register all listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    conn?.addEventListener("change", handleConnectionChange);

    // Set initial state
    setOnline(navigator.onLine);
    if (navigator.onLine) {
      const initialQuality = getConnectionApiQuality();
      if (initialQuality) setConnectionQuality(initialQuality);
    }

    // --- Periodic latency ping ---
    // Only ping when online to avoid unnecessary network requests
    pingTimerRef.current = setInterval(() => {
      if (!navigator.onLine) return; // js-early-exit
      void measureLatency().then(setConnectionQuality);
    }, PING_INTERVAL_MS);

    // client-event-listeners: cleanup all listeners
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      conn?.removeEventListener("change", handleConnectionChange);

      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }

      abortControllerRef.current?.abort();
    };
  }, [
    setOnline,
    setConnectionQuality,
    measureLatency,
    getConnectionApiQuality,
  ]);

  return {
    isOnline,
    connectionQuality,
    pendingSyncCount,
    /** True when connection is offline or too slow to be functional */
    isEffectivelyOffline: !isOnline || connectionQuality === "slow",
  };
}
