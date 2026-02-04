import * as React from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "~/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "onChange"
> {
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  onChange?: (value: string) => void;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, options, placeholder, error, onChange, value, ...props },
    ref,
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className="relative">
        <select
          ref={ref}
          value={value}
          onChange={handleChange}
          className={cn(
            `flex h-11 w-full appearance-none rounded-xl border bg-white px-4 py-2 pr-10 text-sm
             transition-colors duration-200
             focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
             disabled:cursor-not-allowed disabled:opacity-50
             dark:bg-neutral-900 dark:text-white`,
            error
              ? "border-error-500 focus:ring-error-500 focus:border-error-500"
              : "border-neutral-200 dark:border-neutral-700",
            !value && "text-neutral-400 dark:text-neutral-500",
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      </div>
    );
  },
);

Select.displayName = "Select";

// Native select with label wrapper
interface SelectFieldProps extends SelectProps {
  label?: string;
  helperText?: string;
  errorMessage?: string;
}

export function SelectField({
  label,
  helperText,
  errorMessage,
  error,
  className,
  ...props
}: SelectFieldProps) {
  const hasError = error || !!errorMessage;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <Select error={hasError} {...props} />
      {(helperText || errorMessage) && (
        <p
          className={cn(
            "text-sm",
            hasError
              ? "text-error-500"
              : "text-neutral-500 dark:text-neutral-400",
          )}
        >
          {errorMessage || helperText}
        </p>
      )}
    </div>
  );
}

// Multi-select component using checkboxes (simplified)
interface MultiSelectProps {
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  className,
  error,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const selectedLabels = options
    .filter((opt) => value.includes(opt.value))
    .map((opt) => opt.label);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          `flex min-h-11 w-full items-center justify-between rounded-xl border bg-white px-4 py-2 text-sm
           transition-colors duration-200
           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
           dark:bg-neutral-900`,
          error
            ? "border-error-500 focus:ring-error-500"
            : "border-neutral-200 dark:border-neutral-700",
        )}
      >
        <div className="flex flex-1 flex-wrap gap-1">
          {selectedLabels.length > 0 ? (
            selectedLabels.map((label, index) => (
              <span
                key={value[index]}
                className="inline-flex items-center gap-1 rounded-md bg-primary-100 px-2 py-0.5 text-xs text-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
              >
                {label}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => removeOption(value[index], e)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      removeOption(
                        value[index],
                        e as unknown as React.MouseEvent,
                      );
                    }
                  }}
                  className="hover:text-primary-600 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </span>
              </span>
            ))
          ) : (
            <span className="text-neutral-400 dark:text-neutral-500">
              {placeholder}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-neutral-400 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {options.map((option) => {
            const isSelected = value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleOption(option.value)}
                disabled={option.disabled}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2 text-left text-sm",
                  "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                  isSelected && "bg-primary-50 dark:bg-primary-900/20",
                  option.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    isSelected
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-neutral-300 dark:border-neutral-600",
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
                <span className="text-neutral-900 dark:text-white">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
