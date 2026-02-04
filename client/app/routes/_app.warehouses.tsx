import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { containerVariants, itemVariants } from "~/lib/animations";
import {
  Search,
  Plus,
  Filter,
  Warehouse,
  Eye,
  Pencil,
  Trash2,
  X,
  MapPin,
  User,
  Package,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { Route } from "./+types/_app.warehouses";
import { cn, debounce } from "~/lib/utils";
import {
  useWarehousesWithFilters,
  useWarehouseCities,
  useDeleteWarehouse,
} from "~/hooks/useWarehouses";
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
} from "~/components/ui/Table";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import { DeleteModal } from "~/components/ui/DeleteModal";
import type {
  WarehouseFilters,
  Warehouse as WarehouseType,
} from "~/types/warehouse";
import { useUrlFilters } from "~/hooks/useUrlFilters";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Bodegas - StockFlow" },
    { name: "description", content: "Gestion de bodegas y almacenes" },
  ];
};

// Status options
const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "true", label: "Activas" },
  { value: "false", label: "Inactivas" },
];

// Parser config for warehouse filters
const warehouseFiltersParser = {
  parse: (searchParams: URLSearchParams): WarehouseFilters => ({
    search: searchParams.get("search") || undefined,
    city: searchParams.get("city") || undefined,
    isActive: searchParams.get("isActive")
      ? searchParams.get("isActive") === "true"
      : undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

export default function WarehousesPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [deletingWarehouse, setDeletingWarehouse] =
    useState<WarehouseType | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const { filters, updateFilters, clearFilters } =
    useUrlFilters<WarehouseFilters>({
      parserConfig: warehouseFiltersParser,
    });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Queries
  const {
    data: warehousesData,
    isLoading,
    isError,
  } = useWarehousesWithFilters(filters);
  const { data: cities = [] } = useWarehouseCities();
  const deleteWarehouse = useDeleteWarehouse();

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
    if (deletingWarehouse) {
      await deleteWarehouse.mutateAsync(deletingWarehouse.id);
      setDeletingWarehouse(null);
    }
  };

  const warehouses = warehousesData?.data || [];
  const meta = warehousesData?.meta;
  const hasActiveFilters =
    filters.search || filters.city || filters.isActive !== undefined;

  return (
    <motion.div
      variants={containerVariants}
      initial={isMounted ? "hidden" : false}
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Bodegas
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Gestiona tus bodegas y almacenes
          </p>
        </div>
        <Link to="/warehouses/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>Nueva Bodega</Button>
        </Link>
      </motion.div>

      {/* Search and Filters */}
      <motion.div variants={itemVariants}>
        <Card padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Buscar bodegas..."
                  className="pl-10"
                  defaultValue={filters.search}
                  onChange={handleSearchChange}
                />
              </div>

              {/* Filter toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  showFilters &&
                    "bg-primary-50 border-primary-500 text-primary-600 dark:bg-primary-900/20",
                )}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="primary" className="ml-2">
                    {
                      [filters.city, filters.isActive !== undefined].filter(
                        Boolean,
                      ).length
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
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bodega</TableHead>
                  <TableHead className="hidden md:table-cell">Ciudad</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Encargado
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Productos
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={6} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <div className="p-8 text-center">
              <p className="text-error-500">Error al cargar las bodegas</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </Button>
            </div>
          ) : warehouses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-6 text-neutral-300 dark:text-neutral-600">
                <Warehouse className="h-16 w-16" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
                {hasActiveFilters ? "Sin resultados" : "No hay bodegas"}
              </h3>
              <p className="mb-6 max-w-sm text-neutral-500 dark:text-neutral-400">
                {hasActiveFilters
                  ? "No se encontraron bodegas con los filtros aplicados."
                  : "Comienza creando tu primera bodega."}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Link to="/warehouses/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear bodega
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bodega</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Ciudad
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Encargado
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Productos
                    </TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {warehouses.map((warehouse) => (
                      <motion.tr
                        key={warehouse.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                              <Warehouse className="h-5 w-5 text-primary-500" />
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900 dark:text-white">
                                {warehouse.name}
                              </p>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                                {warehouse.address}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-neutral-400" />
                            <span className="text-neutral-700 dark:text-neutral-300">
                              {warehouse.city || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <User className="h-4 w-4 text-neutral-400" />
                            <span className="text-neutral-700 dark:text-neutral-300">
                              {warehouse.manager || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="secondary">
                            <Package className="h-3 w-3 mr-1" />
                            {warehouse.productCount || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {warehouse.isActive ? (
                            <Badge variant="success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Activa
                            </Badge>
                          ) : (
                            <Badge variant="error">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactiva
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link to={`/warehouses/${warehouse.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver detalles"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to={`/warehouses/${warehouse.id}/edit`}>
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
                              onClick={() => setDeletingWarehouse(warehouse)}
                              title="Eliminar"
                              className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
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
      </motion.div>

      {/* Delete Modal */}
      <DeleteModal
        open={!!deletingWarehouse}
        onOpenChange={(open) => !open && setDeletingWarehouse(null)}
        itemName={deletingWarehouse?.name || ""}
        itemType="bodega"
        onConfirm={handleDelete}
        isLoading={deleteWarehouse.isPending}
      />
    </motion.div>
  );
}
