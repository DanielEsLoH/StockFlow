import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useHotkeys } from "./useHotkeys";

interface UseListPageHotkeysOptions {
  /** URL to navigate when pressing 'n' (e.g., "/products/new") */
  createUrl?: string;
  /** Callback to clear filters when pressing Escape */
  onClearFilters?: () => void;
}

/**
 * Keyboard shortcuts for list pages:
 * - `/` → Focus search input
 * - `n` → Navigate to create new item
 * - `Escape` → Clear active filters
 */
export function useListPageHotkeys({ createUrl, onClearFilters }: UseListPageHotkeysOptions = {}) {
  const navigate = useNavigate();

  const focusSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(
      'input[type="text"], input[type="search"], input[placeholder*="Buscar"]',
    );
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  useHotkeys([
    {
      key: "/",
      preventDefault: true,
      handler: focusSearch,
    },
    ...(createUrl
      ? [
          {
            key: "n",
            handler: () => navigate(createUrl),
          },
        ]
      : []),
    ...(onClearFilters
      ? [
          {
            key: "Escape",
            handler: onClearFilters,
          },
        ]
      : []),
  ]);
}
