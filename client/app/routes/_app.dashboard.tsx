import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  Package,
  FileText,
  Users,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Plus,
  UserPlus,
  FileBarChart,
  Download,
  Image as ImageIcon,
  Eye,
  MoreVertical,
  ShoppingCart,
  Clock,
  Activity,
  TrendingUp,
  Sparkles,
  ChevronRight,
} from "lucide-react";
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
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Link } from "react-router";
import type { Route } from "./+types/_app.dashboard";
import {
  cn,
  formatCurrency,
  formatCompactNumber,
  formatDate,
  formatRelativeTime,
} from "~/lib/utils";
import { useDashboard } from "~/hooks/useDashboard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDivider,
} from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { StatCard } from "~/components/ui/StatCard";
import { Badge, StatusBadge } from "~/components/ui/Badge";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/Alert";
import { useAuthStore } from "~/stores/auth.store";
import { usePermissions } from "~/hooks/usePermissions";
import type { ActivityType } from "~/services/dashboard.service";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Dashboard - StockFlow" },
    { name: "description", content: "Panel de control de StockFlow" },
  ];
};

// Date range options
const dateRangeOptions = [
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "30d", label: "Ultimos 30 dias" },
  { value: "90d", label: "Ultimos 90 dias" },
  { value: "1y", label: "Ultimo ano" },
] as const;

// Activity type configurations with new color scheme
const activityTypeConfig: Record<
  ActivityType,
  { icon: typeof ShoppingCart; color: string; bgColor: string }
> = {
  sale: {
    icon: ShoppingCart,
    color: "text-success-600 dark:text-success-400",
    bgColor:
      "bg-gradient-to-br from-success-500/20 to-success-600/10 dark:from-success-500/20 dark:to-success-900/30",
  },
  product: {
    icon: Package,
    color: "text-primary-600 dark:text-primary-400",
    bgColor:
      "bg-gradient-to-br from-primary-500/20 to-primary-600/10 dark:from-primary-500/20 dark:to-primary-900/30",
  },
  customer: {
    icon: UserPlus,
    color: "text-accent-600 dark:text-accent-400",
    bgColor:
      "bg-gradient-to-br from-accent-500/20 to-accent-600/10 dark:from-accent-500/20 dark:to-accent-900/30",
  },
  invoice: {
    icon: FileText,
    color: "text-warning-600 dark:text-warning-400",
    bgColor:
      "bg-gradient-to-br from-warning-500/20 to-warning-600/10 dark:from-warning-500/20 dark:to-warning-900/30",
  },
  stock: {
    icon: AlertTriangle,
    color: "text-error-600 dark:text-error-400",
    bgColor:
      "bg-gradient-to-br from-error-500/20 to-error-600/10 dark:from-error-500/20 dark:to-error-900/30",
  },
};

// Custom Tooltip for charts
interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-xl border border-neutral-200/60 dark:border-neutral-700/60 rounded-xl shadow-xl p-3">
        <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">
          {formatDate(label || "")}
        </p>
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <p
            key={index}
            className="text-sm flex items-center gap-2"
            style={{ color: entry.color }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}:{" "}
            <span className="font-semibold">
              {entry.name === "Ventas" || entry.name === "Periodo Anterior"
                ? formatCurrency(entry.value)
                : entry.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// Shimmer skeleton component
function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-neutral-200 dark:bg-neutral-800 rounded-2xl",
        className,
      )}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/10 animate-shimmer" />
    </div>
  );
}

