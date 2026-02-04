import * as React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Card, CardContent } from "~/components/ui/Card";

// Preset color schemes with gradient backgrounds for premium look
const presetColors = {
  primary: {
    iconBg:
      "bg-gradient-to-br from-primary-500/20 to-primary-600/10 dark:from-primary-500/20 dark:to-primary-900/30",
    iconColor: "text-primary-600 dark:text-primary-400",
    accentBg: "from-primary-500 to-accent-500",
  },
  accent: {
    iconBg:
      "bg-gradient-to-br from-accent-500/20 to-accent-600/10 dark:from-accent-500/20 dark:to-accent-900/30",
    iconColor: "text-accent-600 dark:text-accent-400",
    accentBg: "from-accent-500 to-primary-500",
  },
  success: {
    iconBg:
      "bg-gradient-to-br from-success-500/20 to-success-600/10 dark:from-success-500/20 dark:to-success-900/30",
    iconColor: "text-success-600 dark:text-success-400",
    accentBg: "from-success-500 to-success-400",
  },
  warning: {
    iconBg:
      "bg-gradient-to-br from-warning-500/20 to-warning-600/10 dark:from-warning-500/20 dark:to-warning-900/30",
    iconColor: "text-warning-600 dark:text-warning-400",
    accentBg: "from-warning-500 to-warning-400",
  },
  error: {
    iconBg:
      "bg-gradient-to-br from-error-500/20 to-error-600/10 dark:from-error-500/20 dark:to-error-900/30",
    iconColor: "text-error-600 dark:text-error-400",
    accentBg: "from-error-500 to-error-400",
  },
  neutral: {
    iconBg:
      "bg-gradient-to-br from-neutral-200 to-neutral-100 dark:from-neutral-700 dark:to-neutral-800",
    iconColor: "text-neutral-600 dark:text-neutral-300",
    accentBg: "from-neutral-500 to-neutral-400",
  },
} as const;

export type StatCardColor = keyof typeof presetColors;

