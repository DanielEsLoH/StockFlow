import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  BookMarked,
  Plus,
  Search,
  Filter,
  X,
  Calendar,
} from "lucide-react";
import type { Route } from "./+types/_app.accounting.journal-entries";
import { debounce, formatCurrency, formatDate } from "~/lib/utils";
import { useJournalEntries } from "~/hooks/useAccounting";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
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
import type {
  JournalEntryFilters,
  JournalEntryStatus,
  JournalEntrySource,
} from "~/types/accounting";
import {
  JournalEntryStatusLabels,
  JournalEntrySourceLabels,
} from "~/types/accounting";
import { useUrlFilters } from "~/hooks/useUrlFilters";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Asientos Contables - StockFlow" },
    { name: "description", content: "Gestion de asientos contables" },
  ];
};

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "DRAFT", label: "Borrador" },
  { value: "POSTED", label: "Contabilizado" },
  { value: "VOIDED", label: "Anulado" },
];

const sourceOptions = [
  { value: "", label: "Todas las fuentes" },
  { value: "MANUAL", label: "Manual" },
  { value: "INVOICE_SALE", label: "Venta (Factura)" },
  { value: "INVOICE_CANCEL", label: "Anulacion de Factura" },
  { value: "PAYMENT_RECEIVED", label: "Pago Recibido" },
  { value: "PURCHASE_RECEIVED", label: "Compra Recibida" },
  { value: "STOCK_ADJUSTMENT", label: "Ajuste de Inventario" },
  { value: "PERIOD_CLOSE", label: "Cierre de Periodo" },
];

const statusBadgeVariant: Record<
  JournalEntryStatus,
  "warning" | "success" | "error"
> = {
  DRAFT: "warning",
  POSTED: "success",
  VOIDED: "error",
};

const journalEntryFiltersParser = {
  parse: (searchParams: URLSearchParams): JournalEntryFilters => ({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as JournalEntryStatus) || undefined,
    source: (searchParams.get("source") as JournalEntrySource) || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

export default function JournalEntriesPage() {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const { filters, updateFilters, clearFilters } =
    useUrlFilters<JournalEntryFilters>({
      parserConfig: journalEntryFiltersParser,
    });

  const {
    data: entriesData,
    isLoading,
    isError,
  } = useJournalEntries(filters);

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

  const entries = entriesData?.data || [];
  const meta = entriesData?.meta;
  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.source ||
    filters.fromDate ||
    filters.toDate;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/20 to-primary-500/10 dark:from-accent-500/20 dark:to-primary-900/30">
            <BookMarked className="h-7 w-7 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Asientos Contables
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {meta?.total || 0} asientos contables
            </p>
          </div>
        </div>
        {hasPermission(Permission.ACCOUNTING_CREATE) && (
          <Link to="/accounting/journal-entries/new">
            <Button
              variant="gradient"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Nuevo Asiento
            </Button>
          </Link>
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
                  placeholder="Buscar por numero o descripcion..."
                  className="pl-10"
                  defaultValue={filters.search}
                  onChange={handleSearchChange}
                />
              </div>

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
                        filters.source,
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
                          status:
                            (value as JournalEntryStatus) || undefined,
                        })
                      }
                      placeholder="Todos los estados"
                    />
                    <Select
                      options={sourceOptions}
                      value={filters.source || ""}
                      onChange={(value) =>
                        updateFilters({
                          source:
                            (value as JournalEntrySource) || undefined,
                        })
                      }
                      placeholder="Todas las fuentes"
                    />
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                        Desde
                      </label>
                      <Input
                        type="date"
                        value={filters.fromDate || ""}
                        onChange={(e) =>
                          updateFilters({
                            fromDate: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                        Hasta
                      </label>
                      <Input
                        type="date"
                        value={filters.toDate || ""}
                        onChange={(e) =>
                          updateFilters({
                            toDate: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
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
                  <TableHead>#</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Fuente
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-right">
                    Total Debito
                  </TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={6} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar los asientos contables"
              description="Hubo un problema al cargar los asientos. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : entries.length === 0 ? (
            <EmptyState
              icon={<BookMarked className="h-16 w-16" />}
              title={
                hasActiveFilters ? "Sin resultados" : "No hay asientos contables"
              }
              description={
                hasActiveFilters
                  ? "No se encontraron asientos con los filtros aplicados."
                  : "Comienza creando tu primer asiento contable."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : hasPermission(Permission.ACCOUNTING_CREATE)
                    ? {
                        label: "Nuevo Asiento",
                        onClick: () =>
                          navigate("/accounting/journal-entries/new"),
                      }
                    : undefined
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Fuente
                    </TableHead>
                    <TableHead className="hidden sm:table-cell text-right">
                      Total Debito
                    </TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, i) => (
                    <AnimatedTableRow
                      key={entry.id}
                      index={i}
                      className="group cursor-pointer"
                    >
                      <TableCell>
                        <Link
                          to={`/accounting/journal-entries/${entry.id}`}
                          className="font-mono text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {entry.entryNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                          {formatDate(entry.date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/accounting/journal-entries/${entry.id}`}
                          className="text-neutral-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          {entry.description}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">
                          {JournalEntrySourceLabels[entry.source]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right">
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {formatCurrency(entry.totalDebit)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusBadgeVariant[entry.status]}
                          dot
                        >
                          {JournalEntryStatusLabels[entry.status]}
                        </Badge>
                      </TableCell>
                    </AnimatedTableRow>
                  ))}
                </TableBody>
              </Table>

              {meta && meta.totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-neutral-200 dark:border-neutral-700">
                  <PaginationInfo
                    currentPage={meta.page}
                    pageSize={meta.limit}
                    totalItems={meta.total}
                  />
                  <Pagination
                    currentPage={meta.page}
                    totalPages={meta.totalPages}
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
