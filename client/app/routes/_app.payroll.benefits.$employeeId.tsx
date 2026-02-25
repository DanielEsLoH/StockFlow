import { useMemo } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Gift,
  DollarSign,
  Calendar,
  Briefcase,
  User,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { Route } from "./+types/_app.payroll.benefits.$employeeId";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatCurrency, formatDate } from "~/lib/utils";
import { useEmployee } from "~/hooks/usePayroll";
import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api";
import { useIsQueryEnabled } from "~/hooks/useIsQueryEnabled";
import {
  EmployeeStatusLabels,
  EmployeeStatusVariants,
  ContractTypeLabels,
  SalaryTypeLabels,
} from "~/types/payroll";
import type { EmployeeStatus } from "~/types/payroll";
import { Button } from "~/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";

// ============================================================================
// META
// ============================================================================

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Prestaciones Sociales - StockFlow" },
    {
      name: "description",
      content: "Vista previa de prestaciones sociales del empleado",
    },
  ];
};

// ============================================================================
// TYPES
// ============================================================================

interface LiquidationBenefitItem {
  concept: string;
  base: number;
  days: number;
  amount: number;
  formula: string;
}

interface AccumulatedProvisions {
  prima: number;
  cesantias: number;
  intereses: number;
  vacaciones: number;
  total: number;
}

interface BenefitsPreview {
  employeeId: string;
  employeeName: string;
  documentNumber: string;
  baseSalary: number;
  auxilioTransporte: number;
  startDate: string;
  endDate: string;
  totalDaysWorked: number;
  salaryType: string;
  benefits: LiquidationBenefitItem[];
  totalBenefits: number;
  accumulatedProvisions: AccumulatedProvisions;
  netPayable: number;
}

// ============================================================================
// HOOKS
// ============================================================================

function useBenefitsPreview(employeeId: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<BenefitsPreview>({
    queryKey: ["payroll", "benefits", "preview", employeeId],
    queryFn: async () => {
      const { data } = await api.get<BenefitsPreview>(
        `/payroll/benefits/preview/${employeeId}`,
      );
      return data;
    },
    staleTime: 1000 * 60 * 2,
    enabled: enabled && !!employeeId,
  });
}

// ============================================================================
// BENEFIT CARD
// ============================================================================

interface BenefitCardProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  monthlyProvision: number;
  accruedTotal: number;
  benefitItem?: LiquidationBenefitItem;
}

