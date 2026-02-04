import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl p-4 [&>svg~*]:pl-8 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
  {
    variants: {
      variant: {
        default: `bg-neutral-50 text-neutral-900 border border-neutral-200
                  dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800`,
        info: `bg-primary-50 text-primary-900 border border-primary-200
               dark:bg-primary-950/50 dark:text-primary-100 dark:border-primary-900`,
        success: `bg-success-50 text-success-900 border border-success-200
                  dark:bg-success-950/50 dark:text-success-100 dark:border-success-900`,
        warning: `bg-warning-50 text-warning-900 border-l-4 border-warning-500
                  dark:bg-warning-950/50 dark:text-warning-100`,
        error: `bg-error-50 text-error-900 border border-error-200
                dark:bg-error-950/50 dark:text-error-100 dark:border-error-900`,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface AlertProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";

type AlertTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

const AlertTitle = React.forwardRef<HTMLParagraphElement, AlertTitleProps>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn(
        "mb-1 font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  ),
);
AlertTitle.displayName = "AlertTitle";

type AlertDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  AlertDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };
