import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";

// Toast state management
type ToastType = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

let toastListeners: ((toasts: ToastMessage[]) => void)[] = [];
let toasts: ToastMessage[] = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toasts]));
}

function addToast(type: ToastType, message: string, duration = 5000) {
  const id = Math.random().toString(36).substring(2, 9);
  const toast: ToastMessage = { id, type, message, duration };
  toasts = [...toasts, toast];
  notifyListeners();

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
}

// Public toast API
export const toast = {
  success: (message: string, duration?: number) =>
    addToast("success", message, duration),
  error: (message: string, duration?: number) =>
    addToast("error", message, duration),
  warning: (message: string, duration?: number) =>
    addToast("warning", message, duration),
  info: (message: string, duration?: number) =>
    addToast("info", message, duration),
  dismiss: removeToast,
};

// Hook to use toasts
function useToasts() {
  const [currentToasts, setCurrentToasts] =
    React.useState<ToastMessage[]>(toasts);

  React.useEffect(() => {
    toastListeners.push(setCurrentToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setCurrentToasts);
    };
  }, []);

  return currentToasts;
}

// Toast styles by type
const toastStyles: Record<ToastType, string> = {
  success:
    "bg-success-50 border-success-200 text-success-800 dark:bg-success-900/20 dark:border-success-800 dark:text-success-200",
  error:
    "bg-error-50 border-error-200 text-error-800 dark:bg-error-900/20 dark:border-error-800 dark:text-error-200",
  warning:
    "bg-warning-50 border-warning-200 text-warning-800 dark:bg-warning-900/20 dark:border-warning-800 dark:text-warning-200",
  info: "bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-200",
};

// Toast Provider Component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const currentToasts = useToasts();

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {children}
      {currentToasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          className={cn(
            "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 shadow-lg transition-all",
            "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
            "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
            "data-[state=open]:animate-slide-up data-[state=closed]:animate-fade-out",
            toastStyles[t.type],
          )}
        >
          <div className="flex-1">
            <ToastPrimitive.Description className="text-sm">
              {t.message}
            </ToastPrimitive.Description>
          </div>
          <ToastPrimitive.Close
            className="rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2"
            onClick={() => removeToast(t.id)}
          >
            <X className="h-4 w-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]" />
    </ToastPrimitive.Provider>
  );
}
