import { useState, useRef } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Landmark,
  Upload,
  Eye,
  Trash2,
  Calendar,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";
import type { Route } from "./+types/_app.bank.accounts.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency, formatDate } from "~/lib/utils";
import {
  useBankAccount,
  useBankStatements,
  useImportStatement,
  useDeleteStatement,
} from "~/hooks/useBank";
import { BankAccountTypeLabels } from "~/types/bank";
import type { BankStatement, BankStatementStatus } from "~/types/bank";
import { BankStatementStatusLabels } from "~/types/bank";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { StatCard } from "~/components/ui/StatCard";
import { Skeleton } from "~/components/ui/Skeleton";
import { Input } from "~/components/ui/Input";
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
import { DeleteModal } from "~/components/ui/DeleteModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/Modal";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Cuenta Bancaria - StockFlow" },
    { name: "description", content: "Detalle de cuenta bancaria" },
  ];
};

const statementStatusVariant: Record<BankStatementStatus, string> = {
  IMPORTED: "warning",
  PARTIALLY_RECONCILED: "primary",
  RECONCILED: "success",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function BankAccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = usePermissions();
  const [showImportModal, setShowImportModal] = useState(false);
  const [deletingStatement, setDeletingStatement] =
    useState<BankStatement | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: account, isLoading, isError } = useBankAccount(id!);
  const { data: statements } = useBankStatements(id!);
  const importStatement = useImportStatement();
  const deleteStatement = useDeleteStatement();

  const handleImport = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !periodStart || !periodEnd) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bankAccountId", id!);
    formData.append("periodStart", periodStart);
    formData.append("periodEnd", periodEnd);

    importStatement.mutate(formData, {
      onSuccess: () => {
        setShowImportModal(false);
        setPeriodStart("");
        setPeriodEnd("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  const handleDeleteStatement = async () => {
    if (deletingStatement) {
      await deleteStatement.mutateAsync({
        id: deletingStatement.id,
        bankAccountId: id!,
      });
      setDeletingStatement(null);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !account) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Landmark className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Cuenta no encontrada
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          La cuenta bancaria que buscas no existe o fue eliminada.
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

  const bankStatements: BankStatement[] = statements || [];

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Link to="/bank/accounts">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                <Landmark className="h-7 w-7 text-primary-500" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                    {account.name}
                  </h1>
                  {account.isActive ? (
                    <Badge variant="success">Activa</Badge>
                  ) : (
                    <Badge variant="error">Inactiva</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="primary">
                    {BankAccountTypeLabels[account.accountType]}
                  </Badge>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {account.bankName} - {account.accountNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      {/* Stats */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={DollarSign}
            label="Saldo Actual"
            value={formatCurrency(account.currentBalance, account.currency)}
            color="primary"
          />
          <StatCard
            icon={FileSpreadsheet}
            label="Total Extractos"
            value={account.statementCount || 0}
            subtitle="extractos importados"
            color="accent"
          />
        </div>
      </PageSection>

      {/* Info Card */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle>Informacion de la Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400">
                Nombre
              </span>
              <span className="font-medium text-neutral-900 dark:text-white">
                {account.name}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400">
                Banco
              </span>
              <span className="font-medium text-neutral-900 dark:text-white">
                {account.bankName}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400">
                Numero de Cuenta
              </span>
              <span className="font-medium text-neutral-900 dark:text-white font-mono">
                {account.accountNumber}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400">
                Tipo
              </span>
              <Badge variant="primary">
                {BankAccountTypeLabels[account.accountType]}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400">
                Moneda
              </span>
              <span className="font-medium text-neutral-900 dark:text-white">
                {account.currency}
              </span>
            </div>
            {account.accountCode && (
              <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Cuenta Contable
                </span>
                <span className="font-medium text-neutral-900 dark:text-white font-mono">
                  {account.accountCode} - {account.accountName}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400">
                Saldo Inicial
              </span>
              <span className="font-medium text-neutral-900 dark:text-white">
                {formatCurrency(account.initialBalance, account.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">
                Fecha de Creacion
              </span>
              <span className="text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-neutral-400" />
                {formatDate(account.createdAt)}
              </span>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Statements Section */}
      <PageSection>
        <Card variant="elevated">
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Extractos Bancarios
            </h2>
            {hasPermission(Permission.BANK_IMPORT) && (
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Extracto
              </Button>
            )}
          </div>

          {bankStatements.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="h-16 w-16" />}
              title="No hay extractos"
              description="Importa tu primer extracto bancario para comenzar la conciliacion."
              action={
                hasPermission(Permission.BANK_IMPORT)
                  ? {
                      label: "Importar extracto",
                      onClick: () => setShowImportModal(true),
                    }
                  : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Periodo
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Lineas</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Conciliadas
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-30">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankStatements.map((statement, i) => (
                  <AnimatedTableRow
                    key={statement.id}
                    index={i}
                    className="group"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                          <FileSpreadsheet className="h-5 w-5 text-neutral-500" />
                        </div>
                        <div>
                          <Link
                            to={`/bank/statements/${statement.id}`}
                            className="font-semibold text-neutral-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          >
                            {statement.fileName}
                          </Link>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Importado {formatDate(statement.importedAt)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {formatDate(statement.periodStart)} -{" "}
                        {formatDate(statement.periodEnd)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {statement.totalLines}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full max-w-[100px]">
                          <div
                            className="h-2 bg-success-500 rounded-full transition-all"
                            style={{
                              width: `${statement.matchPercentage}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                          {statement.matchPercentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/bank/statements/${statement.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {hasPermission(Permission.BANK_IMPORT) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingStatement(statement)}
                            title="Eliminar"
                            className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </AnimatedTableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </PageSection>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent hideDescription>
          <DialogHeader>
            <DialogTitle>Importar Extracto Bancario</DialogTitle>
            <DialogDescription>
              Sube un archivo Excel (.xlsx) con el extracto bancario
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Archivo (.xlsx) *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="block w-full text-sm text-neutral-500 dark:text-neutral-400
                  file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-primary-50 file:text-primary-600
                  dark:file:bg-primary-900/30 dark:file:text-primary-400
                  hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50
                  file:cursor-pointer cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Inicio del Periodo *
                </label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Fin del Periodo *
                </label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setShowImportModal(false)}
              disabled={importStatement.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              isLoading={importStatement.isPending}
              disabled={!periodStart || !periodEnd}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Statement Modal */}
      <DeleteModal
        open={!!deletingStatement}
        onOpenChange={(open) => !open && setDeletingStatement(null)}
        itemName={deletingStatement?.fileName || ""}
        onConfirm={handleDeleteStatement}
        isLoading={deleteStatement.isPending}
      />
    </PageWrapper>
  );
}
