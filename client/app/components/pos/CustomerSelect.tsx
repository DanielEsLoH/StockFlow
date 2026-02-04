import { useMemo, useState, useRef, useEffect } from "react";
import { User, ChevronDown, Search, X, UserPlus } from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import type { Customer } from "~/types/customer";

interface CustomerSelectProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string | null) => void;
  isLoading?: boolean;
  className?: string;
}

export function CustomerSelect({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  isLoading = false,
  className,
}: CustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  // Filter active customers and by search query
  const filteredCustomers = useMemo(() => {
    // Support both backend format (status: "ACTIVE") and legacy format (isActive: true)
    const activeCustomers = customers.filter(
      (c) => c.status === "ACTIVE" || c.isActive === true,
    );
    if (!searchQuery.trim()) return activeCustomers;

    const lowerQuery = searchQuery.toLowerCase();
    return activeCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.email.toLowerCase().includes(lowerQuery) ||
        c.document?.toLowerCase().includes(lowerQuery),
    );
  }, [customers, searchQuery]);

  // Get selected customer
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId],
  );

  const handleSelect = (customerId: string) => {
    onSelectCustomer(customerId);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCustomer(null);
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "h-12 w-64 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700",
          className,
        )}
      />
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-12 w-full min-w-[240px] items-center gap-3 rounded-xl border px-4 transition-all",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
          isOpen
            ? "border-primary-500 bg-white dark:bg-neutral-800"
            : selectedCustomer
              ? "border-success-300 bg-success-50 dark:border-success-700 dark:bg-success-900/20"
              : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600",
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            selectedCustomer
              ? "bg-success-100 dark:bg-success-900/30"
              : "bg-neutral-100 dark:bg-neutral-700",
          )}
        >
          <User
            className={cn(
              "h-4 w-4",
              selectedCustomer
                ? "text-success-600 dark:text-success-400"
                : "text-neutral-500",
            )}
          />
        </div>

        <div className="flex flex-1 flex-col items-start truncate">
          {selectedCustomer ? (
            <>
              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                {selectedCustomer.name}
              </span>
              <span className="text-xs text-neutral-500">
                {selectedCustomer.document || selectedCustomer.email}
              </span>
            </>
          ) : (
            <span className="text-sm text-neutral-500">
              Seleccionar cliente...
            </span>
          )}
        </div>

        {selectedCustomer ? (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-neutral-400 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[300px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
          {/* Search Input */}
          <div className="border-b border-neutral-200 p-2 dark:border-neutral-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente..."
                className="h-10 w-full rounded-lg border-0 bg-neutral-50 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-neutral-900 dark:text-white"
              />
            </div>
          </div>

          {/* Customer List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-neutral-500">
                  No se encontraron clientes
                </p>
                <Link
                  to="/customers/new"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  <UserPlus className="h-4 w-4" />
                  Crear nuevo cliente
                </Link>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelect(customer.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    "hover:bg-neutral-50 dark:hover:bg-neutral-700/50",
                    selectedCustomerId === customer.id &&
                      "bg-primary-50 dark:bg-primary-900/20",
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      {customer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 truncate">
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {customer.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {customer.document && (
                        <span className="mr-2">{customer.document}</span>
                      )}
                      {customer.email}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      customer.type === "BUSINESS"
                        ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
                    )}
                  >
                    {customer.type === "BUSINESS" ? "Empresa" : "Persona"}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-200 p-2 dark:border-neutral-700">
            <Link
              to="/customers/new"
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
            >
              <UserPlus className="h-4 w-4" />
              Nuevo cliente
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
