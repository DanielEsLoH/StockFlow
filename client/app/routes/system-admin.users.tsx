import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  UserCheck,
  UserX,
  Trash2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { useSystemAdminUsers } from "~/hooks/useSystemAdmin";
import { Button } from "~/components/ui/Button";
import {
  pageVariants,
  pageItemVariants,
  tableRowVariants,
  modalOverlayVariants,
  modalContentVariants,
} from "~/lib/animations";
import type { UserStatus, UserRole } from "~/services/system-admin.service";

export function meta() {
  return [
    { title: "Usuarios - System Admin - StockFlow" },
    { name: "description", content: "Gestion de usuarios del sistema" },
  ];
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { classes: string; label: string }> = {
    PENDING: {
      classes:
        "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400",
      label: "Pendiente",
    },
    ACTIVE: {
      classes:
        "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
      label: "Activo",
    },
    SUSPENDED: {
      classes:
        "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
      label: "Suspendido",
    },
    INACTIVE: {
      classes: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
      label: "Inactivo",
    },
  };
  const c = config[status] || config.INACTIVE;
  return (
    <span
      className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium ${c.classes}`}
    >
      {c.label}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, string> = {
    SUPER_ADMIN: "bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400",
    ADMIN: "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400",
    MANAGER: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
    EMPLOYEE: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  };
  return (
    <span
      className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium ${config[role] || config.EMPLOYEE}`}
    >
      {role}
    </span>
  );
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  isLoading,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "danger" | "success";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          variants={modalOverlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onCancel}
        />
        <motion.div
          variants={modalContentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        >
          <h3 className="font-display text-lg font-semibold text-neutral-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {message}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              variant={confirmVariant}
              size="sm"
              onClick={onConfirm}
              disabled={isLoading}
              isLoading={isLoading}
            >
              {confirmLabel}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const statusOptions: { value: UserStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "PENDING", label: "Pendiente" },
  { value: "ACTIVE", label: "Activo" },
  { value: "SUSPENDED", label: "Suspendido" },
  { value: "INACTIVE", label: "Inactivo" },
];

const roleOptions: { value: UserRole | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "EMPLOYEE", label: "Employee" },
];

