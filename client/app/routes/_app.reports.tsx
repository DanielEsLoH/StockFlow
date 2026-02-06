import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Package,
  Users,
  Calendar,
  Download,
  FileText,
  Clock,
  ShieldX,
} from "lucide-react";
import type { Route } from "./+types/_app.reports";
import { cn, formatDate, formatFileSize } from "~/lib/utils";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";
import {
  useGenerateSalesReport,
  useGenerateInventoryReport,
  useGenerateCustomersReport,
  useRecentReports,
} from "~/hooks/useReports";
import { useCategories } from "~/hooks/useCategories";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Select } from "~/components/ui/Select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import type { ReportFormat, ReportType, DateRangePreset } from "~/types/report";
import {
  DateRangePresetLabels,
  ReportFormatLabels,
  ReportTypeLabels,
} from "~/types/report";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Reportes - StockFlow" },
    {
      name: "description",
      content: "Genera y descarga reportes de tu negocio",
    },
  ];
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

// Date range preset options for select
const dateRangePresetOptions = [
  { value: "today", label: DateRangePresetLabels.today },
  { value: "last7days", label: DateRangePresetLabels.last7days },
  { value: "last30days", label: DateRangePresetLabels.last30days },
  { value: "thisMonth", label: DateRangePresetLabels.thisMonth },
  { value: "thisYear", label: DateRangePresetLabels.thisYear },
  { value: "custom", label: DateRangePresetLabels.custom },
];

// Format options for radio buttons
const formatOptions: { value: ReportFormat; label: string }[] = [
  { value: "pdf", label: ReportFormatLabels.pdf },
  { value: "excel", label: ReportFormatLabels.excel },
];

// Helper to calculate date range from preset
function getDateRangeFromPreset(preset: DateRangePreset): {
  fromDate: string;
  toDate: string;
} {
  const today = new Date();
  const toDate = today.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { fromDate: toDate, toDate };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      return { fromDate: yesterdayStr, toDate: yesterdayStr };
    }
    case "last7days": {
      const last7days = new Date(today);
      last7days.setDate(last7days.getDate() - 7);
      return { fromDate: last7days.toISOString().split("T")[0], toDate };
    }
    case "last30days": {
      const last30days = new Date(today);
      last30days.setDate(last30days.getDate() - 30);
      return { fromDate: last30days.toISOString().split("T")[0], toDate };
    }
    case "thisMonth": {
      const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      return { fromDate: firstDayOfMonth.toISOString().split("T")[0], toDate };
    }
    case "lastMonth": {
      const firstDayOfLastMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1,
      );
      const lastDayOfLastMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        0,
      );
      return {
        fromDate: firstDayOfLastMonth.toISOString().split("T")[0],
        toDate: lastDayOfLastMonth.toISOString().split("T")[0],
      };
    }
    case "thisYear": {
      const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
      return { fromDate: firstDayOfYear.toISOString().split("T")[0], toDate };
    }
    default:
      return { fromDate: "", toDate: "" };
  }
}

// Format selector component
function FormatSelector({
  value,
  onChange,
}: {
  value: ReportFormat;
  onChange: (format: ReportFormat) => void;
}) {
  return (
    <div className="flex gap-4">
      {formatOptions.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition-colors",
            value === option.value
              ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
              : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800",
          )}
        >
          <input
            type="radio"
            name="format"
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value as ReportFormat)}
            className="sr-only"
          />
          <FileText className="h-4 w-4" />
          <span className="text-sm font-medium">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

// Report type badge
function ReportTypeBadge({ type }: { type: ReportType }) {
  const config: Record<
    ReportType,
    { label: string; variant: "primary" | "success" | "warning" }
  > = {
    sales: { label: ReportTypeLabels.sales, variant: "success" },
    inventory: { label: ReportTypeLabels.inventory, variant: "primary" },
    customers: { label: ReportTypeLabels.customers, variant: "warning" },
  };

  const { label, variant } = config[type];

  return <Badge variant={variant}>{label}</Badge>;
}

