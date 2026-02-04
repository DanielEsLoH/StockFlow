import { forwardRef } from 'react';
import { cn } from '~/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border bg-white px-3 py-2 text-sm',
          'placeholder:text-neutral-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500',
          error
            ? 'border-error-500 focus:ring-error-500 focus:border-error-500'
            : 'border-neutral-300 dark:border-neutral-600',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
