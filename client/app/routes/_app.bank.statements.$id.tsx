import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  FileSpreadsheet,
  Calendar,
  GitCompareArrows,
} from "lucide-react";
import type { Route } from "./+types/_app.bank.statements.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency, formatDate } from "~/lib/utils";
import { useBankStatement } from "~/hooks/useBank";
import type { BankStatementStatus, ReconciliationStatus } from "~/types/bank";
import {
  BankStatementStatusLabels,
  ReconciliationStatusLabels,
} from "~/types/bank";
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
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Extracto Bancario - StockFlow" },
    { name: "description", content: "Detalle del extracto bancario" },
  ];
};

const statementStatusVariant: Record<BankStatementStatus, string> = {
  IMPORTED: "warning",
  PARTIALLY_RECONCILED: "primary",
  RECONCILED: "success",
};

const lineStatusVariant: Record<ReconciliationStatus, string> = {
  MATCHED: "success",
  UNMATCHED: "warning",
  MANUALLY_MATCHED: "primary",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function BankStatementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = usePermissions();

  const { data: statement, isLoading, isError } = useBankStatement(id!);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !statement) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileSpreadsheet className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Extracto no encontrado
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          El extracto bancario que buscas no existe o fue eliminado.
        </p>
        <Link to="/bank/accounts">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a cuentas
          </Button>
        </Link>
      </div>
    );
  }

  const lines = statement.lines || [];

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Link to={`/bank/accounts/${statement.bankAccountId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                <FileSpreadsheet className="h-7 w-7 text-primary-500" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                    {statement.fileName}
                  </h1>
                  <Badge
                    variant={
                      statementStatusVariant[statement.status] as
                        | "warning"
                        | "primary"
                        | "success"
                    }
                  >
                    {BankStatementStatusLabels[statement.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-neutral-500 dark:text-neutral-400">
                  <span>{statement.bankAccountName}</span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(statement.periodStart)} -{" "}
                    {formatDate(statement.periodEnd)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {hasPermission(Permission.BANK_RECONCILE) &&
            statement.status !== "RECONCILED" && (
              <Link to={`/bank/reconciliation/${statement.id}`}>
                <Button variant="gradient">
                  <GitCompareArrows className="h-4 w-4 mr-2" />
                  Conciliar
                </Button>
              </Link>
            )}
        </div>
      </PageSection>

      {/* Info & Progress */}
      <PageSection>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Cuenta
                </p>
                <p className="font-semibold text-neutral-900 dark:text-white mt-1">
                  {statement.bankAccountName}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Lineas Totales
                </p>
                <p className="font-semibold text-neutral-900 dark:text-white mt-1">
                  {statement.totalLines}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Conciliadas
                </p>
                <p className="font-semibold text-neutral-900 dark:text-white mt-1">
                  {statement.matchedLines} de {statement.totalLines}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Progreso
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                    <div
                      className="h-3 bg-gradient-to-r from-primary-500 to-success-500 rounded-full transition-all"
                      style={{ width: `${statement.matchPercentage}%` }}
                    />
                  </div>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {statement.matchPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Lines Table */}
      <PageSection>
        <Card variant="elevated">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Lineas del Extracto
            </h2>
          </div>

          {lines.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="h-16 w-16" />}
              title="Sin lineas"
              description="Este extracto no tiene lineas registradas."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Referencia
                  </TableHead>
                  <TableHead className="text-right">Debito</TableHead>
                  <TableHead className="text-right">Credito</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">
                    Saldo
                  </TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, i) => (
                  <AnimatedTableRow key={line.id} index={i}>
                    <TableCell>
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {formatDate(line.lineDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-neutral-900 dark:text-white text-sm">
                        {line.description}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">
                        {line.reference || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {line.debit > 0 ? (
                        <span className="font-medium text-error-600 dark:text-error-400">
                          {formatCurrency(line.debit)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.credit > 0 ? (
                        <span className="font-medium text-success-600 dark:text-success-400">
                          {formatCurrency(line.credit)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell">
                      {line.balance !== null ? (
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {formatCurrency(line.balance)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          lineStatusVariant[line.status] as
                            | "success"
                            | "warning"
                            | "primary"
                        }
                      >
                        {ReconciliationStatusLabels[line.status]}
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
