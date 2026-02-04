import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { containerVariants, itemVariants } from "~/lib/animations";
import {
  Search,
  Filter,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  X,
  ChevronDown,
  Package,
  FileText,
  CreditCard,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  User,
  BarChart3,
  Settings,
  ExternalLink,
  Mail,
  MailOpen,
} from "lucide-react";
import type { Route } from "./+types/_app.notifications";
import { cn, debounce, formatRelativeTime } from "~/lib/utils";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAsUnread,
  useMarkMultipleAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useDeleteMultipleNotifications,
  useClearReadNotifications,
  useUnreadCount,
} from "~/hooks/useNotifications";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Select } from "~/components/ui/Select";
import { Pagination, PaginationInfo } from "~/components/ui/Pagination";
import { EmptyState } from "~/components/ui/EmptyState";
import { DeleteModal } from "~/components/ui/DeleteModal";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import { useUrlFilters } from "~/hooks/useUrlFilters";
import type {
  NotificationFilters,
  NotificationType,
  NotificationPriority,
  NotificationSummary,
  NotificationCategory,
} from "~/types/notification";
import {
  NotificationTypeLabels,
  NotificationPriorityLabels,
  NotificationTypeToCategory,
} from "~/types/notification";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Notificaciones - StockFlow" },
    { name: "description", content: "Centro de notificaciones" },
  ];
};

// Type options for filter
const typeOptions = [
  { value: "", label: "Todos los tipos" },
  { value: "LOW_STOCK", label: NotificationTypeLabels.LOW_STOCK },
  { value: "OUT_OF_STOCK", label: NotificationTypeLabels.OUT_OF_STOCK },
  { value: "NEW_INVOICE", label: NotificationTypeLabels.NEW_INVOICE },
  { value: "INVOICE_PAID", label: NotificationTypeLabels.INVOICE_PAID },
  { value: "INVOICE_OVERDUE", label: NotificationTypeLabels.INVOICE_OVERDUE },
  { value: "PAYMENT_RECEIVED", label: NotificationTypeLabels.PAYMENT_RECEIVED },
  { value: "PAYMENT_FAILED", label: NotificationTypeLabels.PAYMENT_FAILED },
  { value: "NEW_CUSTOMER", label: NotificationTypeLabels.NEW_CUSTOMER },
  { value: "REPORT_READY", label: NotificationTypeLabels.REPORT_READY },
  { value: "SYSTEM", label: NotificationTypeLabels.SYSTEM },
  { value: "INFO", label: NotificationTypeLabels.INFO },
];

// Priority options for filter
const priorityOptions = [
  { value: "", label: "Todas las prioridades" },
  { value: "LOW", label: NotificationPriorityLabels.LOW },
  { value: "MEDIUM", label: NotificationPriorityLabels.MEDIUM },
  { value: "HIGH", label: NotificationPriorityLabels.HIGH },
  { value: "URGENT", label: NotificationPriorityLabels.URGENT },
];

// Read status options for filter
const readStatusOptions = [
  { value: "", label: "Todas" },
  { value: "unread", label: "No leidas" },
  { value: "read", label: "Leidas" },
];

// Items per page options
const pageSizeOptions = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
];

// Notification icon based on type
function getNotificationIcon(type: NotificationType) {
  const iconClass = "h-5 w-5";
  switch (type) {
    case "LOW_STOCK":
    case "OUT_OF_STOCK":
      return <Package className={iconClass} />;
    case "NEW_INVOICE":
    case "INVOICE_PAID":
    case "INVOICE_OVERDUE":
      return <FileText className={iconClass} />;
    case "PAYMENT_RECEIVED":
    case "PAYMENT_FAILED":
      return <CreditCard className={iconClass} />;
    case "NEW_CUSTOMER":
      return <User className={iconClass} />;
    case "REPORT_READY":
      return <BarChart3 className={iconClass} />;
    case "SYSTEM":
      return <Settings className={iconClass} />;
    case "INFO":
      return <Info className={iconClass} />;
    case "WARNING":
      return <AlertTriangle className={iconClass} />;
    case "SUCCESS":
      return <CheckCircle className={iconClass} />;
    case "ERROR":
      return <AlertCircle className={iconClass} />;
    default:
      return <Bell className={iconClass} />;
  }
}

