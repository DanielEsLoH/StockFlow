import { useState, useMemo } from "react";
import { Link } from "react-router";
import { ArrowLeft, BookText, Search, Calendar } from "lucide-react";
import type { Route } from "./+types/_app.accounting.reports.general-ledger";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency, formatDate } from "~/lib/utils";
import { useGeneralLedger } from "~/hooks/useAccountingReports";
import { useAccounts } from "~/hooks/useAccounting";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Select } from "~/components/ui/Select";
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
import type { LedgerAccountSection, LedgerMovement } from "~/types/accounting";
import { AccountTypeLabels } from "~/types/accounting";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Libro Mayor - StockFlow" },
    { name: "description", content: "Libro mayor contable" },
  ];
};

export default function GeneralLedgerPage() {
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
  const [accountId, setAccountId] = useState("");

  const { data: accounts } = useAccounts();
  const { data, isLoading, isError } = useGeneralLedger(
    fromDate,
    toDate,
    accountId || undefined,
  );

  const accountOptions = useMemo(
    () => [
      { value: "", label: "Todas las cuentas" },
      ...(accounts || []).map((a) => ({
        value: a.id,
        label: `${a.code} - ${a.name}`,
      })),
    ],
    [accounts],
  );

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
            <BookText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Libro Mayor
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Movimientos detallados por cuenta contable
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
              <div className="space-y-2 w-full sm:w-auto sm:min-w-[240px]">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Cuenta (opcional)
                </label>
                <Select
                  options={accountOptions}
                  value={accountId}
                  onChange={(value) => setAccountId(value)}
                  placeholder="Todas las cuentas"
                />
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

      {isLoading ? (
        <PageSection>
          <Card padding="none">
            <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <CardTitle>Cargando...</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead># Asiento</TableHead>
                    <TableHead>Descripcion</TableHead>
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
            </CardContent>
          </Card>
        </PageSection>
      ) : isError ? (
        <PageSection>
          <Card>
            <CardContent>
              <EmptyState
                type="error"
                title="Error al cargar el libro mayor"
                description="Hubo un problema al consultar los datos. Por favor, intenta de nuevo."
                action={{
                  label: "Reintentar",
                  onClick: () => window.location.reload(),
                }}
              />
            </CardContent>
          </Card>
        </PageSection>
      ) : !data || data.accounts.length === 0 ? (
        <PageSection>
          <Card>
            <CardContent>
              <EmptyState
                icon={<BookText className="h-16 w-16" />}
                title="Sin movimientos"
                description="No se encontraron movimientos contables en el periodo seleccionado."
              />
            </CardContent>
          </Card>
        </PageSection>
      ) : (
        data.accounts.map((section: LedgerAccountSection) => (
          <PageSection key={section.accountId}>
            <Card padding="none">
              <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                      {section.code}
                    </code>
                    <CardTitle>{section.name}</CardTitle>
                    <Badge variant="outline" size="sm">
                      {AccountTypeLabels[section.type]}
                    </Badge>
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Saldo inicial:{" "}
                    <span className="font-semibold tabular-nums text-neutral-900 dark:text-white">
                      {formatCurrency(section.openingBalance)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {section.movements.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Sin movimientos en este periodo
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead># Asiento</TableHead>
                        <TableHead>Descripcion</TableHead>
                        <TableHead className="text-right">Debito</TableHead>
                        <TableHead className="text-right">Credito</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.movements.map(
                        (mov: LedgerMovement, movIndex: number) => (
                          <TableRow key={movIndex}>
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
                              {mov.debit > 0
                                ? formatCurrency(mov.debit)
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {mov.credit > 0
                                ? formatCurrency(mov.credit)
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              {formatCurrency(mov.runningBalance)}
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={5} className="font-bold text-right">
                          Saldo Final
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-bold">
                          {formatCurrency(section.closingBalance)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                )}
              </CardContent>
            </Card>
          </PageSection>
        ))
      )}
    </PageWrapper>
  );
}
