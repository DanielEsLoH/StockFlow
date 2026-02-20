import { useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  GitCompareArrows,
  Wand2,
  CheckCircle2,
  Link2,
  Unlink,
  FileSpreadsheet,
  BookOpen,
  Filter,
} from "lucide-react";
import type { Route } from "./+types/_app.bank.reconciliation.$statementId";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency, formatDate } from "~/lib/utils";
import {
  useBankStatement,
  useAutoMatch,
  useManualMatch,
  useUnmatch,
  useFinalizeReconciliation,
} from "~/hooks/useBank";
import { useJournalEntries } from "~/hooks/useAccounting";
import type { ReconciliationStatus, BankStatementLine } from "~/types/bank";
import { ReconciliationStatusLabels } from "~/types/bank";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import { Select } from "~/components/ui/Select";
import { EmptyState } from "~/components/ui/EmptyState";
import { ConfirmModal } from "~/components/ui/Modal";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Conciliacion Bancaria - StockFlow" },
    { name: "description", content: "Conciliacion de extracto bancario" },
  ];
};

const lineStatusVariant: Record<ReconciliationStatus, string> = {
  MATCHED: "success",
  UNMATCHED: "warning",
  MANUALLY_MATCHED: "primary",
};

const statusFilterOptions = [
  { value: "all", label: "Todas" },
  { value: "UNMATCHED", label: "Sin conciliar" },
  { value: "MATCHED", label: "Conciliadas" },
  { value: "MANUALLY_MATCHED", label: "Conciliadas manualmente" },
];

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ReconciliationPage() {
  const { statementId } = useParams<{ statementId: string }>();
  const navigate = useNavigate();

  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  const {
    data: statement,
    isLoading,
    isError,
  } = useBankStatement(statementId!);
  const autoMatch = useAutoMatch(statementId!);
  const manualMatch = useManualMatch();
  const unmatch = useUnmatch();
  const finalizeReconciliation = useFinalizeReconciliation();

  const journalEntriesFilters = useMemo(() => {
    if (!statement) return {};
    return {
      fromDate: statement.periodStart,
      toDate: statement.periodEnd,
      status: "POSTED" as const,
      limit: 100,
    };
  }, [statement]);

  const { data: journalEntriesData } = useJournalEntries(journalEntriesFilters);

  const lines = statement?.lines || [];
  const journalEntries = journalEntriesData?.data || [];

  const filteredLines = useMemo(() => {
    if (statusFilter === "all") return lines;
    return lines.filter((line) => line.status === statusFilter);
  }, [lines, statusFilter]);

  const unmatchedCount = lines.filter((l) => l.status === "UNMATCHED").length;
  const allMatched = lines.length > 0 && unmatchedCount === 0;

  const handleAutoMatch = () => {
    autoMatch.mutate();
  };

  const handleManualMatch = (journalEntryId: string) => {
    if (!selectedLineId || !statementId) return;
    manualMatch.mutate(
      {
        lineId: selectedLineId,
        journalEntryId,
        statementId,
      },
      {
        onSuccess: () => setSelectedLineId(null),
      },
    );
  };

  const handleUnmatch = (lineId: string) => {
    if (!statementId) return;
    unmatch.mutate({ lineId, statementId });
  };

  const handleFinalize = () => {
    if (!statementId) return;
    finalizeReconciliation.mutate(statementId, {
      onSuccess: () => {
        setShowFinalizeModal(false);
        navigate(`/bank/statements/${statementId}`);
      },
    });
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !statement) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <GitCompareArrows className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Extracto no encontrado
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          El extracto que intentas conciliar no existe.
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

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Link to={`/bank/statements/${statementId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
                Conciliacion Bancaria
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
                {statement.fileName} | {statement.bankAccountName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-14 sm:ml-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full w-24">
                <div
                  className="h-2 bg-gradient-to-r from-primary-500 to-success-500 rounded-full transition-all"
                  style={{ width: `${statement.matchPercentage}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                {statement.matchPercentage}%
              </span>
            </div>
            <Badge variant={unmatchedCount > 0 ? "warning" : "success"}>
              {unmatchedCount} pendientes
            </Badge>
          </div>
        </div>
      </PageSection>

      {/* Action Buttons */}
      <PageSection>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleAutoMatch}
            isLoading={autoMatch.isPending}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-Match
          </Button>
          {allMatched && (
            <Button
              variant="gradient"
              onClick={() => setShowFinalizeModal(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Finalizar
            </Button>
          )}
        </div>
      </PageSection>

      {/* Two-panel layout */}
      <PageSection>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Statement Lines */}
          <Card variant="elevated">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary-500" />
                <h2 className="font-semibold text-neutral-900 dark:text-white">
                  Lineas del Extracto
                </h2>
              </div>
              <div className="w-44">
                <Select
                  options={statusFilterOptions}
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value)}
                />
              </div>
            </div>

            <div className="divide-y divide-neutral-200 dark:divide-neutral-700 max-h-[600px] overflow-y-auto">
              {filteredLines.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-neutral-500 dark:text-neutral-400">
                    No hay lineas con el filtro seleccionado
                  </p>
                </div>
              ) : (
                filteredLines.map((line) => (
                  <div
                    key={line.id}
                    className={`p-4 transition-colors ${
                      selectedLineId === line.id
                        ? "bg-primary-50 dark:bg-primary-900/20 ring-1 ring-inset ring-primary-200 dark:ring-primary-800"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {formatDate(line.lineDate)}
                          </span>
                          <Badge
                            variant={
                              lineStatusVariant[line.status] as
                                | "success"
                                | "warning"
                                | "primary"
                            }
                            size="xs"
                          >
                            {ReconciliationStatusLabels[line.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-neutral-900 dark:text-white truncate">
                          {line.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {line.debit > 0 && (
                            <span className="text-sm font-medium text-error-600 dark:text-error-400">
                              Debito: {formatCurrency(line.debit)}
                            </span>
                          )}
                          {line.credit > 0 && (
                            <span className="text-sm font-medium text-success-600 dark:text-success-400">
                              Credito: {formatCurrency(line.credit)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {line.status === "UNMATCHED" ? (
                          <Button
                            variant={
                              selectedLineId === line.id
                                ? "soft-primary"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              setSelectedLineId(
                                selectedLineId === line.id ? null : line.id,
                              )
                            }
                          >
                            {selectedLineId === line.id
                              ? "Cancelar"
                              : "Seleccionar"}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnmatch(line.id)}
                            className="text-error-500 hover:text-error-600"
                            title="Deshacer conciliacion"
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Right Panel: Journal Entries */}
          <Card variant="elevated">
            <div className="flex items-center gap-2 p-4 border-b border-neutral-200 dark:border-neutral-700">
              <BookOpen className="h-5 w-5 text-accent-500" />
              <h2 className="font-semibold text-neutral-900 dark:text-white">
                Asientos Contables
              </h2>
            </div>

            {selectedLineId && (
              <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-200 dark:border-primary-800">
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  Selecciona un asiento para vincular con la linea del extracto
                </p>
              </div>
            )}

            <div className="divide-y divide-neutral-200 dark:divide-neutral-700 max-h-[600px] overflow-y-auto">
              {journalEntries.length === 0 ? (
                <div className="p-8 text-center">
                  <BookOpen className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-500 dark:text-neutral-400">
                    No hay asientos contables en el periodo del extracto
                  </p>
                </div>
              ) : (
                journalEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-primary-600 dark:text-primary-400">
                            {entry.entryNumber}
                          </span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {formatDate(entry.date)}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-900 dark:text-white truncate">
                          {entry.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            {formatCurrency(entry.totalDebit)}
                          </span>
                        </div>
                      </div>
                      {selectedLineId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManualMatch(entry.id)}
                          isLoading={manualMatch.isPending}
                        >
                          <Link2 className="h-3.5 w-3.5 mr-1" />
                          Vincular
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </PageSection>

      {/* Finalize Confirmation Modal */}
      <ConfirmModal
        open={showFinalizeModal}
        onOpenChange={setShowFinalizeModal}
        title="Finalizar Conciliacion"
        description="Todas las lineas han sido conciliadas. Al finalizar, el extracto se marcara como conciliado. Esta accion no se puede deshacer."
        confirmLabel="Finalizar"
        cancelLabel="Cancelar"
        onConfirm={handleFinalize}
        isLoading={finalizeReconciliation.isPending}
        variant="warning"
      />
    </PageWrapper>
  );
}
