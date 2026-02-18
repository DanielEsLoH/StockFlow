import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { usePermissions } from "~/hooks/usePermissions";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  Search,
  Plus,
  Filter,
  Eye,
  Pencil,
  Trash2,
  X,
  Calendar,
  Clock,
  CheckCircle,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import type { Route } from "./+types/_app.quotations";
import { cn, debounce, formatCurrency, formatDate } from "~/lib/utils";
import {
  useQuotations,
  useQuotationStats,
  useDeleteQuotation,
} from "~/hooks/useQuotations";
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
import { DeleteModal } from "~/components/ui/DeleteModal";
import { EmptyState } from "~/components/ui/EmptyState";
import type {
  QuotationFilters,
  QuotationSummary,
  QuotationStatus,
} from "~/types/quotation";
import { QuotationStatusLabels } from "~/types/quotation";
import { useUrlFilters } from "~/hooks/useUrlFilters";
import { useCustomerOptions } from "~/hooks/useCustomerOptions";

// Meta for SEO - used by React Router
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Cotizaciones - StockFlow" },
    { name: "description", content: "Gestion de cotizaciones" },
  ];
};

// Status options for filter
const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "DRAFT", label: "Borrador" },
  { value: "SENT", label: "Enviada" },
  { value: "ACCEPTED", label: "Aceptada" },
  { value: "REJECTED", label: "Rechazada" },
  { value: "EXPIRED", label: "Vencida" },
  { value: "CONVERTED", label: "Convertida" },
];

// Items per page options
const pageSizeOptions = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
];

// Badge variant mapping for quotation statuses
const statusBadgeVariant: Record<
  QuotationStatus,
  "default" | "primary" | "secondary" | "success" | "warning" | "error"
> = {
  DRAFT: "secondary",
  SENT: "primary",
  ACCEPTED: "success",
  REJECTED: "error",
  EXPIRED: "warning",
  CONVERTED: "primary",
};

// Date filter input component - extracted to avoid duplication
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

// Quotation table header component - extracted to avoid duplication
function QuotationTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>No. Cotizacion</TableHead>
        <TableHead>Cliente</TableHead>
        <TableHead className="hidden md:table-cell">Fecha</TableHead>
        <TableHead className="hidden sm:table-cell">Valida hasta</TableHead>
        <TableHead className="text-right">Total</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead className="w-30">Acciones</TableHead>
      </TableRow>
    </TableHeader>
  );
}

