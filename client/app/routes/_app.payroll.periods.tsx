import { useState } from "react";
import { Link } from "react-router";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  Plus,
  Eye,
  Calculator,
  CalendarDays,
} from "lucide-react";
import type { Route } from "./+types/_app.payroll.periods";
import { formatCurrency, formatDate } from "~/lib/utils";
import {
  usePayrollPeriods,
  useCreatePayrollPeriod,
} from "~/hooks/usePayroll";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Pagination, PaginationInfo } from "~/components/ui/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  AnimatedTableRow,
} from "~/components/ui/Table";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import { Select } from "~/components/ui/Select";
import {
  PayrollPeriodStatusLabels,
  PayrollPeriodStatusVariants,
  PayrollPeriodTypeLabels,
} from "~/types/payroll";
import type { PayrollPeriodType } from "~/types/payroll";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export const meta: Route.MetaFunction = () => [
  { title: "Periodos de Nomina - StockFlow" },
  { name: "description", content: "Gestion de periodos de nomina" },
];

const periodSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  periodType: z.enum(["MONTHLY", "BIWEEKLY"]),
  startDate: z.string().min(1, "Fecha inicio requerida"),
  endDate: z.string().min(1, "Fecha fin requerida"),
  paymentDate: z.string().min(1, "Fecha pago requerida"),
  notes: z.string().optional(),
});

type PeriodFormData = z.infer<typeof periodSchema>;

const periodTypeOptions = [
  { value: "MONTHLY", label: "Mensual" },
  { value: "BIWEEKLY", label: "Quincenal" },
];

export default function PayrollPeriodsPage() {
  const { hasPermission } = usePermissions();
  const [page, setPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: periodsData, isLoading, isError } = usePayrollPeriods({ page, limit: 10 });
  const createPeriod = useCreatePayrollPeriod();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PeriodFormData>({
    resolver: zodResolver(periodSchema),
    defaultValues: {
      periodType: "MONTHLY",
    },
  });

  const onSubmit = (data: PeriodFormData) => {
    createPeriod.mutate(data, {
      onSuccess: () => {
        setShowCreateForm(false);
        reset();
      },
    });
  };

  const periods = periodsData?.data || [];
  const meta = periodsData?.meta;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/20 to-primary-500/10">
            <Calculator className="h-7 w-7 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Periodos de Nomina
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {meta?.total || 0} periodos registrados
            </p>
          </div>
        </div>
        {hasPermission(Permission.PAYROLL_CREATE) && (
          <Button
            variant="gradient"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            Nuevo Periodo
          </Button>
        )}
      </PageSection>

      {/* Create Form */}
      {showCreateForm && (
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Crear Periodo de Nomina</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Nombre *
                    </label>
                    <Input
                      {...register("name")}
                      placeholder="Nomina Enero 2026"
                      error={!!errors.name}
                    />
                    {errors.name && <p className="mt-1 text-sm text-error-500">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Tipo de Periodo
                    </label>
                    <Controller
                      name="periodType"
                      control={control}
                      render={({ field }) => (
                        <Select options={periodTypeOptions} value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Fecha de Inicio *
                    </label>
                    <Input {...register("startDate")} type="date" error={!!errors.startDate} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Fecha de Fin *
                    </label>
                    <Input {...register("endDate")} type="date" error={!!errors.endDate} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Fecha de Pago *
                    </label>
                    <Input {...register("paymentDate")} type="date" error={!!errors.paymentDate} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Notas
                    </label>
                    <Input {...register("notes")} placeholder="Observaciones..." />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => { setShowCreateForm(false); reset(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" isLoading={createPeriod.isPending}>
                    Crear Periodo
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Table */}
      <PageSection>
        <Card variant="elevated">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">Fechas</TableHead>
                  <TableHead className="hidden lg:table-cell">Empleados</TableHead>
                  <TableHead className="hidden lg:table-cell">Total Neto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-20">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={7} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar los periodos"
              description="Hubo un problema al cargar los periodos. Intenta de nuevo."
              action={{ label: "Reintentar", onClick: () => window.location.reload() }}
            />
          ) : periods.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-16 w-16" />}
              title="No hay periodos de nomina"
              description="Crea tu primer periodo para calcular la nomina."
              action={
                hasPermission(Permission.PAYROLL_CREATE)
                  ? { label: "Crear periodo", onClick: () => setShowCreateForm(true) }
                  : undefined
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Fechas</TableHead>
                    <TableHead className="hidden lg:table-cell">Empleados</TableHead>
                    <TableHead className="hidden lg:table-cell">Total Neto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-20">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period, i) => (
                    <AnimatedTableRow key={period.id} index={i} className="group">
                      <TableCell>
                        <Link
                          to={`/payroll/periods/${period.id}`}
                          className="font-semibold text-neutral-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          {period.name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">
                          {PayrollPeriodTypeLabels[period.periodType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm text-neutral-700 dark:text-neutral-300">
                          {formatDate(period.startDate)} - {formatDate(period.endDate)}
                        </div>
                        <div className="text-xs text-neutral-500">
                          Pago: {formatDate(period.paymentDate)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="font-medium tabular-nums">{period.employeeCount}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                          {formatCurrency(period.totalNeto)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={PayrollPeriodStatusVariants[period.status] as any}
                          dot
                        >
                          {PayrollPeriodStatusLabels[period.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link to={`/payroll/periods/${period.id}`}>
                          <Button variant="ghost" size="icon" title="Ver detalles">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </AnimatedTableRow>
                  ))}
                </TableBody>
              </Table>

              {meta && meta.totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-neutral-200 dark:border-neutral-700">
                  <PaginationInfo currentPage={meta.page} pageSize={meta.limit} totalItems={meta.total} />
                  <Pagination currentPage={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
