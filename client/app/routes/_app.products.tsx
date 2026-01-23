import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Filter,
  Package,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  AlertTriangle,
  X,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import type { Route } from './+types/_app.products';
import { cn, formatCurrency, debounce } from '~/lib/utils';
import { useProducts, useCategories, useWarehouses } from '~/hooks/useProducts';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Card } from '~/components/ui/Card';
import { Badge, StatusBadge } from '~/components/ui/Badge';
import { Select } from '~/components/ui/Select';
import { Pagination, PaginationInfo } from '~/components/ui/Pagination';
import { EmptyState } from '~/components/ui/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '~/components/ui/Table';
import { Skeleton, SkeletonProductCard, SkeletonTableRow } from '~/components/ui/Skeleton';
import type { ProductFilters, ProductStatus } from '~/types/product';
import { useUrlFilters } from '~/hooks/useUrlFilters';

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Productos - StockFlow' },
    { name: 'description', content: 'Gestion de productos e inventario' },
  ];
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

// Status options for filter
const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
  { value: 'DISCONTINUED', label: 'Descontinuado' },
];

// Items per page options
const pageSizeOptions = [
  { value: '10', label: '10 por pagina' },
  { value: '25', label: '25 por pagina' },
  { value: '50', label: '50 por pagina' },
];

