import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  filterProductsBySearch,
  filterProductsByCategory,
  sortProductsForPOS,
} from "~/lib/pos-utils";
import { ProductCard } from "./ProductCard";
import { CategoryTabs } from "./CategoryTabs";
import type { Product } from "~/types/product";
import type { Category } from "~/types/category";

interface ProductCatalogProps {
  products: Product[];
  categories: Category[];
  selectedCategory: string | null;
  searchQuery: string;
  onSelectCategory: (categoryId: string | null) => void;
  onAddToCart: (product: Product) => void;
  getCartQuantity: (productId: string) => number;
  isLoadingProducts?: boolean;
  isLoadingCategories?: boolean;
  itemsPerPage?: number;
}

const ITEMS_PER_PAGE = 12;

export function ProductCatalog({
  products,
  categories,
  selectedCategory,
  searchQuery,
  onSelectCategory,
  onAddToCart,
  getCartQuantity,
  isLoadingProducts = false,
  isLoadingCategories = false,
  itemsPerPage = ITEMS_PER_PAGE,
}: ProductCatalogProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Get active products only (for counting and filtering)
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.status === "ACTIVE");
  }, [products]);

  // Build a Map of categoryId -> active product count for O(1) lookups
  // This fixes the badge count mismatch where API returns all products but we show only active
  const categoryActiveCountMap = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const product of activeProducts) {
      if (product.categoryId) {
        const current = countMap.get(product.categoryId) ?? 0;
        countMap.set(product.categoryId, current + 1);
      }
    }
    return countMap;
  }, [activeProducts]);

  // Enhance categories with accurate active product counts
  const categoriesWithActiveCounts = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      productCount: categoryActiveCountMap.get(category.id) ?? 0,
    }));
  }, [categories, categoryActiveCountMap]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = activeProducts;
    result = filterProductsByCategory(result, selectedCategory);
    result = filterProductsBySearch(result, searchQuery);
    result = sortProductsForPOS(result);
    return result;
  }, [activeProducts, selectedCategory, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  // Loading skeleton
  if (isLoadingProducts) {
    return (
      <div className="flex min-w-0 w-full flex-col">
        <CategoryTabs
          categories={[]}
          selectedCategory={null}
          onSelectCategory={() => {}}
          isLoading={isLoadingCategories}
        />

        <div className="mt-3 sm:mt-4 grid w-full grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: itemsPerPage }).map((_, i) => (
            <div
              key={i}
              className="h-[140px] sm:h-[180px] min-w-0 w-full animate-pulse rounded-xl sm:rounded-2xl bg-neutral-200 dark:bg-neutral-700"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-col">
      {/* Category Tabs - using categories with accurate active product counts */}
      <CategoryTabs
        categories={categoriesWithActiveCounts}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        isLoading={isLoadingCategories}
        totalActiveProducts={activeProducts.length}
      />

      {/* Products Grid */}
      <div className="mt-3 sm:mt-4 flex-1">
        <AnimatePresence mode="wait">
          {paginatedProducts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-12 sm:py-16"
            >
              <Package className="mb-3 sm:mb-4 h-12 w-12 sm:h-16 sm:w-16 text-neutral-300 dark:text-neutral-600" />
              <h3 className="text-base sm:text-lg font-medium text-neutral-900 dark:text-white">
                No se encontraron productos
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-neutral-500 text-center px-4">
                {searchQuery
                  ? "Intenta con otros terminos de busqueda"
                  : "No hay productos en esta categoria"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid w-full grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            >
              {paginatedProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { delay: index * 0.03 },
                  }}
                  className="min-w-0 w-full"
                >
                  <ProductCard
                    product={product}
                    cartQuantity={getCartQuantity(product.id)}
                    onAddToCart={onAddToCart}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-700">
          <p className="text-sm text-neutral-500">
            Mostrando {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de{" "}
            {filteredProducts.length} productos
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                currentPage === 1
                  ? "cursor-not-allowed border-neutral-200 text-neutral-300 dark:border-neutral-700 dark:text-neutral-600"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                      currentPage === pageNum
                        ? "bg-primary-600 text-white"
                        : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                currentPage === totalPages
                  ? "cursor-not-allowed border-neutral-200 text-neutral-300 dark:border-neutral-700 dark:text-neutral-600"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800",
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
