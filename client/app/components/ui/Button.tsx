import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '~/lib/utils';

const buttonVariants = cva(
  `inline-flex items-center justify-center rounded-xl font-medium
   transition-all duration-200 focus-visible:outline-none
   focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
   dark:focus-visible:ring-offset-neutral-900
   disabled:pointer-events-none disabled:opacity-50
   active:scale-[0.98]`,
  {
    variants: {
      variant: {
        // Primary - Solid indigo with glow
        primary: `bg-primary-600 text-white hover:bg-primary-700
                  shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40
                  hover:shadow-xl`,
        // Gradient - Premium gradient button
        gradient: `bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 text-white
                   shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50
                   hover:shadow-xl hover:brightness-110`,
        // Secondary - Subtle background
        secondary: `bg-neutral-100 text-neutral-900 hover:bg-neutral-200
                    dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700
                    shadow-sm hover:shadow`,
        // Outline - Border only
        outline: `border-2 border-neutral-200 bg-transparent hover:bg-neutral-50
                  hover:border-neutral-300
                  dark:border-neutral-700 dark:hover:bg-neutral-800 dark:hover:border-neutral-600`,
        // Outline Primary - Primary colored border
        'outline-primary': `border-2 border-primary-500 bg-transparent text-primary-600
                           hover:bg-primary-50 dark:text-primary-400
                           dark:hover:bg-primary-900/20`,
        // Ghost - Transparent with hover
        ghost: `bg-transparent hover:bg-neutral-100
                dark:hover:bg-neutral-800`,
        // Danger - Error/destructive action
        danger: `bg-error-600 text-white hover:bg-error-700
                 shadow-lg shadow-error-500/25 hover:shadow-error-500/40`,
        // Success - Positive action
        success: `bg-success-600 text-white hover:bg-success-700
                  shadow-lg shadow-success-500/25 hover:shadow-success-500/40`,
        // Glass - Glassmorphism style
        glass: `bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl
                border border-white/20 dark:border-neutral-700/50
                text-neutral-900 dark:text-white
                hover:bg-white/90 dark:hover:bg-neutral-900/90
                shadow-lg`,
        // Soft Primary - Subtle primary background
        'soft-primary': `bg-primary-100 text-primary-700 hover:bg-primary-200
                         dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50`,
        // Soft Success - Subtle success background
        'soft-success': `bg-success-100 text-success-700 hover:bg-success-200
                         dark:bg-success-900/30 dark:text-success-300 dark:hover:bg-success-900/50`,
        // Soft Warning - Subtle warning background
        'soft-warning': `bg-warning-100 text-warning-700 hover:bg-warning-200
                         dark:bg-warning-900/30 dark:text-warning-300 dark:hover:bg-warning-900/50`,
        // Soft Danger - Subtle error background
        'soft-danger': `bg-error-100 text-error-700 hover:bg-error-200
                        dark:bg-error-900/30 dark:text-error-300 dark:hover:bg-error-900/50`,
      },
      size: {
        xs: 'h-7 px-2.5 text-xs gap-1',
        sm: 'h-9 px-3 text-sm gap-1.5',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2',
        xl: 'h-14 px-8 text-lg gap-3',
        icon: 'h-10 w-10',
        'icon-xs': 'h-7 w-7',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
        'icon-xl': 'h-14 w-14',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
