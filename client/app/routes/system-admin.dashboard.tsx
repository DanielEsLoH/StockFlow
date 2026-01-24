import { motion } from "framer-motion";
import {
  Building2,
  Users,
  UserCheck,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router";
import {
  useSystemAdminDashboard,
  useSystemAdminPendingUsers,
} from "~/hooks/useSystemAdmin";
import { Button } from "~/components/ui/Button";
import { StatCard } from "~/components/ui/StatCard";

export function meta() {
  return [
    { title: "Dashboard - System Admin - StockFlow" },
    {
      name: "description",
      content: "Panel de control del administrador del sistema",
    },
  ];
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    PENDING: {
      bg: "bg-yellow-100 dark:bg-yellow-900/20",
      text: "text-yellow-700 dark:text-yellow-400",
      label: "Pendiente",
    },
    ACTIVE: {
      bg: "bg-green-100 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-400",
      label: "Activo",
    },
    SUSPENDED: {
      bg: "bg-red-100 dark:bg-red-900/20",
      text: "text-red-700 dark:text-red-400",
      label: "Suspendido",
    },
    INACTIVE: {
      bg: "bg-neutral-100 dark:bg-neutral-800",
      text: "text-neutral-700 dark:text-neutral-400",
      label: "Inactivo",
    },
    TRIAL: {
      bg: "bg-blue-100 dark:bg-blue-900/20",
      text: "text-blue-700 dark:text-blue-400",
      label: "Prueba",
    },
  };

  const config = statusConfig[status] || statusConfig.INACTIVE;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

export default function SystemAdminDashboard() {
  const { data: dashboardData, isLoading, error } = useSystemAdminDashboard();
  const { pendingUsers, approveUser, isApproving } = useSystemAdminPendingUsers(
    { limit: 5 },
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-error-500 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Error al cargar datos
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          No se pudieron cargar los datos del dashboard
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Tenants"
          value={dashboardData?.totalTenants ?? 0}
          icon={Building2}
          color="blue"
          isLoading={isLoading}
          animate
        />
        <StatCard
          label="Aprobaciones Pendientes"
          value={dashboardData?.pendingApprovals ?? 0}
          icon={Clock}
          color="amber"
          isLoading={isLoading}
          animate
        />
        <StatCard
          label="Usuarios Activos"
          value={dashboardData?.activeUsers ?? 0}
          icon={UserCheck}
          color="green"
          isLoading={isLoading}
          animate
        />
        <StatCard
          label="Registros Recientes"
          value={dashboardData?.recentRegistrations?.length ?? 0}
          icon={Users}
          color="purple"
          isLoading={isLoading}
          animate
        />
      </div>

      {/* Recent Registrations / Pending Approvals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Usuarios Pendientes de Aprobacion
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Registros recientes que requieren aprobacion
            </p>
          </div>
          <Link to="/system-admin/users?status=PENDING">
            <Button variant="ghost" size="sm">
              Ver todos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  <div>
                    <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="mt-1 h-3 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                </div>
                <div className="h-8 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
              </div>
            ))
          ) : pendingUsers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <UserCheck className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400">
                No hay usuarios pendientes de aprobacion
              </p>
            </div>
          ) : (
            pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      {user.firstName[0]}
                      {user.lastName[0]}
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
                <div className="flex items-center gap-4">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {user.tenantName}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {new Date(user.createdAt).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <StatusBadge status={user.status} />
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => approveUser(user.id)}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Aprobar"
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Link
          to="/system-admin/users"
          className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-amber-500 hover:bg-amber-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-amber-500 dark:hover:bg-amber-900/10"
        >
          <div className="rounded-lg bg-blue-500/10 p-3">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">
              Gestionar Usuarios
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Ver y administrar usuarios del sistema
            </p>
          </div>
          <ArrowRight className="ml-auto h-5 w-5 text-neutral-400" />
        </Link>

        <Link
          to="/system-admin/tenants"
          className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-amber-500 hover:bg-amber-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-amber-500 dark:hover:bg-amber-900/10"
        >
          <div className="rounded-lg bg-purple-500/10 p-3">
            <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">
              Gestionar Tenants
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Ver y administrar organizaciones
            </p>
          </div>
          <ArrowRight className="ml-auto h-5 w-5 text-neutral-400" />
        </Link>

        <Link
          to="/system-admin/users?status=PENDING"
          className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-amber-500 hover:bg-amber-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-amber-500 dark:hover:bg-amber-900/10"
        >
          <div className="rounded-lg bg-amber-500/10 p-3">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">
              Aprobaciones Pendientes
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Revisar solicitudes de registro
            </p>
          </div>
          <ArrowRight className="ml-auto h-5 w-5 text-neutral-400" />
        </Link>
      </motion.div>
    </div>
  );
}
