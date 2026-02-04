import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import type { Category } from "~/types/category";

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isLoading?: boolean;
  totalActiveProducts?: number;
}

export function CategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading = false,
  totalActiveProducts = 0,
}: CategoryTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position to show/hide arrows
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  // Initial check and resize listener
  useEffect(() => {
    checkScrollPosition();
    window.addEventListener("resize", checkScrollPosition);
    return () => window.removeEventListener("resize", checkScrollPosition);
  }, [checkScrollPosition, categories]);

  // Scroll handlers
  const scrollLeft = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: -200, behavior: "smooth" });
    }
  }, []);

  const scrollRight = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: 200, behavior: "smooth" });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-9 sm:h-10 w-20 sm:w-24 shrink-0 animate-pulse rounded-lg sm:rounded-xl bg-neutral-200 dark:bg-neutral-700"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative flex items-center">
      {/* Left scroll arrow - smaller on mobile */}
      {canScrollLeft ? (
        <button
          type="button"
          onClick={scrollLeft}
          className="absolute left-0 z-10 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:bg-white dark:bg-neutral-800/90 dark:hover:bg-neutral-800"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-neutral-600 dark:text-neutral-300" />
        </button>
      ) : null}

      {/* Scrollable tabs container - smaller gaps on mobile */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScrollPosition}
        className={cn(
          "flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-smooth",
          // Touch-friendly horizontal padding for scroll inertia
          "-mx-1 px-1",
          canScrollLeft && "pl-9 sm:pl-10",
          canScrollRight && "pr-9 sm:pr-10",
        )}
      >
        {/* All Products Tab - touch-friendly with min 44px tap target */}
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={cn(
            "relative flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl",
            // Padding: px-3 py-2 on mobile (44px height), px-4 py-2.5 on sm+
            "px-3 py-2 sm:px-4 sm:py-2.5",
            "text-xs sm:text-sm font-medium transition-all",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
            selectedCategory === null
              ? "bg-primary-600 text-white shadow-lg shadow-primary-500/25"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Todos</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs",
              selectedCategory === null
                ? "bg-white/20 text-white"
                : totalActiveProducts === 0
                  ? "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                  : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400",
            )}
          >
            {totalActiveProducts}
          </span>
          {selectedCategory === null ? (
            <motion.div
              layoutId="category-indicator"
              className="absolute inset-0 rounded-lg sm:rounded-xl bg-primary-600"
              style={{ zIndex: -1 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          ) : null}
        </button>

        {/* Category Tabs - full names visible, no truncation */}
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl",
              // Padding: px-3 py-2 on mobile, px-4 py-2.5 on sm+
              "px-3 py-2 sm:px-4 sm:py-2.5",
              "text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
              selectedCategory === category.id
                ? "bg-primary-600 text-white shadow-lg shadow-primary-500/25"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
            )}
          >
            <span>{category.name}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs",
                selectedCategory === category.id
                  ? "bg-white/20 text-white"
                  : (category.productCount ?? 0) === 0
                    ? "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                    : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400",
              )}
            >
              {category.productCount ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Right scroll arrow - smaller on mobile */}
      {canScrollRight ? (
        <button
          type="button"
          onClick={scrollRight}
          className="absolute right-0 z-10 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:bg-white dark:bg-neutral-800/90 dark:hover:bg-neutral-800"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-neutral-600 dark:text-neutral-300" />
        </button>
      ) : null}
    </div>
  );
}
