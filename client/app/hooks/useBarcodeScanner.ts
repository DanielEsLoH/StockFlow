import { useEffect, useRef, useCallback } from "react";

interface UseBarcodeScanner {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxDelay?: number;
}

/**
 * Hook that detects barcode scanner input.
 * Barcode scanners typically type characters very fast (< 50ms between keys)
 * followed by an Enter key.
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 3,
  maxDelay = 50,
}: UseBarcodeScanner) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;

      // If too much time has passed, reset the buffer
      if (timeDiff > maxDelay && bufferRef.current.length > 0) {
        bufferRef.current = "";
      }

      lastKeyTimeRef.current = now;

      // Handle Enter key - submit the barcode
      if (event.key === "Enter") {
        const barcode = bufferRef.current.trim();
        if (barcode.length >= minLength) {
          event.preventDefault();
          event.stopPropagation();
          onScan(barcode);
        }
        bufferRef.current = "";
        return;
      }

      // Only accept printable characters
      if (event.key.length === 1) {
        bufferRef.current += event.key;
      }
    },
    [enabled, minLength, maxDelay, onScan],
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [enabled, handleKeyDown]);

  const reset = useCallback(() => {
    bufferRef.current = "";
  }, []);

  return { reset };
}
