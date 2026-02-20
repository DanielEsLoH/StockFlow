import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, TrendingUp, Search, Calendar } from "lucide-react";
import type { Route } from "./+types/_app.accounting.reports.income-statement";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency } from "~/lib/utils";
import { useIncomeStatement } from "~/hooks/useAccountingReports";
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
import type { ReportSection, AccountBalance } from "~/types/accounting";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Estado de Resultados - StockFlow" },
    { name: "description", content: "Estado de resultados contable" },
  ];
};

function AccountSection({
  title,
  section,
  isLoading,
}: {
  title: string;
  section?: ReportSection;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Table>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonTableRow key={i} columns={3} />
          ))}
        </TableBody>
      </Table>
    );
  }

  if (!section || section.accounts.length === 0) {
    return (
      <div className="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400">
        Sin cuentas en esta seccion
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Codigo</TableHead>
          <TableHead>Cuenta</TableHead>
          <TableHead className="text-right">Monto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {section.accounts.map((account: AccountBalance) => (
          <TableRow key={account.accountId}>
            <TableCell>
              <code className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                {account.code}
              </code>
            </TableCell>
            <TableCell className="font-medium">{account.name}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(account.balance)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2} className="font-bold">
            Total {title}
          </TableCell>
          <TableCell className="text-right tabular-nums font-bold">
            {formatCurrency(section.total)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

export default function IncomeStatementPage() {
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

  const { data, isLoading, isError } = useIncomeStatement(fromDate, toDate);

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
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Estado de Resultados
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Ingresos, costos y gastos del periodo
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

      {isError ? (
        <PageSection>
          <Card>
            <CardContent>
              <EmptyState
                type="error"
                title="Error al cargar el estado de resultados"
                description="Hubo un problema al consultar los datos. Por favor, intenta de nuevo."
                action={{
                  label: "Reintentar",
                  onClick: () => window.location.reload(),
                }}
              />
            </CardContent>
          </Card>
        </PageSection>
      ) : (
        <>
          <PageSection>
            <Card padding="none">
              <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <CardTitle>Ingresos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <AccountSection
                  title="Ingresos"
                  section={data?.revenue}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </PageSection>

          <PageSection>
            <Card padding="none">
              <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <CardTitle>Costo de Ventas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <AccountSection
                  title="Costo de Ventas"
                  section={data?.cogs}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </PageSection>

          {data && (
            <PageSection>
              <Card variant="soft-success">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-success-700 dark:text-success-300">
                      Utilidad Bruta
                    </span>
                    <span className="text-xl font-bold tabular-nums text-success-700 dark:text-success-300">
                      {formatCurrency(data.grossProfit)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </PageSection>
          )}

          <PageSection>
            <Card padding="none">
              <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <CardTitle>Gastos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <AccountSection
                  title="Gastos"
                  section={data?.expenses}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </PageSection>

          {data && (
            <PageSection>
              <Card
                variant={data.netIncome >= 0 ? "soft-success" : "soft-error"}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-lg font-bold ${data.netIncome >= 0 ? "text-success-700 dark:text-success-300" : "text-error-700 dark:text-error-300"}`}
                    >
                      Utilidad Neta
                    </span>
                    <span
                      className={`text-2xl font-bold tabular-nums ${data.netIncome >= 0 ? "text-success-700 dark:text-success-300" : "text-error-700 dark:text-error-300"}`}
                    >
                      {formatCurrency(data.netIncome)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </PageSection>
          )}
        </>
      )}
    </PageWrapper>
  );
}
