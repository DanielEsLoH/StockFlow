import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, BarChart3, Search } from "lucide-react";
import type { Route } from "./+types/_app.accounting.reports.balance-sheet";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency } from "~/lib/utils";
import { useBalanceSheet } from "~/hooks/useAccountingReports";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
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
    { title: "Balance General - StockFlow" },
    { name: "description", content: "Balance general contable" },
  ];
};

function SectionCard({
  title,
  section,
  variant,
  isLoading,
}: {
  title: string;
  section?: ReportSection;
  variant: "success" | "primary" | "warning";
  isLoading: boolean;
}) {
  const colorMap = {
    success: {
      bg: "bg-success-50 dark:bg-success-900/20",
      text: "text-success-700 dark:text-success-300",
      border: "border-success-200 dark:border-success-800",
    },
    primary: {
      bg: "bg-primary-50 dark:bg-primary-900/20",
      text: "text-primary-700 dark:text-primary-300",
      border: "border-primary-200 dark:border-primary-800",
    },
    warning: {
      bg: "bg-warning-50 dark:bg-warning-900/20",
      text: "text-warning-700 dark:text-warning-300",
      border: "border-warning-200 dark:border-warning-800",
    },
  };

  const colors = colorMap[variant];

  return (
    <Card padding="none">
      <CardHeader
        className={`p-4 border-b ${colors.border} ${colors.bg}`}
      >
        <CardTitle className={`text-base ${colors.text}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <Table>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonTableRow key={i} columns={3} />
              ))}
            </TableBody>
          </Table>
        ) : !section || section.accounts.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Sin cuentas en esta seccion
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
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
        )}
      </CardContent>
    </Card>
  );
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const { data, isLoading, isError } = useBalanceSheet(asOfDate);

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
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Balance General
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Situacion financiera a una fecha determinada
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

      {isError ? (
        <PageSection>
          <Card>
            <CardContent>
              <EmptyState
                type="error"
                title="Error al cargar el balance general"
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard
                title="Activos"
                section={data?.assets}
                variant="success"
                isLoading={isLoading}
              />
              <div className="space-y-6">
                <SectionCard
                  title="Pasivos"
                  section={data?.liabilities}
                  variant="primary"
                  isLoading={isLoading}
                />
                <SectionCard
                  title="Patrimonio"
                  section={data?.equity}
                  variant="warning"
                  isLoading={isLoading}
                />
              </div>
            </div>
          </PageSection>

          {data && (
            <PageSection>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                          Total Activos
                        </p>
                        <p className="text-lg font-bold tabular-nums text-neutral-900 dark:text-white">
                          {formatCurrency(data.totalAssets)}
                        </p>
                      </div>
                      <span className="text-2xl text-neutral-300 dark:text-neutral-600">
                        =
                      </span>
                      <div className="text-center">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                          Pasivos + Patrimonio
                        </p>
                        <p className="text-lg font-bold tabular-nums text-neutral-900 dark:text-white">
                          {formatCurrency(data.totalLiabilitiesAndEquity)}
                        </p>
                      </div>
                    </div>
                    {data.totalAssets === data.totalLiabilitiesAndEquity ? (
                      <Badge variant="success" size="lg">
                        Cuadrado
                      </Badge>
                    ) : (
                      <Badge variant="error" size="lg">
                        Descuadrado
                      </Badge>
                    )}
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
