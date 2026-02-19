import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  Search,
  Plus,
  Filter,
  Eye,
  Pencil,
  Trash2,
  X,
  Mail,
  Phone,
  Building2,
  CheckCircle,
  XCircle,
  MapPin,
  Clock,
} from "lucide-react";
import type { Route } from "./+types/_app.suppliers";
import { cn, debounce, formatCurrency } from "~/lib/utils";
import {
  useSuppliers,
  useSupplierStats,
  useDeleteSupplier,
} from "~/hooks/useSuppliers";
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
import { DeleteModal } from "~/components/ui/DeleteModal";
import { EmptyState } from "~/components/ui/EmptyState";
import type { SupplierFilters, Supplier, SupplierStatus } from "~/types/supplier";
import { PaymentTermsLabels } from "~/types/supplier";
import { useUrlFilters } from "~/hooks/useUrlFilters";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Proveedores - StockFlow" },
    { name: "description", content: "Gestion de proveedores" },
  ];
};

// Status options
const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "ACTIVE", label: "Activos" },
  { value: "INACTIVE", label: "Inactivos" },
];

// Parser config for supplier filters
const supplierFiltersParser = {
  parse: (searchParams: URLSearchParams): SupplierFilters => ({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as SupplierStatus) || undefined,
    city: searchParams.get("city") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

export default function SuppliersPage() {
  const { hasPermission } = usePermissions();
  const [showFilters, setShowFilters] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(
    null,
  );
  const { filters, updateFilters, clearFilters } =
    useUrlFilters<SupplierFilters>({
      parserConfig: supplierFiltersParser,
    });

  // Queries
  const { data: suppliersData, isLoading, isError } = useSuppliers(filters);
  const { data: stats } = useSupplierStats();
  const deleteSupplier = useDeleteSupplier();

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
    if (deletingSupplier) {
      await deleteSupplier.mutateAsync(deletingSupplier.id);
      setDeletingSupplier(null);
    }
  };

  const suppliers = suppliersData?.data || [];
  const meta = suppliersData?.meta;
  const hasActiveFilters = filters.search || filters.status || filters.city;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/20 to-primary-500/10 dark:from-accent-500/20 dark:to-primary-900/30">
            <Building2 className="h-7 w-7 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Proveedores
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {meta?.total || 0} proveedores en tu base de datos
            </p>
          </div>
        </div>
        {hasPermission(Permission.SUPPLIERS_CREATE) && (
          <Link to="/suppliers/new">
            <Button
              variant="gradient"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Nuevo Proveedor
            </Button>
          </Link>
        )}
      </PageSection>

      {/* Quick Stats */}
      <PageSection>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card variant="soft-primary" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20">
                <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {stats?.total || 0}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Total Proveedores
                </p>
              </div>
            </div>
          </Card>
          <Card variant="soft-success" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-500/20">
                <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {stats?.active || 0}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Activos
                </p>
              </div>
            </div>
          </Card>
          <Card variant="soft-warning" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/20">
                <XCircle className="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {stats?.inactive || 0}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Inactivos
                </p>
              </div>
            </div>
          </Card>
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
                  placeholder="Buscar proveedores por nombre, NIT, ciudad..."
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
                      [filters.status, filters.city].filter(Boolean).length
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Select
                      options={statusOptions}
                      value={filters.status || ""}
                      onChange={(value) =>
                        updateFilters({
                          status: (value as SupplierStatus) || undefined,
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
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">
                    NIT/Documento
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Ciudad</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Condiciones de Pago
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-30">Acciones</TableHead>
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
              title="Error al cargar los proveedores"
              description="Hubo un problema al cargar los proveedores. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : suppliers.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-16 w-16" />}
              title={hasActiveFilters ? "Sin resultados" : "No hay proveedores"}
              description={
                hasActiveFilters
                  ? "No se encontraron proveedores con los filtros aplicados."
                  : "Comienza agregando tu primer proveedor."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : {
                      label: "Agregar proveedor",
                      onClick: () => (window.location.href = "/suppliers/new"),
                    }
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden md:table-cell">
                      NIT/Documento
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">Ciudad</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Condiciones de Pago
                    </TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-30">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier, i) => (
                    <AnimatedTableRow key={supplier.id} index={i} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105 bg-gradient-to-br from-primary-500/20 to-accent-500/10">
                              <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                              <Link
                                to={`/suppliers/${supplier.id}`}
                                className="font-semibold text-neutral-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                              >
                                {supplier.name}
                              </Link>
                              {supplier.contactName && (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                  {supplier.contactName}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-neutral-700 dark:text-neutral-300">
                            {supplier.documentNumber || "-"}
                          </span>
                          {supplier.documentType && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {supplier.documentType}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {supplier.city ? (
                            <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                              <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                              {supplier.city}
                            </div>
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline" icon={<Clock className="h-3 w-3" />}>
                            {PaymentTermsLabels[supplier.paymentTerms]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {supplier.status === "ACTIVE" ? (
                            <Badge variant="success" dot>
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="error" dot>
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link to={`/suppliers/${supplier.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver detalles"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {hasPermission(Permission.SUPPLIERS_EDIT) && (
                              <Link to={`/suppliers/${supplier.id}/edit`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                            {hasPermission(Permission.SUPPLIERS_DELETE) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingSupplier(supplier)}
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

      {/* Delete Modal */}
      <DeleteModal
        open={!!deletingSupplier}
        onOpenChange={(open) => !open && setDeletingSupplier(null)}
        itemName={deletingSupplier?.name || ""}
        itemType="proveedor"
        onConfirm={handleDelete}
        isLoading={deleteSupplier.isPending}
      />
    </PageWrapper>
  );
}
