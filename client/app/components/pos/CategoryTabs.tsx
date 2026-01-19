import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import { cn } from '~/lib/utils';
import type { Category } from '~/types/category';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isLoading?: boolean;
}

export function CategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading = false,
}: CategoryTabsProps) {
  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-24 shrink-0 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {/* All Products Tab */}
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={cn(
          'relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          selectedCategory === null
            ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span>Todos</span>
        {selectedCategory === null && (
          <motion.div
            layoutId="category-indicator"
            className="absolute inset-0 rounded-xl bg-primary-600"
            style={{ zIndex: -1 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
      </button>

      {/* Category Tabs */}
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            'relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            selectedCategory === category.id
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
          )}
        >
          <span>{category.name}</span>
          {category.productCount !== undefined && category.productCount > 0 && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs',
                selectedCategory === category.id
                  ? 'bg-white/20 text-white'
                  : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
              )}
            >
              {category.productCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}