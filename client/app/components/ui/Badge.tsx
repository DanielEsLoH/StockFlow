import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
        primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
        secondary: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
        success: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300',
        warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300',
        error: 'bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300',
        outline: 'border border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot, dotColor, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'mr-1.5 h-1.5 w-1.5 rounded-full',
              dotColor || 'bg-current opacity-70'
            )}
          />
        )}
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };

// Status-specific badge component
type StatusType = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'OUT_OF_STOCK' | 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';

const statusConfig: Record<StatusType, { label: string; variant: VariantProps<typeof badgeVariants>['variant'] }> = {
  ACTIVE: { label: 'Activo', variant: 'success' },
  INACTIVE: { label: 'Inactivo', variant: 'secondary' },
  DISCONTINUED: { label: 'Descontinuado', variant: 'error' },
  OUT_OF_STOCK: { label: 'Sin stock', variant: 'warning' },
  PAID: { label: 'Pagada', variant: 'success' },
  PENDING: { label: 'Pendiente', variant: 'warning' },
  OVERDUE: { label: 'Vencida', variant: 'error' },
  CANCELLED: { label: 'Cancelada', variant: 'secondary' },
};

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: StatusType;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'default' as const };

  return (
    <Badge variant={config.variant} className={className} {...props}>
      {config.label}
    </Badge>
  );
}