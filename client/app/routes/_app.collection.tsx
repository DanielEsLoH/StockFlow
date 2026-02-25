import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Eye,
  X,
  Calendar,
  DollarSign,
  Bell,
  BellRing,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  Loader2,
  Zap,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import type { Route } from "./+types/_app.collection";
import { cn, debounce, formatCurrency, formatDate } from "~/lib/utils";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  useCollectionReminders,
  useCollectionDashboard,
  useCreateReminder,
  useGenerateAutoReminders,
  useCancelReminder,
  useMarkReminderSent,
} from "~/hooks/useCollection";
import { useUrlFilters } from "~/hooks/useUrlFilters";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Textarea } from "~/components/ui/Textarea";
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
import { EmptyState } from "~/components/ui/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/Modal";
import { toast } from "~/components/ui/Toast";
import type {
  ReminderStatus,
  CollectionReminderType,
  ReminderChannel,
  CollectionReminder,
} from "~/types/collection";
import {
  reminderStatusLabels,
  reminderTypeLabels,
  channelLabels,
} from "~/types/collection";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Cobros - StockFlow" },
    { name: "description", content: "Gestion de cobros y recordatorios" },
  ];
};

// Status filter options
const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "PENDING", label: "Pendiente" },
  { value: "SENT", label: "Enviado" },
  { value: "FAILED", label: "Fallido" },
  { value: "CANCELLED", label: "Cancelado" },
];

// Type filter options
const typeOptions = [
  { value: "", label: "Todos los tipos" },
  { value: "BEFORE_DUE", label: "Antes del vencimiento" },
  { value: "ON_DUE", label: "Dia de vencimiento" },
  { value: "AFTER_DUE", label: "Despues del vencimiento" },
  { value: "MANUAL", label: "Manual" },
];

// Channel options
const channelOptions = [
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
];

// Items per page
const pageSizeOptions = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
];

// Badge variant mapping
const statusBadgeVariant: Record<
  ReminderStatus,
  "default" | "primary" | "secondary" | "success" | "warning" | "error"
> = {
  PENDING: "warning",
  SENT: "success",
  FAILED: "error",
  CANCELLED: "secondary",
};

// Channel icon mapping
function ChannelIcon({ channel }: { channel: ReminderChannel }) {
  switch (channel) {
    case "EMAIL":
      return <Mail className="h-3.5 w-3.5" />;
    case "SMS":
      return <Phone className="h-3.5 w-3.5" />;
    case "WHATSAPP":
      return <MessageCircle className="h-3.5 w-3.5" />;
  }
}

// Filters type
interface CollectionFilters {
  search?: string;
  status?: ReminderStatus;
  type?: CollectionReminderType;
  page?: number;
  limit?: number;
}

// Parser config
const collectionFiltersParser = {
  parse: (searchParams: URLSearchParams): CollectionFilters => ({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as ReminderStatus) || undefined,
    type: (searchParams.get("type") as CollectionReminderType) || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

// Table header
function ReminderTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Factura</TableHead>
        <TableHead>Cliente</TableHead>
        <TableHead className="hidden md:table-cell">Tipo</TableHead>
        <TableHead className="hidden sm:table-cell">Canal</TableHead>
        <TableHead className="hidden md:table-cell">Programado</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead className="w-24">Acciones</TableHead>
      </TableRow>
    </TableHeader>
  );
}

