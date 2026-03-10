import { Download } from "lucide-react";
import { Button } from "./Button";
import { exportToCSV, type ExportColumn } from "~/lib/export-utils";
import { toast } from "./Toast";

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
  const handleExport = () => {
    if (data.length === 0) {
      toast.warning("No hay datos para exportar");
      return;
    }
    try {
      const date = new Date().toISOString().split("T")[0];
      exportToCSV(data, columns, `${filename}-${date}`);
      toast.success(`${data.length} registros exportados`);
    } catch {
      toast.error("Error al exportar los datos");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      leftIcon={<Download className="h-4 w-4" />}
    >
      <span className="hidden sm:inline">Exportar</span>
    </Button>
  );
}
