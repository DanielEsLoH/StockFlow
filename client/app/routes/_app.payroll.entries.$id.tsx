import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Pencil,
  Save,
  X,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Calculator,
  CheckCircle,
  Send,
  FileCheck,
  XCircle,
  Shield,
  Plus,
  Trash2,
  Loader2,
  User,
  Briefcase,
} from "lucide-react";
import type { Route } from "./+types/_app.payroll.entries.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency, formatDate } from "~/lib/utils";
import { usePayrollEntry, useUpdatePayrollEntry } from "~/hooks/usePayroll";
import {
  PayrollEntryStatusLabels,
  PayrollEntryStatusVariants,
  ContractTypeLabels,
  SalaryTypeLabels,
  ARLRiskLevelLabels,
  OvertimeTypeLabels,
} from "~/types/payroll";
import type {
  PayrollEntryStatus,
  OvertimeDetail,
  OvertimeType,
} from "~/types/payroll";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";

export const meta: Route.MetaFunction = () => [
  { title: "Entrada de Nomina - StockFlow" },
  { name: "description", content: "Detalle de la entrada de nomina" },
];

const OVERTIME_TYPES: OvertimeType[] = [
  "HED",
  "HEN",
  "HDD",
  "HDN",
  "HEDDF",
  "HENDF",
];

function EntryStatusBadge({
  status,
  size = "md",
}: {
  status: PayrollEntryStatus;
  size?: "sm" | "md" | "lg";
}) {
  const iconMap: Record<PayrollEntryStatus, React.ReactNode> = {
    DRAFT: <Pencil className="h-3 w-3" />,
    CALCULATED: <Calculator className="h-3 w-3" />,
    APPROVED: <CheckCircle className="h-3 w-3" />,
    SENT: <Send className="h-3 w-3" />,
    ACCEPTED: <FileCheck className="h-3 w-3" />,
    REJECTED: <XCircle className="h-3 w-3" />,
  };

  return (
    <Badge
      variant={PayrollEntryStatusVariants[status]}
      size={size}
      icon={iconMap[status]}
    >
      {PayrollEntryStatusLabels[status]}
    </Badge>
  );
}

