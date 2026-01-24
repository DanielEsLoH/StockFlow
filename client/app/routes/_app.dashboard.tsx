import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { StatCard } from "~/components/ui/StatCard";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/Alert";
import { useAuthStore } from "~/stores/auth.store";
import type { ActivityType } from "~/services/dashboard.service";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Dashboard - StockFlow" },
    { name: "description", content: "Panel de control de StockFlow" },
  ];
};

// Animation variants - hoisted outside component
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

// Date range options - hoisted outside component
const dateRangeOptions = [
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "30d", label: "Ultimos 30 dias" },
  { value: "90d", label: "Ultimos 90 dias" },
  { value: "1y", label: "Ultimo ano" },
] as const;

// Activity type configurations - hoisted outside component
const activityTypeConfig: Record<
  ActivityType,
  { icon: typeof ShoppingCart; color: string; bgColor: string }
> = {
  sale: {
    icon: ShoppingCart,
    color: "text-success-600",
    bgColor: "bg-success-100 dark:bg-success-900/30",
  },
  product: {
    icon: Package,
    color: "text-primary-600",
    bgColor: "bg-primary-100 dark:bg-primary-900/30",
  },
  customer: {
    icon: UserPlus,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  invoice: {
    icon: FileText,
    color: "text-warning-600",
    bgColor: "bg-warning-100 dark:bg-warning-900/30",
  },
  stock: {
    icon: AlertTriangle,
    color: "text-error-600",
    bgColor: "bg-error-100 dark:bg-error-900/30",
  },
};

// Invoice Status Badge
function InvoiceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
    PENDING:
      "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
    OVERDUE:
      "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
    CANCELLED:
      "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  };

  const labels: Record<string, string> = {
    PAID: "Pagada",
    PENDING: "Pendiente",
    OVERDUE: "Vencida",
    CANCELLED: "Cancelada",
  };

  return (
    <span
      className={cn(
        "px-2 py-1 rounded-full text-xs font-medium",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

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
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
          {formatDate(label || "")}
        </p>
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}:{" "}
            {entry.name === "Ventas" || entry.name === "Periodo Anterior"
              ? formatCurrency(entry.value)
              : entry.value}
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
      <div
        className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent dark:via-white/10 animate-[shimmer_2s_infinite]"
        style={{
          animation: "shimmer 2s infinite",
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const {
    stats,
    charts,
    recentInvoices,
    lowStockAlerts,
    recentActivity,
    isLoading,
    refetch,
  } = useDashboard();

  const [dateRange, setDateRange] = useState<string>("30d");
  const [isMounted, setIsMounted] = useState(false);

  // SSR-safe mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Chart click handler (placeholder for future drill-down)
  const handleChartClick = useCallback(() => {
    // Future: Navigate to detailed view or show modal with drill-down data
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
        <ShimmerSkeleton className="h-20 w-full" />

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <ShimmerSkeleton key={i} className="h-32" />
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ShimmerSkeleton className="lg:col-span-2 h-80" />
          <ShimmerSkeleton className="h-80" />
        </div>

        {/* Bottom row skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ShimmerSkeleton className="lg:col-span-2 h-80" />
          <ShimmerSkeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate={isMounted ? "visible" : "hidden"}
      className="space-y-6"
    >
      {/* Header with Date Range Filter */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Hola, {userName}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Aqui tienes un resumen de tu negocio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            aria-label="Actualizar datos del dashboard"
          >
            Actualizar
          </Button>
        </div>
      </motion.div>

      {/* Alert Banner */}
      {hasAlerts && (
        <motion.div variants={itemVariants}>
          <Alert variant="warning" className="flex items-start gap-3">
            <AlertTriangle
              className="h-5 w-5 text-warning-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="flex-1">
              <AlertTitle>Requiere atencion</AlertTitle>
              <AlertDescription>
                {(lowStockAlerts?.length ?? 0) > 0 && (
                  <span>
                    {lowStockAlerts?.length} producto
                    {(lowStockAlerts?.length ?? 0) !== 1 ? "s" : ""} con stock
                    bajo.{" "}
                  </span>
                )}
                {(stats?.overdueInvoicesCount ?? 0) > 0 && (
                  <span>
                    {stats?.overdueInvoicesCount} factura
                    {(stats?.overdueInvoicesCount ?? 0) !== 1 ? "s" : ""}{" "}
                    vencida{(stats?.overdueInvoicesCount ?? 0) !== 1 ? "s" : ""}
                    .
                  </span>
                )}
              </AlertDescription>
            </div>
          </Alert>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card variant="default" padding="md">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mr-2">
              Acciones rapidas:
            </span>
            <Link to="/invoices/new">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Nueva Factura
              </Button>
            </Link>
            <Link to="/products/new">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Package className="h-4 w-4" />}
              >
                Agregar Producto
              </Button>
            </Link>
            <Link to="/reports">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<FileBarChart className="h-4 w-4" />}
              >
                Generar Reporte
              </Button>
            </Link>
            <Link to="/customers/new">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                Nuevo Cliente
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          label="Ventas Totales"
          value={formatCurrency(stats?.totalSales || 0)}
          change={stats?.salesGrowth || 0}
          icon={DollarSign}
          iconColor="text-primary-600"
          iconBg="bg-primary-100 dark:bg-primary-900/30"
          variant="dashboard"
        />
        <StatCard
          label="Productos"
          value={formatCompactNumber(stats?.totalProducts || 0)}
          change={stats?.productsGrowth || 0}
          icon={Package}
          iconColor="text-success-600"
          iconBg="bg-success-100 dark:bg-success-900/30"
          variant="dashboard"
        />
        <StatCard
          label="Facturas"
          value={formatCompactNumber(stats?.totalInvoices || 0)}
          change={stats?.invoicesGrowth || 0}
          icon={FileText}
          iconColor="text-warning-600"
          iconBg="bg-warning-100 dark:bg-warning-900/30"
          variant="dashboard"
        />
        <StatCard
          label="Clientes"
          value={formatCompactNumber(stats?.totalCustomers || 0)}
          change={stats?.customersGrowth || 0}
          icon={Users}
          iconColor="text-purple-600"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          variant="dashboard"
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Sales Area Chart with Previous Period Comparison */}
        <Card variant="default" padding="md" className="lg:col-span-2">
          <CardHeader className="pb-4 flex-row items-center justify-between">
            <CardTitle>Ventas vs Periodo Anterior</CardTitle>
            <div className="flex items-center gap-2">
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
          <CardContent>
            <div className="h-72" id="sales-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={charts?.salesChart || []}
                  onClick={handleChartClick}
                  style={{ cursor: "pointer" }}
                >
                  <defs>
                    <linearGradient
                      id="salesGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
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
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution Pie Chart */}
        <Card variant="default" padding="md">
          <CardHeader className="pb-4">
            <CardTitle>Distribucion por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts?.categoryDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
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
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
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
      </motion.div>

      {/* Middle Row - Products Chart and Low Stock Alerts */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Top Products Bar Chart */}
        <Card variant="default" padding="md" className="lg:col-span-2">
          <CardHeader className="pb-4 flex-row items-center justify-between">
            <CardTitle>Productos mas Vendidos</CardTitle>
            <div className="flex items-center gap-2">
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
          <CardContent>
            <div className="h-64" id="products-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts?.topProducts || []}
                  layout="vertical"
                  onClick={handleChartClick}
                  style={{ cursor: "pointer" }}
                >
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
                    labelStyle={{ color: "#1F2937" }}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="sales"
                    name="Ventas"
                    fill="#10B981"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card variant="default" padding="md">
          <CardHeader className="pb-4 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="h-5 w-5 text-warning-500"
                aria-hidden="true"
              />
              <CardTitle>Alertas de Stock</CardTitle>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400 font-medium">
              {lowStockAlerts?.length || 0} productos
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(lowStockAlerts || []).slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50"
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
                </div>
              ))}
              {(lowStockAlerts?.length || 0) === 0 && (
                <div className="text-center py-6">
                  <Package
                    className="h-12 w-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-2"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No hay alertas de stock
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Row - Recent Invoices and Recent Activity */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Recent Invoices Table */}
        <Card variant="default" padding="none" className="lg:col-span-2">
          <CardHeader className="p-6 pb-4 flex-row items-center justify-between">
            <CardTitle>Facturas Recientes</CardTitle>
            <Link
              to="/invoices"
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table
                className="w-full"
                role="table"
                aria-label="Facturas recientes"
              >
                <thead>
                  <tr className="border-t border-neutral-100 dark:border-neutral-800">
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                    >
                      Factura
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                    >
                      Cliente
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                    >
                      Monto
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                    >
                      Estado
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                    >
                      Fecha
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
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
                          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
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
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {formatCurrency(invoice.amount)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {formatDate(invoice.date)}
                        </p>
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
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <FileText
                          className="h-12 w-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-3"
                          aria-hidden="true"
                        />
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          No hay facturas recientes
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
        <Card variant="default" padding="md">
          <CardHeader className="pb-4 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity
                className="h-5 w-5 text-primary-500"
                aria-hidden="true"
              />
              <CardTitle>Actividad Reciente</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(recentActivity || []).slice(0, 5).map((activity) => {
                const config = activityTypeConfig[activity.type];
                const IconComponent = config.icon;

                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                        config.bgColor,
                      )}
                    >
                      <IconComponent
                        className={cn("h-4 w-4", config.color)}
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
                      <div className="flex items-center gap-1 mt-1">
                        <Clock
                          className="h-3 w-3 text-neutral-400"
                          aria-hidden="true"
                        />
                        <span className="text-xs text-neutral-400">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(recentActivity?.length || 0) === 0 && (
                <div className="text-center py-6">
                  <Activity
                    className="h-12 w-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-2"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No hay actividad reciente
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
