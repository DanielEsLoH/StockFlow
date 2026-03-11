import { useEffect, useCallback } from "react";

type HotkeyHandler = (e: KeyboardEvent) => void;

interface HotkeyConfig {
  key: string;
  handler: HotkeyHandler;
  /** If true, prevents default browser behavior */
  preventDefault?: boolean;
}

/**
 * Hook for registering keyboard shortcuts.
 * Ignores events when focus is inside input/textarea/select elements.
 */
export function useHotkeys(hotkeys: HotkeyConfig[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();

      // Ignore when typing in form elements
      if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) {
        // Allow Escape to still work inside inputs
        if (e.key !== "Escape") return;
      }

      for (const hotkey of hotkeys) {
        if (e.key === hotkey.key || e.key.toLowerCase() === hotkey.key.toLowerCase()) {
          if (hotkey.preventDefault) e.preventDefault();
          hotkey.handler(e);
          return;
        }
      }
    },
    [hotkeys],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
