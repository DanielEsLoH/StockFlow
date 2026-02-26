import { Calendar } from "lucide-react";
import { Input } from "~/components/ui/Input";

interface DateFilterInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder: string;
}

export function DateFilterInput({ value, onChange, placeholder }: DateFilterInputProps) {
  return (
    <div className="relative">
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
      <Input
        type="date"
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="pl-10"
      />
    </div>
  );
}
