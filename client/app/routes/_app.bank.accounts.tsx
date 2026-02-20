import { Link } from "react-router";
import {
  Landmark,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { Route } from "./+types/_app.bank.accounts";
import { formatCurrency } from "~/lib/utils";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { useBankAccounts } from "~/hooks/useBank";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
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
import type { BankAccount } from "~/types/bank";
import { BankAccountTypeLabels } from "~/types/bank";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Cuentas Bancarias - StockFlow" },
    { name: "description", content: "Gestion de cuentas bancarias" },
  ];
};

export default function BankAccountsPage() {
  const { hasPermission } = usePermissions();
  const { data: accounts, isLoading, isError } = useBankAccounts();

  const bankAccounts: BankAccount[] = accounts || [];

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/20 to-primary-500/10 dark:from-accent-500/20 dark:to-primary-900/30">
            <Landmark className="h-7 w-7 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Cuentas Bancarias
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {bankAccounts.length} cuentas registradas
            </p>
          </div>
        </div>
        {hasPermission(Permission.BANK_CREATE) && (
          <Link to="/bank/accounts/new">
            <Button
              variant="gradient"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Nueva Cuenta
            </Button>
          </Link>
        )}
      </PageSection>

      {/* Table */}
      <PageSection>
        <Card variant="elevated">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Banco</TableHead>
                  <TableHead className="hidden sm:table-cell">Numero</TableHead>
                  <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                  <TableHead>Saldo Actual</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-20">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={7} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar las cuentas bancarias"
              description="Hubo un problema al cargar las cuentas. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : bankAccounts.length === 0 ? (
            <EmptyState
              icon={<Landmark className="h-16 w-16" />}
              title="No hay cuentas bancarias"
              description="Comienza agregando tu primera cuenta bancaria."
              action={
                hasPermission(Permission.BANK_CREATE)
                  ? {
                      label: "Agregar cuenta",
                      onClick: () =>
                        (window.location.href = "/bank/accounts/new"),
                    }
                  : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Banco</TableHead>
                  <TableHead className="hidden sm:table-cell">Numero</TableHead>
                  <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                  <TableHead>Saldo Actual</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-20">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map((account, i) => (
                  <AnimatedTableRow key={account.id} index={i} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105 bg-gradient-to-br from-primary-500/20 to-accent-500/10">
                          <Landmark className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <Link
                            to={`/bank/accounts/${account.id}`}
                            className="font-semibold text-neutral-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          >
                            {account.name}
                          </Link>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {account.currency}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {account.bankName}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-neutral-700 dark:text-neutral-300 font-mono text-sm">
                        {account.accountNumber}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={account.accountType === "CHECKING" ? "primary" : "accent"}>
                        {BankAccountTypeLabels[account.accountType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {formatCurrency(account.currentBalance, account.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {account.isActive ? (
                        <Badge variant="success" dot>
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="error" dot>
                          Inactiva
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/bank/accounts/${account.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
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
