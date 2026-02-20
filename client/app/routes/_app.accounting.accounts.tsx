import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  X,
  ChevronRight,
} from "lucide-react";
import type { Route } from "./+types/_app.accounting.accounts";
import { cn } from "~/lib/utils";
import { useAccountTree, useAccounts, useCreateAccount } from "~/hooks/useAccounting";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Select } from "~/components/ui/Select";
import { Switch } from "~/components/ui/Switch";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/Modal";
import type { Account, AccountType, AccountNature, CreateAccountData } from "~/types/accounting";
import { AccountTypeLabels, AccountNatureLabels } from "~/types/accounting";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Plan de Cuentas - StockFlow" },
    { name: "description", content: "Plan de cuentas contable" },
  ];
};

const typeOptions = [
  { value: "", label: "Todos los tipos" },
  { value: "ASSET", label: "Activo" },
  { value: "LIABILITY", label: "Pasivo" },
  { value: "EQUITY", label: "Patrimonio" },
  { value: "REVENUE", label: "Ingreso" },
  { value: "EXPENSE", label: "Gasto" },
  { value: "COGS", label: "Costo de Ventas" },
];

const typeFormOptions = [
  { value: "ASSET", label: "Activo" },
  { value: "LIABILITY", label: "Pasivo" },
  { value: "EQUITY", label: "Patrimonio" },
  { value: "REVENUE", label: "Ingreso" },
  { value: "EXPENSE", label: "Gasto" },
  { value: "COGS", label: "Costo de Ventas" },
];

const natureOptions = [
  { value: "DEBIT", label: "Debito" },
  { value: "CREDIT", label: "Credito" },
];


