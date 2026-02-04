import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { containerVariants, itemVariants } from '~/lib/animations';
import {
  Search,
  Plus,
  Filter,
  FileText,
  Eye,
  Pencil,
  Trash2,
  X,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  ShoppingCart,
  Store,
  TrendingUp,
  Receipt,
} from 'lucide-react';
import type { Route } from './+types/_app.invoices';
import { cn, debounce, formatCurrency, formatDate } from '~/lib/utils';
import {
  useInvoices,
  useInvoiceStats,
  useDeleteInvoice,
} from '~/hooks/useInvoices';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Card } from '~/components/ui/Card';
import { Badge, StatusBadge } from '~/components/ui/Badge';
import { StatCard } from '~/components/ui/StatCard';
import { Select } from '~/components/ui/Select';
import { Pagination, PaginationInfo } from '~/components/ui/Pagination';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '~/components/ui/Table';
import { SkeletonTableRow } from '~/components/ui/Skeleton';
import { DeleteModal } from '~/components/ui/DeleteModal';
import { EmptyState } from '~/components/ui/EmptyState';
import type { InvoiceFilters, InvoiceSummary, InvoiceStatus, InvoiceSource } from '~/types/invoice';
import { useUrlFilters } from '~/hooks/useUrlFilters';
import { useCustomerOptions } from '~/hooks/useCustomerOptions';

// Meta for SEO - used by React Router
export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Facturas - StockFlow' },
    { name: 'description', content: 'Gestion de facturas' },
  ];
};

// Status options for filter
const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'PAID', label: 'Pagada' },
  { value: 'OVERDUE', label: 'Vencida' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

// Source options for filter
const sourceOptions = [
  { value: '', label: 'Todos los origenes' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'POS', label: 'POS' },
];

// Items per page options
const pageSizeOptions = [
  { value: '10', label: '10 por pagina' },
  { value: '25', label: '25 por pagina' },
  { value: '50', label: '50 por pagina' },
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
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="pl-10"
      />
    </div>
  );
}

// Invoice table header component - extracted to avoid duplication
function InvoiceTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>No. Factura</TableHead>
        <TableHead>Cliente</TableHead>
        <TableHead className="hidden md:table-cell">Fecha Emision</TableHead>
        <TableHead className="hidden sm:table-cell">Fecha Vencimiento</TableHead>
        <TableHead className="text-right">Total</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead className="hidden lg:table-cell">Origen</TableHead>
        <TableHead className="hidden lg:table-cell text-center">DIAN</TableHead>
        <TableHead className="w-30">Acciones</TableHead>
      </TableRow>
    </TableHeader>
  );
}

// Source badge component
function InvoiceSourceBadge({ source }: { source: InvoiceSource }) {
  const config: Record<InvoiceSource, { label: string; variant: 'default' | 'primary' | 'secondary'; icon: React.ReactNode }> = {
    MANUAL: { label: 'Manual', variant: 'secondary', icon: <FileText className="h-3 w-3" /> },
    POS: { label: 'POS', variant: 'primary', icon: <ShoppingCart className="h-3 w-3" /> },
  };

  const sourceConfig = config[source] || { label: source || 'Desconocido', variant: 'default' as const, icon: null };

  return (
    <Badge variant={sourceConfig.variant} size="sm" icon={sourceConfig.icon}>
      {sourceConfig.label}
    </Badge>
  );
}

