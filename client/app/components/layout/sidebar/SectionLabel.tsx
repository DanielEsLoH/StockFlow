import { cn } from "~/lib/utils";

interface SectionLabelProps {
  label: string;
  isFirst?: boolean;
}

export function SectionLabel({ label, isFirst = false }: SectionLabelProps) {
  return (
    <h3
      className={cn(
        "sidebar-label px-3 pb-1.5",
        isFirst ? "pt-2" : "pt-5",
      )}
    >
      {label}
    </h3>
  );
}