// Get category color classes
function getCategoryColors(category: NotificationCategory) {
  switch (category) {
    case "success":
      return {
        bg: "bg-success-100 dark:bg-success-900/30",
        text: "text-success-600 dark:text-success-400",
        border: "border-success-200 dark:border-success-800",
      };
    case "warning":
      return {
        bg: "bg-warning-100 dark:bg-warning-900/30",
        text: "text-warning-600 dark:text-warning-400",
        border: "border-warning-200 dark:border-warning-800",
      };
    case "error":
      return {
        bg: "bg-error-100 dark:bg-error-900/30",
        text: "text-error-600 dark:text-error-400",
        border: "border-error-200 dark:border-error-800",
      };
    case "info":
    default:
      return {
        bg: "bg-primary-100 dark:bg-primary-900/30",
        text: "text-primary-600 dark:text-primary-400",
        border: "border-primary-200 dark:border-primary-800",
      };
  }
}

// Priority badge component
function PriorityBadge({ priority }: { priority: NotificationPriority }) {
  const variants: Record<
    NotificationPriority,
    "secondary" | "primary" | "warning" | "error"
  > = {
    LOW: "secondary",
    MEDIUM: "primary",
    HIGH: "warning",
    URGENT: "error",
  };

  return (
    <Badge variant={variants[priority]} size="sm">
      {NotificationPriorityLabels[priority]}
    </Badge>
  );
}

