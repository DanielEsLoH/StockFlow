import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '~/lib/utils';
import { filterProductsBySearch, filterProductsByCategory, sortProductsForPOS } from '~/lib/pos-utils';
import { ProductCard } from './ProductCard';
import { CategoryTabs } from './CategoryTabs';
import type { Product } from '~/types/product';
import type { Category } from '~/types/category';

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
  useMemo(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => p.status === 'ACTIVE');
    result = filterProductsByCategory(result, selectedCategory);
    result = filterProductsBySearch(result, searchQuery);
    result = sortProductsForPOS(result);
    return result;
  }, [products, selectedCategory, searchQuery]);

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
      <div className="flex flex-col">
        <CategoryTabs
          categories={[]}
          selectedCategory={null}
          onSelectCategory={() => {}}
          isLoading={isLoadingCategories}
        />

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: itemsPerPage }).map((_, i) => (
            <div
              key={i}
              className="h-[200px] animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-700"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        isLoading={isLoadingCategories}
      />

      {/* Products Grid */}
      <div className="mt-4 flex-1">
        <AnimatePresence mode="wait">
          {paginatedProducts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <Package className="mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-600" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                No se encontraron productos
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                {searchQuery
                  ? 'Intenta con otros terminos de busqueda'
                  : 'No hay productos en esta categoria'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
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
            {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de{' '}
            {filteredProducts.length} productos
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                currentPage === 1
                  ? 'cursor-not-allowed border-neutral-200 text-neutral-300 dark:border-neutral-700 dark:text-neutral-600'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800'
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
                      'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
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
                'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                currentPage === totalPages
                  ? 'cursor-not-allowed border-neutral-200 text-neutral-300 dark:border-neutral-700 dark:text-neutral-600'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800'
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