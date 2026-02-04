import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

const cardVariants = cva(
  'rounded-2xl transition-all duration-200',
  {
    variants: {
      variant: {
        // Default - Clean white card
        default: `bg-white border border-neutral-200/60
                  dark:bg-neutral-900 dark:border-neutral-800/60`,
        // Elevated - With shadow
        elevated: `bg-white shadow-lg shadow-neutral-200/50
                   border border-neutral-100
                   dark:bg-neutral-900 dark:shadow-neutral-950/50
                   dark:border-neutral-800/60`,
        // Outlined - Border emphasis
        outlined: `bg-transparent border-2 border-neutral-200
                   dark:border-neutral-700`,
        // Glass - Glassmorphism effect
        glass: `bg-white/70 backdrop-blur-xl border border-white/20
                shadow-lg
                dark:bg-neutral-900/70 dark:border-neutral-700/50`,
        // Glass Elevated - Glass with more shadow
        'glass-elevated': `bg-white/80 backdrop-blur-xl border border-white/30
                          shadow-xl shadow-neutral-200/30
                          dark:bg-neutral-900/80 dark:border-neutral-700/50
                          dark:shadow-neutral-950/30`,
        // Gradient Border - Premium gradient outline
        'gradient-border': `bg-white dark:bg-neutral-900 p-[2px]
                           bg-gradient-to-br from-primary-500 via-accent-500 to-primary-600
                           [&>*]:bg-white dark:[&>*]:bg-neutral-900 [&>*]:rounded-[calc(1rem-2px)]`,
        // Soft - Subtle background
        soft: `bg-neutral-50 border border-neutral-100
               dark:bg-neutral-900/50 dark:border-neutral-800/50`,
        // Primary Soft - Primary tinted background
        'soft-primary': `bg-primary-50/50 border border-primary-100
                         dark:bg-primary-900/10 dark:border-primary-900/30`,
        // Success Soft - Success tinted background
        'soft-success': `bg-success-50/50 border border-success-100
                         dark:bg-success-900/10 dark:border-success-900/30`,
        // Warning Soft - Warning tinted background
        'soft-warning': `bg-warning-50/50 border border-warning-100
                         dark:bg-warning-900/10 dark:border-warning-900/30`,
        // Error Soft - Error tinted background
        'soft-error': `bg-error-50/50 border border-error-100
                       dark:bg-error-900/10 dark:border-error-900/30`,
      },
      padding: {
        none: 'p-0',
        xs: 'p-3',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      hover: {
        none: '',
        lift: 'hover:-translate-y-1 hover:shadow-xl cursor-pointer',
        glow: 'hover:shadow-lg hover:shadow-primary-500/10 cursor-pointer',
        'glow-accent': 'hover:shadow-lg hover:shadow-accent-500/10 cursor-pointer',
        border: 'hover:border-primary-300 dark:hover:border-primary-600 cursor-pointer',
        scale: 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      hover: 'none',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hover, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, hover, className }))}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

// CardHeader
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start justify-between gap-4',
          className
        )}
        {...props}
      >
        <div className="flex flex-col space-y-1.5 flex-1 min-w-0">
          {children}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    );
  }
);
CardHeader.displayName = 'CardHeader';

// CardTitle
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  gradient?: boolean;
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h3', gradient, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'text-lg font-semibold leading-none tracking-tight',
          gradient
            ? 'bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent'
            : 'text-neutral-900 dark:text-white',
          className
        )}
        {...props}
      />
    );
  }
);
CardTitle.displayName = 'CardTitle';

// CardDescription
type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}
      {...props}
    />
  );
});
CardDescription.displayName = 'CardDescription';

// CardContent
type CardContentProps = React.HTMLAttributes<HTMLDivElement>

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('', className)} {...props} />;
  }
);
CardContent.displayName = 'CardContent';

// CardFooter
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  divider?: boolean;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, divider, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center pt-4',
          divider && 'border-t border-neutral-100 dark:border-neutral-800 mt-4',
          className
        )}
        {...props}
      />
    );
  }
);
CardFooter.displayName = 'CardFooter';

// CardDivider - Utility component for dividing card sections
const CardDivider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700 my-4',
        className
      )}
      {...props}
    />
  );
});
CardDivider.displayName = 'CardDivider';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardDivider,
  cardVariants,
};
