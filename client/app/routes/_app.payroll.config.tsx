import { useEffect } from "react";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { Save, Cog, DollarSign, FileText } from "lucide-react";
import type { Route } from "./+types/_app.payroll.config";
import { usePayrollConfig, useSavePayrollConfig } from "~/hooks/usePayroll";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";
import { Skeleton } from "~/components/ui/Skeleton";

export const meta: Route.MetaFunction = () => [
  { title: "Configuracion de Nomina - StockFlow" },
  { name: "description", content: "Configuracion de parametros de nomina" },
];

const configSchema = z.object({
  smmlv: z.coerce.number().min(1, "SMMLV es requerido"),
  auxilioTransporteVal: z.coerce.number().min(0, "Valor invalido"),
  uvtValue: z.coerce.number().min(1, "UVT es requerido"),
  defaultPeriodType: z.enum(["MONTHLY", "BIWEEKLY"]).optional(),
  payrollPrefix: z.string().max(10).optional(),
  payrollCurrentNumber: z.coerce.number().min(0).optional(),
  adjustmentPrefix: z.string().max(10).optional(),
  adjustmentCurrentNumber: z.coerce.number().min(0).optional(),
  payrollSoftwareId: z.string().max(100).optional(),
  payrollSoftwarePin: z.string().max(100).optional(),
  payrollTestSetId: z.string().max(100).optional(),
});

type ConfigFormData = z.infer<typeof configSchema>;

const periodTypeOptions = [
  { value: "MONTHLY", label: "Mensual" },
  { value: "BIWEEKLY", label: "Quincenal" },
];

export default function PayrollConfigPage() {
  const { data: config, isLoading } = usePayrollConfig();
  const saveConfig = useSavePayrollConfig();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      smmlv: 1423500,
      auxilioTransporteVal: 200000,
      uvtValue: 49799,
      defaultPeriodType: "MONTHLY",
    },
  });

  useEffect(() => {
    if (config) {
      reset({
        smmlv: config.smmlv,
        auxilioTransporteVal: config.auxilioTransporteVal,
        uvtValue: config.uvtValue,
        defaultPeriodType: config.defaultPeriodType || "MONTHLY",
        payrollPrefix: config.payrollPrefix || "",
        payrollCurrentNumber: config.payrollCurrentNumber || 0,
        adjustmentPrefix: config.adjustmentPrefix || "",
        adjustmentCurrentNumber: config.adjustmentCurrentNumber || 0,
        payrollSoftwareId: config.payrollSoftwareId || "",
        payrollSoftwarePin: config.payrollSoftwarePin || "",
        payrollTestSetId: config.payrollTestSetId || "",
      });
    }
  }, [config, reset]);

  const onSubmit = (data: ConfigFormData) => {
    saveConfig.mutate({
      ...data,
      payrollPrefix: data.payrollPrefix || undefined,
      payrollCurrentNumber: data.payrollCurrentNumber || undefined,
      adjustmentPrefix: data.adjustmentPrefix || undefined,
      adjustmentCurrentNumber: data.adjustmentCurrentNumber || undefined,
      payrollSoftwareId: data.payrollSoftwareId || undefined,
      payrollSoftwarePin: data.payrollSoftwarePin || undefined,
      payrollTestSetId: data.payrollTestSetId || undefined,
    });
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <PageSection><Skeleton className="h-8 w-64" /></PageSection>
        <Card><CardContent className="p-6"><Skeleton className="h-60 w-full" /></CardContent></Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10">
            <Cog className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Configuracion de Nomina
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              Parametros anuales y configuracion DIAN
            </p>
          </div>
        </div>
      </PageSection>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Annual Parameters */}
            <PageSection>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary-500" />
                    <CardTitle>Parametros Anuales 2026</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        SMMLV *
                      </label>
                      <Input
                        {...register("smmlv")}
                        type="number"
                        error={!!errors.smmlv}
                      />
                      {errors.smmlv && <p className="mt-1 text-sm text-error-500">{errors.smmlv.message}</p>}
                      <p className="mt-1 text-xs text-neutral-500">Salario minimo mensual legal vigente</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Auxilio de Transporte *
                      </label>
                      <Input
                        {...register("auxilioTransporteVal")}
                        type="number"
                        error={!!errors.auxilioTransporteVal}
                      />
                      {errors.auxilioTransporteVal && <p className="mt-1 text-sm text-error-500">{errors.auxilioTransporteVal.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Valor UVT *
                      </label>
                      <Input
                        {...register("uvtValue")}
                        type="number"
                        error={!!errors.uvtValue}
                      />
                      {errors.uvtValue && <p className="mt-1 text-sm text-error-500">{errors.uvtValue.message}</p>}
                      <p className="mt-1 text-xs text-neutral-500">Unidad de Valor Tributario</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Tipo de Periodo por Defecto
                    </label>
                    <Controller
                      name="defaultPeriodType"
                      control={control}
                      render={({ field }) => (
                        <Select
                          options={periodTypeOptions}
                          value={field.value || "MONTHLY"}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </PageSection>

            {/* DIAN Numbering */}
            <PageSection>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent-500" />
                    <CardTitle>Numeracion DIAN</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Prefijo Nomina
                      </label>
                      <Input {...register("payrollPrefix")} placeholder="NOM" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Numero Actual
                      </label>
                      <Input {...register("payrollCurrentNumber")} type="number" placeholder="0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Prefijo Ajuste
                      </label>
                      <Input {...register("adjustmentPrefix")} placeholder="ADJ" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Numero Actual
                      </label>
                      <Input {...register("adjustmentCurrentNumber")} type="number" placeholder="0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PageSection>

            {/* DIAN Software Config */}
            <PageSection>
              <Card>
                <CardHeader>
                  <CardTitle>Software DIAN (Nomina Electronica)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Software ID
                      </label>
                      <Input {...register("payrollSoftwareId")} placeholder="ID del software DIAN" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Software PIN
                      </label>
                      <Input {...register("payrollSoftwarePin")} placeholder="PIN del software" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Test Set ID (Habilitacion)
                    </label>
                    <Input {...register("payrollTestSetId")} placeholder="ID del set de pruebas" />
                    <p className="mt-1 text-xs text-neutral-500">
                      Solo necesario durante el proceso de habilitacion con la DIAN
                    </p>
                  </div>
                </CardContent>
              </Card>
            </PageSection>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <PageSection>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={saveConfig.isPending}
                    disabled={!isDirty}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Configuracion
                  </Button>
                </CardContent>
              </Card>
            </PageSection>

            <PageSection>
              <Card variant="soft-primary">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                    Parametros 2026
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">SMMLV</span>
                      <span className="font-medium text-neutral-900 dark:text-white">$1,423,500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Aux. Transporte</span>
                      <span className="font-medium text-neutral-900 dark:text-white">$200,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">UVT</span>
                      <span className="font-medium text-neutral-900 dark:text-white">$49,799</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-neutral-500">
                    Valores de referencia. Actualiza segun normativa vigente.
                  </p>
                </CardContent>
              </Card>
            </PageSection>
          </div>
        </div>
      </form>
    </PageWrapper>
  );
}
