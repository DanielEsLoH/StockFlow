import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { containerVariants, itemVariants } from "~/lib/animations";
import {
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  X,
  Calendar,
  Package,
  Warehouse,
  Plus,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldX,
} from "lucide-react";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";
import { cn, formatDate } from "~/lib/utils";
import { useStockMovements } from "~/hooks/useStockMovements";
import { useProducts } from "~/hooks/useProducts";
import { useWarehouses } from "~/hooks/useWarehouses";
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
} from "~/components/ui/Table";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import type {
  StockMovementFilters,
  StockMovement,
  MovementType,
} from "~/types/stock-movement";
import { MovementTypeLabels, MovementTypeColors } from "~/types/stock-movement";

// Parser config for movement filters
const movementFiltersParser = {
  parse: (searchParams: URLSearchParams): StockMovementFilters => ({
    productId: searchParams.get("productId") || undefined,
    warehouseId: searchParams.get("warehouseId") || undefined,
    type: (searchParams.get("type") as MovementType) || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

// Meta for SEO
export function meta() {
  return [
    { title: "Movimientos de Inventario - StockFlow" },
    { name: "description", content: "Historial de movimientos de inventario" },
  ];
}

// Type options for filter
const typeOptions = [
  { value: "", label: "Todos los tipos" },
  { value: "SALE", label: "Venta" },
  { value: "PURCHASE", label: "Compra" },
  { value: "ADJUSTMENT", label: "Ajuste" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "RETURN", label: "Devolucion" },
  { value: "DAMAGE", label: "Daño" },
  { value: "EXPIRED", label: "Vencido" },
];

// Items per page options
const pageSizeOptions = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
];

// Movement type badge component
function MovementTypeBadge({ type }: { type: MovementType }) {
  return (
    <Badge variant={MovementTypeColors[type] || "default"}>
      {MovementTypeLabels[type] || type}
    </Badge>
  );
}

// Quantity badge component
function QuantityBadge({ quantity }: { quantity: number }) {
  const isPositive = quantity > 0;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold",
        isPositive
          ? "bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400"
          : "bg-error-50 text-error-700 dark:bg-error-900/20 dark:text-error-400",
      )}
    >
      {isPositive ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5" />
      )}
      {isPositive ? `+${quantity}` : quantity}
    </div>
  );
}

// Access Denied component
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-4 rounded-full bg-error-100 dark:bg-error-900/30 mb-6">
        <ShieldX className="h-12 w-12 text-error-500 dark:text-error-400" />
      </div>
      <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white mb-2">
        Acceso Denegado
      </h1>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-md">
        No tienes permisos para ver los movimientos de inventario. Contacta a tu administrador si necesitas acceso.
      </p>
    </div>
  );
}

