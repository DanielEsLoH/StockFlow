import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  Plus,
  Warehouse,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  PauseCircle,
  Banknote,
  Boxes,
  Filter,
  X,
  Search,
} from "lucide-react";
import type { Route } from "./+types/_app.pos.cash-registers";
import { cn, debounce, formatDateTime } from "~/lib/utils";
import { useCashRegisters, useDeleteCashRegister } from "~/hooks/usePOS";
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
import { useUrlFilters } from "~/hooks/useUrlFilters";
import type { CashRegisterFilters, CashRegister } from "~/types/pos";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Cajas Registradoras - POS - StockFlow" },
    { name: "description", content: "Gestion de cajas registradoras" },
  ];
};

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "OPEN", label: "Abierta" },
  { value: "CLOSED", label: "Cerrada" },
  { value: "SUSPENDED", label: "Suspendida" },
];

const pageSizeOptions = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
];

const registersFiltersParser = {
  parse: (searchParams: URLSearchParams): CashRegisterFilters => ({
    status:
      (searchParams.get("status") as "OPEN" | "CLOSED" | "SUSPENDED") ||
      undefined,
    warehouseId: searchParams.get("warehouseId") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

// Table header component
function RegisterTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Caja</TableHead>
        <TableHead className="hidden md:table-cell">Bodega</TableHead>
        <TableHead className="hidden sm:table-cell">Codigo</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead className="w-[120px]">Acciones</TableHead>
      </TableRow>
    </TableHeader>
  );
}

export default function CashRegistersPage() {
  const navigate = useNavigate();
  const [deletingRegister, setDeletingRegister] =
    useState<CashRegister | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { filters, updateFilters, clearFilters } =
    useUrlFilters<CashRegisterFilters>({
      parserConfig: registersFiltersParser,
    });

  const {
    data: registersData,
    isLoading,
    isError,
  } = useCashRegisters(filters);
  const deleteRegister = useDeleteCashRegister();

  const handleDelete = async () => {
    if (deletingRegister) {
      await deleteRegister.mutateAsync(deletingRegister.id);
      setDeletingRegister(null);
    }
  };

  const registers = registersData?.data || [];
  const paginationMeta = registersData?.meta;
  const hasActiveFilters = !!filters.status || !!filters.warehouseId;

  // Derive stats from current page data
  const openCount = registers.filter((r) => r.status === "OPEN").length;
  const closedCount = registers.filter((r) => r.status === "CLOSED").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <Badge variant="success" size="sm">
            <CheckCircle className="h-3 w-3 mr-1" />
            Abierta
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="secondary" size="sm">
            <XCircle className="h-3 w-3 mr-1" />
            Cerrada
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge variant="warning" size="sm">
            <PauseCircle className="h-3 w-3 mr-1" />
            Suspendida
          </Badge>
        );
      default:
        return <Badge size="sm">{status}</Badge>;
    }
  };

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-900/30">
            <Boxes className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Cajas Registradoras
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {paginationMeta?.total || registers.length} cajas configuradas
            </p>
          </div>
        </div>
        <Link to="/pos/cash-registers/new">
          <Button
            variant="gradient"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Nueva Caja
          </Button>
        </Link>
      </PageSection>

      {/* Stats Cards */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Boxes}
            label="Total Cajas"
            value={paginationMeta?.total || registers.length}
            color="primary"
            variant="gradient"
            animate
            animationDelay={0}
          />
          <StatCard
            icon={CheckCircle}
            label="Abiertas"
            value={openCount}
            color="success"
            variant="gradient"
            animate
            animationDelay={0.1}
          />
          <StatCard
            icon={XCircle}
            label="Cerradas"
            value={closedCount}
            color="neutral"
            variant="gradient"
            animate
            animationDelay={0.2}
          />
        </div>
      </PageSection>

      {/* Filters */}
      <PageSection>
        <Card variant="elevated" padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button
                variant={showFilters ? "soft-primary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="gradient" size="xs" className="ml-2">
                    {
                      [filters.status, filters.warehouseId].filter(Boolean)
                        .length
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Select
                      options={statusOptions}
                      value={filters.status || ""}
                      onChange={(value) =>
                        updateFilters({
                          status:
                            (value as "OPEN" | "CLOSED" | "SUSPENDED") ||
                            undefined,
                        })
                      }
                      placeholder="Todos los estados"
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
              <RegisterTableHeader />
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={5} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar las cajas"
              description="Hubo un problema al cargar las cajas registradoras. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : registers.length === 0 ? (
            <EmptyState
              icon={<Boxes className="h-16 w-16" />}
              title={
                hasActiveFilters
                  ? "Sin resultados"
                  : "No hay cajas registradoras"
              }
              description={
                hasActiveFilters
                  ? "No se encontraron cajas con los filtros aplicados."
                  : "Crea tu primera caja registradora para comenzar a usar el punto de venta."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : {
                      label: "Crear caja",
                      onClick: () => navigate("/pos/cash-registers/new"),
                    }
              }
            />
          ) : (
            <>
              <Table>
                <RegisterTableHeader />
                <TableBody>
                  {registers.map((register, i) => (
                    <AnimatedTableRow
                      key={register.id}
                      index={i}
                      className="group border-b border-neutral-200 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 dark:from-primary-500/20 dark:to-primary-900/30">
                            <Banknote className="h-5 w-5 text-primary-500" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {register.name}
                            </p>
                            {register.description && (
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                                {register.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Warehouse className="h-4 w-4 text-neutral-400" />
                          <span className="text-neutral-700 dark:text-neutral-300">
                            {(register as any).warehouse?.name || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">{register.code}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(register.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                          <Link
                            to={`/pos/cash-registers/${register.id}/edit`}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingRegister(register)}
                            title="Eliminar"
                            className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
        open={!!deletingRegister}
        onOpenChange={(open) => !open && setDeletingRegister(null)}
        itemName={deletingRegister?.name || ""}
        itemType="caja registradora"
        onConfirm={handleDelete}
        isLoading={deleteRegister.isPending}
      />
    </PageWrapper>
  );
}