// Create manual reminder dialog
function CreateReminderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createReminder = useCreateReminder();
  const [invoiceId, setInvoiceId] = useState("");
  const [channel, setChannel] = useState<ReminderChannel>("EMAIL");
  const [scheduledAt, setScheduledAt] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!invoiceId.trim()) {
      toast.error("Ingresa el ID de la factura");
      return;
    }
    if (!scheduledAt) {
      toast.error("Selecciona fecha de programacion");
      return;
    }

    createReminder.mutate(
      {
        invoiceId: invoiceId.trim(),
        type: "MANUAL" as CollectionReminderType,
        channel,
        scheduledAt: new Date(scheduledAt).toISOString(),
        message: message || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setInvoiceId("");
          setChannel("EMAIL");
          setScheduledAt("");
          setMessage("");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideDescription>
        <DialogHeader>
          <DialogTitle>Nuevo Recordatorio Manual</DialogTitle>
          <DialogDescription>
            Crea un recordatorio de cobro manual para una factura
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
              ID de Factura
            </label>
            <Input
              placeholder="ID de la factura"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
              Canal
            </label>
            <Select
              options={channelOptions}
              value={channel}
              onChange={(val) => setChannel(val as ReminderChannel)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
              Fecha de programacion
            </label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
              Mensaje (opcional)
            </label>
            <Textarea
              placeholder="Mensaje personalizado para el recordatorio..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createReminder.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={createReminder.isPending}
          >
            Crear Recordatorio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CollectionPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { filters, updateFilters, clearFilters } =
    useUrlFilters<CollectionFilters>({
      parserConfig: collectionFiltersParser,
    });

  // Queries
  const {
    data: remindersData,
    isLoading,
    isError,
  } = useCollectionReminders(filters as Record<string, unknown>);
  const { data: dashboard } = useCollectionDashboard();
  const generateAutoReminders = useGenerateAutoReminders();
  const cancelReminder = useCancelReminder();
  const markReminderSent = useMarkReminderSent();

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

  const handleGenerateAuto = () => {
    generateAutoReminders.mutate();
  };

  const reminders = (remindersData as { data?: CollectionReminder[] })?.data || [];
  const total = (remindersData as { total?: number })?.total || 0;
  const totalPages = Math.ceil(total / (filters.limit || 10));
  const hasActiveFilters = filters.search || filters.status || filters.type;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-900/30">
            <BellRing className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Cobros
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              Gestion de recordatorios de cobro
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateAuto}
            disabled={generateAutoReminders.isPending}
            leftIcon={
              generateAutoReminders.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )
            }
          >
            Generar Automaticos
          </Button>
          <Button
            variant="gradient"
            leftIcon={<Bell className="h-4 w-4" />}
            onClick={() => setShowCreateDialog(true)}
          >
            Nuevo Recordatorio
          </Button>
        </div>
      </PageSection>

      {/* Stats Cards */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={DollarSign}
            label="Total Vencido"
            value={formatCurrency(dashboard?.totalOverdue || 0)}
            color="error"
            variant="gradient"
            animate
            animationDelay={0}
          />
          <StatCard
            icon={AlertTriangle}
            label="Facturas Vencidas"
            value={dashboard?.overdueCount || 0}
            color="warning"
            variant="gradient"
            animate
            animationDelay={0.1}
          />
          <StatCard
            icon={Clock}
            label="Recordatorios Pendientes"
            value={dashboard?.pendingReminders || 0}
            color="primary"
            variant="gradient"
            animate
            animationDelay={0.2}
          />
          <StatCard
            icon={Send}
            label="Enviados Hoy"
            value={dashboard?.sentToday || 0}
            color="success"
            variant="gradient"
            animate
            animationDelay={0.3}
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
                  placeholder="Buscar por factura o cliente..."
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
                    {[filters.status, filters.type].filter(Boolean).length}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Select
                      options={statusOptions}
                      value={filters.status || ""}
                      onChange={(value) =>
                        updateFilters({
                          status: (value as ReminderStatus) || undefined,
                        })
                      }
                      placeholder="Todos los estados"
                    />
                    <Select
                      options={typeOptions}
                      value={filters.type || ""}
                      onChange={(value) =>
                        updateFilters({
                          type: (value as CollectionReminderType) || undefined,
                        })
                      }
                      placeholder="Todos los tipos"
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
              <ReminderTableHeader />
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={7} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar recordatorios"
              description="Hubo un problema al cargar los recordatorios. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : reminders.length === 0 ? (
            <EmptyState
              icon={<BellRing className="h-16 w-16" />}
              title={
                hasActiveFilters
                  ? "Sin resultados"
                  : "No hay recordatorios"
              }
              description={
                hasActiveFilters
                  ? "No se encontraron recordatorios con los filtros aplicados."
                  : "Genera recordatorios automaticos o crea uno manualmente."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : {
                      label: "Generar automaticos",
                      onClick: handleGenerateAuto,
                    }
              }
            />
          ) : (
            <>
              <Table>
                <ReminderTableHeader />
                <TableBody>
                  {reminders.map((reminder, i) => (
                    <AnimatedTableRow
                      key={reminder.id}
                      index={i}
                      className="group border-b border-neutral-200 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <TableCell>
                        {reminder.invoice ? (
                          <Link
                            to={`/invoices/${reminder.invoice.id}`}
                            className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                          >
                            {reminder.invoice.invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                        {reminder.invoice?.total != null && (
                          <p className="text-xs text-neutral-500">
                            {formatCurrency(reminder.invoice.total)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {reminder.customer?.name || "—"}
                        </p>
                        {reminder.customer?.email && (
                          <p className="text-xs text-neutral-500">
                            {reminder.customer.email}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          {reminderTypeLabels[reminder.type]}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <ChannelIcon channel={reminder.channel} />
                          {channelLabels[reminder.channel]}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                          {formatDate(reminder.scheduledAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusBadgeVariant[reminder.status]}
                          size="sm"
                        >
                          {reminderStatusLabels[reminder.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {reminder.status === "PENDING" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  markReminderSent.mutate(reminder.id)
                                }
                                disabled={markReminderSent.isPending}
                                title="Marcar como enviado"
                              >
                                <CheckCircle className="h-4 w-4 text-success-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  cancelReminder.mutate(reminder.id)
                                }
                                disabled={cancelReminder.isPending}
                                title="Cancelar"
                                className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {reminder.invoice && (
                            <Link to={`/invoices/${reminder.invoice.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver factura"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </AnimatedTableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-4">
                    <PaginationInfo
                      currentPage={filters.page || 1}
                      pageSize={filters.limit || 10}
                      totalItems={total}
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
                    currentPage={filters.page || 1}
                    totalPages={totalPages}
                    onPageChange={(page) => updateFilters({ page })}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </PageSection>

      {/* Create Reminder Dialog */}
      <CreateReminderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </PageWrapper>
  );
}