// DIAN status icon
function DianStatusIcon({ hasCufe }: { hasCufe: boolean }) {
  if (hasCufe) {
    return (
      <div className="flex items-center justify-center" title="Enviada a DIAN">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-success-100 dark:bg-success-900/30">
          <Store className="h-4 w-4 text-success-600 dark:text-success-400" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center" title="Sin enviar a DIAN">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800">
        <Store className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
      </div>
    </div>
  );
}


// Parser config for invoice filters
const invoiceFiltersParser = {
  parse: (searchParams: URLSearchParams): InvoiceFilters => ({
    search: searchParams.get('search') || undefined,
    status: (searchParams.get('status') as InvoiceStatus) || undefined,
    source: (searchParams.get('source') as InvoiceSource) || undefined,
    customerId: searchParams.get('customerId') || undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 10,
  }),
};

// Default export used by React Router
export default function InvoicesPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<InvoiceSummary | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const { filters, updateFilters, clearFilters } = useUrlFilters<InvoiceFilters>({
    parserConfig: invoiceFiltersParser,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Queries
  const { data: invoicesData, isLoading, isError } = useInvoices(filters);
  const { data: stats } = useInvoiceStats();
  const deleteInvoice = useDeleteInvoice();

  // Customer options for filter
  const customerOptions = useCustomerOptions();

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((value: string) => updateFilters({ search: value || undefined }), 300),
    [updateFilters]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Handle delete
  const handleDelete = async () => {
    if (deletingInvoice) {
      await deleteInvoice.mutateAsync(deletingInvoice.id);
      setDeletingInvoice(null);
    }
  };

  // Check if invoice can be edited (not paid or cancelled)
  const canEdit = (invoice: InvoiceSummary) => {
    return invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
  };

  // Check if invoice can be deleted (only drafts)
  const canDelete = (invoice: InvoiceSummary) => {
    return invoice.status === 'DRAFT';
  };

  const invoices = invoicesData?.data || [];
  const paginationMeta = invoicesData?.meta;
  const hasActiveFilters =
    filters.search || filters.status || filters.source || filters.customerId || filters.startDate || filters.endDate;

  return (
    <motion.div
      variants={containerVariants}
      initial={isMounted ? "hidden" : false}
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-900/30">
            <Receipt className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Facturas
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {paginationMeta?.total || 0} facturas en total
            </p>
          </div>
        </div>
        <Link to="/invoices/new">
          <Button variant="gradient" leftIcon={<Plus className="h-4 w-4" />}>
            Nueva Factura
          </Button>
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Clock}
            label="Pendiente de Cobro"
            value={formatCurrency(stats?.pendingAmount || 0)}
            color="warning"
            variant="gradient"
            animate
            animationDelay={0}
          />
          <StatCard
            icon={AlertTriangle}
            label="Facturas Vencidas"
            value={formatCurrency(stats?.overdueAmount || 0)}
            color="error"
            variant="gradient"
            animate
            animationDelay={0.1}
          />
          <StatCard
            icon={TrendingUp}
            label="Pagado este Mes"
            value={formatCurrency(stats?.totalRevenue || 0)}
            color="success"
            variant="gradient"
            animate
            animationDelay={0.2}
          />
          <StatCard
            icon={FileText}
            label="Total Facturas"
            value={stats?.totalInvoices || 0}
            subtitle="en el sistema"
            color="primary"
            variant="gradient"
            animate
            animationDelay={0.3}
          />
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div variants={itemVariants}>
        <Card variant="elevated" padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Buscar por numero de factura o cliente..."
                  className="pl-10"
                  defaultValue={filters.search}
                  onChange={handleSearchChange}
                />
              </div>

              {/* Filter toggle */}
              <Button
                variant={showFilters ? 'soft-primary' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="gradient" size="xs" className="ml-2">
                    {[filters.status, filters.source, filters.customerId, filters.startDate, filters.endDate].filter(Boolean).length}
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
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Select
                      options={statusOptions}
                      value={filters.status || ''}
                      onChange={(value) =>
                        updateFilters({ status: (value as InvoiceStatus) || undefined })
                      }
                      placeholder="Todos los estados"
                    />
                    <Select
                      options={sourceOptions}
                      value={filters.source || ''}
                      onChange={(value) =>
                        updateFilters({ source: (value as InvoiceSource) || undefined })
                      }
                      placeholder="Todos los origenes"
                    />
                    <Select
                      options={customerOptions}
                      value={filters.customerId || ''}
                      onChange={(value) => updateFilters({ customerId: value || undefined })}
                      placeholder="Todos los clientes"
                    />
                    <DateFilterInput
                      value={filters.startDate}
                      onChange={(value) => updateFilters({ startDate: value })}
                      placeholder="Fecha desde"
                    />
                    <DateFilterInput
                      value={filters.endDate}
                      onChange={(value) => updateFilters({ endDate: value })}
                      placeholder="Fecha hasta"
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
        <Card variant="elevated">
          {isLoading ? (
            <Table>
              <InvoiceTableHeader />
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={9} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar facturas"
              description="Hubo un problema al cargar las facturas. Por favor, intenta de nuevo."
              action={{
                label: 'Reintentar',
                onClick: () => window.location.reload(),
              }}
            />
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-16 w-16" />}
              title={hasActiveFilters ? 'Sin resultados' : 'No hay facturas'}
              description={
                hasActiveFilters
                  ? 'No se encontraron facturas con los filtros aplicados.'
                  : 'Comienza creando tu primera factura.'
              }
              action={
                hasActiveFilters
                  ? { label: 'Limpiar filtros', onClick: clearFilters }
                  : { label: 'Crear factura', onClick: () => (window.location.href = '/invoices/new') }
              }
            />
          ) : (
            <>
              <Table>
                <InvoiceTableHeader />
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {invoices.map((invoice) => (
                      <motion.tr
                        key={invoice.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="group border-b border-neutral-200 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                      >
                        <TableCell>
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {invoice.customer?.name || 'Cliente desconocido'}
                            </p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              {invoice.itemCount} {invoice.itemCount === 1 ? 'item' : 'items'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                            {formatDate(invoice.issueDate)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div
                            className={cn(
                              'flex items-center gap-1.5 text-sm',
                              invoice.status === 'OVERDUE'
                                ? 'text-error-600 dark:text-error-400'
                                : 'text-neutral-700 dark:text-neutral-300'
                            )}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(invoice.dueDate)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-bold text-lg bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                            {formatCurrency(invoice.total)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <InvoiceSourceBadge source={invoice.source} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <DianStatusIcon hasCufe={!!invoice.dianCufe} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link to={`/invoices/${invoice.id}`}>
                              <Button variant="ghost" size="icon" title="Ver detalles">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {canEdit(invoice) && (
                              <Link to={`/invoices/${invoice.id}/edit`}>
                                <Button variant="ghost" size="icon" title="Editar">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                            {canDelete(invoice) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingInvoice(invoice)}
                                title="Eliminar"
                                className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
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
                      onChange={(value) => updateFilters({ limit: Number(value), page: 1 })}
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

      {/* Delete Modal */}
      <DeleteModal
        open={!!deletingInvoice}
        onOpenChange={(open) => !open && setDeletingInvoice(null)}
        itemName={deletingInvoice?.invoiceNumber || ''}
        itemType="factura"
        onConfirm={handleDelete}
        isLoading={deleteInvoice.isPending}
      />
    </motion.div>
  );
}
