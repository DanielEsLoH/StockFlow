import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { containerVariants, itemVariants } from "~/lib/animations";
import {
  Search,
  Filter,
  CreditCard,
  Eye,
  Trash2,
  X,
  Calendar,
  Clock,
  RefreshCcw,
  CheckCircle,
} from "lucide-react";
import type { Route } from "./+types/_app.payments";
import { cn, debounce, formatCurrency, formatDate } from "~/lib/utils";
import {
  usePayments,
  usePaymentStats,
  useDeletePayment,
} from "~/hooks/usePayments";
import { useCustomers } from "~/hooks/useCustomers";
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
import { DeleteModal } from "~/components/ui/DeleteModal";
import { EmptyState } from "~/components/ui/EmptyState";
import type {
  PaymentFilters,
  PaymentSummary,
  PaymentStatus,
  PaymentMethod,
} from "~/types/payment";
import { PaymentMethodLabels, PaymentStatusLabels } from "~/types/payment";

// Parser config for payment filters
const paymentFiltersParser = {
  parse: (searchParams: URLSearchParams): PaymentFilters => ({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as PaymentStatus) || undefined,
    method: (searchParams.get("method") as PaymentMethod) || undefined,
    customerId: searchParams.get("customerId") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Pagos - StockFlow" },
    { name: "description", content: "Gestion de pagos" },
  ];
};

// Status options for filter
const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "PENDING", label: "Pendiente" },
  { value: "COMPLETED", label: "Completado" },
  { value: "FAILED", label: "Fallido" },
  { value: "REFUNDED", label: "Reembolsado" },
  { value: "CANCELLED", label: "Cancelado" },
];

// Method options for filter
const methodOptions = [
  { value: "", label: "Todos los metodos" },
  { value: "CASH", label: "Efectivo" },
  { value: "CREDIT_CARD", label: "Tarjeta de Credito" },
  { value: "DEBIT_CARD", label: "Tarjeta Debito" },
  { value: "BANK_TRANSFER", label: "Transferencia Bancaria" },
  { value: "CHECK", label: "Cheque" },
  { value: "OTHER", label: "Otro" },
];

// Items per page options
const pageSizeOptions = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
];

// Status badge component
function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config: Record<
    PaymentStatus,
    {
      label: string;
      variant:
        | "default"
        | "primary"
        | "secondary"
        | "success"
        | "warning"
        | "error";
    }
  > = {
    PENDING: { label: PaymentStatusLabels.PENDING, variant: "warning" },
    PROCESSING: { label: PaymentStatusLabels.PROCESSING, variant: "primary" },
    COMPLETED: { label: PaymentStatusLabels.COMPLETED, variant: "success" },
    FAILED: { label: PaymentStatusLabels.FAILED, variant: "error" },
    REFUNDED: { label: PaymentStatusLabels.REFUNDED, variant: "secondary" },
    CANCELLED: { label: PaymentStatusLabels.CANCELLED, variant: "secondary" },
  };

  const statusConfig = config[status] || {
    label: status || "Desconocido",
    variant: "default" as const,
  };

  return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
}

// Method badge component
function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  return (
    <Badge variant="default">
      {PaymentMethodLabels[method] || method || "Desconocido"}
    </Badge>
  );
}

