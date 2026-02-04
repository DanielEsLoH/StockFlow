import { useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/Input";

interface QuickSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  shortcutKey?: string;
}

export function QuickSearch({
  value,
  onChange,
  placeholder = "Buscar productos... (F2)",
  className,
  autoFocus = false,
  shortcutKey = "F2",
}: QuickSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle keyboard shortcut to focus search
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === shortcutKey) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      // Escape to clear and blur
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        onChange("");
        inputRef.current?.blur();
      }
    },
    [shortcutKey, onChange],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        leftElement={<Search className="h-4 w-4 text-neutral-400" />}
        rightElement={
          value ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-xs text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 sm:inline-block">
              {shortcutKey}
            </kbd>
          )
        }
        className="h-12 rounded-xl pl-11 pr-12 text-base"
      />
    </div>
  );
}