export default function InventoryMovementsPage() {
  const { hasPermission } = usePermissions();
  const [showFilters, setShowFilters] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { filters, updateFilters, clearFilters } =
    useUrlFilters<StockMovementFilters>({
      parserConfig: movementFiltersParser,
    });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Store permission check result - must be before any early returns
  const canViewInventory = hasPermission(Permission.INVENTORY_VIEW);

  // Queries - must be called before any early returns to maintain hook order
  const { data: movementsData, isLoading, isError } = useStockMovements(filters);
  const { data: productsData } = useProducts({ limit: 100 });
  const { data: warehousesData } = useWarehouses();

  // Product options for filter
  const productOptions = useMemo(
    () => [
      { value: "", label: "Todos los productos" },
      ...(productsData?.data || []).map((p) => ({
        value: p.id,
        label: `${p.sku} - ${p.name}`,
      })),
    ],
    [productsData],
  );

  // Warehouse options for filter
  const warehouseOptions = useMemo(
    () => [
      { value: "", label: "Todas las bodegas" },
      ...(warehousesData || []).map((w) => ({
        value: w.id,
        label: w.name,
      })),
    ],
    [warehousesData],
  );

  // Calculate stats from current data
  const stats = useMemo(() => {
    const movements = movementsData?.data || [];
    const totalIn = movements
      .filter((m) => m.quantity > 0)
      .reduce((sum, m) => sum + m.quantity, 0);
    const totalOut = movements
      .filter((m) => m.quantity < 0)
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const adjustments = movements.filter((m) => m.type === "ADJUSTMENT").length;
    const sales = movements.filter((m) => m.type === "SALE").length;

    return { totalIn, totalOut, adjustments, sales };
  }, [movementsData]);

  // Check permissions after all hooks
  if (!canViewInventory) {
    return <AccessDenied />;
  }

  const movements = movementsData?.data || [];
  const paginationMeta = movementsData?.meta;
  const hasActiveFilters =
    filters.productId ||
    filters.warehouseId ||
    filters.type ||
    filters.fromDate ||
    filters.toDate;

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
            Movimientos de Inventario
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Historial completo de entradas y salidas de stock
          </p>
        </div>
        <Link to="/inventory/adjustments/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Ajuste
          </Button>
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Entradas"
            value={stats.totalIn}
            subtitle="unidades en pagina"
            color="success"
          />
          <StatCard
            icon={TrendingDown}
            label="Salidas"
            value={stats.totalOut}
            subtitle="unidades en pagina"
            color="error"
          />
          <StatCard
            icon={ArrowUpDown}
            label="Ajustes"
            value={stats.adjustments}
            subtitle="en esta pagina"
            color="warning"
          />
          <StatCard
            icon={Activity}
            label="Total Movimientos"
            value={paginationMeta?.total || 0}
            subtitle="registrados"
            color="primary"
          />
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
                      [
                        filters.productId,
                        filters.warehouseId,
                        filters.type,
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Select
                      options={typeOptions}
                      value={filters.type || ""}
                      onChange={(value) =>
                        updateFilters({
                          type: (value as MovementType) || undefined,
                        })
                      }
                      placeholder="Todos los tipos"
                    />
                    <Select
                      options={productOptions}
                      value={filters.productId || ""}
                      onChange={(value) =>
                        updateFilters({ productId: value || undefined })
                      }
                      placeholder="Todos los productos"
                    />
                    <Select
                      options={warehouseOptions}
                      value={filters.warehouseId || ""}
                      onChange={(value) =>
                        updateFilters({ warehouseId: value || undefined })
                      }
                      placeholder="Todas las bodegas"
                    />
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                      <Input
                        type="date"
                        placeholder="Fecha desde"
                        value={filters.fromDate || ""}
                        onChange={(e) =>
                          updateFilters({
                            fromDate: e.target.value || undefined,
                          })
                        }
                        className="pl-10"
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                      <Input
                        type="date"
                        placeholder="Fecha hasta"
                        value={filters.toDate || ""}
                        onChange={(e) =>
                          updateFilters({
                            toDate: e.target.value || undefined,
                          })
                        }
                        className="pl-10"
                      />
                    </div>
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
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="hidden md:table-cell">Bodega</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="hidden lg:table-cell">Razon</TableHead>
                  <TableHead className="hidden sm:table-cell">Usuario</TableHead>
                  <TableHead className="w-20">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={8} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar movimientos"
              description="Hubo un problema al cargar los movimientos de inventario. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : movements.length === 0 ? (
            <EmptyState
              icon={<ArrowUpDown className="h-16 w-16" />}
              title={hasActiveFilters ? "Sin resultados" : "No hay movimientos"}
              description={
                hasActiveFilters
                  ? "No se encontraron movimientos con los filtros aplicados."
                  : "Aun no hay movimientos de inventario registrados."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : undefined
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Bodega
                    </TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="hidden lg:table-cell">Razon</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Usuario
                    </TableHead>
                    <TableHead className="w-20">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {movements.map((movement) => (
                      <motion.tr
                        key={movement.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                      >
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                            {formatDate(movement.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {movement.product ? (
                            <div>
                              <p className="font-medium text-neutral-900 dark:text-white">
                                {movement.product.name}
                              </p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {movement.product.sku}
                              </p>
                            </div>
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {movement.warehouse ? (
                            <div className="flex items-center gap-2">
                              <Warehouse className="h-4 w-4 text-neutral-400" />
                              <span className="text-sm">
                                {movement.warehouse.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-400 text-sm">
                              General
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <MovementTypeBadge type={movement.type} />
                        </TableCell>
                        <TableCell className="text-right">
                          <QuantityBadge quantity={movement.quantity} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                            {movement.reason || "-"}
                          </p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {movement.user ? (
                            <span className="text-sm">
                              {movement.user.firstName} {movement.user.lastName}
                            </span>
                          ) : (
                            <span className="text-neutral-400 text-sm">
                              Sistema
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link to={`/inventory/movements/${movement.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
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
      </motion.div>
    </motion.div>
  );
}
