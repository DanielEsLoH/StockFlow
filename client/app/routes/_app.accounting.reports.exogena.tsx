import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, FileSpreadsheet, Download } from "lucide-react";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency } from "~/lib/utils";
import { useExogena } from "~/hooks/useAccountingReports";
import { accountingService } from "~/services/accounting.service";
import { Button } from "~/components/ui/Button";
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
import { Badge } from "~/components/ui/Badge";

export const meta = () => [
  { title: "Informacion Exogena - StockFlow" },
  { name: "description", content: "Medios magneticos anuales para la DIAN" },
];

const currentYear = new Date().getFullYear();

export default function ExogenaPage() {
  const [year, setYear] = useState(currentYear);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError } = useExogena(year);

  async function handleDownload() {
    setDownloading(true);
    try {
      const { blob, fileName } = await accountingService.downloadExogena(year);
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

  const totalTerceros = data
    ? data.formatos.reduce((sum, f) => sum + f.rows.length, 0)
    : 0;

  return (
    <PageWrapper>
      <PageSection className="flex items-center gap-4">
        <Link to="/accounting/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-50 text-primary-500 dark:bg-primary-900/20">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Informacion Exogena
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Medios magneticos anuales para la DIAN
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
                  Ano Gravable
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
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={handleDownload}
                  disabled={downloading || !data}
                >
                  Descargar Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Summary Card */}
      {data && (
        <PageSection>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
                <div className="text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    NIT
                  </p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
                    {data.tenantNit}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Empresa
                  </p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
                    {data.tenantName}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Ano Gravable
                  </p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1 tabular-nums">
                    {data.year}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Total Formatos
                  </p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1 tabular-nums">
                    {data.formatos.length}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Total Terceros
                  </p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1 tabular-nums">
                    {totalTerceros}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Error State */}
      {isError && (
        <PageSection>
          <Card>
            <CardContent className="p-0">
              <EmptyState
                type="error"
                title="Error al cargar el informe"
                description="No se pudieron obtener los datos. Intenta de nuevo."
                action={{
                  label: "Reintentar",
                  onClick: () => window.location.reload(),
                }}
              />
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Loading State */}
      {isLoading && (
        <PageSection>
          <Card padding="none">
            <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <CardTitle>Cargando formatos...</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Tipo Doc</TableHead>
                    <TableHead>No. Documento</TableHead>
                    <TableHead>DV</TableHead>
                    <TableHead>Razon Social</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={7} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Formato Cards */}
      {data &&
        data.formatos.map((formato) => (
          <PageSection key={formato.formatNumber}>
            <Card padding="none">
              <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <CardTitle>
                    F{formato.formatNumber} - {formato.name}
                  </CardTitle>
                  <Badge variant="secondary">{formato.rows.length} terceros</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {formato.rows.length === 0 ? (
                  <EmptyState
                    icon={<FileSpreadsheet className="h-16 w-16" />}
                    title="Sin datos para este formato"
                    description="No se encontraron registros de terceros para este formato en el ano seleccionado."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Tipo Doc</TableHead>
                          <TableHead>No. Documento</TableHead>
                          <TableHead>DV</TableHead>
                          <TableHead>Razon Social</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead className="text-right">IVA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formato.rows.map((row, idx) => (
                          <TableRow key={`${formato.formatNumber}-${row.documentNumber}-${idx}`}>
                            <TableCell className="font-medium">
                              {row.conceptCode}
                            </TableCell>
                            <TableCell>{row.documentType}</TableCell>
                            <TableCell className="tabular-nums">
                              {row.documentNumber}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {row.dv}
                            </TableCell>
                            <TableCell>{row.businessName}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(row.amount)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(row.taxAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={5} className="font-bold">
                            Total
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-bold">
                            {formatCurrency(formato.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-bold">
                            {formatCurrency(formato.totalTaxAmount)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </PageSection>
        ))}
    </PageWrapper>
  );
}
