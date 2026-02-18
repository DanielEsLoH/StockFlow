import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  Search,
  Filter,
  CreditCard,
  Eye,
  Trash2,
  X,
  Calendar,
  Clock,
  Plus,
  DollarSign,
  ShieldX,
} from "lucide-react";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";
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
  AnimatedTableRow,
} from "~/components/ui/Table";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import { DeleteModal } from "~/components/ui/DeleteModal";
import { EmptyState } from "~/components/ui/EmptyState";
import type {
  PaymentFilters,
  PaymentSummary,
  PaymentMethod,
} from "~/types/payment";
import { PaymentMethodLabels } from "~/types/payment";

// Parser config for payment filters
const paymentFiltersParser = {
  parse: (searchParams: URLSearchParams): PaymentFilters => ({
    search: searchParams.get("search") || undefined,
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

// Invoice payment status badge (from invoice, not payment)
function InvoicePaymentStatusBadge({ status }: { status?: string }) {
  const config: Record<string, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
    PAID: { label: "Pagada", variant: "success" },
    PARTIALLY_PAID: { label: "Parcial", variant: "warning" },
    UNPAID: { label: "Sin pagar", variant: "error" },
  };

  const statusConfig = config[status || ""] || {
    label: "—",
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
        No tienes permisos para ver los pagos. Contacta a tu administrador si necesitas acceso.
      </p>
    </div>
  );
}

export default function PaymentsPage() {
  const { hasPermission } = usePermissions();
  const [showFilters, setShowFilters] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<PaymentSummary | null>(
    null,
  );
  const { filters, updateFilters, clearFilters } =
    useUrlFilters<PaymentFilters>({
      parserConfig: paymentFiltersParser,
    });

  // Store permission check result - must be before any early returns
  const canViewPayments = hasPermission(Permission.PAYMENTS_VIEW);

  // Queries - must be called before any early returns to maintain hook order
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

  // Check permissions after all hooks
  if (!canViewPayments) {
    return <AccessDenied />;
  }

  // Handle delete
  const handleDelete = async () => {
    if (deletingPayment) {
      await deletePayment.mutateAsync(deletingPayment.id);
      setDeletingPayment(null);
    }
  };

  const payments = paymentsData?.data || [];
  const paginationMeta = paymentsData?.meta;
  const hasActiveFilters =
    filters.search ||
    filters.method ||
    filters.customerId ||
    filters.startDate ||
    filters.endDate;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Pagos
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Gestiona los pagos recibidos
          </p>
        </div>
        <Link to="/payments/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Pago
          </Button>
        </Link>
      </PageSection>

      {/* Stats Cards */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={DollarSign}
            label="Total Recibido"
            value={formatCurrency(stats?.totalReceived || 0)}
            color="success"
          />
          <StatCard
            icon={Calendar}
            label="Hoy"
            value={formatCurrency(stats?.todayTotal || 0)}
            subtitle={`${stats?.todayPayments || 0} pagos`}
            color="accent"
          />
          <StatCard
            icon={Clock}
            label="Esta Semana"
            value={formatCurrency(stats?.weekTotal || 0)}
            subtitle={`${stats?.weekPayments || 0} pagos`}
            color="warning"
          />
          <StatCard
            icon={CreditCard}
            label="Total Pagos"
            value={stats?.totalPayments || 0}
            subtitle="en el sistema"
            color="primary"
          />
        </div>
      </PageSection>

      {/* Search and Filters */}
      <PageSection>
        <Card padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Buscar por referencia o cliente..."
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
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
      </PageSection>

      {/* Table */}
      <PageSection>
        <Card>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="hidden sm:table-cell">Metodo</TableHead>
                  <TableHead className="hidden md:table-cell">Estado Factura</TableHead>
                  <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                  <TableHead className="w-25">Acciones</TableHead>
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
                    <TableHead>Factura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Metodo
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Estado Factura
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Fecha
                    </TableHead>
                    <TableHead className="w-25">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment, i) => (
                    <AnimatedTableRow key={payment.id} index={i}>
                      <TableCell>
                        {payment.invoice ? (
                          <Link
                            to={`/invoices/${payment.invoiceId}`}
                            className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                          >
                            {payment.invoice.invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-sm text-neutral-500 dark:text-neutral-400">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {payment.invoice?.customer?.name || "Cliente desconocido"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-semibold text-neutral-900 dark:text-white">
                          {formatCurrency(payment.amount)}
                        </p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <PaymentMethodBadge method={payment.method} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <InvoicePaymentStatusBadge status={payment.invoice?.paymentStatus} />
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingPayment(payment)}
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
        open={!!deletingPayment}
        onOpenChange={(open) => !open && setDeletingPayment(null)}
        itemName={
          deletingPayment?.invoice?.invoiceNumber
            ? `Pago de ${deletingPayment.invoice.invoiceNumber}`
            : "este pago"
        }
        itemType="pago"
        onConfirm={handleDelete}
        isLoading={deletePayment.isPending}
      />
    </PageWrapper>
  );
}
