import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Trash2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useSystemAdminUsers } from '~/hooks/useSystemAdmin';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import type { UserStatus, UserRole } from '~/services/system-admin.service';

export function meta() {
  return [
    { title: 'Usuarios - System Admin - StockFlow' },
    { name: 'description', content: 'Gestion de usuarios del sistema' },
  ];
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', label: 'Pendiente' },
    ACTIVE: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', label: 'Activo' },
    SUSPENDED: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', label: 'Suspendido' },
    INACTIVE: { bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-700 dark:text-neutral-400', label: 'Inactivo' },
  };

  const config = statusConfig[status] || statusConfig.INACTIVE;

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

// Role badge component
function RoleBadge({ role }: { role: string }) {
  const roleConfig: Record<string, { bg: string; text: string }> = {
    SUPER_ADMIN: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400' },
    ADMIN: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
    MANAGER: { bg: 'bg-cyan-100 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-400' },
    EMPLOYEE: { bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-700 dark:text-neutral-400' },
  };

  const config = roleConfig[role] || roleConfig.EMPLOYEE;

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {role}
    </span>
  );
}

// Confirmation dialog component
function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  isLoading,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SystemAdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'approve' | 'suspend' | 'delete';
    userId: string;
    userName: string;
  } | null>(null);

  // Get query params
  const page = parseInt(searchParams.get('page') || '1', 10);
  const status = searchParams.get('status') as UserStatus | undefined;
  const role = searchParams.get('role') as UserRole | undefined;
  const search = searchParams.get('search') || undefined;

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

  // Update search params
  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    // Reset to page 1 when filters change (except when changing page)
    if (!('page' in updates)) {
      newParams.delete('page');
    }
    setSearchParams(newParams);
  };

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput || undefined });
  };

  // Handle confirm action
  const handleConfirmAction = () => {
    if (!confirmDialog) return;

    switch (confirmDialog.type) {
      case 'approve':
        approveUser(confirmDialog.userId);
        break;
      case 'suspend':
        suspendUser({ userId: confirmDialog.userId });
        break;
      case 'delete':
        deleteUser({ userId: confirmDialog.userId });
        break;
    }
    setConfirmDialog(null);
  };

  // Status filter options
  const statusOptions: { value: UserStatus | ''; label: string }[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'ACTIVE', label: 'Activo' },
    { value: 'SUSPENDED', label: 'Suspendido' },
    { value: 'INACTIVE', label: 'Inactivo' },
  ];

  // Role filter options
  const roleOptions: { value: UserRole | ''; label: string }[] = [
    { value: '', label: 'Todos los roles' },
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'EMPLOYEE', label: 'Employee' },
  ];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-error-500 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Error al cargar usuarios
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          No se pudieron cargar los datos de usuarios
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              type="text"
              placeholder="Buscar por email o nombre..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

        <div className="flex gap-2">
          <select
            value={status || ''}
            onChange={(e) => updateParams({ status: e.target.value || undefined })}
            className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={role || ''}
            onChange={(e) => updateParams({ role: e.target.value || undefined })}
            className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filters */}
      {(status || role || search) && (
        <div className="flex flex-wrap gap-2">
          {status && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              Estado: {statusOptions.find((o) => o.value === status)?.label}
              <button onClick={() => updateParams({ status: undefined })}>
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
          {role && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
              Rol: {role}
              <button onClick={() => updateParams({ role: undefined })}>
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
          {search && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              Busqueda: {search}
              <button onClick={() => { setSearchInput(''); updateParams({ search: undefined }); }}>
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Registro
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
                        <div>
                          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          <div className="mt-1 h-3 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Filter className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                    <p className="text-neutral-600 dark:text-neutral-400">
                      No se encontraron usuarios con los filtros seleccionados
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/20">
                          <span className="text-sm font-medium text-primary-700 dark:text-primary-400">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-neutral-900 dark:text-white">{user.tenantName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                      {new Date(user.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {user.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => setConfirmDialog({
                              type: 'approve',
                              userId: user.id,
                              userName: `${user.firstName} ${user.lastName}`,
                            })}
                          >
                            <UserCheck className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Aprobar</span>
                          </Button>
                        )}
                        {user.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setConfirmDialog({
                              type: 'suspend',
                              userId: user.id,
                              userName: `${user.firstName} ${user.lastName}`,
                            })}
                          >
                            <UserX className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Suspender</span>
                          </Button>
                        )}
                        {user.status === 'SUSPENDED' && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => setConfirmDialog({
                              type: 'approve',
                              userId: user.id,
                              userName: `${user.firstName} ${user.lastName}`,
                            })}
                          >
                            <UserCheck className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Activar</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setConfirmDialog({
                            type: 'delete',
                            userId: user.id,
                            userName: `${user.firstName} ${user.lastName}`,
                          })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Mostrando {((meta.page - 1) * meta.limit) + 1} a {Math.min(meta.page * meta.limit, meta.total)} de {meta.total} usuarios
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!meta.hasPreviousPage}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!meta.hasNextPage}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={
          confirmDialog?.type === 'approve'
            ? 'Aprobar Usuario'
            : confirmDialog?.type === 'suspend'
            ? 'Suspender Usuario'
            : 'Eliminar Usuario'
        }
        message={
          confirmDialog?.type === 'approve'
            ? `Esta seguro de aprobar al usuario ${confirmDialog?.userName}? Podra acceder al sistema.`
            : confirmDialog?.type === 'suspend'
            ? `Esta seguro de suspender al usuario ${confirmDialog?.userName}? No podra acceder al sistema.`
            : `Esta seguro de eliminar al usuario ${confirmDialog?.userName}? Esta accion no se puede deshacer.`
        }
        confirmLabel={
          confirmDialog?.type === 'approve'
            ? 'Aprobar'
            : confirmDialog?.type === 'suspend'
            ? 'Suspender'
            : 'Eliminar'
        }
        confirmVariant={confirmDialog?.type === 'approve' ? 'success' : 'danger'}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog(null)}
        isLoading={isApproving || isSuspending || isDeleting}
      />
    </div>
  );
}
