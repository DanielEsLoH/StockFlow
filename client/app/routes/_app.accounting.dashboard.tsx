import { useState } from "react";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
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
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import ListTree from "lucide-react/dist/esm/icons/list-tree";
import ArrowDownLeft from "lucide-react/dist/esm/icons/arrow-down-left";
import ArrowUpRight from "lucide-react/dist/esm/icons/arrow-up-right";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import { cn } from "~/lib/utils";
import { useAccountingDashboard } from "~/hooks/useAccountingReports";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

interface ChartTooltipPayload {
  color: string;
  name: string;
  value: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-xl border border-neutral-200/60 dark:border-neutral-700/60 rounded-xl shadow-xl p-3">
      <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">
        {label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm flex items-center gap-2" style={{ color: entry.color }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}:{" "}
          <span className="font-semibold">{formatCOP(entry.value)}</span>
        </p>
      ))}
    </div>
  );
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
        <ShimmerSkeleton className="h-8 w-64" />
        <ShimmerSkeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <ShimmerSkeleton key={i} className="h-28" />
        ))}
      </div>
      <ShimmerSkeleton className="h-80" />
      <ShimmerSkeleton className="h-64" />
    </div>
  );
}

export default function AccountingDashboardPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = useAccountingDashboard(year);

  if (isLoading) return <LoadingSkeleton />;

  const chartData = (data?.monthlyEntries ?? []).map((m: { month: number; debits: number; credits: number }) => ({
    name: MONTH_NAMES[m.month - 1] ?? `${m.month}`,
    Debitos: m.debits,
    Creditos: m.credits,
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <PageWrapper
      title="Dashboard Contable"
      description={`Resumen contable del ano ${year}`}
      actions={
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-10 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          aria-label="Seleccionar ano"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      }
    >
      {/* Summary Cards */}
      <PageSection className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary-500/20 to-primary-600/10">
              <BookOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Asientos contables</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {(data?.entriesCount ?? 0).toLocaleString("es-CO")}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-accent-500/20 to-accent-600/10">
              <ListTree className="h-5 w-5 text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Cuentas PUC</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {(data?.accountsCount ?? 0).toLocaleString("es-CO")}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-success-500/20 to-success-600/10">
              <ArrowUpRight className="h-5 w-5 text-success-600 dark:text-success-400" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Total debitos</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {formatCOP(data?.totals?.debits ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-warning-500/20 to-warning-600/10">
              <ArrowDownLeft className="h-5 w-5 text-warning-600 dark:text-warning-400" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Total creditos</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {formatCOP(data?.totals?.credits ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br",
              data?.totals?.balanced
                ? "from-success-500/20 to-success-600/10"
                : "from-error-500/20 to-error-600/10",
            )}>
              {data?.totals?.balanced ? (
                <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-error-600 dark:text-error-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Estado</p>
              <p className={cn(
                "text-lg font-bold",
                data?.totals?.balanced
                  ? "text-success-600 dark:text-success-400"
                  : "text-error-600 dark:text-error-400",
              )}>
                {data?.totals?.balanced ? "Cuadrado" : "Descuadrado"}
              </p>
            </div>
          </div>
        </Card>
      </PageSection>

      {/* Monthly Chart */}
      <PageSection>
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="p-6 pb-0">
            <CardHeader className="flex-row items-center gap-3 p-0 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary-500/20 to-primary-600/10">
                <BookOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <CardTitle>Debitos vs Creditos Mensuales</CardTitle>
            </CardHeader>
          </div>
          <CardContent className="p-6 pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:opacity-20" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar dataKey="Debitos" name="Debitos" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Creditos" name="Creditos" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Top 10 Accounts Table */}
      <PageSection>
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="p-6 pb-0">
            <CardHeader className="flex-row items-center gap-3 p-0 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-accent-500/20 to-accent-600/10">
                <ListTree className="h-5 w-5 text-accent-600 dark:text-accent-400" />
              </div>
              <CardTitle>Top 10 Cuentas por Movimientos</CardTitle>
            </CardHeader>
          </div>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label="Top 10 cuentas contables">
                <thead>
                  <tr className="border-y border-neutral-100 dark:border-neutral-800">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Codigo</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Nombre</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tipo</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Debitos</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Creditos</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Movimientos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {(data?.topAccounts ?? []).map((account: { accountId: string; code: string; name: string; type: string; totalDebits: number; totalCredits: number; transactionCount: number }) => (
                    <tr key={account.accountId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-primary-600 dark:text-primary-400">{account.code}</td>
                      <td className="px-4 py-3 text-sm text-neutral-900 dark:text-white">{account.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {account.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-neutral-900 dark:text-white">{formatCOP(account.totalDebits)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-neutral-900 dark:text-white">{formatCOP(account.totalCredits)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-neutral-900 dark:text-white">{account.transactionCount.toLocaleString("es-CO")}</td>
                    </tr>
                  ))}
                  {(data?.topAccounts ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay cuentas con movimientos</p>
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