export default function PaymentsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<PaymentSummary | null>(
    null,
  );
  const [isMounted, setIsMounted] = useState(false);

  const { filters, updateFilters, clearFilters } =
    useUrlFilters<PaymentFilters>({
      parserConfig: paymentFiltersParser,
    });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Queries
  const { data: paymentsData, isLoading, isError } = usePayments(filters);
  const { data: stats } = usePaymentStats();
  const { data: customersData } = useCustomers({ limit: 100 });
  const deletePayment = useDeletePayment();

  // Customer options for filter
  const customerOptions = useMemo(
    () => [
      { value: "", label: "Todos los clientes" },
      ...(customersData?.data || []).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    ],
    [customersData],
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
    if (deletingPayment) {
      await deletePayment.mutateAsync(deletingPayment.id);
      setDeletingPayment(null);
    }
  };

  // Check if payment can be deleted (only pending payments)
  const canDelete = (payment: PaymentSummary) => {
    return payment.status === "PENDING";
  };

  const payments = paymentsData?.data || [];
  const paginationMeta = paymentsData?.meta;
  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.method ||
    filters.customerId ||
    filters.startDate ||
    filters.endDate;

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
            Pagos
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Gestiona los pagos recibidos
          </p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={CheckCircle}
            label="Total Recibido"
            value={formatCurrency(stats?.totalReceived || 0)}
            color="success"
          />
          <StatCard
            icon={Clock}
            label="Total Pendiente"
            value={formatCurrency(stats?.totalPending || 0)}
            color="warning"
          />
          <StatCard
            icon={RefreshCcw}
            label="Total Reembolsado"
            value={formatCurrency(stats?.totalRefunded || 0)}
            color="error"
          />
          <StatCard
            icon={CreditCard}
            label="Total Pagos"
            value={stats?.totalPayments || 0}
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
                  placeholder="Buscar por numero de pago o cliente..."
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
                      [
                        filters.status,
                        filters.method,
                        filters.customerId,
                        filters.startDate,
                        filters.endDate,
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
                          status: (value as PaymentStatus) || undefined,
                        })
                      }
                      placeholder="Todos los estados"
                    />
                    <Select
                      options={methodOptions}
                      value={filters.method || ""}
                      onChange={(value) =>
                        updateFilters({
                          method: (value as PaymentMethod) || undefined,
                        })
                      }
                      placeholder="Todos los metodos"
                    />
                    <Select
                      options={customerOptions}
                      value={filters.customerId || ""}
                      onChange={(value) =>
                        updateFilters({ customerId: value || undefined })
                      }
                      placeholder="Todos los clientes"
                    />
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                      <Input
                        type="date"
                        placeholder="Fecha desde"
                        value={filters.startDate || ""}
                        onChange={(e) =>
                          updateFilters({
                            startDate: e.target.value || undefined,
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
                        value={filters.endDate || ""}
                        onChange={(e) =>
                          updateFilters({
                            endDate: e.target.value || undefined,
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
                  <TableHead>No. Pago</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Factura
                  </TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="hidden sm:table-cell">Metodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                  <TableHead className="w-25">Acciones</TableHead>
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
              title="Error al cargar pagos"
              description="Hubo un problema al cargar los pagos. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : payments.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-16 w-16" />}
              title={hasActiveFilters ? "Sin resultados" : "No hay pagos"}
              description={
                hasActiveFilters
                  ? "No se encontraron pagos con los filtros aplicados."
                  : "Aun no hay pagos registrados en el sistema."
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
                    <TableHead>No. Pago</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Factura
                    </TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Metodo
                    </TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Fecha
                    </TableHead>
                    <TableHead className="w-25">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {payments.map((payment) => (
                      <motion.tr
                        key={payment.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                      >
                        <TableCell>
                          <Link
                            to={`/payments/${payment.id}`}
                            className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                          >
                            {payment.paymentNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {payment.customer?.name || "Cliente desconocido"}
                          </p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {payment.invoice ? (
                            <Link
                              to={`/invoices/${payment.invoiceId}`}
                              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                            >
                              {payment.invoice.invoiceNumber}
                            </Link>
                          ) : (
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-semibold text-neutral-900 dark:text-white">
                            {formatCurrency(payment.amount)}
                          </p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <PaymentMethodBadge method={payment.method} />
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={payment.status} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                            {formatDate(payment.paymentDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link to={`/payments/${payment.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver detalles"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {canDelete(payment) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingPayment(payment)}
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

      {/* Delete Modal */}
      <DeleteModal
        open={!!deletingPayment}
        onOpenChange={(open) => !open && setDeletingPayment(null)}
        itemName={deletingPayment?.paymentNumber || ""}
        itemType="pago"
        onConfirm={handleDelete}
        isLoading={deletePayment.isPending}
      />
    </motion.div>
  );
}
