import * as React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Card, CardContent } from '~/components/ui/Card';

// Preset color schemes for convenience
const presetColors = {
  primary: {
    iconBg: 'bg-primary-50 dark:bg-primary-900/20',
    iconColor: 'text-primary-500',
  },
  success: {
    iconBg: 'bg-success-50 dark:bg-success-900/20',
    iconColor: 'text-success-500',
  },
  warning: {
    iconBg: 'bg-warning-50 dark:bg-warning-900/20',
    iconColor: 'text-warning-500',
  },
  error: {
    iconBg: 'bg-error-50 dark:bg-error-900/20',
    iconColor: 'text-error-500',
  },
  amber: {
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  green: {
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  blue: {
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-600 dark:text-purple-400',
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
   * Preset color scheme. Can use semantic colors (primary, success, warning, error)
   * or standard colors (amber, green, blue, purple).
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
  /**
   * Card variant style:
   * - "default": Simple card with horizontal layout
   * - "dashboard": Card with lift hover effect and vertical layout for change indicator
   */
  variant?: 'default' | 'dashboard';
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  change,
  changeLabel = 'vs mes anterior',
  color = 'primary',
  iconBg,
  iconColor,
  isLoading,
  animate = false,
  variant = 'default',
}: StatCardProps) {
  // Get colors from preset or use custom values
  const colorScheme = presetColors[color];
  const finalIconBg = iconBg ?? colorScheme.iconBg;
  const finalIconColor = iconColor ?? colorScheme.iconColor;

  const isPositive = change !== undefined && change >= 0;

  // Dashboard variant - vertical layout with change indicator
  if (variant === 'dashboard') {
    return (
      <Card variant="default" padding="md" hover="lift">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {label}
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
              {value}
            </p>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-success-500" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-error-500" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    isPositive ? 'text-success-600' : 'text-error-600'
                  )}
                >
                  {isPositive ? '+' : ''}{change}%
                </span>
                <span className="text-sm text-neutral-400">{changeLabel}</span>
              </div>
            )}
          </div>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', finalIconBg)}>
            <Icon className={cn('h-6 w-6', finalIconColor)} aria-hidden="true" />
          </div>
        </div>
      </Card>
    );
  }

  // Animated variant for system admin style
  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {label}
            </p>
            {isLoading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
            ) : (
              <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-white">
                {value}
              </p>
            )}
          </div>
          <div className={cn('rounded-xl p-3', finalIconBg)}>
            <Icon className={cn('h-6 w-6', finalIconColor)} />
          </div>
        </div>
      </motion.div>
    );
  }

  // Default variant - horizontal layout with optional subtitle
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-lg', finalIconBg)}>
            <Icon className={cn('h-5 w-5', finalIconColor)} />
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="text-xl font-semibold text-neutral-900 dark:text-white">{value}</p>
            {subtitle && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}