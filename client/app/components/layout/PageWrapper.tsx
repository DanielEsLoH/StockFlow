import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "~/lib/utils";
import type { Variants } from "framer-motion";
import {
  pageVariants,
  pageItemVariants,
  statGridVariants,
  statItemVariants,
  detailGridVariants,
  detailItemVariants,
} from "~/lib/animations";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** Page title rendered as h1 header. */
  title?: string;
  /** Subtitle/description under the title. */
  description?: string;
  /** Action buttons rendered to the right of the title. */
  actions?: React.ReactNode;
}

export function PageWrapper({ children, className, title, description, actions }: PageWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <motion.div
      variants={pageVariants}
      initial={isMounted ? "hidden" : false}
      animate="visible"
      className={cn("space-y-6", className)}
    >
      {title && (
        <motion.div
          variants={pageItemVariants}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-neutral-500">{description}</p>
            )}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </motion.div>
      )}
      {children}
    </motion.div>
  );
}

interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageSection({ children, className }: PageSectionProps) {
  return (
    <motion.div variants={pageItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

interface AnimatedGridProps {
  children: React.ReactNode;
  className?: string;
  variant?: "stats" | "detail";
}

export function AnimatedGrid({ children, className, variant = "stats" }: AnimatedGridProps) {
  const variants = variant === "stats" ? statGridVariants : detailGridVariants;
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedGridItem({ children, className, variant = "stats" }: AnimatedGridProps) {
  const variants = variant === "stats" ? statItemVariants : detailItemVariants;
  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  );
}
