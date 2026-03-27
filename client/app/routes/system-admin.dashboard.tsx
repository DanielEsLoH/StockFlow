import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Building2,
  Users,
  UserCheck,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
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
import { cn } from "~/lib/utils";
import { pageVariants, pageItemVariants } from "~/lib/animations";

// Intent: Control room dashboard for SaaS operator.
// Numbers count up on mount. Pending approvals pulse with urgency.
// Charts feel alive. Rows exit smoothly when approved.

export function meta() {
  return [
    { title: "Dashboard - System Admin - StockFlow" },
    { name: "description", content: "Panel de control del administrador del sistema" },
  ];
}

const PLAN_COLORS: Record<string, string> = {
  EMPRENDEDOR: "#6366f1",
  PYME:        "#a855f7",
  PRO:         "#14b8a6",
  PLUS:        "#f97316",
  FREE:        "#9ca3af",
};

const ease = [0.16, 1, 0.3, 1] as const;

// ── Animated number counter ────────────────────────────────────────────────

function CountUp({
  to,
  duration = 900,
  delay = 0,
}: {
  to: number;
  duration?: number;
  delay?: number;
}) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || to === 0) return;
    started.current = true;

    const timeout = setTimeout(() => {
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(to * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);

    return () => clearTimeout(timeout);
  }, [to, duration, delay]);

  return <>{count.toLocaleString("es-CO")}</>;
}

// ── Hero KPI card (Total Tenants) ──────────────────────────────────────────

