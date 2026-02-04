import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./Button";

export interface DeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  title?: string;
  description?: string;
  actionLabel?: string;
  variant?: "danger" | "warning";
  children?: React.ReactNode;
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export function DeleteModal({
  open,
  onOpenChange,
  itemName,
  itemType = "elemento",
  onConfirm,
  isLoading = false,
  title,
  description,
  actionLabel = "Eliminar",
  variant = "danger",
  children,
}: DeleteModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={() => !isLoading && onOpenChange(false)}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md mx-4 bg-white dark:bg-neutral-800 rounded-xl shadow-xl"
          >
            {/* Close button */}
            <button
              onClick={() => !isLoading && onOpenChange(false)}
              disabled={isLoading}
              className="absolute right-4 top-4 p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="p-6 text-center">
              {/* Warning icon */}
              <div
                className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                  variant === "warning"
                    ? "bg-warning-50 dark:bg-warning-900/20"
                    : "bg-error-50 dark:bg-error-900/20"
                }`}
              >
                <AlertTriangle
                  className={`h-7 w-7 ${
                    variant === "warning"
                      ? "text-warning-500"
                      : "text-error-500"
                  }`}
                />
              </div>

              {/* Title */}
              <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
                {title || `Eliminar ${itemType}`}
              </h3>

              {/* Description */}
              <p className="mb-4 text-neutral-500 dark:text-neutral-400">
                {description || (
                  <>
                    ¿Estas seguro de que deseas {actionLabel.toLowerCase()}{" "}
                    <span className="font-medium text-neutral-900 dark:text-white">
                      "{itemName}"
                    </span>
                    ? Esta accion no se puede deshacer.
                  </>
                )}
              </p>

              {/* Custom children content */}
              {children && <div className="mb-6">{children}</div>}

              {/* Actions */}
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleConfirm}
                  isLoading={isLoading}
                >
                  {actionLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
