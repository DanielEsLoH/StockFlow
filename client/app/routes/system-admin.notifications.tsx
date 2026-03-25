import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  UserPlus,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  UserX,
  AlertTriangle,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useSystemAdminNotifications,
} from "~/hooks/useSystemAdmin";
import { Button } from "~/components/ui/Button";
import {
  pageVariants,
  pageItemVariants,
  tableRowVariants,
} from "~/lib/animations";
import type { AdminNotification } from "~/services/system-admin.service";

export function meta() {
  return [
    { title: "Notificaciones - System Admin - StockFlow" },
    { name: "description", content: "Notificaciones del sistema" },
  ];
}

const typeIcons: Record<string, React.ElementType> = {
  NEW_USER_REGISTRATION: UserPlus,
  SUBSCRIPTION_CHANGE: CreditCard,
  PLAN_UPGRADE: TrendingUp,
  PLAN_DOWNGRADE: TrendingDown,
  PLAN_SUSPENDED: Pause,
  PLAN_REACTIVATED: Play,
  USER_SUSPENDED: UserX,
  SYSTEM_ALERT: AlertTriangle,
};

const typeColors: Record<string, string> = {
  NEW_USER_REGISTRATION: "bg-primary-50 text-primary-500 dark:bg-primary-500/10",
  SUBSCRIPTION_CHANGE: "bg-accent-50 text-accent-500 dark:bg-accent-500/10",
  PLAN_UPGRADE: "bg-success-50 text-success-500 dark:bg-success-500/10",
  PLAN_DOWNGRADE: "bg-warning-50 text-warning-500 dark:bg-warning-500/10",
  PLAN_SUSPENDED: "bg-error-50 text-error-500 dark:bg-error-500/10",
  PLAN_REACTIVATED: "bg-success-50 text-success-500 dark:bg-success-500/10",
  USER_SUSPENDED: "bg-error-50 text-error-500 dark:bg-error-500/10",
  SYSTEM_ALERT: "bg-warning-50 text-warning-500 dark:bg-warning-500/10",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin}m`;
  if (diffHr < 24) return `Hace ${diffHr}h`;
  if (diffDay < 7) return `Hace ${diffDay}d`;
  return date.toLocaleDateString("es-ES");
}

function NotificationRow({
  notification,
  index,
  onMarkAsRead,
  onDelete,
}: {
  notification: AdminNotification;
  index: number;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = typeIcons[notification.type] || Bell;
  const colorClass = typeColors[notification.type] || "bg-neutral-100 text-neutral-500 dark:bg-neutral-800";

  return (
    <motion.div
      custom={index}
      variants={tableRowVariants}
      initial="hidden"
      animate="visible"
      className={`flex items-start gap-3 px-5 py-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/30 ${
        !notification.read ? "bg-primary-50/30 dark:bg-primary-500/[0.03]" : ""
      }`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-sm ${notification.read ? "text-neutral-700 dark:text-neutral-300" : "font-medium text-neutral-900 dark:text-white"}`}>
              {notification.title}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">
              {notification.message}
            </p>
          </div>
          <span className="shrink-0 text-[11px] text-neutral-400">
            {timeAgo(notification.createdAt)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        {!notification.read && (
          <Button
            size="icon-xs"
            variant="ghost"
            title="Marcar como leida"
            onClick={() => onMarkAsRead(notification.id)}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="icon-xs"
          variant="ghost"
          title="Eliminar"
          onClick={() => onDelete(notification.id)}
          className="text-neutral-400 hover:text-error-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function SystemAdminNotificationsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const {
    notifications,
    meta,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useSystemAdminNotifications({
    page,
    limit: 20,
    ...(filter === "unread" && { read: false }),
  });

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Header */}
      <motion.div
        variants={pageItemVariants}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
            Notificaciones
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Centro de notificaciones del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl border border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => { setFilter("all"); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-xl last:rounded-r-xl ${
                filter === "all"
                  ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => { setFilter("unread"); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-xl last:rounded-r-xl ${
                filter === "unread"
                  ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              No leidas
            </button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => markAllAsRead()}
          >
            Marcar todo como leido
          </Button>
        </div>
      </motion.div>

      {/* Notifications list */}
      <motion.div
        variants={pageItemVariants}
        className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      >
        {isLoading ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                <div className="h-9 w-9 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700" />
                <div className="flex-1">
                  <div className="h-3.5 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  <div className="mt-2 h-3 w-64 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-500/10">
              <Bell className="h-7 w-7 text-primary-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-neutral-900 dark:text-white">
              No hay notificaciones
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {filter === "unread"
                ? "No tienes notificaciones sin leer"
                : "Las notificaciones del sistema apareceran aqui"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {notifications.map((notification, i) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                index={i}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
            <p className="text-xs text-neutral-400">
              Pagina {meta.page} de {meta.totalPages}
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={meta.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
