/**
 * Shared animation variants for Framer Motion.
 * These are reused across multiple pages to maintain consistent animations
 * and eliminate code duplication.
 */

import type { Variants } from "framer-motion";

/**
 * Container variants for staggered children animations.
 * Use with motion.div to animate child elements in sequence.
 *
 * @example
 * <motion.div variants={containerVariants} initial="hidden" animate="visible">
 *   <motion.div variants={itemVariants}>Item 1</motion.div>
 *   <motion.div variants={itemVariants}>Item 2</motion.div>
 * </motion.div>
 */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

/**
 * Item variants for individual element animations.
 * Use as children of a container with containerVariants.
 */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

/**
 * Fade in animation variants.
 * Simple opacity transition for subtle element reveals.
 */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
};

/**
 * Scale in animation variants.
 * Combines opacity with scale for modal-like appearances.
 */
export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2 },
  },
};

/**
 * Slide in from right variants.
 * Useful for side panels and drawers.
 */
export const slideInRightVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
};

/**
 * Slide in from left variants.
 * Useful for navigation and sidebars.
 */
export const slideInLeftVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
};

// ============================================================================
// TRANSITION PRESETS
// ============================================================================

const ease = [0.16, 1, 0.3, 1] as const;

export const transitions = {
  micro: { duration: 0.15, ease },
  default: { duration: 0.3, ease },
  page: { duration: 0.4, ease },
  emphasis: { duration: 0.5, ease },
  spring: { type: "spring" as const, stiffness: 350, damping: 30 },
};

// ============================================================================
// PAGE VARIANTS — consistent entrance for every page
// ============================================================================

export const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export const pageItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease },
  },
};

// ============================================================================
// TABLE ROW VARIANTS — staggered row entrance
// ============================================================================

export const tableRowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.3, ease },
  }),
};

// ============================================================================
// CARD GRID VARIANTS — staggered card entrance
// ============================================================================

export const cardGridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

export const cardItemVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease },
  },
};

// ============================================================================
// MODAL VARIANTS — for AnimatePresence-driven modals
// ============================================================================

export const modalOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.25, ease },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 4,
    transition: { duration: 0.15 },
  },
};

// ============================================================================
// COLLAPSE VARIANTS — expand/collapse for filters
// ============================================================================

export const collapseVariants: Variants = {
  hidden: { height: 0, opacity: 0, overflow: "hidden" as const },
  visible: {
    height: "auto",
    opacity: 1,
    overflow: "visible" as const,
    transition: {
      height: { duration: 0.25, ease },
      opacity: { duration: 0.2, delay: 0.05 },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    overflow: "hidden" as const,
    transition: {
      height: { duration: 0.2, ease },
      opacity: { duration: 0.1 },
    },
  },
};
