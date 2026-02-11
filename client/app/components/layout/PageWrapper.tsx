import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "~/lib/utils";
import { pageVariants, pageItemVariants } from "~/lib/animations";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
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
