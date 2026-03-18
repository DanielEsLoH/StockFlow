import { useState } from "react";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { StatCard } from "~/components/ui/StatCard";
import { Badge } from "~/components/ui/Badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Users from "lucide-react/dist/esm/icons/users";
import UserCheck from "lucide-react/dist/esm/icons/user-check";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import { cn } from "~/lib/utils";
import { usePayrollDashboard } from "~/hooks/usePayroll";

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const STATUS_COLORS: Record<string, { variant: "default" | "primary" | "success" | "secondary"; label: string }> = {
  DRAFT: { variant: "default", label: "Borrador" },
  CALCULATED: { variant: "primary", label: "Calculado" },
  APPROVED: { variant: "success", label: "Aprobado" },
  CLOSED: { variant: "secondary", label: "Cerrado" },
};

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-xl border border-neutral-200/60 dark:border-neutral-700/60 rounded-xl shadow-xl p-3">
        {label && (
          <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">
            {label}
          </p>
        )}
        {payload.map((entry, index) => (
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
            <span className="font-semibold text-neutral-900 dark:text-white">
              {formatCOP(entry.value)}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-neutral-200 dark:bg-neutral-800 rounded-2xl",
        className,
      )}
    >
      <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent dark:via-white/10 animate-shimmer" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <ShimmerSkeleton className="h-8 w-56" />
        <ShimmerSkeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <ShimmerSkeleton key={i} className="h-36" />
        ))}
      </div>
      <ShimmerSkeleton className="h-80" />
      <ShimmerSkeleton className="h-64" />
    </div>
  );
}

export default function PayrollDashboardPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, isLoading } = usePayrollDashboard(year);

  if (isLoading || !data) {
    return <LoadingSkeleton />;
  }

  const chartData = data.monthlyTotals.map((m: { month: number; earnings: number; deductions: number; netPay: number }) => ({
    name: MONTH_NAMES[m.month - 1],
    Devengos: m.earnings,
    Deducciones: m.deductions,
    "Neto a pagar": m.netPay,
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <PageWrapper title="Nomina" description="Resumen general de nomina">
      {/* Year selector */}
      <PageSection className="flex items-center justify-end">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-10 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          aria-label="Seleccionar ano"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </PageSection>

      {/* Summary cards */}
      <PageSection className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Empleados Activos"
          value={data.activeEmployees}
          icon={UserCheck}
          color="success"
          variant="gradient"
          animate
          animationDelay={0}
        />
        <StatCard
          label="Total Empleados"
          value={data.totalEmployees}
          icon={Users}
          color="primary"
          variant="gradient"
          animate
          animationDelay={0.1}
        />
        <StatCard
          label="Periodos Procesados"
          value={`${data.approvedPeriods}/${data.periodsCount}`}
          icon={Calendar}
          color="accent"
          variant="gradient"
          animate
          animationDelay={0.2}
        />
        <StatCard
          label="Promedio de Nomina"
          value={formatCOP(data.averagePayroll)}
          icon={DollarSign}
          color="warning"
          variant="gradient"
          animate
          animationDelay={0.3}
        />
      </PageSection>

      {/* Monthly chart */}
      <PageSection>
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="p-6 pb-0">
            <CardHeader className="flex-row items-center gap-3 p-0 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary-500/20 to-primary-600/10">
                <DollarSign className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <CardTitle>Devengos vs Deducciones vs Neto - {year}</CardTitle>
            </CardHeader>
          </div>
          <CardContent className="p-6 pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E7EB"
                    className="dark:opacity-20"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar dataKey="Devengos" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Deducciones" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Neto a pagar" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Recent periods */}
      <PageSection>
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="p-6 pb-0">
            <CardHeader className="flex-row items-center gap-3 p-0 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-accent-500/20 to-accent-600/10">
                <Calendar className="h-5 w-5 text-accent-600 dark:text-accent-400" />
              </div>
              <CardTitle>Periodos Recientes</CardTitle>
            </CardHeader>
          </div>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label="Periodos recientes de nomina">
                <thead>
                  <tr className="border-y border-neutral-100 dark:border-neutral-800">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Periodo</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Fechas</th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Empleados</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {data.recentPeriods.map((period: { id: string; name: string; status: string; startDate: string; endDate: string; entriesCount: number }) => {
                    const statusCfg = STATUS_COLORS[period.status] || STATUS_COLORS.DRAFT;
                    return (
                      <tr
                        key={period.id}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                      >
                        <td className="px-4 py-4 text-sm font-medium text-neutral-900 dark:text-white">
                          {period.name}
                        </td>
                        <td className="px-4 py-4 text-sm text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                          {new Date(period.startDate).toLocaleDateString("es-CO")} -{" "}
                          {new Date(period.endDate).toLocaleDateString("es-CO")}
                        </td>
                        <td className="px-4 py-4 text-sm text-neutral-600 dark:text-neutral-300 text-center">
                          {period.entriesCount}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={statusCfg.variant} size="sm">
                            {statusCfg.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {data.recentPeriods.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 mx-auto mb-3">
                          <Calendar className="h-7 w-7 text-neutral-400 dark:text-neutral-500" />
                        </div>
                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                          No hay periodos registrados
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                          Los periodos de nomina apareceran aqui
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
