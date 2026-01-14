import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '~/lib/utils';

const buttonVariants = cva(
  `inline-flex items-center justify-center rounded-xl font-medium
   transition-all duration-200 focus-visible:outline-none
   focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
   disabled:pointer-events-none disabled:opacity-50
   active:scale-[0.98]`,
  {
    variants: {
      variant: {
        primary: `bg-primary-600 text-white hover:bg-primary-700
                  shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40`,
        secondary: `bg-neutral-100 text-neutral-900 hover:bg-neutral-200
                    dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700`,
        outline: `border-2 border-neutral-200 bg-transparent hover:bg-neutral-50
                  dark:border-neutral-700 dark:hover:bg-neutral-800`,
        ghost: `bg-transparent hover:bg-neutral-100
                dark:hover:bg-neutral-800`,
        danger: `bg-error-600 text-white hover:bg-error-700
                 shadow-lg shadow-error-500/25`,
        success: `bg-success-600 text-white hover:bg-success-700
                  shadow-lg shadow-success-500/25`,
      },
      size: {
        sm: 'h-9 px-3 text-sm gap-1.5',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2',
        xl: 'h-14 px-8 text-lg gap-3',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
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
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