// Parser config for notification filters
const notificationFiltersParser = {
  parse: (searchParams: URLSearchParams): NotificationFilters => ({
    search: searchParams.get("search") || undefined,
    type: (searchParams.get("type") as NotificationType) || undefined,
    priority:
      (searchParams.get("priority") as NotificationPriority) || undefined,
    read:
      searchParams.get("read") === "read"
        ? true
        : searchParams.get("read") === "unread"
          ? false
          : undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

// Table header component
function NotificationTableHeader({
  allSelected,
  someSelected,
  onSelectAll,
}: {
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: (checked: boolean) => void;
}) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800"
            aria-label="Seleccionar todas las notificaciones"
          />
        </TableHead>
        <TableHead>Notificacion</TableHead>
        <TableHead className="hidden md:table-cell w-32">Tipo</TableHead>
        <TableHead className="hidden sm:table-cell w-28">Prioridad</TableHead>
        <TableHead className="hidden lg:table-cell w-36">Fecha</TableHead>
        <TableHead className="w-32">Acciones</TableHead>
      </TableRow>
    </TableHeader>
  );
}

export default function NotificationsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingNotification, setDeletingNotification] =
    useState<NotificationSummary | null>(null);
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { filters, updateFilters, clearFilters } =
    useUrlFilters<NotificationFilters>({
      parserConfig: notificationFiltersParser,
    });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Queries
  const {
    data: notificationsData,
    isLoading,
    isError,
    error,
  } = useNotifications(filters);
  const { data: unreadCount } = useUnreadCount();

  // Mutations
  const markAsRead = useMarkAsRead();
  const markAsUnread = useMarkAsUnread();
  const markMultipleAsRead = useMarkMultipleAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const deleteMultiple = useDeleteMultipleNotifications();
  const clearRead = useClearReadNotifications();

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

  // Get read status filter value for select
  const getReadStatusValue = () => {
    if (filters.read === true) return "read";
    if (filters.read === false) return "unread";
    return "";
  };

  // Handle read status filter change
  const handleReadStatusChange = (value: string) => {
    if (value === "read") {
      updateFilters({ read: true });
    } else if (value === "unread") {
      updateFilters({ read: false });
    } else {
      updateFilters({ read: undefined });
    }
  };

  // Selection handlers
  const notifications = notificationsData?.data || [];
  const meta = notificationsData?.meta;

  const allSelected =
    notifications.length > 0 && selectedIds.size === notifications.length;
  const someSelected = selectedIds.size > 0;

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(notifications.map((n) => n.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [notifications],
  );

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters]);

  // Bulk actions
  const handleMarkSelectedAsRead = () => {
    const ids = Array.from(selectedIds);
    markMultipleAsRead.mutate(ids, {
      onSuccess: () => setSelectedIds(new Set()),
    });
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    await deleteMultiple.mutateAsync(ids);
    setSelectedIds(new Set());
    setShowDeleteSelectedModal(false);
  };

  // Single item actions
  const handleToggleRead = (notification: NotificationSummary) => {
    if (notification.read) {
      markAsUnread.mutate(notification.id);
    } else {
      markAsRead.mutate(notification.id);
    }
  };

  const handleDelete = async () => {
    if (deletingNotification) {
      await deleteNotification.mutateAsync(deletingNotification.id);
      setDeletingNotification(null);
    }
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.search ||
    filters.type ||
    filters.priority ||
    filters.read !== undefined;

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
            Notificaciones
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {unreadCount?.count ? (
              <>
                Tienes{" "}
                <span className="font-medium text-primary-600 dark:text-primary-400">
                  {unreadCount.count}
                </span>{" "}
                {unreadCount.count === 1
                  ? "notificacion sin leer"
                  : "notificaciones sin leer"}
              </>
            ) : (
              "Todas las notificaciones estan al dia"
            )}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {unreadCount && unreadCount.count > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsRead.mutate()}
              isLoading={markAllAsRead.isPending}
              leftIcon={<CheckCheck className="h-4 w-4" />}
            >
              Marcar todo como leido
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => clearRead.mutate()}
            isLoading={clearRead.isPending}
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            Limpiar leidas
          </Button>
        </div>
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
                  placeholder="Buscar en notificaciones..."
                  defaultValue={filters.search || ""}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>

              {/* Filter toggle button */}
              <Button
                variant={showFilters ? "secondary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                leftIcon={<Filter className="h-4 w-4" />}
                rightIcon={
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      showFilters && "rotate-180",
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
                  <div className="grid grid-cols-1 gap-4 border-t border-neutral-100 pt-4 dark:border-neutral-800 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Type filter */}
                    <Select
                      options={typeOptions}
                      value={filters.type || ""}
                      onChange={(value) =>
                        updateFilters({
                          type: (value as NotificationType) || undefined,
                        })
                      }
                      placeholder="Tipo de notificacion"
                    />

                    {/* Priority filter */}
                    <Select
                      options={priorityOptions}
                      value={filters.priority || ""}
                      onChange={(value) =>
                        updateFilters({
                          priority:
                            (value as NotificationPriority) || undefined,
                        })
                      }
                      placeholder="Prioridad"
                    />

                    {/* Read status filter */}
                    <Select
                      options={readStatusOptions}
                      value={getReadStatusValue()}
                      onChange={handleReadStatusChange}
                      placeholder="Estado de lectura"
                    />
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

      {/* Bulk actions bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              padding="sm"
              className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {selectedIds.size}{" "}
                  {selectedIds.size === 1
                    ? "notificacion seleccionada"
                    : "notificaciones seleccionadas"}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkSelectedAsRead}
                    isLoading={markMultipleAsRead.isPending}
                    leftIcon={<Check className="h-4 w-4" />}
                  >
                    Marcar como leidas
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteSelectedModal(true)}
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-900/20"
                  >
                    Eliminar seleccionadas
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Table */}
      <motion.div variants={itemVariants}>
        <Card padding="none">
          {isLoading ? (
            <Table>
              <NotificationTableHeader
                allSelected={false}
                someSelected={false}
                onSelectAll={() => {}}
              />
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={6} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar notificaciones"
              description={
                error?.message ||
                "Hubo un problema al cargar las notificaciones."
              }
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<BellOff className="h-16 w-16" />}
              title={
                hasActiveFilters ? "Sin resultados" : "No hay notificaciones"
              }
              description={
                hasActiveFilters
                  ? "No se encontraron notificaciones con los filtros aplicados."
                  : "Cuando tengas notificaciones nuevas, apareceran aqui."
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
                <NotificationTableHeader
                  allSelected={allSelected}
                  someSelected={someSelected}
                  onSelectAll={selectAll}
                />
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {notifications.map((notification) => {
                      const category =
                        NotificationTypeToCategory[notification.type] || "info";
                      const colors = getCategoryColors(category);
                      const isSelected = selectedIds.has(notification.id);

                      return (
                        <motion.tr
                          key={notification.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            "border-b border-neutral-100 transition-colors dark:border-neutral-800",
                            !notification.read &&
                              "bg-primary-50/50 dark:bg-primary-900/10",
                            isSelected &&
                              "bg-primary-100/50 dark:bg-primary-900/20",
                          )}
                        >
                          {/* Checkbox */}
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(notification.id)}
                              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800"
                              aria-label={`Seleccionar notificacion: ${notification.title}`}
                            />
                          </TableCell>

                          {/* Notification content */}
                          <TableCell>
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div
                                className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                                  colors.bg,
                                  colors.text,
                                )}
                              >
                                {getNotificationIcon(notification.type)}
                              </div>

                              {/* Text */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p
                                    className={cn(
                                      "font-medium text-neutral-900 dark:text-white truncate",
                                      !notification.read && "font-semibold",
                                    )}
                                  >
                                    {notification.title}
                                  </p>
                                  {!notification.read && (
                                    <span className="h-2 w-2 rounded-full bg-primary-500 shrink-0" />
                                  )}
                                </div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
                                  {notification.message}
                                </p>
                                {notification.link && (
                                  <Link
                                    to={notification.link}
                                    className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-1"
                                  >
                                    Ver detalles
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Type */}
                          <TableCell className="hidden md:table-cell">
                            <Badge
                              variant={
                                category === "error"
                                  ? "error"
                                  : category === "warning"
                                    ? "warning"
                                    : category === "success"
                                      ? "success"
                                      : "secondary"
                              }
                              size="sm"
                            >
                              {NotificationTypeLabels[notification.type]}
                            </Badge>
                          </TableCell>

                          {/* Priority */}
                          <TableCell className="hidden sm:table-cell">
                            <PriorityBadge priority={notification.priority} />
                          </TableCell>

                          {/* Date */}
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleToggleRead(notification)}
                                title={
                                  notification.read
                                    ? "Marcar como no leida"
                                    : "Marcar como leida"
                                }
                                disabled={
                                  markAsRead.isPending || markAsUnread.isPending
                                }
                              >
                                {notification.read ? (
                                  <Mail className="h-4 w-4" />
                                ) : (
                                  <MailOpen className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  setDeletingNotification(notification)
                                }
                                title="Eliminar"
                                className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-100 p-4 dark:border-neutral-800 sm:flex-row">
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
                </div>
              )}
            </>
          )}
        </Card>
      </motion.div>

      {/* Delete Single Notification Modal */}
      <DeleteModal
        open={!!deletingNotification}
        onOpenChange={(open) => !open && setDeletingNotification(null)}
        itemName={deletingNotification?.title || ""}
        itemType="notificacion"
        onConfirm={handleDelete}
        isLoading={deleteNotification.isPending}
      />

      {/* Delete Multiple Notifications Modal */}
      <DeleteModal
        open={showDeleteSelectedModal}
        onOpenChange={setShowDeleteSelectedModal}
        itemName={`${selectedIds.size} notificaciones`}
        itemType="notificaciones"
        title="Eliminar notificaciones"
        description={`¿Estas seguro de que deseas eliminar ${selectedIds.size} ${selectedIds.size === 1 ? "notificacion" : "notificaciones"}? Esta accion no se puede deshacer.`}
        onConfirm={handleDeleteSelected}
        isLoading={deleteMultiple.isPending}
      />
    </motion.div>
  );
}