// Parser config for product filters
const productFiltersParser = {
  parse: (searchParams: URLSearchParams): ProductFilters => ({
    search: searchParams.get('search') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    warehouseId: searchParams.get('warehouseId') || undefined,
    status: (searchParams.get('status') as ProductStatus) || undefined,
    lowStock: searchParams.get('lowStock') === 'true',
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 10,
  }),
};

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { filters, updateFilters, clearFilters } = useUrlFilters<ProductFilters>({
    parserConfig: productFiltersParser,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Queries
  const { data: productsData, isLoading, isError, error } = useProducts(filters);
  const { data: categories = [] } = useCategories();
  const { data: warehouses = [] } = useWarehouses();

  // Category and warehouse options
  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'Todas las categorias' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories]
  );

  const warehouseOptions = useMemo(
    () => [
      { value: '', label: 'Todas las bodegas' },
      ...warehouses.map((w) => ({ value: w.id, label: w.name })),
    ],
    [warehouses]
  );

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((value: string) => updateFilters({ search: value || undefined }), 300),
    [updateFilters]
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
    <motion.div
      variants={containerVariants}
      initial={isMounted ? "hidden" : false}
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Productos
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Gestiona tu inventario de productos
          </p>
        </div>
        <Link to="/products/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            Nuevo Producto
          </Button>
        </Link>
      </motion.div>

      {/* Search and Filters */}
      <motion.div variants={itemVariants}>
        <Card padding="md">
          <div className="flex flex-col gap-4">
            {/* Search row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre, SKU o codigo de barras..."
                  defaultValue={filters.search || ''}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>

              {/* Filter toggle button */}
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
                leftIcon={<Filter className="h-4 w-4" />}
                rightIcon={
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      showFilters && 'rotate-180'
                    )}
                  />
                }
              >
                Filtros
                {hasActiveFilters && (
                  <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-xs text-white">
                    !
                  </span>
                )}
              </Button>

              {/* View mode toggle */}
              <div className="hidden sm:flex items-center gap-1 rounded-lg border border-neutral-200 p-1 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'rounded-md p-1.5 transition-colors',
                    viewMode === 'table'
                      ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  )}
                  aria-label="Vista de tabla"
                >
                  <LayoutList className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'rounded-md p-1.5 transition-colors',
                    viewMode === 'grid'
                      ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
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
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 gap-4 border-t border-neutral-100 pt-4 dark:border-neutral-800 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Category filter */}
                    <Select
                      options={categoryOptions}
                      value={filters.categoryId || ''}
                      onChange={(value) => updateFilters({ categoryId: value || undefined })}
                      placeholder="Categoria"
                    />

                    {/* Warehouse filter */}
                    <Select
                      options={warehouseOptions}
                      value={filters.warehouseId || ''}
                      onChange={(value) => updateFilters({ warehouseId: value || undefined })}
                      placeholder="Bodega"
                    />

                    {/* Status filter */}
                    <Select
                      options={statusOptions}
                      value={filters.status || ''}
                      onChange={(value) =>
                        updateFilters({ status: (value as ProductStatus) || undefined })
                      }
                      placeholder="Estado"
                    />

                    {/* Low stock toggle */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.lowStock || false}
                        onChange={(e) => updateFilters({ lowStock: e.target.checked })}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800"
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
      </motion.div>

      {/* Error state */}
      {isError && (
        <motion.div variants={itemVariants}>
          <EmptyState
            type="error"
            title="Error al cargar productos"
            description={error?.message || 'Hubo un problema al cargar los productos.'}
            action={{
              label: 'Reintentar',
              onClick: () => window.location.reload(),
            }}
          />
        </motion.div>
      )}

      {/* Loading state */}
      {isLoading && (
        <motion.div variants={itemVariants}>
          {viewMode === 'table' ? (
            <Card padding="none">
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
        </motion.div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && products.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card padding="none">
            <EmptyState
              type={hasActiveFilters ? 'search' : 'products'}
              action={
                hasActiveFilters
                  ? { label: 'Limpiar filtros', onClick: clearFilters }
                  : { label: 'Agregar producto', onClick: () => window.location.href = '/products/new' }
              }
            />
          </Card>
        </motion.div>
      )}

      {/* Products list/grid */}
      {!isLoading && !isError && products.length > 0 && (
        <>
          {viewMode === 'table' ? (
            <motion.div variants={itemVariants}>
              <Card padding="none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Imagen</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="hidden md:table-cell">Categoria</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="hidden sm:table-cell">Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {products.map((product) => (
                        <motion.tr
                          key={product.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-neutral-100 transition-colors hover:bg-neutral-50/50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                        >
                          {/* Image */}
                          <TableCell>
                            <div className="h-12 w-12 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                              {product.images?.[0] ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-5 w-5 text-neutral-400" />
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Product info */}
                          <TableCell>
                            <Link
                              to={`/products/${product.id}`}
                              className="block hover:text-primary-600 dark:hover:text-primary-400"
                            >
                              <p className="font-medium text-neutral-900 dark:text-white">
                                {product.name}
                              </p>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                SKU: {product.sku}
                              </p>
                            </Link>
                          </TableCell>

                          {/* Category */}
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="secondary">{product.category?.name || '-'}</Badge>
                          </TableCell>

                          {/* Price */}
                          <TableCell className="text-right">
                            <p className="font-medium">{formatCurrency(product.price)}</p>
                            <p className="text-xs text-neutral-400">
                              Costo: {formatCurrency(product.cost)}
                            </p>
                          </TableCell>

                          {/* Stock */}
                          <TableCell className="text-center">
                            <div
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium',
                                product.quantity <= product.minStock
                                  ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400'
                                  : 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                              )}
                            >
                              {product.quantity <= product.minStock && (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              )}
                              {product.quantity}
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="hidden sm:table-cell">
                            <StatusBadge status={product.status} />
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Link to={`/products/${product.id}`}>
                                <Button variant="ghost" size="icon-sm" aria-label="Ver detalles">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link to={`/products/${product.id}/edit`}>
                                <Button variant="ghost" size="icon-sm" aria-label="Editar">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <AnimatePresence mode="popLayout">
                {products.map((product) => (
                  <motion.div
                    key={product.id}
                    layout
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card padding="none" hover="lift" className="overflow-hidden">
                      {/* Image */}
                      <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
                          </div>
                        )}

                        {/* Status badge */}
                        <div className="absolute right-2 top-2">
                          <StatusBadge status={product.status} />
                        </div>

                        {/* Low stock warning */}
                        {product.quantity <= product.minStock && (
                          <div className="absolute left-2 top-2">
                            <Badge variant="error" dot>
                              Stock bajo
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <Link
                          to={`/products/${product.id}`}
                          className="block hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          <h3 className="font-medium text-neutral-900 dark:text-white line-clamp-1">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                          SKU: {product.sku}
                        </p>

                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                            {formatCurrency(product.price)}
                          </p>
                          <div
                            className={cn(
                              'rounded-full px-2 py-1 text-sm font-medium',
                              product.quantity <= product.minStock
                                ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400'
                                : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                            )}
                          >
                            {product.quantity} uds
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex gap-2">
                          <Link to={`/products/${product.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              <Eye className="mr-1.5 h-4 w-4" />
                              Ver
                            </Button>
                          </Link>
                          <Link to={`/products/${product.id}/edit`} className="flex-1">
                            <Button variant="secondary" size="sm" className="w-full">
                              <Pencil className="mr-1.5 h-4 w-4" />
                              Editar
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <motion.div
              variants={itemVariants}
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
                  onChange={(value) => updateFilters({ limit: Number(value), page: 1 })}
                  className="w-36"
                />
              </div>
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPages}
                onPageChange={(page) => updateFilters({ page })}
              />
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}