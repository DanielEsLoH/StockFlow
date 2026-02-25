import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  Target,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import type { Route } from "./+types/_app.accounting.reports.cost-center-balance";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { accountingService } from "~/services/accounting.service";
import { reportsService } from "~/services/reports.service";
import { useCostCenterOptions } from "~/hooks/useCostCenters";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Select } from "~/components/ui/Select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "~/components/ui/Card";
import { toast } from "~/components/ui/Toast";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Balance por Centro de Costo - StockFlow" },
    {
      name: "description",
      content: "Saldos agrupados por centro de costo",
    },
  ];
};

export default function CostCenterBalancePage() {
  const today = new Date().toISOString().split("T")[0];
  const firstDayOfMonth = `${today.slice(0, 7)}-01`;

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(today);
  const [costCenterId, setCostCenterId] = useState("");
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);

  const { data: rawCostCenterOptions = [] } = useCostCenterOptions();

  const selectOptions = [
    { value: "", label: "Todos" },
    ...rawCostCenterOptions.map((cc) => ({
      value: cc.id,
      label: `${cc.code} - ${cc.name}`,
    })),
  ];

  const canDownload = !!fromDate && !!toDate;

  async function handleDownload(format: "pdf" | "excel") {
    if (!canDownload) return;

    setDownloading(format);
    try {
      const { blob, fileName } =
        await accountingService.downloadCostCenterBalanceReport(
          fromDate,
          toDate,
          format,
          costCenterId || undefined,
        );
      reportsService.downloadReport(blob, fileName);
      toast.success(
        `Reporte descargado: ${fileName}`,
      );
    } catch {
      toast.error("Error al generar el reporte. Intenta de nuevo.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <PageWrapper>
      <PageSection className="flex items-center gap-4">
        <Link to="/accounting/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-50 text-accent-500 dark:bg-accent-900/20">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Balance por Centro de Costo
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Saldos agrupados por centro de costo en un periodo
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-end gap-4">
                <div className="space-y-2 w-full sm:w-auto">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Desde
                  </label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2 w-full sm:w-auto">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Hasta
                  </label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2 w-full sm:w-64">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Centro de Costo
                  </label>
                  <Select
                    value={costCenterId}
                    onChange={(val) => setCostCenterId(val)}
                    options={selectOptions}
                    placeholder="Todos"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection>
        <Card>
          <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
            <CardTitle>Descargar Reporte</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              Selecciona el formato del reporte. Incluye los saldos de todas las
              cuentas agrupados por centro de costo para el periodo seleccionado.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                leftIcon={<FileText className="h-4 w-4" />}
                onClick={() => handleDownload("pdf")}
                disabled={!canDownload || downloading !== null}
                isLoading={downloading === "pdf"}
              >
                Descargar PDF
              </Button>
              <Button
                variant="outline"
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                onClick={() => handleDownload("excel")}
                disabled={!canDownload || downloading !== null}
                isLoading={downloading === "excel"}
              >
                Descargar Excel
              </Button>
            </div>
            {!canDownload && (
              <p className="mt-3 text-xs text-warning-600 dark:text-warning-400">
                Selecciona las fechas para poder descargar el reporte.
              </p>
            )}
          </CardContent>
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
