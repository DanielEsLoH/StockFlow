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
  CheckCircle,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";
import type { Route } from "./+types/_app.purchases";
import { debounce, formatCurrency, formatDate } from "~/lib/utils";
import {
  usePurchaseOrders,
  usePurchaseOrderStats,
  useDeletePurchaseOrder,
} from "~/hooks/usePurchaseOrders";
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
  PurchaseOrderFilters,
  PurchaseOrderSummary,
  PurchaseOrderStatus,
} from "~/types/purchase-order";
import {
  PurchaseOrderStatusLabels,
  PurchaseOrderStatusVariants,
} from "~/types/purchase-order";
import { Permission } from "~/types/permissions";
import { useUrlFilters } from "~/hooks/useUrlFilters";
import { useSupplierOptions } from "~/hooks/useSupplierOptions";
import { useWarehouses } from "~/hooks/useWarehouses";

// Meta for SEO - used by React Router
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Ordenes de Compra - StockFlow" },
    { name: "description", content: "Gestion de ordenes de compra" },
  ];
};

// Status options for filter
const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "DRAFT", label: "Borrador" },
  { value: "SENT", label: "Enviada" },
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "RECEIVED", label: "Recibida" },
  { value: "CANCELLED", label: "Cancelada" },
];

// Items per page options
const pageSizeOptions = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
];

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

// Purchase order table header component
function PurchaseOrderTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>No. OC</TableHead>
        <TableHead>Proveedor</TableHead>
        <TableHead className="hidden lg:table-cell">Bodega</TableHead>
        <TableHead className="hidden xl:table-cell">Creado por</TableHead>
        <TableHead className="hidden md:table-cell">Fecha</TableHead>
        <TableHead className="hidden sm:table-cell">Fecha Entrega</TableHead>
        <TableHead className="text-right">Total</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead className="w-30">Acciones</TableHead>
      </TableRow>
    </TableHeader>
  );
}

