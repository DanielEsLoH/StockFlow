import { motion } from "framer-motion";
import {
  Building2,
  Users,
  UserCheck,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  useSystemAdminDashboard,
  useSystemAdminPendingUsers,
} from "~/hooks/useSystemAdmin";
import { Button } from "~/components/ui/Button";
import {
  pageVariants,
  pageItemVariants,
  statGridVariants,
  statItemVariants,
} from "~/lib/animations";

export function meta() {
  return [
    { title: "Dashboard - System Admin - StockFlow" },
    {
      name: "description",
      content: "Panel de control del administrador del sistema",
    },
  ];
}

const PLAN_COLORS: Record<string, string> = {
  EMPRENDEDOR: "#6366f1",
  PYME: "#a855f7",
  PRO: "#14b8a6",
  PLUS: "#f97316",
  FREE: "#9ca3af",
};

function StatCard({
  label,
  value,
  icon: Icon,
  change,
  changeLabel,
  color,
  isLoading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  change?: number;
  changeLabel?: string;
  color: string;
  isLoading?: boolean;
}) {
  const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
    primary: {
      bg: "bg-primary-50 dark:bg-primary-500/10",
      icon: "text-primary-500",
      ring: "ring-primary-500/20",
    },
    warning: {
      bg: "bg-warning-50 dark:bg-warning-500/10",
      icon: "text-warning-500",
      ring: "ring-warning-500/20",
    },
    success: {
      bg: "bg-success-50 dark:bg-success-500/10",
      icon: "text-success-500",
      ring: "ring-success-500/20",
    },
    accent: {
      bg: "bg-accent-50 dark:bg-accent-500/10",
      icon: "text-accent-500",
      ring: "ring-accent-500/20",
    },
  };

  const c = colorMap[color] || colorMap.primary;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
        <div className="mt-3 h-8 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
    );
  }

  return (
    <motion.div
      variants={statItemVariants}
      className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg}`}>
          <Icon className={`h-5 w-5 ${c.icon}`} />
        </div>
        {change !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${change >= 0 ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}
          >
            <TrendingUp className={`h-3 w-3 ${change < 0 ? "rotate-180" : ""}`} />
            {change >= 0 ? "+" : ""}
            {change}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
          {value.toLocaleString("es-CO")}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
        {changeLabel && (
          <p className="text-[11px] text-neutral-400">{changeLabel}</p>
        )}
      </div>
    </motion.div>
  );
}

export default function SystemAdminDashboard() {
  const { data, isLoading, error } = useSystemAdminDashboard();
  const { pendingUsers, approveUser, isApproving } =
    useSystemAdminPendingUsers({ limit: 5 });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 dark:bg-error-500/10">
          <AlertCircle className="h-7 w-7 text-error-500" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">
          Error al cargar datos
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          No se pudieron cargar los datos del dashboard
        </p>
      </div>
    );
  }

  const planData = (data?.planDistribution ?? []).map((item) => ({
    name: item.plan,
    value: item.count,
  }));

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={pageItemVariants}>
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Resumen general del sistema
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={statGridVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Total Tenants"
          value={data?.totalTenants ?? 0}
          icon={Building2}
          color="primary"
          change={data?.tenantsThisMonth}
          changeLabel="este mes"
          isLoading={isLoading}
        />
        <StatCard
          label="Usuarios Activos"
          value={data?.activeUsers ?? 0}
          icon={UserCheck}
          color="success"
          change={data?.usersThisMonth}
          changeLabel="este mes"
          isLoading={isLoading}
        />
        <StatCard
          label="Aprobaciones Pendientes"
          value={data?.pendingApprovals ?? 0}
          icon={Clock}
          color="warning"
          isLoading={isLoading}
        />
        <StatCard
          label="Total Usuarios"
          value={data?.totalUsers ?? 0}
          icon={Users}
          color="accent"
          isLoading={isLoading}
        />
      </motion.div>

      {/* Charts row */}
      <motion.div
        variants={pageItemVariants}
        className="grid gap-4 lg:grid-cols-5"
      >
        {/* Tenant Growth Chart */}
        <div className="lg:col-span-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Crecimiento de Tenants
          </h3>
          <p className="text-xs text-neutral-500">Ultimos 6 meses</p>
          <div className="mt-4 h-52">
            {isLoading ? (
              <div className="h-full animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.tenantGrowth ?? []}>
                  <defs>
                    <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(156,163,175,0.15)"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) => {
                      const [, m] = v.split("-");
                      const months = [
                        "Ene","Feb","Mar","Abr","May","Jun",
                        "Jul","Ago","Sep","Oct","Nov","Dic",
                      ];
                      return months[parseInt(m) - 1] || v;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(17,24,39,0.95)",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#f9fafb",
                    }}
                    labelFormatter={(v: string) => `Mes: ${v}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#colorTenants)"
                    name="Tenants"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="lg:col-span-2 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Distribucion por Plan
          </h3>
          <p className="text-xs text-neutral-500">Tenants activos</p>
          <div className="mt-4 h-44">
            {isLoading ? (
              <div className="h-full animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            ) : planData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                Sin datos
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {planData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={PLAN_COLORS[entry.name] || "#9ca3af"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(17,24,39,0.95)",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#f9fafb",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Legend */}
          <div className="mt-2 flex flex-wrap gap-3">
            {planData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: PLAN_COLORS[item.name] || "#9ca3af",
                  }}
                />
                <span className="text-[11px] text-neutral-500">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Pending Approvals */}
      <motion.div
        variants={pageItemVariants}
        className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Usuarios Pendientes de Aprobacion
            </h3>
            <p className="text-xs text-neutral-500">
              Registros que requieren aprobacion
            </p>
          </div>
          <Link to="/system-admin/users?status=PENDING">
            <Button variant="ghost" size="sm">
              Ver todos
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700" />
                  <div>
                    <div className="h-3.5 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="mt-1.5 h-3 w-36 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                </div>
                <div className="h-8 w-20 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700" />
              </div>
            ))
          ) : pendingUsers.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success-50 dark:bg-success-500/10">
                <UserCheck className="h-6 w-6 text-success-500" />
              </div>
              <p className="mt-3 text-sm text-neutral-500">
                No hay usuarios pendientes
              </p>
            </div>
          ) : (
            pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning-50 text-xs font-semibold text-warning-600 dark:bg-warning-500/10 dark:text-warning-400">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {user.email}{" "}
                      <span className="text-neutral-300 dark:text-neutral-600">
                        ·
                      </span>{" "}
                      {user.tenantName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-xs text-neutral-400 sm:block">
                    {new Date(user.createdAt).toLocaleDateString("es-ES")}
                  </span>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => approveUser(user.id)}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
    </motion.div>
  );
}