// Parser config for quotation filters
const quotationFiltersParser = {
  parse: (searchParams: URLSearchParams): QuotationFilters => ({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as QuotationStatus) || undefined,
    customerId: searchParams.get("customerId") || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

// Default export used by React Router
export default function QuotationsPage() {
  const { canCreateQuotations, canDeleteQuotations } = usePermissions();
  const [showFilters, setShowFilters] = useState(false);
  const [deletingQuotation, setDeletingQuotation] =
    useState<QuotationSummary | null>(null);
  const { filters, updateFilters, clearFilters } =
    useUrlFilters<QuotationFilters>({
      parserConfig: quotationFiltersParser,
    });

  // Queries
  const {
    data: quotationsData,
    isLoading,
    isError,
  } = useQuotations(filters);
  const { data: stats } = useQuotationStats();
  const deleteQuotation = useDeleteQuotation();

  // Customer options for filter
  const customerOptions = useCustomerOptions();

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

  // Handle delete
  const handleDelete = async () => {
    if (deletingQuotation) {
      await deleteQuotation.mutateAsync(deletingQuotation.id);
      setDeletingQuotation(null);
    }
  };

  // Check if quotation can be edited (only drafts)
  const canEdit = (quotation: QuotationSummary) => {
    return quotation.status === "DRAFT";
  };

  // Check if quotation can be deleted (only drafts)
  const canDelete = (quotation: QuotationSummary) => {
    return quotation.status === "DRAFT";
  };

  const quotations = quotationsData?.data || [];
  const paginationMeta = quotationsData?.meta;
  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.customerId ||
    filters.fromDate ||
    filters.toDate;

  const pendingCount =
    (stats?.quotationsByStatus?.DRAFT || 0) +
    (stats?.quotationsByStatus?.SENT || 0);

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-900/30">
            <ClipboardList className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Cotizaciones
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {paginationMeta?.total || 0} cotizaciones en total
            </p>
          </div>
        </div>
        {canCreateQuotations && (
          <Link to="/quotations/new">
            <Button variant="gradient" leftIcon={<Plus className="h-4 w-4" />}>
              Nueva Cotizacion
            </Button>
          </Link>
        )}
      </PageSection>

      {/* Stats Cards */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={ClipboardList}
            label="Total Cotizaciones"
            value={stats?.totalQuotations || 0}
            subtitle="en el sistema"
            color="primary"
            variant="gradient"
            animate
            animationDelay={0}
          />
          <StatCard
            icon={Clock}
            label="Pendientes"
            value={pendingCount}
            color="warning"
            variant="gradient"
            animate
            animationDelay={0.1}
          />
          <StatCard
            icon={CheckCircle}
            label="Aceptadas"
            value={stats?.quotationsByStatus?.ACCEPTED || 0}
            color="success"
            variant="gradient"
            animate
            animationDelay={0.2}
          />
          <StatCard
            icon={TrendingUp}
            label="Valor Total"
            value={formatCurrency(stats?.totalValue || 0)}
            color="primary"
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
                  placeholder="Buscar por numero de cotizacion o cliente..."
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
                        filters.customerId,
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
                          status: (value as QuotationStatus) || undefined,
                        })
                      }
                      placeholder="Todos los estados"
                    />
                    <Select
                      options={customerOptions}
                      value={filters.customerId || ""}
                      onChange={(value) =>
                        updateFilters({ customerId: value || undefined })
                      }
                      placeholder="Todos los clientes"
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
              <QuotationTableHeader />
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={7} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar cotizaciones"
              description="Hubo un problema al cargar las cotizaciones. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : quotations.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-16 w-16" />}
              title={
                hasActiveFilters ? "Sin resultados" : "No hay cotizaciones"
              }
              description={
                hasActiveFilters
                  ? "No se encontraron cotizaciones con los filtros aplicados."
                  : "Comienza creando tu primera cotizacion."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : {
                      label: "Crear cotizacion",
                      onClick: () =>
                        (window.location.href = "/quotations/new"),
                    }
              }
            />
          ) : (
            <>
              <Table>
                <QuotationTableHeader />
                <TableBody>
                  {quotations.map((quotation, i) => (
                    <AnimatedTableRow
                      key={quotation.id}
                      index={i}
                      className="group border-b border-neutral-200 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <TableCell>
                        <Link
                          to={`/quotations/${quotation.id}`}
                          className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                        >
                          {quotation.quotationNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {quotation.customer?.name || "Sin cliente"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                          {formatDate(quotation.issueDate)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div
                          className={cn(
                            "flex items-center gap-1.5 text-sm",
                            quotation.status === "EXPIRED"
                              ? "text-error-600 dark:text-error-400"
                              : "text-neutral-700 dark:text-neutral-300",
                          )}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          {quotation.validUntil
                            ? formatDate(quotation.validUntil)
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-bold text-lg bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                          {formatCurrency(quotation.total)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusBadgeVariant[quotation.status]}
                          size="sm"
                        >
                          {QuotationStatusLabels[quotation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/quotations/${quotation.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {canEdit(quotation) && (
                            <Link to={`/quotations/${quotation.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          {canDelete(quotation) && canDeleteQuotations && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingQuotation(quotation)}
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

      {/* Delete Modal */}
      <DeleteModal
        open={!!deletingQuotation}
        onOpenChange={(open) => !open && setDeletingQuotation(null)}
        itemName={deletingQuotation?.quotationNumber || ""}
        itemType="cotizacion"
        onConfirm={handleDelete}
        isLoading={deleteQuotation.isPending}
      />
    </PageWrapper>
  );
}
