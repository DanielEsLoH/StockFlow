import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Scale, Search } from "lucide-react";
import type { Route } from "./+types/_app.accounting.reports.trial-balance";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency } from "~/lib/utils";
import { useTrialBalance } from "~/hooks/useAccountingReports";
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
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import type { AccountBalance } from "~/types/accounting";
import { AccountTypeLabels } from "~/types/accounting";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Balance de Prueba - StockFlow" },
    { name: "description", content: "Balance de prueba contable" },
  ];
};

export default function TrialBalancePage() {
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const { data, isLoading, isError } = useTrialBalance(asOfDate);

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
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Balance de Prueba
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Saldos de todas las cuentas a una fecha determinada
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
              <CardTitle>Resultados</CardTitle>
              {data &&
                data.totalDebit === data.totalCredit && (
                  <Badge variant="success">Cuadrado</Badge>
                )}
              {data &&
                data.totalDebit !== data.totalCredit && (
                  <Badge variant="error">Descuadrado</Badge>
                )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Debito</TableHead>
                    <TableHead className="text-right">Credito</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={6} />
                  ))}
                </TableBody>
              </Table>
            ) : isError ? (
              <EmptyState
                type="error"
                title="Error al cargar el balance de prueba"
                description="Hubo un problema al consultar los datos. Por favor, intenta de nuevo."
                action={{
                  label: "Reintentar",
                  onClick: () => window.location.reload(),
                }}
              />
            ) : !data || data.accounts.length === 0 ? (
              <EmptyState
                icon={<Scale className="h-16 w-16" />}
                title="Sin datos"
                description="No se encontraron cuentas con movimientos para la fecha seleccionada."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Debito</TableHead>
                    <TableHead className="text-right">Credito</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.accounts.map((account: AccountBalance) => (
                    <TableRow key={account.accountId}>
                      <TableCell>
                        <code className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                          {account.code}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span
                          style={{
                            paddingLeft: `${(account.level - 1) * 1.25}rem`,
                          }}
                        >
                          {account.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" size="sm">
                          {AccountTypeLabels[account.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(account.totalDebit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(account.totalCredit)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-medium ${
                          account.balance > 0
                            ? "text-success-600 dark:text-success-400"
                            : account.balance < 0
                              ? "text-error-600 dark:text-error-400"
                              : ""
                        }`}
                      >
                        {formatCurrency(account.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-bold">
                      Totales
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {formatCurrency(data.totalDebit)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {formatCurrency(data.totalCredit)}
                    </TableCell>
                    <TableCell />
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
