import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, BookOpen, Search, Calendar } from "lucide-react";
import type { Route } from "./+types/_app.accounting.reports.general-journal";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency, formatDate } from "~/lib/utils";
import { useGeneralJournal } from "~/hooks/useAccountingReports";
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
import type { GeneralJournalRow } from "~/types/accounting";
import { JournalEntrySourceLabels } from "~/types/accounting";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Libro Diario - StockFlow" },
    { name: "description", content: "Libro diario contable" },
  ];
};

export default function GeneralJournalPage() {
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

  const { data, isLoading, isError } = useGeneralJournal(fromDate, toDate);

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
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Libro Diario
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Registro cronologico de todos los asientos contables
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
        <Card padding="none">
          <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
            <CardTitle>Asientos Contables</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead className="text-right">Debito</TableHead>
                    <TableHead className="text-right">Credito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={5} />
                  ))}
                </TableBody>
              </Table>
            ) : isError ? (
              <EmptyState
                type="error"
                title="Error al cargar el libro diario"
                description="Hubo un problema al consultar los datos. Por favor, intenta de nuevo."
                action={{
                  label: "Reintentar",
                  onClick: () => window.location.reload(),
                }}
              />
            ) : !data || data.entries.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-16 w-16" />}
                title="Sin asientos"
                description="No se encontraron asientos contables en el periodo seleccionado."
              />
            ) : (
              <div>
                {data.entries.map(
                  (entry: GeneralJournalRow, entryIndex: number) => (
                    <div key={entry.entryId}>
                      {entryIndex > 0 && (
                        <div className="border-t-2 border-neutral-200 dark:border-neutral-700" />
                      )}
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 px-6 py-3 flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-neutral-900 dark:text-white">
                          #{entry.entryNumber}
                        </span>
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                          {formatDate(entry.date)}
                        </span>
                        <span className="text-sm text-neutral-700 dark:text-neutral-300 flex-1">
                          {entry.description}
                        </span>
                        <Badge variant="outline" size="sm">
                          {JournalEntrySourceLabels[entry.source] ||
                            entry.source}
                        </Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-10">Codigo</TableHead>
                            <TableHead>Cuenta</TableHead>
                            <TableHead>Descripcion</TableHead>
                            <TableHead className="text-right">
                              Debito
                            </TableHead>
                            <TableHead className="text-right">
                              Credito
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entry.lines.map((line, lineIndex) => (
                            <TableRow key={lineIndex}>
                              <TableCell className="pl-10">
                                <code className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                                  {line.accountCode}
                                </code>
                              </TableCell>
                              <TableCell className="font-medium">
                                {line.accountName}
                              </TableCell>
                              <TableCell className="text-neutral-500 dark:text-neutral-400">
                                {line.description || "—"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {line.debit > 0
                                  ? formatCurrency(line.debit)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {line.credit > 0
                                  ? formatCurrency(line.credit)
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ),
                )}
                <div className="border-t-2 border-neutral-200 dark:border-neutral-700 bg-neutral-100/50 dark:bg-neutral-800/50 px-6 py-4 flex justify-end gap-8">
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      Total Debitos
                    </p>
                    <p className="text-sm font-bold tabular-nums text-neutral-900 dark:text-white">
                      {formatCurrency(data.totalDebit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      Total Creditos
                    </p>
                    <p className="text-sm font-bold tabular-nums text-neutral-900 dark:text-white">
                      {formatCurrency(data.totalCredit)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