export interface StatCardProps {
  /** The icon component to display */
  icon: React.ComponentType<{ className?: string }>;
  /** The label/title for the stat */
  label: string;
  /** The main value to display */
  value: string | number;
  /** Optional subtitle text */
  subtitle?: string;
  /**
   * Optional change percentage. When provided, shows trending indicator.
   * Positive values show green up arrow, negative show red down arrow.
   */
  change?: number;
  /** Optional text to show after the change percentage (e.g., "vs mes anterior") */
  changeLabel?: string;
  /**
   * Preset color scheme.
   */
  color?: StatCardColor;
  /** Custom icon background classes (overrides color preset) */
  iconBg?: string;
  /** Custom icon color classes (overrides color preset) */
  iconColor?: string;
  /** Whether the card is in loading state */
  isLoading?: boolean;
  /** Whether to animate the card entrance */
  animate?: boolean;
  /** Animation delay for staggered animations (in seconds) */
  animationDelay?: number;
  /**
   * Card variant style:
   * - "default": Simple card with horizontal layout
   * - "dashboard": Premium card with lift hover effect
   * - "compact": Smaller, dense layout
   * - "gradient": Card with gradient accent bar
   */
  variant?: "default" | "dashboard" | "compact" | "gradient";
  /** Optional click handler for interactive cards */
  onClick?: () => void;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  change,
  changeLabel = "vs mes anterior",
  color = "primary",
  iconBg,
  iconColor,
  isLoading,
  animate = false,
  animationDelay = 0,
  variant = "default",
  onClick,
}: StatCardProps) {
  // Get colors from preset or use custom values
  const colorScheme = presetColors[color];
  const finalIconBg = iconBg ?? colorScheme.iconBg;
  const finalIconColor = iconColor ?? colorScheme.iconColor;

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change !== undefined && change === 0;

  // Change indicator component
  const ChangeIndicator = () => {
    if (change === undefined) return null;

    return (
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold",
            isPositive &&
              "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
            isNegative &&
              "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
            isNeutral &&
              "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
          )}
        >
          {isPositive && <ArrowUpRight className="h-3 w-3" />}
          {isNegative && <ArrowDownRight className="h-3 w-3" />}
          {isNeutral && <Minus className="h-3 w-3" />}
          {isPositive && "+"}
          {change}%
        </span>
        <span className="text-xs text-neutral-400 dark:text-neutral-500 hidden sm:inline">
          {changeLabel}
        </span>
      </div>
    );
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <Card variant="default" padding="md">
        <div className="animate-pulse">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
              <div className="h-8 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
              <div className="h-4 w-20 bg-neutral-100 dark:bg-neutral-800 rounded" />
            </div>
            <div className="h-14 w-14 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
          </div>
        </div>
      </Card>
    );
  }

  // Gradient variant - with accent bar at top
  if (variant === "gradient") {
    const content = (
      <Card
        variant="default"
        padding="none"
        hover={onClick ? "lift" : "none"}
        className={cn("overflow-hidden", onClick && "cursor-pointer")}
        onClick={onClick}
      >
        {/* Gradient accent bar */}
        <div className={cn("h-1 bg-gradient-to-r", colorScheme.accentBg)} />

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 truncate">
                {label}
              </p>
              <p className="text-3xl font-bold tracking-tight bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
                {value}
              </p>
              <ChangeIndicator />
            </div>
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl shrink-0",
                finalIconBg,
              )}
            >
              <Icon
                className={cn("h-7 w-7", finalIconColor)}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </Card>
    );

    if (animate) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: animationDelay,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {content}
        </motion.div>
      );
    }

    return content;
  }

  // Dashboard variant - premium card with hover effect
  if (variant === "dashboard") {
    const content = (
      <Card
        variant="elevated"
        padding="md"
        hover={onClick ? "lift" : "glow"}
        className={cn(onClick && "cursor-pointer")}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 truncate">
              {label}
            </p>
            <p className="text-3xl font-bold tracking-tight bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              {value}
            </p>
            <ChangeIndicator />
          </div>
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl shrink-0 shadow-sm",
              finalIconBg,
            )}
          >
            <Icon
              className={cn("h-7 w-7", finalIconColor)}
              aria-hidden="true"
            />
          </div>
        </div>
      </Card>
    );

    if (animate) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: animationDelay,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {content}
        </motion.div>
      );
    }

    return content;
  }

  // Compact variant - smaller, dense layout
  if (variant === "compact") {
    const content = (
      <Card
        variant="default"
        padding="sm"
        hover={onClick ? "border" : "none"}
        className={cn(onClick && "cursor-pointer")}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl shrink-0",
              finalIconBg,
            )}
          >
            <Icon
              className={cn("h-5 w-5", finalIconColor)}
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate">
              {label}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {value}
              </p>
              {change !== undefined && (
                <span
                  className={cn(
                    "text-xs font-medium",
                    isPositive && "text-success-600",
                    isNegative && "text-error-600",
                    isNeutral && "text-neutral-500",
                  )}
                >
                  {isPositive && "+"}
                  {change}%
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    );

    if (animate) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: animationDelay }}
        >
          {content}
        </motion.div>
      );
    }

    return content;
  }

  // Default variant - clean horizontal layout
  const content = (
    <Card
      variant="default"
      padding="md"
      hover={onClick ? "border" : "none"}
      className={cn(onClick && "cursor-pointer")}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
            finalIconBg,
          )}
        >
          <Icon className={cn("h-6 w-6", finalIconColor)} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {subtitle}
            </p>
          )}
          {change !== undefined && !subtitle && (
            <div className="mt-1">
              <ChangeIndicator />
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay: animationDelay,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

// Mini StatCard for sidebar or compact areas
interface MiniStatCardProps {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  color?: StatCardColor;
  trend?: "up" | "down" | "neutral";
}

export function MiniStatCard({
  label,
  value,
  icon: Icon,
  color = "primary",
  trend,
}: MiniStatCardProps) {
  const colorScheme = presetColors[color];

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
      {Icon && (
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            colorScheme.iconBg,
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", colorScheme.iconColor)} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 truncate">
          {label}
        </p>
        <div className="flex items-center gap-1">
          <p className="text-sm font-bold text-neutral-900 dark:text-white">
            {value}
          </p>
          {trend && (
            <span
              className={cn(
                "text-[10px]",
                trend === "up" && "text-success-500",
                trend === "down" && "text-error-500",
                trend === "neutral" && "text-neutral-400",
              )}
            >
              {trend === "up" && "↑"}
              {trend === "down" && "↓"}
              {trend === "neutral" && "−"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
