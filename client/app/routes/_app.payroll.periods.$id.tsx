import { Link, useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Calculator,
  CheckCircle,
  Lock,
  DollarSign,
  Users,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { Route } from "./+types/_app.payroll.periods.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency, formatDate } from "~/lib/utils";
import {
  usePayrollPeriod,
  useCalculatePeriod,
  useApprovePeriod,
  useClosePeriod,
} from "~/hooks/usePayroll";
import {
  PayrollPeriodStatusLabels,
  PayrollPeriodStatusVariants,
  PayrollPeriodTypeLabels,
  PayrollEntryStatusLabels,
  PayrollEntryStatusVariants,
} from "~/types/payroll";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  AnimatedTableRow,
} from "~/components/ui/Table";
import { EmptyState } from "~/components/ui/EmptyState";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";

export const meta: Route.MetaFunction = () => [
  { title: "Periodo de Nomina - StockFlow" },
  { name: "description", content: "Detalle del periodo de nomina" },
];

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-6"><Skeleton className="h-60 w-full" /></CardContent></Card>
    </div>
  );
}

export default function PayrollPeriodDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { data: period, isLoading, isError } = usePayrollPeriod(id!);
  const calculatePeriod = useCalculatePeriod();
  const approvePeriod = useApprovePeriod();
  const closePeriod = useClosePeriod();

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !period) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Calculator className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Periodo no encontrado
        </h2>
        <Link to="/payroll/periods">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a periodos
          </Button>
        </Link>
      </div>
    );
  }

  const canCalculate = period.status === "OPEN" || period.status === "CALCULATING";
  const canApprove = period.status === "CALCULATED";
  const canClose = period.status === "APPROVED" || period.status === "SENT_TO_DIAN";

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Link to="/payroll/periods">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                  {period.name}
                </h1>
                <Badge variant={PayrollPeriodStatusVariants[period.status] as any} dot>
                  {PayrollPeriodStatusLabels[period.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                <Badge variant="outline">{PayrollPeriodTypeLabels[period.periodType]}</Badge>
                <span>{formatDate(period.startDate)} — {formatDate(period.endDate)}</span>
                <span>Pago: {formatDate(period.paymentDate)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-14 sm:ml-0">
            {hasPermission(Permission.PAYROLL_EDIT) && canCalculate && (
              <Button
                variant="soft-primary"
                onClick={() => calculatePeriod.mutate(id!)}
                isLoading={calculatePeriod.isPending}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calcular
              </Button>
            )}
            {hasPermission(Permission.PAYROLL_APPROVE) && canApprove && (
              <Button
                variant="gradient"
                onClick={() => approvePeriod.mutate(id!)}
                isLoading={approvePeriod.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar
              </Button>
            )}
            {hasPermission(Permission.PAYROLL_APPROVE) && canClose && (
              <Button
                variant="outline"
                onClick={() => closePeriod.mutate(id!)}
                isLoading={closePeriod.isPending}
              >
                <Lock className="h-4 w-4 mr-2" />
                Cerrar
              </Button>
            )}
          </div>
        </div>
      </PageSection>

      {/* Stats */}
      <PageSection>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="soft-primary" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20">
                <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {period.employeeCount}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Empleados</p>
              </div>
            </div>
          </Card>
          <Card variant="soft-success" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-500/20">
                <TrendingUp className="h-5 w-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
                  {formatCurrency(period.totalDevengados)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Devengados</p>
              </div>
            </div>
          </Card>
          <Card variant="soft-warning" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/20">
                <TrendingDown className="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
                  {formatCurrency(period.totalDeducciones)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Deducciones</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-500/20">
                <DollarSign className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
                  {formatCurrency(period.totalNeto)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Neto a Pagar</p>
              </div>
            </div>
          </Card>
        </div>
      </PageSection>

      {/* Notes */}
      {period.notes && (
        <PageSection>
          <Card>
            <CardHeader><CardTitle>Notas</CardTitle></CardHeader>
            <CardContent>
              <p className="text-neutral-700 dark:text-neutral-300">{period.notes}</p>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Entries Table */}
      <PageSection>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Entradas de Nomina ({period.entries?.length || 0})</CardTitle>
          </CardHeader>
          {!period.entries || period.entries.length === 0 ? (
            <EmptyState
              icon={<Users className="h-16 w-16" />}
              title="Sin entradas"
              description={
                canCalculate
                  ? "Calcula el periodo para generar las entradas de nomina."
                  : "No hay entradas de nomina para este periodo."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="hidden sm:table-cell">Numero</TableHead>
                  <TableHead className="hidden md:table-cell">Dias</TableHead>
                  <TableHead className="hidden lg:table-cell">Devengados</TableHead>
                  <TableHead className="hidden lg:table-cell">Deducciones</TableHead>
                  <TableHead>Neto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {period.entries.map((entry, i) => (
                  <AnimatedTableRow
                    key={entry.id}
                    index={i}
                    className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    onClick={() => navigate(`/payroll/entries/${entry.id}`)}
                  >
                    <TableCell>
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {entry.employeeName || "—"}
                      </span>
                      {entry.employeeDocument && (
                        <p className="text-xs text-neutral-500">{entry.employeeDocument}</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm text-neutral-600 dark:text-neutral-300 font-mono">
                        {entry.entryNumber}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="tabular-nums">{entry.daysWorked}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="tabular-nums text-success-600 dark:text-success-400">
                        {formatCurrency(entry.totalDevengados)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="tabular-nums text-error-600 dark:text-error-400">
                        {formatCurrency(entry.totalDeducciones)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold tabular-nums text-neutral-900 dark:text-white">
                        {formatCurrency(entry.totalNeto)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={PayrollEntryStatusVariants[entry.status] as any}>
                        {PayrollEntryStatusLabels[entry.status]}
                      </Badge>
                    </TableCell>
                  </AnimatedTableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
