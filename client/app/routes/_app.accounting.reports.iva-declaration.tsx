import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Receipt, Download, Search } from "lucide-react";
import type { Route } from "./+types/_app.accounting.reports.iva-declaration";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency } from "~/lib/utils";
import { useIvaDeclaration } from "~/hooks/useAccountingReports";
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

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Declaracion de IVA - StockFlow" },
    { name: "description", content: "Declaracion bimestral de IVA" },
  ];
};

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-indexed
const currentPeriod = Math.floor(currentMonth / 2) + 1;

const BIMONTHLY_LABELS: Record<number, string> = {
  1: "Enero - Febrero",
  2: "Marzo - Abril",
  3: "Mayo - Junio",
  4: "Julio - Agosto",
  5: "Septiembre - Octubre",
  6: "Noviembre - Diciembre",
};

function formatTaxRate(rate: number) {
  return `${rate}%`;
}

export default function IvaDeclarationPage() {
  const [year, setYear] = useState(currentYear);
  const [period, setPeriod] = useState(currentPeriod);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError } = useIvaDeclaration(year, period);

  async function handleDownload(format: "pdf" | "excel") {
    setDownloading(true);
    try {
      const { blob, fileName } = await accountingService.downloadIvaDeclaration(
        year,
        period,
        format,
      );
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
          <div className="p-2.5 rounded-xl bg-primary-50 text-primary-500 dark:bg-primary-900/20">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Declaracion de IVA
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              IVA generado vs descontable por periodo bimestral
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
                  Periodo Bimestral
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                >
                  {[1, 2, 3, 4, 5, 6].map((p) => (
                    <option key={p} value={p}>
                      {p} - {BIMONTHLY_LABELS[p]}
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

      {/* IVA Generado (Ventas) */}
      <PageSection>
        <Card padding="none">
          <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
            <CardTitle>IVA Generado (Ventas)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarifa</TableHead>
                    <TableHead className="text-right">Base Gravable</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Facturas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={4} />
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
            ) : !data || (data.salesByRate.length === 0 && data.salesExempt.length === 0) ? (
              <EmptyState
                icon={<Receipt className="h-16 w-16" />}
                title="Sin datos de ventas"
                description="No se encontraron facturas de venta para el periodo seleccionado."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarifa</TableHead>
                      <TableHead className="text-right">Base Gravable</TableHead>
                      <TableHead className="text-right">IVA</TableHead>
                      <TableHead className="text-right">Facturas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.salesByRate.map((row) => (
                      <TableRow key={`rate-${row.taxRate}`}>
                        <TableCell className="font-medium">
                          {formatTaxRate(row.taxRate)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.taxableBase)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.taxAmount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.invoiceCount}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.salesExempt.map((row) => (
                      <TableRow key={`exempt-${row.category}`}>
                        <TableCell className="font-medium">
                          {row.category === "EXENTO" ? "Exento" : "Excluido"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.taxableBase)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-neutral-400">
                          —
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.invoiceCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-bold">Total Ventas</TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {formatCurrency(data.totalSalesBase)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {formatCurrency(data.totalIvaGenerado)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>

      {/* IVA Descontable (Compras) */}
      <PageSection>
        <Card padding="none">
          <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
            <CardTitle>IVA Descontable (Compras)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarifa</TableHead>
                    <TableHead className="text-right">Base Gravable</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Ordenes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={4} />
                  ))}
                </TableBody>
              </Table>
            ) : !data || (data.purchasesByRate.length === 0 && data.purchasesExempt.length === 0) ? (
              <EmptyState
                icon={<Receipt className="h-16 w-16" />}
                title="Sin datos de compras"
                description="No se encontraron ordenes de compra recibidas para el periodo."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarifa</TableHead>
                      <TableHead className="text-right">Base Gravable</TableHead>
                      <TableHead className="text-right">IVA</TableHead>
                      <TableHead className="text-right">Ordenes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.purchasesByRate.map((row) => (
                      <TableRow key={`prate-${row.taxRate}`}>
                        <TableCell className="font-medium">
                          {formatTaxRate(row.taxRate)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.taxableBase)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.taxAmount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.invoiceCount}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.purchasesExempt.map((row) => (
                      <TableRow key={`pexempt-${row.category}`}>
                        <TableCell className="font-medium">
                          {row.category === "EXENTO" ? "Exento" : "Excluido"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.taxableBase)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-neutral-400">
                          —
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.invoiceCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-bold">Total Compras</TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {formatCurrency(data.totalPurchasesBase)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {formatCurrency(data.totalIvaDescontable)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>

      {/* Net IVA Summary */}
      {data && (
        <PageSection>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    IVA Generado
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1 tabular-nums">
                    {formatCurrency(data.totalIvaGenerado)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    IVA Descontable
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1 tabular-nums">
                    {formatCurrency(data.totalIvaDescontable)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    IVA Neto a Pagar
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 tabular-nums ${
                      data.netIvaPayable >= 0
                        ? "text-error-600 dark:text-error-400"
                        : "text-success-600 dark:text-success-400"
                    }`}
                  >
                    {formatCurrency(data.netIvaPayable)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      )}
    </PageWrapper>
  );
}
