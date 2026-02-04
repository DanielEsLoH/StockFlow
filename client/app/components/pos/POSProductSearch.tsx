import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Package, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "~/components/ui/Input";
import { formatCurrency } from "~/lib/utils";
import type { Product } from "~/types/product";

interface POSProductSearchProps {
  products: Product[];
  isLoading: boolean;
  onSelectProduct: (product: Product) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function POSProductSearch({
  products,
  isLoading,
  onSelectProduct,
  inputRef,
}: POSProductSearchProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const actualInputRef = inputRef || internalInputRef;

  // Filter products based on search
  const filteredProducts =
    search.length >= 2
      ? products
          .filter(
            (p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              p.sku.toLowerCase().includes(search.toLowerCase()) ||
              (p.barcode && p.barcode.includes(search)),
          )
          .slice(0, 10)
      : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || filteredProducts.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredProducts.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredProducts[selectedIndex]) {
            handleSelect(filteredProducts[selectedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          break;
      }
    },
    [isOpen, filteredProducts, selectedIndex],
  );

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
    setSearch("");
    setIsOpen(false);
    setSelectedIndex(0);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setIsOpen(value.length >= 2);
    setSelectedIndex(0);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
        <Input
          ref={actualInputRef}
          type="text"
          placeholder="Buscar producto por nombre, SKU o codigo (F2)"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => search.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 h-12 text-lg"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 max-h-80 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-neutral-500">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No se encontraron productos</p>
            </div>
          ) : (
            <div className="py-1">
              {filteredProducts.map((product, index) => (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                    index === selectedIndex
                      ? "bg-primary-50 dark:bg-primary-900/20"
                      : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {product.sku}
                      {product.barcode && ` - ${product.barcode}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-600">
                      {formatCurrency(product.salePrice)}
                    </p>
                    {product.stock <= 0 ? (
                      <p className="text-xs text-error-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Sin stock
                      </p>
                    ) : product.stock <= product.minStock ? (
                      <p className="text-xs text-warning-500">
                        Stock bajo: {product.stock}
                      </p>
                    ) : (
                      <p className="text-xs text-neutral-500">
                        Stock: {product.stock}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
