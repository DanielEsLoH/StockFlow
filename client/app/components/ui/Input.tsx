import { forwardRef } from 'react';
import { cn } from '~/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftElement, rightElement, ...props }, ref) => {
    return (
      <div className="relative">
        {leftElement && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {leftElement}
          </div>
        )}
        <input
          type={type}
          className={cn(
            `flex h-11 w-full rounded-xl border bg-white px-4 py-2 text-sm
             transition-colors duration-200
             placeholder:text-neutral-400
             focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
             disabled:cursor-not-allowed disabled:opacity-50
             dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500`,
            error
              ? 'border-error-500 focus:ring-error-500 focus:border-error-500'
              : 'border-neutral-200 dark:border-neutral-700',
            leftElement && 'pl-10',
            rightElement && 'pr-10',
            className
          )}
          ref={ref}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';