// Export helper functions
function exportToCSV<T extends object>(data: T[], filename: string) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) =>
          JSON.stringify((row as Record<string, unknown>)[header] ?? ""),
        )
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportChartToPNG(chartId: string, filename: string) {
  const chartElement = document.getElementById(chartId);
  if (!chartElement) return;

  const svgElement = chartElement.querySelector("svg");
  if (!svgElement) return;

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();

  img.onload = () => {
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  img.src =
    "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
}

// Quick Action Card component
function QuickActionCard({
  to,
  icon: Icon,
  label,
  description,
  gradient,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  gradient: string;
}) {
  return (
    <Link to={to}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative overflow-hidden rounded-2xl p-4 h-full",
          "bg-gradient-to-br shadow-lg transition-shadow hover:shadow-xl",
          gradient,
        )}
      >
        <div className="relative z-10 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">{label}</p>
            <p className="text-sm text-white/80">{description}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/60" />
        </div>
        {/* Decorative elements */}
        <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/5" />
      </motion.div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { canCreateProducts, canViewReports } = usePermissions();

  const [dateRange, setDateRange] = useState<string>("30d");
  const days = parseInt(dateRange) || 30;

  const {
    stats,
    charts,
    recentInvoices,
    lowStockAlerts,
    recentActivity,
    isLoading,
    refetch,
  } = useDashboard(days);

  const userName = user?.firstName || "Usuario";

  // Memoized export handlers
  const handleExportSalesCSV = useCallback(() => {
    if (charts?.salesChart) {
      exportToCSV(charts.salesChart, "ventas-dashboard");
    }
  }, [charts?.salesChart]);

  const handleExportSalesPNG = useCallback(() => {
    exportChartToPNG("sales-chart", "ventas-dashboard");
  }, []);

  const handleExportProductsCSV = useCallback(() => {
    if (charts?.topProducts) {
      exportToCSV(charts.topProducts, "productos-mas-vendidos");
    }
  }, [charts?.topProducts]);

  const handleExportProductsPNG = useCallback(() => {
    exportChartToPNG("products-chart", "productos-mas-vendidos");
  }, []);

  // Calculate alerts
  const hasAlerts =
    (lowStockAlerts?.length ?? 0) > 0 || (stats?.overdueInvoicesCount ?? 0) > 0;

  // Loading skeleton with shimmer effect
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <ShimmerSkeleton className="h-8 w-48" />
            <ShimmerSkeleton className="h-4 w-64" />
          </div>
          <ShimmerSkeleton className="h-10 w-32" />
        </div>

        {/* Quick actions skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <ShimmerSkeleton key={i} className="h-24" />
          ))}
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <ShimmerSkeleton key={i} className="h-36" />
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ShimmerSkeleton className="lg:col-span-2 h-80" />
          <ShimmerSkeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      {/* Header with greeting and Date Range Filter */}
      <PageSection
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold font-display bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Hola, {userName}
            </h1>
            <Badge variant="gradient" size="sm">
              <Sparkles className="h-3 w-3 mr-1" />
              Pro
            </Badge>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400">
            Aqui tienes un resumen de tu negocio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-10 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            aria-label="Seleccionar rango de fechas"
          >
            {dateRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="md"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            aria-label="Actualizar datos del dashboard"
          >
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </PageSection>

      {/* Alert Banner */}
      {hasAlerts && (
        <PageSection>
          <Alert variant="warning" className="border-l-4 border-l-warning-500">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-100 dark:bg-warning-900/30 shrink-0">
                <AlertTriangle className="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div className="flex-1">
                <AlertTitle className="text-warning-800 dark:text-warning-200">
                  Requiere atencion
                </AlertTitle>
                <AlertDescription className="text-warning-700 dark:text-warning-300">
                  {(lowStockAlerts?.length ?? 0) > 0 && (
                    <span>
                      <strong>{lowStockAlerts?.length}</strong> producto
                      {(lowStockAlerts?.length ?? 0) !== 1 ? "s" : ""} con stock
                      bajo.{" "}
                    </span>
                  )}
                  {(stats?.overdueInvoicesCount ?? 0) > 0 && (
                    <span>
                      <strong>{stats?.overdueInvoicesCount}</strong> factura
                      {(stats?.overdueInvoicesCount ?? 0) !== 1 ? "s" : ""}{" "}
                      vencida
                      {(stats?.overdueInvoicesCount ?? 0) !== 1 ? "s" : ""}.
                    </span>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        </PageSection>
      )}

      {/* Quick Actions - Gradient Cards (filtered by permissions) */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            to="/invoices/new"
            icon={Plus}
            label="Nueva Factura"
            description="Crear venta rapida"
            gradient="from-primary-600 to-primary-500"
          />
          {canCreateProducts && (
            <QuickActionCard
              to="/products/new"
              icon={Package}
              label="Agregar Producto"
              description="Nuevo al inventario"
              gradient="from-success-600 to-success-500"
            />
          )}
          {canViewReports && (
            <QuickActionCard
              to="/reports"
              icon={FileBarChart}
              label="Generar Reporte"
              description="Analisis detallado"
              gradient="from-accent-600 to-accent-500"
            />
          )}
          <QuickActionCard
            to="/customers/new"
            icon={UserPlus}
            label="Nuevo Cliente"
            description="Agregar contacto"
            gradient="from-warning-600 to-warning-500"
          />
        </div>
      </PageSection>

      {/* Stats Grid - Premium Gradient Cards */}
      <PageSection
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          label="Ventas Totales"
          value={formatCurrency(stats?.totalSales || 0)}
          change={stats?.salesGrowth || 0}
          icon={DollarSign}
          color="primary"
          variant="gradient"
          animate
          animationDelay={0}
        />
        <StatCard
          label="Productos"
          value={formatCompactNumber(stats?.totalProducts || 0)}
          change={stats?.productsGrowth || 0}
          icon={Package}
          color="success"
          variant="gradient"
          animate
          animationDelay={0.1}
        />
        <StatCard
          label="Facturas"
          value={formatCompactNumber(stats?.totalInvoices || 0)}
          change={stats?.invoicesGrowth || 0}
          icon={FileText}
          color="warning"
          variant="gradient"
          animate
          animationDelay={0.2}
        />
        <StatCard
          label="Clientes"
          value={formatCompactNumber(stats?.totalCustomers || 0)}
          change={stats?.customersGrowth || 0}
          icon={Users}
          color="accent"
          variant="gradient"
          animate
          animationDelay={0.3}
        />
      </PageSection>

      {/* Charts Row */}
      <PageSection
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Sales Area Chart */}
        <Card
          variant="elevated"
          padding="none"
          className="lg:col-span-2 overflow-hidden"
        >
          <div className="p-6 pb-0">
            <CardHeader className="flex-row items-center justify-between p-0 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10">
                  <TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <CardTitle>Ventas vs Periodo Anterior</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleExportSalesCSV}
                  aria-label="Exportar datos de ventas como CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleExportSalesPNG}
                  aria-label="Exportar grafico de ventas como imagen"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </div>
          <CardContent className="p-6 pt-0">
            <div className="h-72" id="sales-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts?.salesChart || []}>
                  <defs>
                    <linearGradient
                      id="salesGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E7EB"
                    className="dark:opacity-20"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).getDate().toString()
                    }
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      `${(value / 1000000).toFixed(0)}M`
                    }
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="previousPeriod"
                    name="Periodo Anterior"
                    stroke="#9CA3AF"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="transparent"
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Ventas"
                    stroke="#6366F1"
                    strokeWidth={2.5}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution Pie Chart */}
        <Card variant="elevated" padding="md">
          <CardHeader className="pb-4 flex-row items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/10">
              <Package className="h-5 w-5 text-accent-600 dark:text-accent-400" />
            </div>
            <CardTitle>Por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts?.categoryDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    strokeWidth={0}
                  >
                    {(charts?.categoryDistribution || []).map(
                      (entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ),
                    )}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${value}%`}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(229, 231, 235, 0.6)",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Middle Row - Products Chart and Low Stock Alerts */}
      <PageSection
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Top Products Bar Chart */}
        <Card
          variant="elevated"
          padding="none"
          className="lg:col-span-2 overflow-hidden"
        >
          <div className="p-6 pb-0">
            <CardHeader className="flex-row items-center justify-between p-0 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-success-500/20 to-success-600/10">
                  <Package className="h-5 w-5 text-success-600 dark:text-success-400" />
                </div>
                <CardTitle>Productos mas Vendidos</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleExportProductsCSV}
                  aria-label="Exportar datos de productos como CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleExportProductsPNG}
                  aria-label="Exportar grafico de productos como imagen"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Link
                  to="/products"
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 ml-2"
                >
                  Ver todos <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
          </div>
          <CardContent className="p-6 pt-0">
            <div className="h-64" id="products-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.topProducts || []} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E7EB"
                    className="dark:opacity-20"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(value) =>
                      `${(value / 1000000).toFixed(0)}M`
                    }
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(229, 231, 235, 0.6)",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar
                    dataKey="sales"
                    name="Ventas"
                    fill="#14B8A6"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card variant="elevated" padding="md">
          <CardHeader className="pb-4 flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-warning-500/20 to-warning-600/10">
                <AlertTriangle className="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <CardTitle>Alertas de Stock</CardTitle>
            </div>
            <Badge variant="warning" size="sm">
              {lowStockAlerts?.length || 0}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(lowStockAlerts || []).slice(0, 4).map((alert) => (
                <motion.div
                  key={alert.id}
                  whileHover={{ scale: 1.01 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700/50 transition-colors hover:border-warning-200 dark:hover:border-warning-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {alert.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      SKU: {alert.sku}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-bold text-error-600 dark:text-error-400">
                      {alert.currentStock} uds
                    </p>
                    <p className="text-xs text-neutral-400">
                      Min: {alert.minStock}
                    </p>
                  </div>
                </motion.div>
              ))}
              {(lowStockAlerts?.length || 0) === 0 && (
                <div className="text-center py-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 mx-auto mb-3">
                    <Package className="h-7 w-7 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    No hay alertas de stock
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                    Todo el inventario esta en orden
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Bottom Row - Recent Invoices and Recent Activity */}
      <PageSection
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Recent Invoices Table */}
        <Card
          variant="elevated"
          padding="none"
          className="lg:col-span-2 overflow-hidden"
        >
          <div className="p-6 pb-0">
            <CardHeader className="flex-row items-center justify-between p-0 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10">
                  <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <CardTitle>Facturas Recientes</CardTitle>
              </div>
              <Link
                to="/invoices"
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                Ver todas <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
          </div>
          <CardContent>
            <div className="overflow-x-auto">
              <table
                className="w-full"
                role="table"
                aria-label="Facturas recientes"
              >
                <thead>
                  <tr className="border-y border-neutral-100 dark:border-neutral-800">
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                    >
                      Factura
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                    >
                      Cliente
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                    >
                      Monto
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                    >
                      Estado
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {(recentInvoices || []).map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {invoice.number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-neutral-900 dark:text-white">
                          {invoice.customer}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {formatCurrency(invoice.amount)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge
                          status={
                            invoice.status as
                              | "PAID"
                              | "PENDING"
                              | "OVERDUE"
                              | "CANCELLED"
                          }
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                            aria-label={`Ver factura ${invoice.number}`}
                          >
                            <Eye className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                          </Link>
                          <button
                            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                            aria-label={`Descargar factura ${invoice.number}`}
                          >
                            <Download className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                          </button>
                          <button
                            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                            aria-label={`Mas opciones para factura ${invoice.number}`}
                          >
                            <MoreVertical className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(recentInvoices?.length || 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 mx-auto mb-3">
                          <FileText className="h-7 w-7 text-neutral-400 dark:text-neutral-500" />
                        </div>
                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                          No hay facturas recientes
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                          Crea tu primera factura para comenzar
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card variant="elevated" padding="md">
          <CardHeader className="pb-4 flex-row items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/10">
              <Activity className="h-5 w-5 text-accent-600 dark:text-accent-400" />
            </div>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(recentActivity || []).slice(0, 5).map((activity, index) => {
                const config = activityTypeConfig[activity.type];
                const IconComponent = config.icon;

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 group"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl shrink-0 transition-transform group-hover:scale-105",
                        config.bgColor,
                      )}
                    >
                      <IconComponent
                        className={cn("h-5 w-5", config.color)}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock
                          className="h-3 w-3 text-neutral-400"
                          aria-hidden="true"
                        />
                        <span className="text-[11px] text-neutral-400">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {(recentActivity?.length || 0) === 0 && (
                <div className="text-center py-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 mx-auto mb-3">
                    <Activity className="h-7 w-7 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    No hay actividad reciente
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                    La actividad aparecera aqui
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