function BenefitCard({
  title,
  icon,
  iconColor,
  monthlyProvision,
  accruedTotal,
  benefitItem,
}: BenefitCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2.5 rounded-xl",
                iconColor,
              )}
            >
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                {title}
              </h3>
              {benefitItem && (
                <p className="text-xs text-neutral-400 mt-0.5">
                  {benefitItem.days} dias trabajados
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Monthly provision */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              Provision mensual
            </span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {formatCurrency(monthlyProvision)}
            </span>
          </div>

          {/* Accrued total */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              Acumulado provisiones
            </span>
            <span className="text-sm font-medium text-success-600 dark:text-success-400">
              {formatCurrency(accruedTotal)}
            </span>
          </div>

          {/* Calculated amount */}
          {benefitItem && (
            <>
              <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Valor calculado
                </span>
                <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {formatCurrency(benefitItem.amount)}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                {benefitItem.formula}
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function EmployeeBenefitsPage() {
  const { employeeId } = useParams<{ employeeId: string }>();

  const {
    data: employee,
    isLoading: isLoadingEmployee,
  } = useEmployee(employeeId!);

  const {
    data: preview,
    isLoading: isLoadingPreview,
    isError: isPreviewError,
  } = useBenefitsPreview(employeeId!);

  const isLoading = isLoadingEmployee || isLoadingPreview;

  // Extract individual benefit items from the preview
  const benefitItems = useMemo(() => {
    if (!preview?.benefits) return { prima: undefined, cesantias: undefined, intereses: undefined, vacaciones: undefined };
    return {
      prima: preview.benefits.find((b) => b.concept.toLowerCase().includes("prima")),
      cesantias: preview.benefits.find(
        (b) => b.concept.toLowerCase().includes("cesant") && !b.concept.toLowerCase().includes("interes"),
      ),
      intereses: preview.benefits.find((b) => b.concept.toLowerCase().includes("interes")),
      vacaciones: preview.benefits.find((b) => b.concept.toLowerCase().includes("vacacion")),
    };
  }, [preview]);

  // Estimate monthly provisions from the benefit items
  // Monthly provision ~ calculated_amount / (days / 30)
  const monthlyProvisions = useMemo(() => {
    if (!preview) {
      return { prima: 0, cesantias: 0, intereses: 0, vacaciones: 0 };
    }
    const baseSalary = preview.baseSalary;
    const auxTransporte = preview.auxilioTransporte;
    const benefitBase = baseSalary + auxTransporte;

    return {
      prima: Math.round(benefitBase / 12),
      cesantias: Math.round(benefitBase / 12),
      intereses: Math.round((benefitBase / 12) * 0.01),
      vacaciones: Math.round(baseSalary / 24),
    };
  }, [preview]);

  const isTerminated = employee?.status === "TERMINATED";

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <User className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Empleado no encontrado
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          El empleado que buscas no existe o fue eliminado.
        </p>
        <Link to="/payroll/employees">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a empleados
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
            <Link to={`/payroll/employees/${employeeId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                  Prestaciones Sociales
                </h1>
                <Badge
                  variant={
                    EmployeeStatusVariants[employee.status as EmployeeStatus] || "secondary"
                  }
                  size="lg"
                >
                  {EmployeeStatusLabels[employee.status as EmployeeStatus] || employee.status}
                </Badge>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                {employee.firstName} {employee.lastName} - {employee.documentNumber}
              </p>
            </div>
          </div>
        </div>
      </PageSection>

      {/* Employee Info Card */}
      <PageSection>
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Salario Base
                </p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
                  {formatCurrency(employee.baseSalary)}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Tipo Contrato
                </p>
                <p className="font-medium text-neutral-900 dark:text-white mt-1">
                  {ContractTypeLabels[employee.contractType] || employee.contractType}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Tipo Salario
                </p>
                <p className="font-medium text-neutral-900 dark:text-white mt-1">
                  {SalaryTypeLabels[employee.salaryType as keyof typeof SalaryTypeLabels] || employee.salaryType}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Fecha Ingreso
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="h-4 w-4 text-neutral-400" />
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {formatDate(employee.startDate)}
                  </p>
                </div>
              </div>
            </div>

            {preview && (
              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-neutral-400" />
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Dias trabajados:
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {preview.totalDaysWorked}
                  </span>
                </div>
                {preview.auxilioTransporte > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-neutral-400" />
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Auxilio transporte:
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {formatCurrency(preview.auxilioTransporte)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>

      {/* Integral salary warning */}
      {employee.salaryType === "INTEGRAL" && (
        <PageSection>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    Salario Integral
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Los empleados con salario integral no generan provisiones de
                    prestaciones sociales independientes. El factor prestacional
                    ya esta incluido en el salario.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Benefit Cards */}
      {preview && employee.salaryType !== "INTEGRAL" && (
        <>
          <PageSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BenefitCard
                title="Prima de Servicios"
                icon={<Gift className="h-5 w-5 text-primary-500" />}
                iconColor="bg-primary-50 dark:bg-primary-900/20"
                monthlyProvision={monthlyProvisions.prima}
                accruedTotal={preview.accumulatedProvisions.prima}
                benefitItem={benefitItems.prima}
              />

              <BenefitCard
                title="Cesantias"
                icon={<DollarSign className="h-5 w-5 text-success-500" />}
                iconColor="bg-success-50 dark:bg-success-900/20"
                monthlyProvision={monthlyProvisions.cesantias}
                accruedTotal={preview.accumulatedProvisions.cesantias}
                benefitItem={benefitItems.cesantias}
              />

              <BenefitCard
                title="Intereses sobre Cesantias"
                icon={<TrendingUp className="h-5 w-5 text-warning-500" />}
                iconColor="bg-warning-50 dark:bg-warning-900/20"
                monthlyProvision={monthlyProvisions.intereses}
                accruedTotal={preview.accumulatedProvisions.intereses}
                benefitItem={benefitItems.intereses}
              />

              <BenefitCard
                title="Vacaciones"
                icon={<Calendar className="h-5 w-5 text-accent-500" />}
                iconColor="bg-accent-50 dark:bg-accent-900/20"
                monthlyProvision={monthlyProvisions.vacaciones}
                accruedTotal={preview.accumulatedProvisions.vacaciones}
                benefitItem={benefitItems.vacaciones}
              />
            </div>
          </PageSection>

          {/* Totals Summary */}
          <PageSection>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary-500" />
                  Resumen de Prestaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 sm:w-80 sm:ml-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Total prestaciones calculadas
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {formatCurrency(preview.totalBenefits)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Provisiones acumuladas
                    </span>
                    <span className="font-medium text-success-600 dark:text-success-400">
                      -{formatCurrency(preview.accumulatedProvisions.total)}
                    </span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />
                  <div className="flex justify-between">
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      Neto a pagar
                    </span>
                    <span
                      className={cn(
                        "text-xl font-bold",
                        preview.netPayable >= 0
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-error-600 dark:text-error-400",
                      )}
                    >
                      {formatCurrency(preview.netPayable)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </PageSection>
        </>
      )}

      {/* Liquidation Preview (for terminated employees) */}
      {isTerminated && preview && preview.benefits.length > 0 && (
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning-500" />
                Liquidacion por Terminacion
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-center">Dias</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.benefits.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {item.concept}
                          </p>
                          <p className="text-xs text-neutral-400 font-mono mt-0.5">
                            {item.formula}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.base)}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.days}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-neutral-900 dark:text-white">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex flex-col gap-2 sm:w-72 sm:ml-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Total prestaciones
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {formatCurrency(preview.totalBenefits)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Provisiones ya pagadas
                    </span>
                    <span className="text-success-600 dark:text-success-400">
                      -{formatCurrency(preview.accumulatedProvisions.total)}
                    </span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />
                  <div className="flex justify-between">
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      Liquidacion neta
                    </span>
                    <span className="text-xl font-bold text-warning-600 dark:text-warning-400">
                      {formatCurrency(preview.netPayable)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Error state */}
      {isPreviewError && (
        <PageSection>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-error-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    Error al cargar prestaciones
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    No se pudieron cargar las prestaciones sociales de este
                    empleado. Esto puede ocurrir si el empleado tiene salario
                    integral o si no hay periodos de nomina procesados.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      )}
    </PageWrapper>
  );
}
