import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  Banknote,
  Search,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { Route } from "./+types/_app.accounting.reports.cash-flow";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency, formatDate } from "~/lib/utils";
import { useCashFlow } from "~/hooks/useAccountingReports";
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
import { Skeleton, SkeletonTableRow } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import type { CashFlowMovement } from "~/types/accounting";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Flujo de Efectivo - StockFlow" },
    { name: "description", content: "Reporte de flujo de efectivo" },
  ];
};

function SummaryCard({
  label,
  value,
  icon,
  variant,
  isLoading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant: "default" | "success" | "error" | "primary";
  isLoading: boolean;
}) {
  const colorMap = {
    default: {
      bg: "bg-neutral-50 dark:bg-neutral-800/50",
      icon: "bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400",
      text: "text-neutral-900 dark:text-white",
    },
    success: {
      bg: "bg-success-50/50 dark:bg-success-900/10",
      icon: "bg-success-100 text-success-500 dark:bg-success-900/30 dark:text-success-400",
      text: "text-success-700 dark:text-success-300",
    },
    error: {
      bg: "bg-error-50/50 dark:bg-error-900/10",
      icon: "bg-error-100 text-error-500 dark:bg-error-900/30 dark:text-error-400",
      text: "text-error-700 dark:text-error-300",
    },
    primary: {
      bg: "bg-primary-50/50 dark:bg-primary-900/10",
      icon: "bg-primary-100 text-primary-500 dark:bg-primary-900/30 dark:text-primary-400",
      text: "text-primary-700 dark:text-primary-300",
    },
  };

  const colors = colorMap[variant];

  return (
    <Card padding="sm" className={colors.bg}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.icon}`}>{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {label}
            </p>
            {isLoading ? (
              <Skeleton className="h-6 w-24 mt-1" />
            ) : (
              <p className={`text-lg font-bold tabular-nums ${colors.text}`}>
                {formatCurrency(value)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CashFlowPage() {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split("T")[0];
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);

  const { data, isLoading, isError } = useCashFlow(fromDate, toDate);

  return (
    <PageWrapper>
      <PageSection className="flex items-center gap-4">
        <Link to="/accounting/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-success-50 text-success-500 dark:bg-success-900/20">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Flujo de Efectivo
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Movimientos de entrada y salida de efectivo
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
                  Desde
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2 w-full sm:w-auto">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Hasta
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                leftIcon={<Search className="h-4 w-4" />}
                disabled={!fromDate || !toDate}
              >
                Consultar
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <SummaryCard
            label="Saldo Inicial"
            value={data?.openingBalance ?? 0}
            icon={<Wallet className="h-4 w-4" />}
            variant="default"
            isLoading={isLoading}
          />
          <SummaryCard
            label="Ingresos"
            value={data?.totalInflows ?? 0}
            icon={<ArrowUpRight className="h-4 w-4" />}
            variant="success"
            isLoading={isLoading}
          />
          <SummaryCard
            label="Egresos"
            value={data?.totalOutflows ?? 0}
            icon={<ArrowDownRight className="h-4 w-4" />}
            variant="error"
            isLoading={isLoading}
          />
          <SummaryCard
            label="Cambio Neto"
            value={data?.netChange ?? 0}
            icon={<TrendingUp className="h-4 w-4" />}
            variant="primary"
            isLoading={isLoading}
          />
          <SummaryCard
            label="Saldo Final"
            value={data?.closingBalance ?? 0}
            icon={<Banknote className="h-4 w-4" />}
            variant="default"
            isLoading={isLoading}
          />
        </div>
      </PageSection>

      <PageSection>
        <Card padding="none">
          <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
            <CardTitle>Movimientos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead># Asiento</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                    <TableHead className="text-right">Salida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={5} />
                  ))}
                </TableBody>
              </Table>
            ) : isError ? (
              <EmptyState
                type="error"
                title="Error al cargar el flujo de efectivo"
                description="Hubo un problema al consultar los datos. Por favor, intenta de nuevo."
                action={{
                  label: "Reintentar",
                  onClick: () => window.location.reload(),
                }}
              />
            ) : !data || data.movements.length === 0 ? (
              <EmptyState
                icon={<Banknote className="h-16 w-16" />}
                title="Sin movimientos"
                description="No se encontraron movimientos de efectivo en el periodo seleccionado."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead># Asiento</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                    <TableHead className="text-right">Salida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.movements.map(
                    (mov: CashFlowMovement, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">
                          {formatDate(mov.date)}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {mov.entryNumber}
                          </span>
                        </TableCell>
                        <TableCell>{mov.description}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {mov.inflow > 0 ? (
                            <span className="text-success-600 dark:text-success-400">
                              {formatCurrency(mov.inflow)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {mov.outflow > 0 ? (
                            <span className="text-error-600 dark:text-error-400">
                              {formatCurrency(mov.outflow)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-bold">
                      Totales
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-success-600 dark:text-success-400">
                      {formatCurrency(data.totalInflows)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-error-600 dark:text-error-400">
                      {formatCurrency(data.totalOutflows)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
