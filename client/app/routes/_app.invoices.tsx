import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
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
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
} from 'lucide-react';
import type { Route } from './+types/_app.invoices';
import { cn, debounce, formatCurrency, formatDate } from '~/lib/utils';
import {
  useInvoices,
  useInvoiceStats,
  useDeleteInvoice,
} from '~/hooks/useInvoices';
import { useCustomers } from '~/hooks/useCustomers';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Card } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
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
import type { Invoice, InvoiceFilters, InvoiceSummary, InvoiceStatus } from '~/types/invoice';

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Facturas - StockFlow' },
    { name: 'description', content: 'Gestion de facturas' },
  ];
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
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
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'PAID', label: 'Pagada' },
  { value: 'OVERDUE', label: 'Vencida' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

// Items per page options
const pageSizeOptions = [
  { value: '10', label: '10 por pagina' },
  { value: '25', label: '25 por pagina' },
  { value: '50', label: '50 por pagina' },
];

// Status badge component
function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config: Record<InvoiceStatus, { label: string; variant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' }> = {
    DRAFT: { label: 'Borrador', variant: 'secondary' },
    PENDING: { label: 'Pendiente', variant: 'warning' },
    PAID: { label: 'Pagada', variant: 'success' },
    OVERDUE: { label: 'Vencida', variant: 'error' },
    CANCELLED: { label: 'Cancelada', variant: 'secondary' },
  };

  const { label, variant } = config[status];

  return <Badge variant={variant}>{label}</Badge>;
}

// Stat card component
function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color = 'primary',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
}) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-500 dark:bg-primary-900/20',
    success: 'bg-success-50 text-success-500 dark:bg-success-900/20',
    warning: 'bg-warning-50 text-warning-500 dark:bg-warning-900/20',
    error: 'bg-error-50 text-error-500 dark:bg-error-900/20',
  };

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-lg', colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="text-xl font-semibold text-neutral-900 dark:text-white">{value}</p>
            {subtitle && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function InvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<InvoiceSummary | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get current filters from URL
  const filters: InvoiceFilters = useMemo(
    () => ({
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') as InvoiceStatus) || undefined,
      customerId: searchParams.get('customerId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 10,
    }),
    [searchParams]
  );

  // Queries
  const { data: invoicesData, isLoading, isError } = useInvoices(filters);
  const { data: stats } = useInvoiceStats();
  const { data: customersData } = useCustomers({ limit: 100 });
  const deleteInvoice = useDeleteInvoice();

  // Customer options for filter
  const customerOptions = useMemo(
    () => [
      { value: '', label: 'Todos los clientes' },
      ...(customersData?.data || []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [customersData]
  );

  // Update URL params
  const updateFilters = useCallback(
    (newFilters: Partial<InvoiceFilters>) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      if (!('page' in newFilters)) {
        params.set('page', '1');
      }

      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((value: string) => updateFilters({ search: value || undefined }), 300),
    [updateFilters]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
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
  const meta = invoicesData?.meta;
  const hasActiveFilters =
    filters.search || filters.status || filters.customerId || filters.startDate || filters.endDate;

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
            Facturas
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Gestiona tus facturas y pagos
          </p>
        </div>
        <Link to="/invoices/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
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
          />
          <StatCard
            icon={AlertTriangle}
            label="Facturas Vencidas"
            value={formatCurrency(stats?.overdueAmount || 0)}
            color="error"
          />
          <StatCard
            icon={CheckCircle}
            label="Pagado este Mes"
            value={formatCurrency(stats?.totalRevenue || 0)}
            color="success"
          />
          <StatCard
            icon={FileText}
            label="Total Facturas"
            value={stats?.totalInvoices || 0}
            subtitle="en el sistema"
            color="primary"
          />
        </div>
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
                  placeholder="Buscar por numero de factura o cliente..."
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
                  showFilters && 'bg-primary-50 border-primary-500 text-primary-600 dark:bg-primary-900/20'
                )}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="primary" className="ml-2">
                    {[filters.status, filters.customerId, filters.startDate, filters.endDate].filter(Boolean).length}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Select
                      options={statusOptions}
                      value={filters.status || ''}
                      onChange={(value) =>
                        updateFilters({ status: (value as InvoiceStatus) || undefined })
                      }
                      placeholder="Todos los estados"
                    />
                    <Select
                      options={customerOptions}
                      value={filters.customerId || ''}
                      onChange={(value) => updateFilters({ customerId: value || undefined })}
                      placeholder="Todos los clientes"
                    />
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                      <Input
                        type="date"
                        placeholder="Fecha desde"
                        value={filters.startDate || ''}
                        onChange={(e) => updateFilters({ startDate: e.target.value || undefined })}
                        className="pl-10"
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                      <Input
                        type="date"
                        placeholder="Fecha hasta"
                        value={filters.endDate || ''}
                        onChange={(e) => updateFilters({ endDate: e.target.value || undefined })}
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
                  <TableHead>No. Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha Emision</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha Vencimiento</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={7} />
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
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Factura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Fecha Emision</TableHead>
                    <TableHead className="hidden sm:table-cell">Fecha Vencimiento</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {invoices.map((invoice) => (
                      <motion.tr
                        key={invoice.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                      >
                        <TableCell>
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
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
                          <p className="font-semibold text-neutral-900 dark:text-white">
                            {formatCurrency(invoice.total)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
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
              {meta && meta.totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-neutral-200 dark:border-neutral-700">
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
