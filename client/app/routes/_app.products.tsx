import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  Search,
  Plus,
  Filter,
  Package,
  Eye,
  Pencil,
  ChevronDown,
  AlertTriangle,
  X,
  LayoutGrid,
  LayoutList,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { Route } from "./+types/_app.products";
import { cn, formatCurrency, debounce } from "~/lib/utils";
import { useProducts, useCategories, useWarehouses } from "~/hooks/useProducts";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";
import { Badge, StatusBadge } from "~/components/ui/Badge";
import { Select } from "~/components/ui/Select";
import { Pagination, PaginationInfo } from "~/components/ui/Pagination";
import { EmptyState } from "~/components/ui/EmptyState";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  AnimatedTableRow,
} from "~/components/ui/Table";
import {
  SkeletonProductCard,
  SkeletonTableRow,
} from "~/components/ui/Skeleton";
import type { ProductFilters, ProductStatus } from "~/types/product";
import { useUrlFilters } from "~/hooks/useUrlFilters";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Productos - StockFlow" },
    { name: "description", content: "Gestion de productos e inventario" },
  ];
};

// Status options for filter
const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "DISCONTINUED", label: "Descontinuado" },
];

// Items per page options
const pageSizeOptions = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
];

// Parser config for product filters
const productFiltersParser = {
  parse: (searchParams: URLSearchParams): ProductFilters => ({
    search: searchParams.get("search") || undefined,
    categoryId: searchParams.get("categoryId") || undefined,
    warehouseId: searchParams.get("warehouseId") || undefined,
    status: (searchParams.get("status") as ProductStatus) || undefined,
    lowStock: searchParams.get("lowStock") === "true",
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [showFilters, setShowFilters] = useState(false);

  const { filters, updateFilters, clearFilters } =
    useUrlFilters<ProductFilters>({
      parserConfig: productFiltersParser,
    });

  // Queries
  const {
    data: productsData,
    isLoading,
    isError,
    error,
  } = useProducts(filters);
  const { data: categories = [] } = useCategories();
  const { data: warehouses = [] } = useWarehouses();

  // Category and warehouse options
  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Todas las categorias" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const warehouseOptions = useMemo(
    () => [
      { value: "", label: "Todas las bodegas" },
      ...warehouses.map((w) => ({ value: w.id, label: w.name })),
    ],
    [warehouses],
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

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.search ||
    filters.categoryId ||
    filters.warehouseId ||
    filters.status ||
    filters.lowStock;

  // Products data
  const products = productsData?.data || [];
  const meta = productsData?.meta;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 dark:from-primary-500/20 dark:to-primary-900/30">
              <Package className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
                Productos
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {meta?.total || 0} productos en inventario
              </p>
            </div>
          </div>
        </div>
        <Link to="/products/new">
          <Button variant="gradient" leftIcon={<Plus className="h-4 w-4" />}>
            Nuevo Producto
          </Button>
        </Link>
      </PageSection>

      {/* Search and Filters */}
      <PageSection>
        <Card variant="elevated" padding="md">
          <div className="flex flex-col gap-4">
            {/* Search row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre, SKU o codigo de barras..."
                  defaultValue={filters.search || ""}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>

              {/* Filter toggle button */}
              <Button
                variant={showFilters ? "soft-primary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                leftIcon={<Filter className="h-4 w-4" />}
                rightIcon={
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      showFilters && "rotate-180",
                    )}
                  />
                }
              >
                Filtros
                {hasActiveFilters && (
                  <Badge variant="gradient" size="xs" className="ml-2">
                    !
                  </Badge>
                )}
              </Button>

              {/* View mode toggle */}
              <div className="hidden sm:flex items-center gap-1 rounded-xl border border-neutral-200 dark:border-neutral-700 p-1 bg-neutral-50 dark:bg-neutral-800/50">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "rounded-lg p-2 transition-all duration-200",
                    viewMode === "table"
                      ? "bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white",
                  )}
                  aria-label="Vista de tabla"
                >
                  <LayoutList className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "rounded-lg p-2 transition-all duration-200",
                    viewMode === "grid"
                      ? "bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white",
                  )}
                  aria-label="Vista de cuadricula"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Expanded filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 gap-4 border-t border-neutral-100 dark:border-neutral-800 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Category filter */}
                    <Select
                      options={categoryOptions}
                      value={filters.categoryId || ""}
                      onChange={(value) =>
                        updateFilters({ categoryId: value || undefined })
                      }
                      placeholder="Categoria"
                    />

                    {/* Warehouse filter */}
                    <Select
                      options={warehouseOptions}
                      value={filters.warehouseId || ""}
                      onChange={(value) =>
                        updateFilters({ warehouseId: value || undefined })
                      }
                      placeholder="Bodega"
                    />

                    {/* Status filter */}
                    <Select
                      options={statusOptions}
                      value={filters.status || ""}
                      onChange={(value) =>
                        updateFilters({
                          status: (value as ProductStatus) || undefined,
                        })
                      }
                      placeholder="Estado"
                    />

                    {/* Low stock toggle */}
                    <label className="flex items-center gap-3 cursor-pointer px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-warning-300 dark:hover:border-warning-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={filters.lowStock || false}
                        onChange={(e) =>
                          updateFilters({ lowStock: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-neutral-300 text-warning-600 focus:ring-warning-500 dark:border-neutral-600 dark:bg-neutral-800"
                      />
                      <span className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                        <AlertTriangle className="h-4 w-4 text-warning-500" />
                        Solo stock bajo
                      </span>
                    </label>
                  </div>

                  {/* Clear filters button */}
                  {hasActiveFilters && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        leftIcon={<X className="h-4 w-4" />}
                      >
                        Limpiar filtros
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </PageSection>

      {/* Error state */}
      {isError && (
        <PageSection>
          <EmptyState
            type="error"
            title="Error al cargar productos"
            description={
              error?.message || "Hubo un problema al cargar los productos."
            }
            action={{
              label: "Reintentar",
              onClick: () => window.location.reload(),
            }}
          />
        </PageSection>
      )}

      {/* Loading state */}
      {isLoading && (
        <PageSection>
          {viewMode === "table" ? (
            <Card variant="elevated" padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Imagen</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={7} />
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonProductCard key={i} />
              ))}
            </div>
          )}
        </PageSection>
      )}

      {/* Empty state */}
      {!isLoading && !isError && products.length === 0 && (
        <PageSection>
          <Card variant="elevated" padding="none">
            <EmptyState
              type={hasActiveFilters ? "search" : "products"}
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : {
                      label: "Agregar producto",
                      onClick: () => (window.location.href = "/products/new"),
                    }
              }
            />
          </Card>
        </PageSection>
      )}

      {/* Products list/grid */}
      {!isLoading && !isError && products.length > 0 && (
        <>
          {viewMode === "table" ? (
            <PageSection>
              <Card
                variant="elevated"
                padding="none"
                className="overflow-hidden"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50/50 dark:bg-neutral-800/30">
                      <TableHead className="w-20">Imagen</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Categoria
                      </TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Estado
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {products.map((product, index) => (
                        <AnimatedTableRow
                          key={product.id}
                          index={index}
                          className="border-b border-neutral-100 dark:border-neutral-800 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 group"
                        >
                          {/* Image */}
                          <TableCell>
                            <div className="h-14 w-14 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800 ring-1 ring-neutral-200/50 dark:ring-neutral-700/50 group-hover:ring-primary-300 dark:group-hover:ring-primary-700 transition-all">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-6 w-6 text-neutral-400" />
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Product info */}
                          <TableCell>
                            <Link
                              to={`/products/${product.id}`}
                              className="block group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                            >
                              <p className="font-semibold text-neutral-900 dark:text-white">
                                {product.name}
                              </p>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                SKU: {product.sku}
                              </p>
                            </Link>
                          </TableCell>

                          {/* Category */}
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" size="sm">
                              {product.category?.name || "-"}
                            </Badge>
                          </TableCell>

                          {/* Price */}
                          <TableCell className="text-right">
                            <p className="font-semibold text-neutral-900 dark:text-white">
                              {formatCurrency(product.salePrice)}
                            </p>
                            <p className="text-xs text-neutral-400">
                              Costo: {formatCurrency(product.costPrice)}
                            </p>
                          </TableCell>

                          {/* Stock */}
                          <TableCell className="text-center">
                            <div
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold",
                                product.stock <= product.minStock
                                  ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                                  : "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
                              )}
                            >
                              {product.stock <= product.minStock && (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              )}
                              {product.stock}
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="hidden sm:table-cell">
                            <StatusBadge status={product.status} />
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link to={`/products/${product.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Ver detalles"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link to={`/products/${product.id}/edit`}>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </AnimatedTableRow>
                      ))}
                  </TableBody>
                </Table>
              </Card>
            </PageSection>
          ) : (
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <AnimatePresence mode="popLayout">
                {products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      variant="elevated"
                      padding="none"
                      hover="lift"
                      className="overflow-hidden group"
                    >
                      {/* Image */}
                      <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-16 w-16 text-neutral-300 dark:text-neutral-600" />
                          </div>
                        )}

                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Status badge */}
                        <div className="absolute right-3 top-3">
                          <StatusBadge status={product.status} />
                        </div>

                        {/* Low stock warning */}
                        {product.stock <= product.minStock && (
                          <div className="absolute left-3 top-3">
                            <Badge variant="error" size="sm">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Stock bajo
                            </Badge>
                          </div>
                        )}

                        {/* Quick actions overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                          <div className="flex gap-2">
                            <Link
                              to={`/products/${product.id}`}
                              className="flex-1"
                            >
                              <Button variant="glass" size="sm" fullWidth>
                                <Eye className="h-4 w-4 mr-1.5" />
                                Ver
                              </Button>
                            </Link>
                            <Link
                              to={`/products/${product.id}/edit`}
                              className="flex-1"
                            >
                              <Button variant="glass" size="sm" fullWidth>
                                <Pencil className="h-4 w-4 mr-1.5" />
                                Editar
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <Link
                          to={`/products/${product.id}`}
                          className="block hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          <h3 className="font-semibold text-neutral-900 dark:text-white line-clamp-1">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                          SKU: {product.sku}
                        </p>

                        {/* Category */}
                        {product.category && (
                          <Badge variant="outline" size="xs" className="mt-2">
                            {product.category.name}
                          </Badge>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-xl font-bold bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
                            {formatCurrency(product.salePrice)}
                          </p>
                          <div
                            className={cn(
                              "rounded-xl px-2.5 py-1 text-sm font-semibold",
                              product.stock <= product.minStock
                                ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                                : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
                            )}
                          >
                            {product.stock} uds
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <PageSection
              className="flex flex-col items-center justify-between gap-4 sm:flex-row"
            >
              <div className="flex items-center gap-4">
                <PaginationInfo
                  currentPage={meta.page}
                  pageSize={meta.limit}
                  totalItems={meta.total}
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
                currentPage={meta.page}
                totalPages={meta.totalPages}
                onPageChange={(page) => updateFilters({ page })}
              />
            </PageSection>
          )}
        </>
      )}
    </PageWrapper>
  );
}
