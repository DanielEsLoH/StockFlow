import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  Search,
  Plus,
  Filter,
  Users,
  Eye,
  Pencil,
  Trash2,
  X,
  Mail,
  Phone,
  Building2,
  User,
  CheckCircle,
  XCircle,
  TrendingUp,
  UserPlus,
  MapPin,
} from "lucide-react";
import type { Route } from "./+types/_app.customers";
import { cn, debounce, formatCurrency } from "~/lib/utils";
import {
  useCustomers,
  useCustomerCities,
  useDeleteCustomer,
} from "~/hooks/useCustomers";
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
import type { CustomerFilters, Customer, CustomerType } from "~/types/customer";
import { useUrlFilters } from "~/hooks/useUrlFilters";
import { usePermissions } from "~/hooks/usePermissions";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Clientes - StockFlow" },
    { name: "description", content: "Gestion de clientes" },
  ];
};

// Type options
const typeOptions = [
  { value: "", label: "Todos los tipos" },
  { value: "INDIVIDUAL", label: "Persona Natural" },
  { value: "BUSINESS", label: "Empresa" },
];

// Status options
const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "true", label: "Activos" },
  { value: "false", label: "Inactivos" },
];

// Parser config for customer filters
const customerFiltersParser = {
  parse: (searchParams: URLSearchParams): CustomerFilters => ({
    search: searchParams.get("search") || undefined,
    type: (searchParams.get("type") as CustomerType) || undefined,
    city: searchParams.get("city") || undefined,
    isActive: searchParams.get("isActive")
      ? searchParams.get("isActive") === "true"
      : undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

export default function CustomersPage() {
  const { canCreateCustomers } = usePermissions();
  const [showFilters, setShowFilters] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(
    null,
  );
  const { filters, updateFilters, clearFilters } =
    useUrlFilters<CustomerFilters>({
      parserConfig: customerFiltersParser,
    });

  // Queries
  const { data: customersData, isLoading, isError } = useCustomers(filters);
  const { data: cities = [] } = useCustomerCities();
  const deleteCustomer = useDeleteCustomer();

  // City options
  const cityOptions = useMemo(
    () => [
      { value: "", label: "Todas las ciudades" },
      ...cities.map((city) => ({ value: city, label: city })),
    ],
    [cities],
  );

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
    if (deletingCustomer) {
      await deleteCustomer.mutateAsync(deletingCustomer.id);
      setDeletingCustomer(null);
    }
  };

  const customers = customersData?.data || [];
  const meta = customersData?.meta;
  const hasActiveFilters =
    filters.search ||
    filters.type ||
    filters.city ||
    filters.isActive !== undefined;

  // Calculate stats from customers data
  const activeCount = customers.filter((c) => c.isActive).length;
  const businessCount = customers.filter((c) => c.type === "BUSINESS").length;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/20 to-primary-500/10 dark:from-accent-500/20 dark:to-primary-900/30">
            <Users className="h-7 w-7 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Clientes
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {meta?.total || 0} clientes en tu base de datos
            </p>
          </div>
        </div>
        {canCreateCustomers && (
          <Link to="/customers/new">
            <Button
              variant="gradient"
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              Nuevo Cliente
            </Button>
          </Link>
        )}
      </PageSection>

      {/* Quick Stats */}
      <PageSection>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="soft-primary" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20">
                <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {meta?.total || 0}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Total Clientes
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
                  {activeCount}
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
                <Building2 className="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {businessCount}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Empresas
                </p>
              </div>
            </div>
          </Card>
          <Card variant="soft" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-500/20">
                <User className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {(meta?.total || 0) - businessCount}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Personas
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
                  placeholder="Buscar clientes por nombre, email, documento..."
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
                        filters.type,
                        filters.city,
                        filters.isActive !== undefined,
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Select
                      options={typeOptions}
                      value={filters.type || ""}
                      onChange={(value) =>
                        updateFilters({
                          type: (value as CustomerType) || undefined,
                        })
                      }
                      placeholder="Todos los tipos"
                    />
                    <Select
                      options={cityOptions}
                      value={filters.city || ""}
                      onChange={(value) =>
                        updateFilters({ city: value || undefined })
                      }
                      placeholder="Todas las ciudades"
                    />
                    <Select
                      options={statusOptions}
                      value={
                        filters.isActive !== undefined
                          ? String(filters.isActive)
                          : ""
                      }
                      onChange={(value) =>
                        updateFilters({
                          isActive: value ? value === "true" : undefined,
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
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Contacto
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Total Compras
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
              title="Error al cargar los clientes"
              description="Hubo un problema al cargar los clientes. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : customers.length === 0 ? (
            <EmptyState
              icon={<Users className="h-16 w-16" />}
              title={hasActiveFilters ? "Sin resultados" : "No hay clientes"}
              description={
                hasActiveFilters
                  ? "No se encontraron clientes con los filtros aplicados."
                  : "Comienza agregando tu primer cliente."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : {
                      label: "Agregar cliente",
                      onClick: () => (window.location.href = "/customers/new"),
                    }
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Contacto
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Total Compras
                    </TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-30">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer, i) => (
                    <AnimatedTableRow key={customer.id} index={i} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                                customer.type === "BUSINESS"
                                  ? "bg-gradient-to-br from-primary-500/20 to-accent-500/10"
                                  : "bg-gradient-to-br from-accent-500/20 to-primary-500/10",
                              )}
                            >
                              {customer.type === "BUSINESS" ? (
                                <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                              ) : (
                                <User className="h-5 w-5 text-accent-600 dark:text-accent-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-neutral-900 dark:text-white">
                                {customer.name}
                              </p>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                {customer.document || "Sin documento"}
                                {customer.city && (
                                  <>
                                    <span className="text-neutral-300 dark:text-neutral-600">
                                      •
                                    </span>
                                    <MapPin className="h-3 w-3" />
                                    {customer.city}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800">
                                <Mail className="h-3 w-3 text-neutral-500" />
                              </div>
                              <span className="text-neutral-700 dark:text-neutral-300 truncate max-w-[180px]">
                                {customer.email}
                              </span>
                            </div>
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800">
                                  <Phone className="h-3 w-3 text-neutral-500" />
                                </div>
                                <span className="text-neutral-700 dark:text-neutral-300">
                                  {customer.phone}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant={
                              customer.type === "BUSINESS"
                                ? "outline-primary"
                                : "outline"
                            }
                            icon={
                              customer.type === "BUSINESS" ? (
                                <Building2 className="h-3 w-3" />
                              ) : (
                                <User className="h-3 w-3" />
                              )
                            }
                          >
                            {customer.type === "BUSINESS"
                              ? "Empresa"
                              : "Persona"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="h-4 w-4 text-success-500" />
                              <span className="font-bold text-lg bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                                {formatCurrency(customer.totalSpent || 0)}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {customer.totalPurchases || 0} compras realizadas
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.isActive ? (
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
                            <Link to={`/customers/${customer.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver detalles"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to={`/customers/${customer.id}/edit`}>
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
                              onClick={() => setDeletingCustomer(customer)}
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
        open={!!deletingCustomer}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        itemName={deletingCustomer?.name || ""}
        itemType="cliente"
        onConfirm={handleDelete}
        isLoading={deleteCustomer.isPending}
      />
    </PageWrapper>
  );
}