function CurrencyRow({
  label,
  amount,
  bold,
  highlight,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  highlight?: "success" | "error";
}) {
  if (!bold && amount === 0) return null;
  return (
    <div className="flex items-center justify-between py-1.5">
      <span
        className={
          bold
            ? "font-semibold text-neutral-900 dark:text-white"
            : "text-sm text-neutral-600 dark:text-neutral-400"
        }
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${
          bold
            ? "font-bold text-neutral-900 dark:text-white"
            : "font-medium text-neutral-900 dark:text-white"
        } ${highlight === "success" ? "text-success-600 dark:text-success-400" : ""} ${
          highlight === "error" ? "text-error-600 dark:text-error-400" : ""
        }`}
      >
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <span className="text-sm font-medium text-neutral-900 dark:text-white">
        {value || "—"}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PayrollEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = usePermissions();
  const { data: entry, isLoading, isError } = usePayrollEntry(id!);
  const updateEntry = useUpdatePayrollEntry();

  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [daysWorked, setDaysWorked] = useState(0);
  const [overtime, setOvertime] = useState<OvertimeDetail[]>([]);
  const [bonificaciones, setBonificaciones] = useState(0);
  const [comisiones, setComisiones] = useState(0);
  const [viaticos, setViaticos] = useState(0);
  const [incapacidadDias, setIncapacidadDias] = useState(0);
  const [licenciaDias, setLicenciaDias] = useState(0);
  const [vacacionesDias, setVacacionesDias] = useState(0);
  const [sindicato, setSindicato] = useState(0);
  const [libranzas, setLibranzas] = useState(0);
  const [otrasDeducciones, setOtrasDeducciones] = useState(0);
  const [otrosDevengados, setOtrosDevengados] = useState(0);

  const canEdit =
    hasPermission(Permission.PAYROLL_EDIT) &&
    entry &&
    (entry.status === "DRAFT" || entry.status === "CALCULATED");

  const startEditing = () => {
    if (!entry) return;
    setDaysWorked(entry.daysWorked);
    setOvertime(entry.overtimeDetails || []);
    setBonificaciones(entry.bonificaciones);
    setComisiones(entry.comisiones);
    setViaticos(entry.viaticos);
    setIncapacidadDias(0);
    setLicenciaDias(0);
    setVacacionesDias(0);
    setSindicato(entry.sindicato);
    setLibranzas(entry.libranzas);
    setOtrasDeducciones(entry.otrasDeducciones);
    setOtrosDevengados(entry.otrosDevengados);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!id) return;
    updateEntry.mutate(
      {
        id,
        data: {
          daysWorked,
          overtimeDetails: overtime.length > 0 ? overtime : undefined,
          bonificaciones,
          comisiones,
          viaticos,
          incapacidadDias: incapacidadDias > 0 ? incapacidadDias : undefined,
          licenciaDias: licenciaDias > 0 ? licenciaDias : undefined,
          vacacionesDias: vacacionesDias > 0 ? vacacionesDias : undefined,
          sindicato,
          libranzas,
          otrasDeducciones,
          otrosDevengados,
        },
      },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const addOvertime = () => {
    setOvertime([...overtime, { type: "HED" as OvertimeType, hours: 1 }]);
  };

  const removeOvertime = (index: number) => {
    setOvertime(overtime.filter((_, i) => i !== index));
  };

  const updateOvertimeType = (index: number, type: OvertimeType) => {
    const updated = [...overtime];
    updated[index] = { ...updated[index], type };
    setOvertime(updated);
  };

  const updateOvertimeHours = (index: number, hours: number) => {
    const updated = [...overtime];
    updated[index] = { ...updated[index], hours };
    setOvertime(updated);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !entry) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Briefcase className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Entrada de nomina no encontrada
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          La entrada que buscas no existe o fue eliminada.
        </p>
        <Link to="/payroll/periods">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a periodos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Link to={`/payroll/periods/${entry.periodId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                  {entry.employee?.name || "Empleado"}
                </h1>
                <EntryStatusBadge status={entry.status} size="lg" />
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                <span>
                  {entry.employee?.documentType} {entry.employee?.documentNumber}
                </span>
                <span className="text-neutral-300 dark:text-neutral-600">|</span>
                <span className="font-mono">#{entry.entryNumber}</span>
                {entry.periodName && (
                  <>
                    <span className="text-neutral-300 dark:text-neutral-600">|</span>
                    <span>{entry.periodName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 ml-14 sm:ml-0">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={updateEntry.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={updateEntry.isPending}
                >
                  {updateEntry.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar
                </Button>
              </>
            ) : (
              canEdit && (
                <Button variant="outline" onClick={startEditing}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )
            )}
          </div>
        </div>
      </PageSection>

      {/* Stats Cards */}
      <PageSection>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="soft-primary" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20">
                <DollarSign className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
                  {formatCurrency(entry.baseSalary)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Salario Base
                </p>
              </div>
            </div>
          </Card>
          <Card variant="soft-success" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-500/20">
                <Calendar className="h-5 w-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {entry.daysWorked}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Dias Trabajados
                </p>
              </div>
            </div>
          </Card>
          <Card variant="soft-success" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-500/20">
                <TrendingUp className="h-5 w-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
                  {formatCurrency(entry.totalDevengados)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Total Devengados
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-500/20">
                <DollarSign className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
                  {formatCurrency(entry.totalNeto)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Neto a Pagar
                </p>
              </div>
            </div>
          </Card>
        </div>
      </PageSection>

      {/* Employee Info + DIAN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary-500" />
                Informacion del Empleado
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-neutral-200 dark:divide-neutral-700">
              <InfoRow
                label="Tipo de Contrato"
                value={
                  entry.employee?.contractType
                    ? ContractTypeLabels[entry.employee.contractType]
                    : null
                }
              />
              <InfoRow
                label="Tipo de Salario"
                value={
                  entry.employee?.salaryType
                    ? SalaryTypeLabels[entry.employee.salaryType]
                    : null
                }
              />
              <InfoRow
                label="Nivel de Riesgo ARL"
                value={
                  entry.employee?.arlRiskLevel
                    ? ARLRiskLevelLabels[entry.employee.arlRiskLevel]
                    : null
                }
              />
              <InfoRow label="EPS" value={entry.employee?.epsName || null} />
              <InfoRow label="AFP" value={entry.employee?.afpName || null} />
              <InfoRow
                label="Caja de Compensacion"
                value={entry.employee?.cajaName || null}
              />
              <div className="pt-2">
                <Link to={`/payroll/employees/${entry.employeeId}`}>
                  <Button variant="ghost" size="sm" className="w-full">
                    Ver perfil del empleado
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* DIAN Section */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary-500" />
                Estado DIAN
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {entry.cune || entry.dianStatus ? (
                <>
                  <InfoRow label="Estado" value={entry.dianStatus} />
                  {entry.cune && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        CUNE
                      </span>
                      <span className="text-xs font-mono text-neutral-900 dark:text-white max-w-[200px] truncate">
                        {entry.cune}
                      </span>
                    </div>
                  )}
                  <InfoRow
                    label="Enviado"
                    value={entry.sentAt ? formatDate(entry.sentAt) : null}
                  />
                  <InfoRow
                    label="Aceptado"
                    value={entry.acceptedAt ? formatDate(entry.acceptedAt) : null}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center py-8 text-neutral-400 dark:text-neutral-500">
                  <Shield className="h-10 w-10 mb-2" />
                  <p className="text-sm">Sin envio a DIAN</p>
                </div>
              )}
            </CardContent>
          </Card>
        </PageSection>
      </div>

      {/* Devengados */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success-500" />
              Devengados (Ingresos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                {/* Days worked */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Dias Trabajados
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={daysWorked}
                      onChange={(e) => setDaysWorked(Number(e.target.value))}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* Overtime */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Horas Extras
                    </label>
                    <button
                      type="button"
                      onClick={addOvertime}
                      className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar
                    </button>
                  </div>
                  {overtime.map((ot, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <select
                        value={ot.type}
                        onChange={(e) =>
                          updateOvertimeType(i, e.target.value as OvertimeType)
                        }
                        className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                      >
                        {OVERTIME_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {OvertimeTypeLabels[t]}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={ot.hours}
                        onChange={(e) =>
                          updateOvertimeHours(i, Number(e.target.value))
                        }
                        className="w-24 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                        placeholder="Horas"
                      />
                      <button
                        type="button"
                        onClick={() => removeOvertime(i)}
                        className="p-2 text-neutral-400 hover:text-error-500 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Currency fields */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: "Bonificaciones",
                      value: bonificaciones,
                      set: setBonificaciones,
                    },
                    {
                      label: "Comisiones",
                      value: comisiones,
                      set: setComisiones,
                    },
                    {
                      label: "Viaticos",
                      value: viaticos,
                      set: setViaticos,
                    },
                    {
                      label: "Otros Devengados",
                      value: otrosDevengados,
                      set: setOtrosDevengados,
                    },
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        {label}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={value}
                        onChange={(e) => set(Number(e.target.value))}
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                      />
                    </div>
                  ))}
                </div>

                {/* Day fields */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: "Dias Incapacidad",
                      value: incapacidadDias,
                      set: setIncapacidadDias,
                    },
                    {
                      label: "Dias Licencia",
                      value: licenciaDias,
                      set: setLicenciaDias,
                    },
                    {
                      label: "Dias Vacaciones",
                      value: vacacionesDias,
                      set: setVacacionesDias,
                    },
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        {label}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={value}
                        onChange={(e) => set(Number(e.target.value))}
                        placeholder="0"
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white dark:placeholder:text-neutral-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                <CurrencyRow label="Sueldo" amount={entry.sueldo} />
                <CurrencyRow
                  label="Auxilio de Transporte"
                  amount={entry.auxilioTransporte}
                />
                <CurrencyRow label="Horas Extras" amount={entry.horasExtras} />
                {entry.overtimeDetails &&
                  entry.overtimeDetails.length > 0 &&
                  entry.overtimeDetails.map((ot, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1 pl-4"
                    >
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">
                        {OvertimeTypeLabels[ot.type]} — {ot.hours}h
                      </span>
                    </div>
                  ))}
                <CurrencyRow
                  label="Bonificaciones"
                  amount={entry.bonificaciones}
                />
                <CurrencyRow label="Comisiones" amount={entry.comisiones} />
                <CurrencyRow label="Viaticos" amount={entry.viaticos} />
                <CurrencyRow label="Incapacidad" amount={entry.incapacidad} />
                <CurrencyRow label="Licencia" amount={entry.licencia} />
                <CurrencyRow label="Vacaciones" amount={entry.vacaciones} />
                <CurrencyRow
                  label="Otros Devengados"
                  amount={entry.otrosDevengados}
                />
                <div className="pt-2 mt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <CurrencyRow
                    label="TOTAL DEVENGADOS"
                    amount={entry.totalDevengados}
                    bold
                    highlight="success"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>

      {/* Deducciones */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-error-500" />
              Deducciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Salud, pension, fondo de solidaridad y retencion se
                  recalculan automaticamente al guardar.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: "Sindicato",
                      value: sindicato,
                      set: setSindicato,
                    },
                    {
                      label: "Libranzas",
                      value: libranzas,
                      set: setLibranzas,
                    },
                    {
                      label: "Otras Deducciones",
                      value: otrasDeducciones,
                      set: setOtrasDeducciones,
                    },
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        {label}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={value}
                        onChange={(e) => set(Number(e.target.value))}
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                <CurrencyRow
                  label="Salud Empleado (4%)"
                  amount={entry.saludEmpleado}
                />
                <CurrencyRow
                  label="Pension Empleado (4%)"
                  amount={entry.pensionEmpleado}
                />
                <CurrencyRow
                  label="Fondo de Solidaridad"
                  amount={entry.fondoSolidaridad}
                />
                <CurrencyRow
                  label="Retencion en la Fuente"
                  amount={entry.retencionFuente}
                />
                <CurrencyRow label="Sindicato" amount={entry.sindicato} />
                <CurrencyRow label="Libranzas" amount={entry.libranzas} />
                <CurrencyRow
                  label="Otras Deducciones"
                  amount={entry.otrasDeducciones}
                />
                <div className="pt-2 mt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <CurrencyRow
                    label="TOTAL DEDUCCIONES"
                    amount={entry.totalDeducciones}
                    bold
                    highlight="error"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>

      {/* Aportes Empleador + Provisiones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-5 w-5 text-primary-500" />
                Aportes Empleador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                Estos valores son informativos y no afectan el neto del
                empleado.
              </p>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                <CurrencyRow
                  label="Salud (8.5%)"
                  amount={entry.saludEmpleador}
                />
                <CurrencyRow
                  label="Pension (12%)"
                  amount={entry.pensionEmpleador}
                />
                <CurrencyRow label="ARL" amount={entry.arlEmpleador} />
                <CurrencyRow
                  label="Caja (4%)"
                  amount={entry.cajaEmpleador}
                />
                <CurrencyRow
                  label="SENA (2%)"
                  amount={entry.senaEmpleador}
                />
                <CurrencyRow
                  label="ICBF (3%)"
                  amount={entry.icbfEmpleador}
                />
              </div>
            </CardContent>
          </Card>
        </PageSection>

        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-primary-500" />
                Provisiones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                Acumulaciones mensuales para prestaciones sociales.
              </p>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                <CurrencyRow
                  label="Prima de Servicios"
                  amount={entry.provisionPrima}
                />
                <CurrencyRow
                  label="Cesantias"
                  amount={entry.provisionCesantias}
                />
                <CurrencyRow
                  label="Intereses sobre Cesantias"
                  amount={entry.provisionIntereses}
                />
                <CurrencyRow
                  label="Vacaciones"
                  amount={entry.provisionVacaciones}
                />
              </div>
            </CardContent>
          </Card>
        </PageSection>
      </div>

      {/* Net Summary */}
      <PageSection>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2 sm:w-72 sm:ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Total Devengados
                </span>
                <span className="font-medium text-success-600 dark:text-success-400 tabular-nums">
                  {formatCurrency(entry.totalDevengados)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Total Deducciones
                </span>
                <span className="font-medium text-error-600 dark:text-error-400 tabular-nums">
                  -{formatCurrency(entry.totalDeducciones)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span className="font-semibold text-neutral-900 dark:text-white">
                  Neto a Pagar
                </span>
                <span className="text-xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">
                  {formatCurrency(entry.totalNeto)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