function HeroStatCard({
  label,
  value,
  icon: Icon,
  change,
  changeLabel,
  isLoading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  change?: number;
  changeLabel?: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="h-5 w-32 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
        <div className="mt-5 h-12 w-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
        <div className="mt-3 h-3.5 w-20 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease }}
      className="relative overflow-hidden rounded-2xl border border-primary-200/60 bg-white p-6 shadow-sm dark:border-primary-500/20 dark:bg-neutral-900"
    >
      {/* Subtle gradient tint — signature touch */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-500/[0.04] via-transparent to-transparent dark:from-primary-500/[0.07]" />

      <div className="relative flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100/80 dark:bg-primary-500/15">
          <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        {change !== undefined && (
          <motion.span
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            className={cn(
              "flex items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-semibold",
              change >= 0
                ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                : "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
            )}
          >
            {change >= 0
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />
            }
            {change >= 0 ? "+" : ""}{change}
          </motion.span>
        )}
      </div>

      <div className="relative mt-4">
        <p className="font-display text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          {isLoading ? "—" : <CountUp to={value} duration={1100} delay={100} />}
        </p>
        <p className="mt-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
        {changeLabel && (
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-600">{changeLabel}</p>
        )}
      </div>
    </motion.div>
  );
}

// ── Compact KPI card ───────────────────────────────────────────────────────

type StatColor = "success" | "warning" | "accent" | "primary";

function CompactStatCard({
  label,
  value,
  icon: Icon,
  change,
  color,
  isLoading,
  delay = 0,
  urgent = false,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  change?: number;
  color: StatColor;
  isLoading?: boolean;
  delay?: number;
  urgent?: boolean;
}) {
  const colorMap: Record<StatColor, { bg: string; icon: string; ring: string }> = {
    primary: {
      bg:   "bg-primary-50 dark:bg-primary-500/10",
      icon: "text-primary-500 dark:text-primary-400",
      ring: "",
    },
    warning: {
      bg:   "bg-warning-50 dark:bg-warning-500/10",
      icon: "text-warning-500 dark:text-warning-400",
      ring: "",
    },
    success: {
      bg:   "bg-success-50 dark:bg-success-500/10",
      icon: "text-success-500 dark:text-success-400",
      ring: "",
    },
    accent: {
      bg:   "bg-accent-50 dark:bg-accent-500/10",
      icon: "text-accent-500 dark:text-accent-400",
      ring: "",
    },
  };

  const c = colorMap[color];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-3.5 w-20 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
        </div>
        <div className="mt-3 h-7 w-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.38, ease, delay }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md",
        "dark:bg-neutral-900",
        urgent && value > 0
          ? "border-warning-200 dark:border-warning-500/30"
          : "border-neutral-200/80 dark:border-neutral-800",
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", c.bg)}>
          <Icon className={cn("h-4.5 w-4.5", c.icon)} style={{ width: 18, height: 18 }} />
        </div>
        {/* Pulsing urgent dot when there are pending items */}
        {urgent && value > 0 && (
          <motion.span
            animate={{ scale: [1, 1.35, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="h-2 w-2 rounded-full bg-warning-500"
          />
        )}
        {!urgent && change !== undefined && (
          <span className={cn(
            "text-xs font-medium",
            change >= 0 ? "text-success-500" : "text-error-500",
          )}>
            {change >= 0 ? "+" : ""}{change}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
          <CountUp to={value} duration={750} delay={delay * 1000 + 150} />
        </p>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      </div>
    </motion.div>
  );
}

// ── Custom tooltip for charts ──────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-neutral-200/80 bg-white px-3 py-2.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-neutral-900 dark:text-white">
        {payload[0].value} tenant{payload[0].value !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ── Status dot — pulses once on mount, then stays ──────────────────────────

function StatusDot() {
  return (
    <span className="relative flex h-2 w-2">
      <motion.span
        initial={{ scale: 1 }}
        animate={{ scale: [1, 2.2, 1], opacity: [0.9, 0, 0] }}
        transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
        className="absolute inline-flex h-full w-full rounded-full bg-success-400"
      />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
    </span>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────

export default function SystemAdminDashboard() {
  const { data, isLoading, error }        = useSystemAdminDashboard();
  const { pendingUsers, approveUser, isApproving } =
    useSystemAdminPendingUsers({ limit: 5 });

  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleApprove = async (userId: string) => {
    setApprovingId(userId);
    approveUser(userId);
    // Give the mutation time before the row exits
    setTimeout(() => setApprovingId(null), 600);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 dark:bg-error-500/10">
          <AlertCircle className="h-7 w-7 text-error-500" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-neutral-900 dark:text-white">
          Error al cargar datos
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          No se pudieron obtener los datos del panel
        </p>
      </div>
    );
  }

  const planData = (data?.planDistribution ?? []).map((item) => ({
    name:  item.plan,
    value: item.count,
  }));

  const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const formatMonth = (v: string) => {
    const [, m] = v.split("-");
    return monthNames[parseInt(m) - 1] || v;
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div
        variants={pageItemVariants}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Dashboard
          </h1>
          <div className="mt-1.5 flex items-center gap-2">
            <StatusDot />
            <span className="text-xs text-neutral-500 dark:text-neutral-500">
              Sistema operacional
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">·</span>
            <span className="text-xs text-neutral-400 dark:text-neutral-600">
              {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-neutral-400" />
          <span className="text-xs text-neutral-400">StockFlow Platform</span>
        </div>
      </motion.div>

      {/* ── KPI Section ─────────────────────────────────────────── */}
      <motion.div variants={pageItemVariants}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Hero: Total Tenants */}
          <div className="sm:col-span-2 lg:col-span-1">
            <HeroStatCard
              label="Total Tenants"
              value={data?.totalTenants ?? 0}
              icon={Building2}
              change={data?.tenantsThisMonth}
              changeLabel="nuevos este mes"
              isLoading={isLoading}
            />
          </div>

          {/* Compact: Usuarios Activos */}
          <CompactStatCard
            label="Usuarios Activos"
            value={data?.activeUsers ?? 0}
            icon={UserCheck}
            change={data?.usersThisMonth}
            color="success"
            delay={0.08}
            isLoading={isLoading}
          />

          {/* Compact: Pendientes — pulsa si hay */}
          <CompactStatCard
            label="Aprobaciones Pendientes"
            value={data?.pendingApprovals ?? 0}
            icon={Clock}
            color="warning"
            delay={0.14}
            urgent={true}
            isLoading={isLoading}
          />

          {/* Compact: Total Usuarios */}
          <CompactStatCard
            label="Total Usuarios"
            value={data?.totalUsers ?? 0}
            icon={Users}
            color="accent"
            delay={0.20}
            isLoading={isLoading}
          />
        </div>
      </motion.div>

      {/* ── Charts ──────────────────────────────────────────────── */}
      <motion.div
        variants={pageItemVariants}
        className="grid gap-4 lg:grid-cols-5"
      >
        {/* Tenant Growth */}
        <div className="lg:col-span-3 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Crecimiento de Tenants
              </h3>
              <p className="mt-0.5 text-xs text-neutral-400">Ultimos 6 meses</p>
            </div>
            {data?.tenantsThisMonth != null && (
              <span className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold",
                (data.tenantsThisMonth ?? 0) >= 0
                  ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                  : "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
              )}>
                <TrendingUp className="h-3 w-3" />
                +{data.tenantsThisMonth} este mes
              </span>
            )}
          </div>
          <div className="mt-5 h-52">
            {isLoading ? (
              <div className="h-full animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.tenantGrowth ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="tenantGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <filter id="lineGlow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(156,163,175,0.1)"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatMonth}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#tenantGrad)"
                      name="Tenants"
                      dot={false}
                      activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                      filter="url(#lineGlow)"
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="lg:col-span-2 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Distribución por Plan
          </h3>
          <p className="mt-0.5 text-xs text-neutral-400">Tenants activos</p>
          <div className="mt-4 h-44">
            {isLoading ? (
              <div className="h-full animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            ) : planData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                Sin datos
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25, duration: 0.5, ease }}
                className="h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                      animationBegin={200}
                      animationDuration={900}
                      animationEasing="ease-out"
                    >
                      {planData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={PLAN_COLORS[entry.name] || "#9ca3af"}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255,255,255,0.96)",
                        border: "1px solid rgba(229,231,235,0.8)",
                        borderRadius: 12,
                        fontSize: 12,
                        color: "#111827",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                      }}
                      formatter={(value, name) => [
                        `${value ?? 0} tenant${value !== 1 ? "s" : ""}`,
                        name ?? "",
                      ] as [string, string]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </div>
          {/* Legend */}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1.5">
            {planData.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.06, duration: 0.25 }}
                className="flex items-center gap-1.5"
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: PLAN_COLORS[item.name] || "#9ca3af" }}
                />
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {item.name}
                  <span className="ml-1 font-medium text-neutral-700 dark:text-neutral-300">
                    ({item.value})
                  </span>
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Pending Approvals ────────────────────────────────────── */}
      <motion.div
        variants={pageItemVariants}
        className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Usuarios Pendientes de Aprobación
                </h3>
                {/* Pulsing dot if there are pending items */}
                <AnimatePresence>
                  {(data?.pendingApprovals ?? 0) > 0 && (
                    <motion.span
                      key="pending-dot"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="relative flex h-2.5 w-2.5"
                    >
                      <motion.span
                        animate={{ scale: [1, 2, 1], opacity: [0.8, 0, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inline-flex h-full w-full rounded-full bg-warning-400"
                      />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warning-500" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <p className="mt-0.5 text-xs text-neutral-400">
                Registros que requieren aprobación manual
              </p>
            </div>
          </div>
          <Link to="/system-admin/users?status=PENDING">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              Ver todos
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Rows */}
        <div>
          {isLoading ? (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
                    <div>
                      <div className="h-3.5 w-28 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                      <div className="mt-1.5 h-3 w-36 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                    </div>
                  </div>
                  <div className="h-8 w-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
                </div>
              ))}
            </div>
          ) : pendingUsers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-5 py-14 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success-50 dark:bg-success-500/10">
                <UserCheck className="h-6 w-6 text-success-500" />
              </div>
              <p className="mt-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Todo al dia
              </p>
              <p className="mt-0.5 text-xs text-neutral-400">
                No hay usuarios pendientes de aprobación
              </p>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {pendingUsers.map((user, i) => {
                const isApproving = approvingId === user.id;
                const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
                const hueOffset = user.id.charCodeAt(0) % 6;
                const avatarColors = [
                  "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400",
                  "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400",
                  "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
                  "bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400",
                  "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
                  "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
                ];

                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, scale: 0.97, marginBottom: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3, ease }}
                    className="group flex items-center justify-between border-b border-neutral-100 px-5 py-3.5 last:border-0 transition-colors hover:bg-neutral-50/80 dark:border-neutral-800 dark:hover:bg-neutral-800/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
                        avatarColors[hueOffset],
                      )}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="truncate text-xs text-neutral-400">
                          {user.email}
                          <span className="mx-1.5 text-neutral-300 dark:text-neutral-700">·</span>
                          <span className="text-neutral-500 dark:text-neutral-400">{user.tenantName}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden text-[11px] tabular-nums text-neutral-400 sm:block">
                        {new Date(user.createdAt).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleApprove(user.id)}
                        disabled={isApproving}
                        className="min-w-[80px]"
                      >
                        {isApproving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Aprobar"
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
