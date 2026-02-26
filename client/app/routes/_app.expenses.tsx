import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Eye,
  X,
  Calendar,
  Receipt,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
} from "lucide-react";
import type { Route } from "./+types/_app.expenses";
import { cn, debounce, formatDate, formatCurrency } from "~/lib/utils";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { useExpenses, useExpenseStats } from "~/hooks/useExpenses";
import { useUrlFilters } from "~/hooks/useUrlFilters";
import { usePermissions } from "~/hooks/usePermissions";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { StatCard } from "~/components/ui/StatCard";
import { Select } from "~/components/ui/Select";
import { Pagination, PaginationInfo } from "~/components/ui/Pagination";
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
import type { ExpenseCategory, ExpenseStatus } from "~/types/expense";
import {
  ExpenseCategoryLabels,
  ExpenseStatusLabels,
  ExpenseStatusVariants,
  ExpenseCategoryColors,
} from "~/types/expense";
import { Permission } from "~/types/permissions";

// Meta for SEO - used by React Router
export const meta: Route.MetaFunction = () => [
  { title: "Gastos - StockFlow" },
  { name: "description", content: "Gestion de gastos operativos" },
];

// Status options for filter
const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "DRAFT", label: "Borrador" },
  { value: "APPROVED", label: "Aprobado" },
  { value: "PAID", label: "Pagado" },
  { value: "CANCELLED", label: "Cancelado" },
];

// Category options for filter
const categoryOptions = [
  { value: "", label: "Todas las categorias" },
  ...Object.entries(ExpenseCategoryLabels).map(([value, label]) => ({
    value,
    label,
  })),
];

// Items per page options
const pageSizeOptions = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
];