function AccountRow({
  account,
  level = 0,
  searchFilter,
}: {
  account: Account;
  level?: number;
  searchFilter?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = account.children && account.children.length > 0;

  if (searchFilter) {
    const matchesSelf =
      account.code.toLowerCase().includes(searchFilter) ||
      account.name.toLowerCase().includes(searchFilter);

    const hasMatchingDescendant = (acc: Account): boolean => {
      if (!acc.children) return false;
      return acc.children.some(
        (child) =>
          child.code.toLowerCase().includes(searchFilter) ||
          child.name.toLowerCase().includes(searchFilter) ||
          hasMatchingDescendant(child),
      );
    };

    if (!matchesSelf && !hasMatchingDescendant(account)) {
      return null;
    }
  }

  return (
    <>
      <TableRow className="group">
        <TableCell style={{ paddingLeft: `${level * 24 + 16}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-neutral-400 transition-transform",
                    expanded && "rotate-90",
                  )}
                />
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="font-mono text-sm font-medium text-primary-600 dark:text-primary-400">
              {account.code}
            </span>
            <span className="text-neutral-900 dark:text-white">
              {account.name}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{AccountTypeLabels[account.type]}</Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <span className="text-neutral-600 dark:text-neutral-400">
            {AccountNatureLabels[account.nature]}
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
      </TableRow>
      {expanded &&
        hasChildren &&
        account.children!.map((child) => (
          <AccountRow
            key={child.id}
            account={child}
            level={level + 1}
            searchFilter={searchFilter}
          />
        ))}
    </>
  );
}

function countAllAccounts(accounts: Account[]): number {
  let count = 0;
  for (const account of accounts) {
    count += 1;
    if (account.children) {
      count += countAllAccounts(account.children);
    }
  }
  return count;
}

const emptyForm: CreateAccountData = {
  code: "",
  name: "",
  description: "",
  type: "ASSET",
  nature: "DEBIT",
  parentId: undefined,
  isBankAccount: false,
};

export default function AccountingAccountsPage() {
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountType | "">("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAccount, setNewAccount] = useState<CreateAccountData>(emptyForm);

  const { data: accountTree, isLoading, isError } = useAccountTree();
  const { data: flatAccounts } = useAccounts();
  const createAccount = useCreateAccount();

  const filteredTree = useMemo(() => {
    if (!accountTree) return [];
    if (!typeFilter) return accountTree;

    const filterByType = (accounts: Account[]): Account[] => {
      return accounts
        .map((acc) => ({
          ...acc,
          children: acc.children ? filterByType(acc.children) : [],
        }))
        .filter(
          (acc) =>
            acc.type === typeFilter ||
            (acc.children && acc.children.length > 0),
        );
    };

    return filterByType(accountTree);
  }, [accountTree, typeFilter]);

  const parentOptions = useMemo(() => {
    if (!flatAccounts) return [{ value: "", label: "Sin cuenta padre" }];
    return [
      { value: "", label: "Sin cuenta padre" },
      ...flatAccounts.map((acc) => ({
        value: acc.id,
        label: `${acc.code} - ${acc.name}`,
      })),
    ];
  }, [flatAccounts]);

  const handleCreateAccount = async () => {
    if (!newAccount.code || !newAccount.name) return;
    await createAccount.mutateAsync({
      ...newAccount,
      parentId: newAccount.parentId || undefined,
      description: newAccount.description || undefined,
    });
    setShowCreateModal(false);
    setNewAccount(emptyForm);
  };

  const totalAccounts = accountTree ? countAllAccounts(accountTree) : 0;
  const normalizedSearch = searchTerm.toLowerCase().trim();
  const hasActiveFilters = searchTerm || typeFilter;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/20 to-primary-500/10 dark:from-accent-500/20 dark:to-primary-900/30">
            <BookOpen className="h-7 w-7 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Plan de Cuentas
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {totalAccounts} cuentas en total
            </p>
          </div>
        </div>
        {hasPermission(Permission.ACCOUNTING_CONFIG) && (
          <Button
            variant="gradient"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Nueva Cuenta
          </Button>
        )}
      </PageSection>

      {/* Search and Filters */}
      <PageSection>
        <Card variant="elevated" padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Buscar por codigo o nombre de cuenta..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Button
                variant={showFilters ? "soft-primary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {typeFilter && (
                  <Badge variant="gradient" size="xs" className="ml-2">
                    1
                  </Badge>
                )}
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("");
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              )}
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Select
                      options={typeOptions}
                      value={typeFilter}
                      onChange={(value) =>
                        setTypeFilter((value as AccountType) || "")
                      }
                      placeholder="Todos los tipos"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </PageSection>

      {/* Table */}
      <PageSection>
        <Card variant="elevated">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Naturaleza
                  </TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={4} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar el plan de cuentas"
              description="Hubo un problema al cargar las cuentas. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : filteredTree.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-16 w-16" />}
              title={hasActiveFilters ? "Sin resultados" : "No hay cuentas"}
              description={
                hasActiveFilters
                  ? "No se encontraron cuentas con los filtros aplicados."
                  : "Comienza configurando el plan de cuentas."
              }
              action={
                hasActiveFilters
                  ? {
                      label: "Limpiar filtros",
                      onClick: () => {
                        setSearchTerm("");
                        setTypeFilter("");
                      },
                    }
                  : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Naturaleza
                  </TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTree.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    searchFilter={normalizedSearch || undefined}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </PageSection>

      {/* Create Account Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Cuenta Contable</DialogTitle>
            <DialogDescription>
              Agrega una nueva cuenta al plan de cuentas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Codigo
              </label>
              <Input
                placeholder="Ej: 1105"
                value={newAccount.code}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, code: e.target.value })
                }
              />
              <p className="mt-1 text-xs text-neutral-500">El nivel se determina automaticamente segun el codigo (1 digito = Clase, 2 = Grupo, 4 = Cuenta, 6 = Subcuenta)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Nombre
              </label>
              <Input
                placeholder="Ej: Caja General"
                value={newAccount.name}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Descripcion (opcional)
              </label>
              <Input
                placeholder="Descripcion de la cuenta"
                value={newAccount.description || ""}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Tipo
                </label>
                <Select
                  options={typeFormOptions}
                  value={newAccount.type}
                  onChange={(value) =>
                    setNewAccount({
                      ...newAccount,
                      type: value as AccountType,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Naturaleza
                </label>
                <Select
                  options={natureOptions}
                  value={newAccount.nature}
                  onChange={(value) =>
                    setNewAccount({
                      ...newAccount,
                      nature: value as AccountNature,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Cuenta Padre (opcional)
              </label>
              <Select
                options={parentOptions}
                value={newAccount.parentId || ""}
                onChange={(value) =>
                  setNewAccount({ ...newAccount, parentId: value || undefined })
                }
              />
            </div>
            <div className="pt-2">
              <Switch
                checked={newAccount.isBankAccount || false}
                onChange={(checked) =>
                  setNewAccount({ ...newAccount, isBankAccount: checked })
                }
                label="Es cuenta bancaria"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setNewAccount(emptyForm);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="gradient"
              onClick={handleCreateAccount}
              isLoading={createAccount.isPending}
              disabled={!newAccount.code || !newAccount.name}
            >
              Crear Cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
