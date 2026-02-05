import { cn } from "~/lib/utils";

export interface SwitchProps {
  /** Whether the switch is checked/on */
  checked: boolean;
  /** Callback when the switch state changes */
  onChange: (checked: boolean) => void;
  /** Optional label to display next to the switch */
  label?: string;
  /** Size variant */
  size?: "sm" | "md";
  /** Whether the switch is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A toggle switch component for binary on/off states.
 *
 * @example
 * ```tsx
 * <Switch
 *   checked={ivaEnabled}
 *   onChange={setIvaEnabled}
 *   label="IVA (19%)"
 *   size="sm"
 * />
 * ```
 */
export function Switch({
  checked,
  onChange,
  label,
  size = "md",
  disabled = false,
  className,
}: SwitchProps) {
  const sizes = {
    sm: {
      track: "w-9 h-5",
      thumb: "w-4 h-4",
      translate: "translate-x-4",
      gap: "gap-2",
    },
    md: {
      track: "w-11 h-6",
      thumb: "w-5 h-5",
      translate: "translate-x-5",
      gap: "gap-3",
    },
  };

  const { track, thumb, translate, gap } = sizes[size];

  return (
    <label
      className={cn(
        "inline-flex items-center cursor-pointer select-none",
        gap,
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        {/* Track */}
        <div
          className={cn(
            "rounded-full transition-colors duration-200",
            track,
            checked
              ? "bg-primary-500"
              : "bg-neutral-200 dark:bg-neutral-700"
          )}
        />
        {/* Thumb */}
        <div
          className={cn(
            "absolute left-0.5 top-1/2 -translate-y-1/2 bg-white rounded-full shadow-sm transition-transform duration-200",
            thumb,
            checked ? translate : "translate-x-0"
          )}
        />
      </div>
      {label && (
        <span className="text-sm text-neutral-700 dark:text-neutral-300">
          {label}
        </span>
      )}
    </label>
  );
}