// Filter parser config
interface ExpenseListFilters {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

const filtersParser = {
  parse: (searchParams: URLSearchParams): ExpenseListFilters => ({
    status: (searchParams.get("status") as ExpenseStatus) || undefined,
    category: (searchParams.get("category") as ExpenseCategory) || undefined,
    search: searchParams.get("search") || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

// Date filter input component
function DateFilterInput({
  value,
  onChange,
  placeholder,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
      <Input
        type="date"
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="pl-10"
      />
    </div>
  );
}

// Expense table header component
function ExpenseTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>No. Gasto</TableHead>
        <TableHead>Categoria</TableHead>
        <TableHead className="hidden lg:table-cell">Descripcion</TableHead>
        <TableHead className="hidden md:table-cell">Proveedor</TableHead>
        <TableHead className="text-right">Total</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead className="hidden sm:table-cell">Fecha</TableHead>
        <TableHead className="w-24">Acciones</TableHead>
      </TableRow>
    </TableHeader>
  );
}

// Default export used by React Router
export default function ExpensesPage() {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(Permission.EXPENSES_CREATE);
  const [showFilters, setShowFilters] = useState(false);
  const { filters, updateFilters, clearFilters } =
    useUrlFilters<ExpenseListFilters>({
      parserConfig: filtersParser,
    });

  // Queries
  const {
    data: expensesData,
    isLoading,
    isError,
  } = useExpenses(filters);
  const { data: stats } = useExpenseStats();

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce(
        (value: string) => updateFilters({ search: value || undefined }),
        300,
      ),
    [updateFilters],
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Derive stats values
  const statsByStatus = useMemo(() => {
    const byStatus = stats?.byStatus || [];
    const approved = byStatus.find((s) => s.status === "APPROVED");
    const paid = byStatus.find((s) => s.status === "PAID");
    const draft = byStatus.find((s) => s.status === "DRAFT");
    return {
      totalMonth: stats?.totalAmount || 0,
      approved: approved?.total || 0,
      paid: paid?.total || 0,
      pending: draft?.total || 0,
    };
  }, [stats]);

  const expenses = expensesData?.data || [];
  const paginationMeta = expensesData?.meta;
  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.category ||
    filters.fromDate ||
    filters.toDate;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-900/30">
            <Receipt className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Gastos
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {paginationMeta?.total || 0} gastos en total
            </p>
          </div>
        </div>
        {canCreate && (
          <Link to="/expenses/new">
            <Button variant="gradient" leftIcon={<Plus className="h-4 w-4" />}>
              Nuevo Gasto
            </Button>
          </Link>
        )}
      </PageSection>

      {/* Stats Cards */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Receipt}
            label="Total Mes"
            value={formatCurrency(statsByStatus.totalMonth)}
            color="primary"
            variant="gradient"
            animate
            animationDelay={0}
          />
          <StatCard
            icon={Clock}
            label="Aprobados"
            value={formatCurrency(statsByStatus.approved)}
            color="warning"
            variant="gradient"
            animate
            animationDelay={0.1}
          />
          <StatCard
            icon={CheckCircle}
            label="Pagados"
            value={formatCurrency(statsByStatus.paid)}
            color="success"
            variant="gradient"
            animate
            animationDelay={0.2}
          />
          <StatCard
            icon={FileText}
            label="Pendientes"
            value={formatCurrency(statsByStatus.pending)}
            color="secondary"
            variant="gradient"
            animate
            animationDelay={0.3}
          />
        </div>
      </PageSection>

      {/* Search and Filters */}
      <PageSection>
        <Card variant="elevated" padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Buscar por numero de gasto o descripcion..."
                  className="pl-10"
                  defaultValue={filters.search}
                  onChange={handleSearchChange}
                />
              </div>

              {/* Filter toggle */}
              <Button
                variant={showFilters ? "soft-primary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="gradient" size="xs" className="ml-2">
                    {
                      [
                        filters.status,
                        filters.category,
                        filters.fromDate,
                        filters.toDate,
                      ].filter(Boolean).length
                    }
                  </Badge>
                )}
              </Button>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              )}
            </div>

            {/* Filter options */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Select
                      options={statusOptions}
                      value={filters.status || ""}
                      onChange={(value) =>
                        updateFilters({
                          status: (value as ExpenseStatus) || undefined,
                        })
                      }
                      placeholder="Todos los estados"
                    />
                    <Select
                      options={categoryOptions}
                      value={filters.category || ""}
                      onChange={(value) =>
                        updateFilters({
                          category: (value as ExpenseCategory) || undefined,
                        })
                      }
                      placeholder="Todas las categorias"
                    />
                    <DateFilterInput
                      value={filters.fromDate}
                      onChange={(value) => updateFilters({ fromDate: value })}
                      placeholder="Fecha desde"
                    />
                    <DateFilterInput
                      value={filters.toDate}
                      onChange={(value) => updateFilters({ toDate: value })}
                      placeholder="Fecha hasta"
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
              <ExpenseTableHeader />
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={8} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar gastos"
              description="Hubo un problema al cargar los gastos. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-16 w-16" />}
              title={
                hasActiveFilters ? "Sin resultados" : "No hay gastos"
              }
              description={
                hasActiveFilters
                  ? "No se encontraron gastos con los filtros aplicados."
                  : "Comienza registrando tu primer gasto."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : canCreate
                    ? {
                        label: "Crear gasto",
                        onClick: () =>
                          (window.location.href = "/expenses/new"),
                      }
                    : undefined
              }
            />
          ) : (
            <>
              <Table>
                <ExpenseTableHeader />
                <TableBody>
                  {expenses.map((expense, i) => (
                    <AnimatedTableRow
                      key={expense.id}
                      index={i}
                      className="group border-b border-neutral-200 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <TableCell>
                        <Link
                          to={`/expenses/${expense.id}`}
                          className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                        >
                          {expense.expenseNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            ExpenseCategoryColors[expense.category],
                          )}
                        >
                          {ExpenseCategoryLabels[expense.category]}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 max-w-[200px] truncate">
                          {expense.description || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {expense.supplier?.name || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-bold text-lg bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                          {formatCurrency(expense.total)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={ExpenseStatusVariants[expense.status]}
                          size="sm"
                        >
                          {ExpenseStatusLabels[expense.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                          {formatDate(expense.issueDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/expenses/${expense.id}`}>
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

              {/* Pagination */}
              {paginationMeta && paginationMeta.totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-4">
                    <PaginationInfo
                      currentPage={paginationMeta.page}
                      pageSize={paginationMeta.limit}
                      totalItems={paginationMeta.total}
                    />
                    <Select
                      options={pageSizeOptions}
                      value={String(filters.limit || 10)}
                      onChange={(value) =>
                        updateFilters({ limit: Number(value), page: 1 })
                      }
                      className="w-36"
                    />
                  </div>
                  <Pagination
                    currentPage={paginationMeta.page}
                    totalPages={paginationMeta.totalPages}
                    onPageChange={(page) => updateFilters({ page })}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
