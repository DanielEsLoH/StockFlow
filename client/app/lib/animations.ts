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
