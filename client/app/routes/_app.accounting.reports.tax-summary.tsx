import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  Calculator,
  Receipt,
  FileText,
  ArrowRight,
} from "lucide-react";
import type { Route } from "./+types/_app.accounting.reports.tax-summary";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency } from "~/lib/utils";
import {
  useIvaDeclaration,
  useReteFuenteSummary,
  useYtdTaxSummary,
} from "~/hooks/useAccountingReports";
import { Button } from "~/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "~/components/ui/Card";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Resumen Tributario - StockFlow" },
    { name: "description", content: "Resumen de posicion fiscal y acumulados del año" },
  ];
};

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-indexed
const currentPeriod = Math.floor(currentMonth / 2) + 1;
const currentMonthNum = currentMonth + 1;

const BIMONTHLY_LABELS: Record<number, string> = {
  1: "Ene - Feb",
  2: "Mar - Abr",
  3: "May - Jun",
  4: "Jul - Ago",
  5: "Sep - Oct",
  6: "Nov - Dic",
};

const MONTH_LABELS: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

function StatCard({
  label,
  value,
  color = "neutral",
}: {
  label: string;
  value: number;
  color?: "neutral" | "success" | "error";
}) {
  const colorClasses = {
    neutral: "text-neutral-900 dark:text-white",
    success: "text-success-600 dark:text-success-400",
    error: "text-error-600 dark:text-error-400",
  };

  return (
    <div>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p
        className={`text-xl font-bold mt-1 tabular-nums ${colorClasses[color]}`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

export default function TaxSummaryPage() {
  const [year] = useState(currentYear);

  const { data: ivaData, isLoading: ivaLoading } = useIvaDeclaration(
    year,
    currentPeriod,
  );
  const { data: reteData, isLoading: reteLoading } = useReteFuenteSummary(
    year,
    currentMonthNum,
  );
  const { data: ytdData, isLoading: ytdLoading } = useYtdTaxSummary(year);

  const isLoading = ivaLoading || reteLoading || ytdLoading;

  return (
    <PageWrapper>
      <PageSection className="flex items-center gap-4">
        <Link to="/accounting/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-success-50 text-success-500 dark:bg-success-900/20">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Resumen Tributario
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Posicion fiscal y acumulados del año {year}
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* IVA Current Period */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary-500" />
                <CardTitle className="text-base">
                  IVA Periodo {currentPeriod}
                </CardTitle>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {BIMONTHLY_LABELS[currentPeriod]} {year}
              </p>
            </CardHeader>
            <CardContent>
              {isLoading || !ivaData ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <StatCard
                    label="IVA Generado"
                    value={ivaData.totalIvaGenerado}
                  />
                  <StatCard
                    label="IVA Descontable"
                    value={ivaData.totalIvaDescontable}
                  />
                  <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3">
                    <StatCard
                      label="Neto a Pagar"
                      value={ivaData.netIvaPayable}
                      color={ivaData.netIvaPayable >= 0 ? "error" : "success"}
                    />
                  </div>
                </div>
              )}
              <Link
                to="/accounting/reports/iva-declaration"
                className="mt-4 flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Ver detalle
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          {/* ReteFuente Current Month */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent-500" />
                <CardTitle className="text-base">ReteFuente</CardTitle>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {MONTH_LABELS[currentMonthNum]} {year}
              </p>
            </CardHeader>
            <CardContent>
              {isLoading || !reteData ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <StatCard label="Base Gravable" value={reteData.totalBase} />
                  <StatCard
                    label="Total Retenido"
                    value={reteData.totalWithheld}
                    color="error"
                  />
                  <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3">
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Proveedores
                      </p>
                      <p className="text-xl font-bold text-neutral-900 dark:text-white mt-1 tabular-nums">
                        {reteData.rows.length}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <Link
                to="/accounting/reports/retefuente-summary"
                className="mt-4 flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Ver detalle
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          {/* YTD Summary */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-success-500" />
                <CardTitle className="text-base">
                  Acumulado {year}
                </CardTitle>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Enero - {MONTH_LABELS[currentMonthNum]} {year}
              </p>
            </CardHeader>
            <CardContent>
              {isLoading || !ytdData ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <StatCard
                    label="IVA Generado YTD"
                    value={ytdData.ivaGeneradoYtd}
                  />
                  <StatCard
                    label="IVA Descontable YTD"
                    value={ytdData.ivaDescontableYtd}
                  />
                  <StatCard
                    label="IVA Neto YTD"
                    value={ytdData.netIvaYtd}
                    color={ytdData.netIvaYtd >= 0 ? "error" : "success"}
                  />
                  <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3">
                    <StatCard
                      label="ReteFuente Retenida YTD"
                      value={ytdData.reteFuenteWithheldYtd}
                      color="error"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageSection>
    </PageWrapper>
  );
}
