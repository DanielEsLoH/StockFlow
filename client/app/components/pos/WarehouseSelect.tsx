import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Warehouse, ChevronDown, Check, MapPin, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import type { Warehouse as WarehouseType } from "~/types/warehouse";

interface WarehouseSelectProps {
  warehouses: WarehouseType[];
  selectedWarehouseId: string | null;
  onSelectWarehouse: (warehouseId: string) => void;
  isLoading?: boolean;
  className?: string;
  compact?: boolean;
  /** When true, the selector is locked and cannot be changed */
  disabled?: boolean;
}

export function WarehouseSelect({
  warehouses,
  selectedWarehouseId,
  onSelectWarehouse,
  isLoading = false,
  className,
  compact = false,
  disabled = false,
}: WarehouseSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedWarehouse = warehouses.find(
    (w) => w.id === selectedWarehouseId,
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-select first warehouse if none selected
  useEffect(() => {
    if (!selectedWarehouseId && warehouses.length > 0) {
      onSelectWarehouse(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId, onSelectWarehouse]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={isLoading || disabled}
        className={cn(
          "flex items-center gap-1.5 sm:gap-2 rounded-lg border transition-colors",
          "border-neutral-300 bg-white hover:bg-neutral-50",
          "dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700",
          "focus:outline-none focus:ring-2 focus:ring-primary-500/20",
          // Touch-friendly minimum height (44px)
          "min-h-[44px]",
          compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
          (isLoading || disabled) && "cursor-not-allowed opacity-60",
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary-500" />
        ) : (
          <Warehouse
            className={cn(
              "shrink-0 text-primary-500",
              compact ? "h-3.5 w-3.5" : "h-4 w-4",
            )}
          />
        )}
        <span
          className={cn(
            "truncate text-neutral-700 dark:text-neutral-200",
            // Allow more space for warehouse name on mobile
            compact
              ? "max-w-[100px] sm:max-w-[120px]"
              : "max-w-[140px] sm:max-w-[160px]",
          )}
          title={selectedWarehouse?.name || "Bodega"}
        >
          {selectedWarehouse?.name || "Bodega"}
        </span>
        {!disabled && (
          <ChevronDown
            className={cn(
              "shrink-0 text-neutral-400 transition-transform",
              compact ? "h-3.5 w-3.5" : "h-4 w-4",
              isOpen && "rotate-180",
            )}
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute left-0 top-full z-50 mt-1 w-64",
              "rounded-lg border bg-white shadow-lg",
              "dark:border-neutral-700 dark:bg-neutral-800",
            )}
          >
            <div className="max-h-64 overflow-y-auto p-1">
              {warehouses.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-neutral-500">
                  No hay bodegas disponibles
                </div>
              ) : (
                warehouses.map((warehouse) => (
                  <button
                    key={warehouse.id}
                    type="button"
                    onClick={() => {
                      onSelectWarehouse(warehouse.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      "hover:bg-neutral-100 dark:hover:bg-neutral-700",
                      selectedWarehouseId === warehouse.id &&
                        "bg-primary-50 dark:bg-primary-900/20",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        "bg-primary-100 text-primary-600 dark:bg-primary-900/30",
                      )}
                    >
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-neutral-900 dark:text-white">
                        {warehouse.name}
                      </p>
                      {warehouse.address && (
                        <p className="truncate text-xs text-neutral-500">
                          {warehouse.address}
                        </p>
                      )}
                    </div>
                    {selectedWarehouseId === warehouse.id && (
                      <Check className="h-4 w-4 shrink-0 text-primary-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