export default function SystemAdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || "",
  );
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "approve" | "suspend" | "delete";
    userId: string;
    userName: string;
  } | null>(null);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const status = searchParams.get("status") as UserStatus | undefined;
  const role = searchParams.get("role") as UserRole | undefined;
  const search = searchParams.get("search") || undefined;

  const {
    users,
    meta,
    isLoading,
    error,
    approveUser,
    isApproving,
    suspendUser,
    isSuspending,
    deleteUser,
    isDeleting,
  } = useSystemAdminUsers({ page, status, role, search, limit: 20 });

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      if (!("page" in updates)) newParams.delete("page");
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams],
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get("search") || "";
      if (searchInput !== current) {
        updateParams({ search: searchInput || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, searchParams, updateParams]);

  const handleConfirmAction = () => {
    if (!confirmDialog) return;
    switch (confirmDialog.type) {
      case "approve":
        approveUser(confirmDialog.userId);
        break;
      case "suspend":
        suspendUser({ userId: confirmDialog.userId });
        break;
      case "delete":
        deleteUser({ userId: confirmDialog.userId });
        break;
    }
    setConfirmDialog(null);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 dark:bg-error-500/10">
          <AlertCircle className="h-7 w-7 text-error-500" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">
          Error al cargar usuarios
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          No se pudieron cargar los datos
        </p>
      </div>
    );
  }

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
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
            Usuarios
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {meta
              ? `${meta.total} usuarios en total`
              : "Gestion de usuarios del sistema"}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={pageItemVariants}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por email o nombre..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-4 text-sm transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500"
          />
        </div>

        {/* Filter selects */}
        <div className="flex gap-2">
          <select
            value={status || ""}
            onChange={(e) =>
              updateParams({ status: e.target.value || undefined })
            }
            className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={role || ""}
            onChange={(e) =>
              updateParams({ role: e.target.value || undefined })
            }
            className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            {roleOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Active filter pills */}
      {(status || role || search) && (
        <motion.div
          variants={pageItemVariants}
          className="flex flex-wrap gap-2"
        >
          {status && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              {statusOptions.find((o) => o.value === status)?.label}
              <button
                onClick={() => updateParams({ status: undefined })}
                className="hover:text-primary-800 dark:hover:text-primary-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {role && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-600 dark:bg-accent-500/10 dark:text-accent-400">
              {role}
              <button
                onClick={() => updateParams({ role: undefined })}
                className="hover:text-accent-800 dark:hover:text-accent-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {search && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              "{search}"
              <button
                onClick={() => {
                  setSearchInput("");
                  updateParams({ search: undefined });
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </motion.div>
      )}

      {/* Table */}
      <motion.div
        variants={pageItemVariants}
        className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                  Usuario
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                  Tenant
                </th>
                <th className="hidden px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-400 md:table-cell">
                  Rol
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                  Estado
                </th>
                <th className="hidden px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-400 lg:table-cell">
                  Registro
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700" />
                          <div>
                            <div className="h-3.5 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                            <div className="mt-1.5 h-3 w-36 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="h-3.5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                      </td>
                      <td className="hidden px-5 py-3.5 md:table-cell">
                        <div className="h-5 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="h-5 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                      </td>
                      <td className="hidden px-5 py-3.5 lg:table-cell">
                        <div className="h-3.5 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="ml-auto h-8 w-20 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700" />
                      </td>
                    </tr>
                  ))
                : users.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                          <Users className="h-6 w-6 text-neutral-400" />
                        </div>
                        <p className="mt-3 text-sm text-neutral-500">
                          No se encontraron usuarios
                        </p>
                      </td>
                    </tr>
                  )
                  : users.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      custom={i}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-xs font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="truncate text-xs text-neutral-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                          {user.tenantName}
                        </p>
                      </td>
                      <td className="hidden px-5 py-3.5 md:table-cell">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="hidden px-5 py-3.5 text-xs text-neutral-400 lg:table-cell">
                        {new Date(user.createdAt).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          {user.status === "PENDING" && (
                            <Button
                              size="xs"
                              variant="soft-success"
                              leftIcon={<UserCheck className="h-3 w-3" />}
                              onClick={() =>
                                setConfirmDialog({
                                  type: "approve",
                                  userId: user.id,
                                  userName: `${user.firstName} ${user.lastName}`,
                                })
                              }
                            >
                              Aprobar
                            </Button>
                          )}
                          {user.status === "ACTIVE" && (
                            <Button
                              size="xs"
                              variant="soft-warning"
                              leftIcon={<UserX className="h-3 w-3" />}
                              onClick={() =>
                                setConfirmDialog({
                                  type: "suspend",
                                  userId: user.id,
                                  userName: `${user.firstName} ${user.lastName}`,
                                })
                              }
                            >
                              Suspender
                            </Button>
                          )}
                          {user.status === "SUSPENDED" && (
                            <Button
                              size="xs"
                              variant="soft-success"
                              leftIcon={<UserCheck className="h-3 w-3" />}
                              onClick={() =>
                                setConfirmDialog({
                                  type: "approve",
                                  userId: user.id,
                                  userName: `${user.firstName} ${user.lastName}`,
                                })
                              }
                            >
                              Activar
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="soft-danger"
                            leftIcon={<Trash2 className="h-3 w-3" />}
                            onClick={() =>
                              setConfirmDialog({
                                type: "delete",
                                userId: user.id,
                                userName: `${user.firstName} ${user.lastName}`,
                              })
                            }
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
            <p className="text-xs text-neutral-400">
              {(meta.page - 1) * meta.limit + 1}–
              {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={!meta.hasPreviousPage}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={!meta.hasNextPage}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={
          confirmDialog?.type === "approve"
            ? "Aprobar Usuario"
            : confirmDialog?.type === "suspend"
              ? "Suspender Usuario"
              : "Eliminar Usuario"
        }
        message={
          confirmDialog?.type === "approve"
            ? `¿Aprobar a ${confirmDialog?.userName}? Podra acceder al sistema.`
            : confirmDialog?.type === "suspend"
              ? `¿Suspender a ${confirmDialog?.userName}? No podra acceder al sistema.`
              : `¿Eliminar a ${confirmDialog?.userName}? Esta accion no se puede deshacer.`
        }
        confirmLabel={
          confirmDialog?.type === "approve"
            ? "Aprobar"
            : confirmDialog?.type === "suspend"
              ? "Suspender"
              : "Eliminar"
        }
        confirmVariant={
          confirmDialog?.type === "approve" ? "success" : "danger"
        }
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog(null)}
        isLoading={isApproving || isSuspending || isDeleting}
      />
    </motion.div>
  );
}