// Parser config for purchase order filters
const purchaseOrderFiltersParser = {
  parse: (searchParams: URLSearchParams): PurchaseOrderFilters => ({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as PurchaseOrderStatus) || undefined,
    supplierId: searchParams.get("supplierId") || undefined,
    warehouseId: searchParams.get("warehouseId") || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

// Default export used by React Router
export default function PurchaseOrdersPage() {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(Permission.PURCHASE_ORDERS_CREATE);
  const canDelete = hasPermission(Permission.PURCHASE_ORDERS_DELETE);
  const [showFilters, setShowFilters] = useState(false);
  const [deletingOrder, setDeletingOrder] =
    useState<PurchaseOrderSummary | null>(null);
  const { filters, updateFilters, clearFilters } =
    useUrlFilters<PurchaseOrderFilters>({
      parserConfig: purchaseOrderFiltersParser,
    });

  // Queries
  const {
    data: ordersData,
    isLoading,
    isError,
  } = usePurchaseOrders(filters);
  const { data: stats } = usePurchaseOrderStats();
  const deletePurchaseOrder = useDeletePurchaseOrder();

  // Supplier and warehouse options for filter
  const supplierOptions = useSupplierOptions();
  const { data: warehousesData } = useWarehouses();
  const warehouseOptions = useMemo(
    () => [
      { value: "", label: "Todas las bodegas" },
      ...(warehousesData ?? []).map((w) => ({
        value: w.id,
        label: w.name,
      })),
    ],
    [warehousesData],
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
    if (deletingOrder) {
      await deletePurchaseOrder.mutateAsync(deletingOrder.id);
      setDeletingOrder(null);
    }
  };

  // Check if order can be edited (only drafts)
  const canEditOrder = (order: PurchaseOrderSummary) => {
    return order.status === "DRAFT";
  };

  // Check if order can be deleted (only drafts)
  const canDeleteOrder = (order: PurchaseOrderSummary) => {
    return order.status === "DRAFT";
  };

  const orders = ordersData?.data || [];
  const paginationMeta = ordersData?.meta;
  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.supplierId ||
    filters.warehouseId ||
    filters.fromDate ||
    filters.toDate;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-900/30">
            <ShoppingCart className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Ordenes de Compra
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {paginationMeta?.total || 0} ordenes de compra en total
            </p>
          </div>
        </div>
        {canCreate && (
          <Link to="/purchases/new">
            <Button variant="gradient" leftIcon={<Plus className="h-4 w-4" />}>
              Nueva Orden de Compra
            </Button>
          </Link>
        )}
      </PageSection>

      {/* Stats Cards */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={ShoppingCart}
            label="Total OC"
            value={stats?.totalPurchaseOrders || 0}
            subtitle="en el sistema"
            color="primary"
            variant="gradient"
            animate
            animationDelay={0}
          />
          <StatCard
            icon={TrendingUp}
            label="Valor Total"
            value={formatCurrency(stats?.totalValue || 0)}
            color="warning"
            variant="gradient"
            animate
            animationDelay={0.1}
          />
          <StatCard
            icon={CheckCircle}
            label="Recibidas"
            value={stats?.totalReceived || 0}
            color="success"
            variant="gradient"
            animate
            animationDelay={0.2}
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
                  placeholder="Buscar por numero de OC o proveedor..."
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
                        filters.supplierId,
                        filters.warehouseId,
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
                      options={statusOptions}
                      value={filters.status || ""}
                      onChange={(value) =>
                        updateFilters({
                          status: (value as PurchaseOrderStatus) || undefined,
                        })
                      }
                      placeholder="Todos los estados"
                    />
                    <Select
                      options={supplierOptions}
                      value={filters.supplierId || ""}
                      onChange={(value) =>
                        updateFilters({ supplierId: value || undefined })
                      }
                      placeholder="Todos los proveedores"
                    />
                    <Select
                      options={warehouseOptions}
                      value={filters.warehouseId || ""}
                      onChange={(value) =>
                        updateFilters({ warehouseId: value || undefined })
                      }
                      placeholder="Todas las bodegas"
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
              <PurchaseOrderTableHeader />
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={9} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar ordenes de compra"
              description="Hubo un problema al cargar las ordenes de compra. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-16 w-16" />}
              title={
                hasActiveFilters
                  ? "Sin resultados"
                  : "No hay ordenes de compra"
              }
              description={
                hasActiveFilters
                  ? "No se encontraron ordenes de compra con los filtros aplicados."
                  : "Comienza creando tu primera orden de compra."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : {
                      label: "Crear orden de compra",
                      onClick: () =>
                        (window.location.href = "/purchases/new"),
                    }
              }
            />
          ) : (
            <>
              <Table>
                <PurchaseOrderTableHeader />
                <TableBody>
                  {orders.map((order, i) => (
                    <AnimatedTableRow
                      key={order.id}
                      index={i}
                      className="group border-b border-neutral-200 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <TableCell>
                        <Link
                          to={`/purchases/${order.id}`}
                          className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                        >
                          {order.purchaseOrderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {order.supplier?.name || "Sin proveedor"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                          {order.warehouse?.name || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                          {order.user?.name || order.user?.email || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                          {formatDate(order.issueDate)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                          {order.expectedDeliveryDate
                            ? formatDate(order.expectedDeliveryDate)
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-bold text-lg bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                          {formatCurrency(order.total)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={PurchaseOrderStatusVariants[order.status]}
                          size="sm"
                        >
                          {PurchaseOrderStatusLabels[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/purchases/${order.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {canEditOrder(order) && (
                            <Link to={`/purchases/${order.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          {canDeleteOrder(order) && canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingOrder(order)}
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
        open={!!deletingOrder}
        onOpenChange={(open) => !open && setDeletingOrder(null)}
        itemName={deletingOrder?.purchaseOrderNumber || ""}
        itemType="orden de compra"
        onConfirm={handleDelete}
        isLoading={deletePurchaseOrder.isPending}
      />
    </PageWrapper>
  );
}
