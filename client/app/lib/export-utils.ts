export interface ExportColumn<T> {
  key: string;
  label: string;
  format?: (value: unknown, row: T) => string;
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  fileName: string,
): void {
  const BOM = "\uFEFF";
  const header = columns.map((c) => escapeCSVField(c.label)).join(",");

  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = getNestedValue(row, col.key);
        const value = col.format
          ? col.format(raw, row)
          : raw == null
            ? ""
            : String(raw);
        return escapeCSVField(value);
      })
      .join(","),
  );

  const csv = BOM + [header, ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  fileName: string,
): Promise<void> {
  const XLSX = await import("xlsx");

  const headers = columns.map((c) => c.label);
  const rows = data.map((row) =>
    columns.map((col) => {
      const raw = getNestedValue(row, col.key);
      return col.format ? col.format(raw, row) : raw == null ? "" : raw;
    }),
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Auto-size columns
  ws["!cols"] = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[i] ?? "").length),
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
