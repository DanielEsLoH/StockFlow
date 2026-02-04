import { useEffect, useCallback } from 'react';

interface POSKeyboardShortcuts {
  onSearch?: () => void; // F2
  onPay?: () => void; // F4
  onSuspend?: () => void; // F8
  onFullscreen?: () => void; // F11
  onCancel?: () => void; // ESC
  onConfirm?: () => void; // Enter (in modal)
  enabled?: boolean;
}

/**
 * Hook for POS keyboard shortcuts.
 * F2 = Focus search
 * F4 = Open payment modal
 * F8 = Suspend sale
 * F11 = Toggle fullscreen
 * ESC = Cancel/close modal
 */
export function usePOSKeyboard({
  onSearch,
  onPay,
  onSuspend,
  onFullscreen,
  onCancel,
  enabled = true,
}: POSKeyboardShortcuts) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't intercept if user is typing in an input
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      switch (event.key) {
        case 'F2':
          event.preventDefault();
          onSearch?.();
          break;
        case 'F4':
          event.preventDefault();
          onPay?.();
          break;
        case 'F8':
          event.preventDefault();
          onSuspend?.();
          break;
        case 'F11':
          event.preventDefault();
          onFullscreen?.();
          break;
        case 'Escape':
          // ESC works even in inputs to close modals
          onCancel?.();
          break;
        default:
          break;
      }
    },
    [enabled, onSearch, onPay, onSuspend, onFullscreen, onCancel]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * Toggle fullscreen mode for POS interface
 */
export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.warn('Error attempting to enable fullscreen:', err);
    });
  } else {
    document.exitFullscreen().catch((err) => {
      console.warn('Error attempting to exit fullscreen:', err);
    });
  }
}
