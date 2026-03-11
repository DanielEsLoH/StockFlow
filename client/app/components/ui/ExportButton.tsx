import { useState } from "react";
import { Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { exportToCSV, exportToExcel, type ExportColumn } from "~/lib/export-utils";
import { toast } from "./Toast";
import { cn } from "~/lib/utils";

interface ExportButtonProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  disabled?: boolean;
}

export function ExportButton<T>({
  data,
  columns,
  filename,
  disabled,
}: ExportButtonProps<T>) {
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = () => {
    if (data.length === 0) {
      toast.warning("No hay datos para exportar");
      return;
    }
    try {
      const date = new Date().toISOString().split("T")[0];
      exportToCSV(data, columns, `${filename}-${date}`);
      toast.success(`${data.length} registros exportados como CSV`);
    } catch {
      toast.error("Error al exportar los datos");
    }
  };

  const handleExportExcel = async () => {
    if (data.length === 0) {
      toast.warning("No hay datos para exportar");
      return;
    }
    setExporting(true);
    try {
      const date = new Date().toISOString().split("T")[0];
      await exportToExcel(data, columns, `${filename}-${date}`);
      toast.success(`${data.length} registros exportados como Excel`);
    } catch {
      toast.error("Error al exportar los datos");
    } finally {
      setExporting(false);
    }
  };

  const isDisabled = disabled || data.length === 0 || exporting;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          disabled={isDisabled}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600",
            "bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm font-medium",
            "text-neutral-700 dark:text-neutral-200",
            "hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors",
            "disabled:opacity-50 disabled:pointer-events-none",
          )}
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className={cn(
            "z-50 min-w-[180px] rounded-lg border border-neutral-200 dark:border-neutral-700",
            "bg-white dark:bg-neutral-800 p-1 shadow-lg",
            "animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2",
          )}
        >
          <DropdownMenu.Item
            onSelect={handleExportCSV}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm cursor-pointer",
              "text-neutral-700 dark:text-neutral-200 outline-none",
              "hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:bg-neutral-100 dark:focus:bg-neutral-700",
            )}
          >
            <FileText className="h-4 w-4 text-neutral-500" />
            CSV (.csv)
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={handleExportExcel}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm cursor-pointer",
              "text-neutral-700 dark:text-neutral-200 outline-none",
              "hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:bg-neutral-100 dark:focus:bg-neutral-700",
            )}
          >
            <FileSpreadsheet className="h-4 w-4 text-success-600 dark:text-success-400" />
            Excel (.xlsx)
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
