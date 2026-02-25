import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, FileText, Download, Search } from "lucide-react";
import type { Route } from "./+types/_app.accounting.reports.retefuente-summary";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency } from "~/lib/utils";
import { useReteFuenteSummary } from "~/hooks/useAccountingReports";
import { accountingService } from "~/services/accounting.service";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "~/components/ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Resumen ReteFuente - StockFlow" },
    { name: "description", content: "Resumen mensual de retenciones en la fuente por proveedor" },
  ];
};

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const MONTH_LABELS: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

export default function ReteFuenteSummaryPage() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError } = useReteFuenteSummary(year, month);

  async function handleDownload(format: "pdf" | "excel") {
    setDownloading(true);
    try {
      const { blob, fileName } =
        await accountingService.downloadReteFuenteSummary(year, month, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <PageWrapper>
      <PageSection className="flex items-center gap-4">
        <Link to="/accounting/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-50 text-accent-500 dark:bg-accent-900/20">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Resumen ReteFuente
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Retenciones en la fuente mensuales por proveedor
            </p>
          </div>
        </div>
      </PageSection>

      {/* Filters */}
      <PageSection>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="space-y-2 w-full sm:w-auto">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Año
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 w-full sm:w-auto">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Mes
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {MONTH_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                leftIcon={<Search className="h-4 w-4" />}
              >
                Consultar
              </Button>
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={() => handleDownload("pdf")}
                  disabled={downloading || !data}
                >
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={() => handleDownload("excel")}
                  disabled={downloading || !data}
                >
                  Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* ReteFuente Table */}
      <PageSection>
        <Card padding="none">
          <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <CardTitle>Retenciones por Proveedor</CardTitle>
              {data && (
                <span className="text-sm font-medium text-neutral-500">
                  {data.rows.length} proveedor{data.rows.length !== 1 ? "es" : ""}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIT</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Retencion</TableHead>
                    <TableHead className="text-right">Tarifa</TableHead>
                    <TableHead className="text-right">Compras</TableHead>
                    <TableHead>Certificado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={7} />
                  ))}
                </TableBody>
              </Table>
            ) : isError ? (
              <EmptyState
                type="error"
                title="Error al cargar el informe"
                description="No se pudieron obtener los datos. Intenta de nuevo."
                action={{
                  label: "Reintentar",
                  onClick: () => window.location.reload(),
                }}
              />
            ) : !data || data.rows.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-16 w-16" />}
                title="Sin retenciones"
                description="No se encontraron compras con retencion en la fuente para el periodo seleccionado."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NIT</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Retencion</TableHead>
                      <TableHead className="text-right">Tarifa</TableHead>
                      <TableHead className="text-right">Compras</TableHead>
                      <TableHead>Certificado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row) => (
                      <TableRow key={row.supplierId}>
                        <TableCell className="font-mono text-sm">
                          {row.supplierNit}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.supplierName}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.totalBase)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-error-600 dark:text-error-400">
                          {formatCurrency(row.totalWithheld)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(row.withholdingRate * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.purchaseCount}
                        </TableCell>
                        <TableCell>
                          {row.certificateId ? (
                            <Badge variant="success">
                              {row.certificateNumber || "Emitido"}
                            </Badge>
                          ) : (
                            <Badge variant="warning">Pendiente</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell />
                      <TableCell className="font-bold">Totales</TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {formatCurrency(data.totalBase)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-error-600 dark:text-error-400">
                        {formatCurrency(data.totalWithheld)}
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
