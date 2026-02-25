import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Hourglass, Search } from "lucide-react";
import type { Route } from "./+types/_app.accounting.reports.ap-aging";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency } from "~/lib/utils";
import { useAPAgingReport } from "~/hooks/useAccountingReports";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
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
    { title: "Cartera CxP - StockFlow" },
    { name: "description", content: "Informe de cartera por edades - Cuentas por Pagar" },
  ];
};

export default function APAgingPage() {
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const { data, isLoading, isError } = useAPAgingReport(asOfDate);

  return (
    <PageWrapper>
      <PageSection className="flex items-center gap-4">
        <Link to="/accounting/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-error-50 text-error-500 dark:bg-error-900/20">
            <Hourglass className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Cartera CxP por Edades
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Ordenes de compra pendientes agrupadas por proveedor y antiguedad
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="space-y-2 w-full sm:w-auto">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Fecha de corte
                </label>
                <Input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                />
              </div>
              <Button
                leftIcon={<Search className="h-4 w-4" />}
                disabled={!asOfDate}
              >
                Consultar
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection>
        <Card padding="none">
          <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <CardTitle>Cuentas por Pagar</CardTitle>
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
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-right">Vigente</TableHead>
                    <TableHead className="text-right">1-30</TableHead>
                    <TableHead className="text-right">31-60</TableHead>
                    <TableHead className="text-right">61-90</TableHead>
                    <TableHead className="text-right">90+</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={7} />
                  ))}
                </TableBody>
              </Table>
            ) : isError ? (
              <EmptyState
                type="error"
                title="Error al cargar el informe"
                description="Hubo un problema al consultar los datos. Por favor, intenta de nuevo."
                action={{
                  label: "Reintentar",
                  onClick: () => window.location.reload(),
                }}
              />
            ) : !data || data.rows.length === 0 ? (
              <EmptyState
                icon={<Hourglass className="h-16 w-16" />}
                title="Sin datos"
                description="No se encontraron ordenes de compra pendientes para la fecha seleccionada."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Vigente</TableHead>
                      <TableHead className="text-right">1-30 dias</TableHead>
                      <TableHead className="text-right">31-60 dias</TableHead>
                      <TableHead className="text-right">61-90 dias</TableHead>
                      <TableHead className="text-right">90+ dias</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row) => (
                      <TableRow key={row.supplierId}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{row.supplierName}</span>
                            <span className="block text-xs text-neutral-400">
                              {row.supplierDocument}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.current > 0 ? formatCurrency(row.current) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-warning-600 dark:text-warning-400">
                          {row.days1to30 > 0 ? formatCurrency(row.days1to30) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-warning-700 dark:text-warning-300">
                          {row.days31to60 > 0 ? formatCurrency(row.days31to60) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-error-500 dark:text-error-400">
                          {row.days61to90 > 0 ? formatCurrency(row.days61to90) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-error-700 dark:text-error-300 font-medium">
                          {row.days90plus > 0 ? formatCurrency(row.days90plus) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-bold">
                          {formatCurrency(row.totalBalance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-bold">Totales</TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {formatCurrency(data.totals.current)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-warning-600 dark:text-warning-400">
                        {formatCurrency(data.totals.days1to30)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-warning-700 dark:text-warning-300">
                        {formatCurrency(data.totals.days31to60)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-error-500 dark:text-error-400">
                        {formatCurrency(data.totals.days61to90)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-error-700 dark:text-error-300">
                        {formatCurrency(data.totals.days90plus)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {formatCurrency(data.totals.totalBalance)}
                      </TableCell>
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
