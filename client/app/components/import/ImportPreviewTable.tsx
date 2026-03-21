import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import type { ImportValidationResult, ImportValidationRow } from "~/types/import";

interface ImportPreviewTableProps {
  validationResult: ImportValidationResult;
  maxDisplayRows?: number;
}

type RowStatus = "valid" | "error" | "duplicate";

function getRowStatus(row: ImportValidationRow): RowStatus {
  if (row.errors.length > 0) return "error";
  if (row.isDuplicate) return "duplicate";
  return "valid";
}

const statusConfig: Record<
  RowStatus,
  { icon: typeof CheckCircle2; className: string; rowBg: string; label: string }
> = {
  valid: {
    icon: CheckCircle2,
    className: "text-success-500",
    rowBg: "",
    label: "Valido",
  },
  error: {
    icon: XCircle,
    className: "text-error-500",
    rowBg: "bg-error-50/50 dark:bg-error-900/10",
    label: "Error",
  },
  duplicate: {
    icon: AlertTriangle,
    className: "text-warning-500",
    rowBg: "bg-warning-50/50 dark:bg-warning-900/10",
    label: "Duplicado",
  },
};

export function ImportPreviewTable({
  validationResult,
  maxDisplayRows = 100,
}: ImportPreviewTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { rows, validRows, errorRows, duplicateRows, totalRows } = validationResult;
  const displayRows = rows.slice(0, maxDisplayRows);

  // Get data column keys from the first row
  const dataColumns = rows.length > 0 ? Object.keys(rows[0].data) : [];

  const toggleRow = (index: number) => {
    setExpandedRow((prev) => (prev === index ? null : index));
  };

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success" size="md">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          {validRows} validos
        </Badge>
        {errorRows > 0 && (
          <Badge variant="error" size="md">
            <XCircle className="mr-1 h-3.5 w-3.5" />
            {errorRows} errores
          </Badge>
        )}
        {duplicateRows > 0 && (
          <Badge variant="warning" size="md">
            <AlertTriangle className="mr-1 h-3.5 w-3.5" />
            {duplicateRows} duplicados
          </Badge>
        )}
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Total: {totalRows} filas
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-50 dark:bg-neutral-800/50">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="w-24">Estado</TableHead>
              {dataColumns.map((col) => (
                <TableHead key={col} className="min-w-[120px]">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row, index) => {
              const status = getRowStatus(row);
              const config = statusConfig[status];
              const StatusIcon = config.icon;
              const hasErrors = row.errors.length > 0;
              const isExpanded = expandedRow === index;

              return (
                <motion.tr
                  key={row.row}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index * 0.01, 0.5) }}
                  onClick={() => hasErrors && toggleRow(index)}
                  className={cn(
                    "border-b border-neutral-100 transition-colors dark:border-neutral-800",
                    config.rowBg,
                    hasErrors &&
                      "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/30",
                  )}
                >
                  <TableCell className="text-center text-xs text-neutral-500">
                    {row.row}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={cn("h-4 w-4", config.className)} />
                      <span className="text-xs font-medium">{config.label}</span>
                      {hasErrors &&
                        (isExpanded ? (
                          <ChevronUp className="h-3 w-3 text-neutral-400" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-neutral-400" />
                        ))}
                    </div>
                    <AnimatePresence>
                      {hasErrors && isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-1.5 overflow-hidden"
                        >
                          <ul className="space-y-0.5">
                            {row.errors.map((err, i) => (
                              <li
                                key={i}
                                className="text-xs text-error-600 dark:text-error-400"
                              >
                                &bull; {err}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TableCell>
                  {dataColumns.map((col) => (
                    <TableCell key={col} className="text-sm">
                      {String(row.data[col] ?? "")}
                    </TableCell>
                  ))}
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Truncation notice */}
      {rows.length > maxDisplayRows && (
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          Mostrando {maxDisplayRows} de {rows.length} filas
        </p>
      )}
    </div>
  );
}
