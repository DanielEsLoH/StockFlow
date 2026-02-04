import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center font-medium transition-colors',
  {
    variants: {
      variant: {
        // Default - Neutral gray
        default: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
        // Primary - Indigo tint
        primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
        // Secondary - Subtle neutral
        secondary: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
        // Success - Teal/green
        success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
        // Warning - Orange/amber
        warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
        // Error - Red
        error: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300',
        // Outline - Border only
        outline: 'border border-neutral-200 text-neutral-700 bg-transparent dark:border-neutral-700 dark:text-neutral-300',
        // Outline Primary - Primary border
        'outline-primary': 'border border-primary-300 text-primary-600 bg-transparent dark:border-primary-700 dark:text-primary-400',
        // Outline Success - Success border
        'outline-success': 'border border-success-300 text-success-600 bg-transparent dark:border-success-700 dark:text-success-400',
        // Outline Warning - Warning border
        'outline-warning': 'border border-warning-300 text-warning-600 bg-transparent dark:border-warning-700 dark:text-warning-400',
        // Outline Error - Error border
        'outline-error': 'border border-error-300 text-error-600 bg-transparent dark:border-error-700 dark:text-error-400',
        // Gradient - Primary to accent gradient
        gradient: 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-sm shadow-primary-500/25',
        // Gradient Success - Success gradient
        'gradient-success': 'bg-gradient-to-r from-success-500 to-success-400 text-white shadow-sm shadow-success-500/25',
        // Glass - Glassmorphism style
        glass: 'bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border border-white/20 dark:border-neutral-700/50 text-neutral-700 dark:text-neutral-300',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-[10px] rounded',
        sm: 'px-2 py-0.5 text-xs rounded-md',
        md: 'px-2.5 py-1 text-xs rounded-lg',
        lg: 'px-3 py-1.5 text-sm rounded-lg',
      },
      pill: {
        true: 'rounded-full',
        false: '',
      },
    },
    compoundVariants: [
      // Pill variants override the rounded classes from size
      { pill: true, size: 'xs', className: 'rounded-full' },
      { pill: true, size: 'sm', className: 'rounded-full' },
      { pill: true, size: 'md', className: 'rounded-full' },
      { pill: true, size: 'lg', className: 'rounded-full' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'md',
      pill: true,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, pill, dot, dotColor, icon, removable, onRemove, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, pill, className }))}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'shrink-0 rounded-full',
              size === 'xs' ? 'h-1 w-1 mr-1' :
              size === 'sm' ? 'h-1.5 w-1.5 mr-1' :
              size === 'lg' ? 'h-2 w-2 mr-1.5' : 'h-1.5 w-1.5 mr-1.5',
              dotColor || 'bg-current opacity-70'
            )}
          />
        )}
        {icon && (
          <span className={cn(
            'shrink-0',
            size === 'xs' ? 'mr-0.5' :
            size === 'sm' ? 'mr-1' :
            size === 'lg' ? 'mr-1.5' : 'mr-1'
          )}>
            {icon}
          </span>
        )}
        {children}
        {removable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className={cn(
              'shrink-0 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors',
              size === 'xs' ? 'ml-0.5 p-0.5' :
              size === 'sm' ? 'ml-1 p-0.5' :
              size === 'lg' ? 'ml-1.5 p-1' : 'ml-1 p-0.5'
            )}
          >
            <svg
              className={cn(
                size === 'xs' ? 'h-2 w-2' :
                size === 'sm' ? 'h-2.5 w-2.5' :
                size === 'lg' ? 'h-3.5 w-3.5' : 'h-3 w-3'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };

// Status-specific badge component
type StatusType =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'DISCONTINUED'
  | 'OUT_OF_STOCK'
  | 'LOW_STOCK'
  | 'PAID'
  | 'PENDING'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'DRAFT'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'REFUNDED';

const statusConfig: Record<StatusType, { label: string; variant: VariantProps<typeof badgeVariants>['variant']; dot?: boolean }> = {
  ACTIVE: { label: 'Activo', variant: 'success', dot: true },
  INACTIVE: { label: 'Inactivo', variant: 'secondary', dot: true },
  DISCONTINUED: { label: 'Descontinuado', variant: 'error', dot: true },
  OUT_OF_STOCK: { label: 'Sin stock', variant: 'error', dot: true },
  LOW_STOCK: { label: 'Stock bajo', variant: 'warning', dot: true },
  PAID: { label: 'Pagada', variant: 'success', dot: true },
  PENDING: { label: 'Pendiente', variant: 'warning', dot: true },
  OVERDUE: { label: 'Vencida', variant: 'error', dot: true },
  CANCELLED: { label: 'Cancelada', variant: 'secondary', dot: true },
  DRAFT: { label: 'Borrador', variant: 'secondary', dot: true },
  PROCESSING: { label: 'Procesando', variant: 'primary', dot: true },
  SHIPPED: { label: 'Enviado', variant: 'primary', dot: true },
  DELIVERED: { label: 'Entregado', variant: 'success', dot: true },
  REFUNDED: { label: 'Reembolsado', variant: 'warning', dot: true },
};

interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'dot'> {
  status: StatusType;
  showDot?: boolean;
}

export function StatusBadge({ status, showDot = true, className, ...props }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'default' as const };

  return (
    <Badge
      variant={config.variant}
      dot={showDot && config.dot}
      className={className}
      {...props}
    >
      {config.label}
    </Badge>
  );
}

// Count Badge - For showing counts/numbers
interface CountBadgeProps extends Omit<BadgeProps, 'children'> {
  count: number;
  max?: number;
}

export function CountBadge({ count, max = 99, variant = 'error', ...props }: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  return (
    <Badge variant={variant} size="xs" {...props}>
      {displayCount}
    </Badge>
  );
}
