import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Filter,
  Eye,
  Trash2,
  X,
  Calendar,
  Truck,
  Package,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import type { Route } from "./+types/_app.remissions";
import { cn, debounce, formatDate } from "~/lib/utils";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  useRemissions,
  useRemissionStats,
  useDeleteRemission,
} from "~/hooks/useRemissions";
import { useCustomerOptions } from "~/hooks/useCustomerOptions";
import { useUrlFilters } from "~/hooks/useUrlFilters";
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
import { DeleteModal } from "~/components/ui/DeleteModal";
import type { RemissionStatus, Remission } from "~/types/remission";
import { remissionStatusLabels } from "~/types/remission";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Remisiones - StockFlow" },
    { name: "description", content: "Gestion de remisiones" },
  ];
};

// Status filter options
const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "DRAFT", label: "Borrador" },
  { value: "DISPATCHED", label: "Despachada" },
  { value: "DELIVERED", label: "Entregada" },
  { value: "CANCELLED", label: "Cancelada" },
];

// Items per page
const pageSizeOptions = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
];

// Badge variant mapping
const statusBadgeVariant: Record<
  RemissionStatus,
  "default" | "primary" | "secondary" | "success" | "warning" | "error"
> = {
  DRAFT: "secondary",
  DISPATCHED: "warning",
  DELIVERED: "success",
  CANCELLED: "error",
};

// Status icon mapping
const statusIcon: Record<RemissionStatus, React.ReactNode> = {
  DRAFT: <Clock className="h-3 w-3" />,
  DISPATCHED: <Truck className="h-3 w-3" />,
  DELIVERED: <CheckCircle className="h-3 w-3" />,
  CANCELLED: <XCircle className="h-3 w-3" />,
};

// Filters type
interface RemissionFilters {
  search?: string;
  status?: RemissionStatus;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// Date filter input
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

// Table header
function RemissionTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>No. Remision</TableHead>
        <TableHead>Cliente</TableHead>
        <TableHead className="hidden md:table-cell">Bodega</TableHead>
        <TableHead className="hidden sm:table-cell">Fecha</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead className="w-24">Acciones</TableHead>
      </TableRow>
    </TableHeader>
  );
}

// Parser config
const remissionFiltersParser = {
  parse: (searchParams: URLSearchParams): RemissionFilters => ({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as RemissionStatus) || undefined,
    customerId: searchParams.get("customerId") || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

export default function RemissionsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [deletingRemission, setDeletingRemission] = useState<Remission | null>(null);
  const { filters, updateFilters, clearFilters } =
    useUrlFilters<RemissionFilters>({
      parserConfig: remissionFiltersParser,
    });

  // Queries
  const {
    data: remissionsData,
    isLoading,
    isError,
  } = useRemissions(filters as Record<string, unknown>);
  const { data: stats } = useRemissionStats();
  const deleteRemission = useDeleteRemission();

  // Customer options
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
    if (deletingRemission) {
      await deleteRemission.mutateAsync(deletingRemission.id);
      setDeletingRemission(null);
    }
  };

  const remissions = remissionsData?.data || [];
  const total = remissionsData?.total || 0;
  const totalPages = Math.ceil(total / (filters.limit || 10));
  const hasActiveFilters =
    filters.search || filters.status || filters.customerId || filters.fromDate || filters.toDate;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-900/30">
            <Truck className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Remisiones
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {total} remisiones en total
            </p>
          </div>
        </div>
        <Link to="/remissions/new">
          <Button variant="gradient" leftIcon={<Plus className="h-4 w-4" />}>
            Nueva Remision
          </Button>
        </Link>
      </PageSection>

      {/* Stats Cards */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Package}
            label="Total Remisiones"
            value={stats?.total || 0}
            subtitle="en el sistema"
            color="primary"
            variant="gradient"
            animate
            animationDelay={0}
          />
          <StatCard
            icon={Clock}
            label="Borradores"
            value={stats?.DRAFT || 0}
            color="warning"
            variant="gradient"
            animate
            animationDelay={0.1}
          />
          <StatCard
            icon={Truck}
            label="Despachadas"
            value={stats?.DISPATCHED || 0}
            color="primary"
            variant="gradient"
            animate
            animationDelay={0.2}
          />
          <StatCard
            icon={CheckCircle}
            label="Entregadas"
            value={stats?.DELIVERED || 0}
            color="success"
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
                  placeholder="Buscar por numero de remision o cliente..."
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
                          status: (value as RemissionStatus) || undefined,
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
              <RemissionTableHeader />
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={6} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar remisiones"
              description="Hubo un problema al cargar las remisiones. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : remissions.length === 0 ? (
            <EmptyState
              icon={<Truck className="h-16 w-16" />}
              title={hasActiveFilters ? "Sin resultados" : "No hay remisiones"}
              description={
                hasActiveFilters
                  ? "No se encontraron remisiones con los filtros aplicados."
                  : "Comienza creando tu primera remision."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : {
                      label: "Crear remision",
                      onClick: () =>
                        (window.location.href = "/remissions/new"),
                    }
              }
            />
          ) : (
            <>
              <Table>
                <RemissionTableHeader />
                <TableBody>
                  {remissions.map((remission, i) => (
                    <AnimatedTableRow
                      key={remission.id}
                      index={i}
                      className="group border-b border-neutral-200 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <TableCell>
                        <Link
                          to={`/remissions/${remission.id}`}
                          className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                        >
                          {remission.remissionNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {remission.customer?.name || "Sin cliente"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                          {remission.warehouse?.name || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                          {formatDate(remission.issueDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusBadgeVariant[remission.status]}
                          size="sm"
                          icon={statusIcon[remission.status]}
                        >
                          {remissionStatusLabels[remission.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/remissions/${remission.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {remission.status === "DRAFT" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingRemission(remission)}
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
              {totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-4">
                    <PaginationInfo
                      currentPage={filters.page || 1}
                      pageSize={filters.limit || 10}
                      totalItems={total}
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
                    currentPage={filters.page || 1}
                    totalPages={totalPages}
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
        open={!!deletingRemission}
        onOpenChange={(open) => !open && setDeletingRemission(null)}
        itemName={deletingRemission?.remissionNumber || ""}
        itemType="remision"
        onConfirm={handleDelete}
        isLoading={deleteRemission.isPending}
      />
    </PageWrapper>
  );
}