// Format badge
function FormatBadge({ format }: { format: ReportFormat }) {
  return (
    <Badge variant={format === "pdf" ? "error" : "success"}>
      {ReportFormatLabels[format].toUpperCase()}
    </Badge>
  );
}

// Sales Report Card Component
function SalesReportCard() {
  const [dateRangePreset, setDateRangePreset] =
    useState<DateRangePreset>("thisMonth");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [format, setFormat] = useState<ReportFormat>("pdf");

  const { data: categories } = useCategories();
  const generateReport = useGenerateSalesReport();

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Todas las categorias" },
      ...(categories || []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const handleGenerate = () => {
    let fromDate: string;
    let toDate: string;

    if (dateRangePreset === "custom") {
      fromDate = customFromDate;
      toDate = customToDate;
    } else {
      const range = getDateRangeFromPreset(dateRangePreset);
      fromDate = range.fromDate;
      toDate = range.toDate;
    }

    if (!fromDate || !toDate) {
      return;
    }

    generateReport.mutate({
      format,
      fromDate,
      toDate,
      categoryId: categoryId || undefined,
    });
  };

  const isCustom = dateRangePreset === "custom";
  const canGenerate = isCustom ? customFromDate && customToDate : true;

  return (
    <Card padding="none" className="flex flex-col">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-success-50 text-success-500 dark:bg-success-900/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Reporte de Ventas</CardTitle>
            <CardDescription>
              Genera un reporte detallado de ventas por periodo
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 flex-1 flex flex-col gap-4">
        {/* Date Range Preset */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Periodo
          </label>
          <Select
            options={dateRangePresetOptions}
            value={dateRangePreset}
            onChange={(value) => setDateRangePreset(value as DateRangePreset)}
          />
        </div>

        {/* Custom Date Range */}
        {isCustom && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Desde
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                <Input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Hasta
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                <Input
                  type="date"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Categoria (opcional)
          </label>
          <Select
            options={categoryOptions}
            value={categoryId}
            onChange={(value) => setCategoryId(value)}
            placeholder="Todas las categorias"
          />
        </div>

        {/* Format Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Formato
          </label>
          <FormatSelector value={format} onChange={setFormat} />
        </div>

        {/* Generate Button */}
        <div className="mt-auto pt-4">
          <Button
            onClick={handleGenerate}
            isLoading={generateReport.isPending}
            disabled={!canGenerate}
            className="w-full"
            leftIcon={<Download className="h-4 w-4" />}
          >
            Generar Reporte
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Inventory Report Card Component
function InventoryReportCard() {
  const [categoryId, setCategoryId] = useState<string>("");
  const [format, setFormat] = useState<ReportFormat>("pdf");

  const { data: categories } = useCategories();
  const generateReport = useGenerateInventoryReport();

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Todas las categorias" },
      ...(categories || []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const handleGenerate = () => {
    generateReport.mutate({
      format,
      categoryId: categoryId || undefined,
    });
  };

  return (
    <Card padding="none" className="flex flex-col">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary-50 text-primary-500 dark:bg-primary-900/20">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Reporte de Inventario</CardTitle>
            <CardDescription>
              Genera un reporte del estado actual del inventario
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 flex-1 flex flex-col gap-4">
        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Categoria (opcional)
          </label>
          <Select
            options={categoryOptions}
            value={categoryId}
            onChange={(value) => setCategoryId(value)}
            placeholder="Todas las categorias"
          />
        </div>

        {/* Format Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Formato
          </label>
          <FormatSelector value={format} onChange={setFormat} />
        </div>

        {/* Generate Button */}
        <div className="mt-auto pt-4">
          <Button
            onClick={handleGenerate}
            isLoading={generateReport.isPending}
            className="w-full"
            leftIcon={<Download className="h-4 w-4" />}
          >
            Generar Reporte
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Customers Report Card Component
function CustomersReportCard() {
  const [format, setFormat] = useState<ReportFormat>("pdf");

  const generateReport = useGenerateCustomersReport();

  const handleGenerate = () => {
    generateReport.mutate({
      format,
    });
  };

  return (
    <Card padding="none" className="flex flex-col">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-warning-50 text-warning-500 dark:bg-warning-900/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Reporte de Clientes</CardTitle>
            <CardDescription>
              Genera un reporte de todos los clientes
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 flex-1 flex flex-col gap-4">
        {/* Format Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Formato
          </label>
          <FormatSelector value={format} onChange={setFormat} />
        </div>

        {/* Generate Button */}
        <div className="mt-auto pt-4">
          <Button
            onClick={handleGenerate}
            isLoading={generateReport.isPending}
            className="w-full"
            leftIcon={<Download className="h-4 w-4" />}
          >
            Generar Reporte
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Recent Reports Table Component
function RecentReportsTable() {
  const { data: recentReports, isLoading, isError } = useRecentReports();

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Formato</TableHead>
            <TableHead className="hidden sm:table-cell">Fecha</TableHead>
            <TableHead className="hidden md:table-cell">Tamano</TableHead>
            <TableHead className="w-[100px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonTableRow key={i} columns={5} />
          ))}
        </TableBody>
      </Table>
    );
  }

  if (isError) {
    return (
      <EmptyState
        type="error"
        title="Error al cargar reportes recientes"
        description="Hubo un problema al cargar los reportes recientes. Por favor, intenta de nuevo."
        action={{
          label: "Reintentar",
          onClick: () => window.location.reload(),
        }}
      />
    );
  }

  if (!recentReports || recentReports.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-16 w-16" />}
        title="No hay reportes recientes"
        description="Los reportes generados apareceran aqui."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Formato</TableHead>
          <TableHead className="hidden sm:table-cell">Fecha</TableHead>
          <TableHead className="hidden md:table-cell">Tamano</TableHead>
          <TableHead className="w-[100px]">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recentReports.map((report) => (
          <TableRow key={report.id}>
            <TableCell>
              <ReportTypeBadge type={report.type} />
            </TableCell>
            <TableCell>
              <FormatBadge format={report.format} />
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                <Clock className="h-3.5 w-3.5 text-neutral-400" />
                {formatDate(report.generatedAt)}
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {report.fileSize ? formatFileSize(report.fileSize) : "-"}
              </span>
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                title="Descargar"
                onClick={() => {
                  // Download functionality to be implemented when backend supports report history downloads
                  if (report.downloadUrl) {
                    window.open(report.downloadUrl, "_blank");
                  }
                }}
                disabled={!report.downloadUrl}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Access Denied component for unauthorized users
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-4 rounded-full bg-error-100 dark:bg-error-900/30 mb-6">
        <ShieldX className="h-12 w-12 text-error-500 dark:text-error-400" />
      </div>
      <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white mb-2">
        Acceso Denegado
      </h1>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
        No tienes permisos para acceder a esta seccion. Si crees que esto es un
        error, contacta a tu administrador.
      </p>
      <a
        href="/dashboard"
        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
      >
        Volver al Dashboard
      </a>
    </div>
  );
}

export default function ReportsPage() {
  const { hasPermission } = usePermissions();

  // Check if user has permission to view reports
  if (!hasPermission(Permission.REPORTS_VIEW)) {
    return <AccessDenied />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
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
            Reportes
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Genera y descarga reportes de tu negocio
          </p>
        </div>
      </motion.div>

      {/* Report Cards Grid */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SalesReportCard />
          <InventoryReportCard />
          <CustomersReportCard />
        </div>
      </motion.div>

      {/* Recent Reports Section */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="border-b border-neutral-200 dark:border-neutral-700">
            <CardTitle>Reportes Recientes</CardTitle>
            <CardDescription>
              Historial de reportes generados recientemente
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <RecentReportsTable />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
