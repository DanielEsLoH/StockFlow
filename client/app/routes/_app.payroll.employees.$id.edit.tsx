import { Link, useParams } from "react-router";
import { ArrowLeft, Save } from "lucide-react";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import type { Route } from "./+types/_app.payroll.employees.$id.edit";
import { useEmployee, useUpdateEmployee } from "~/hooks/usePayroll";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";
import { Skeleton } from "~/components/ui/Skeleton";

export const meta: Route.MetaFunction = () => [
  { title: "Editar Empleado - StockFlow" },
  { name: "description", content: "Editar informacion del empleado" },
];

const employeeSchema = z.object({
  documentType: z.enum(["CC", "CE", "TI", "NIT", "PP", "PEP"]),
  documentNumber: z.string().min(1, "El documento es requerido").max(20),
  firstName: z.string().min(1, "El nombre es requerido").max(100),
  lastName: z.string().min(1, "El apellido es requerido").max(100),
  email: z.string().email("Email invalido").or(z.literal("")).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  contractType: z.enum(["TERMINO_FIJO", "TERMINO_INDEFINIDO", "OBRA_O_LABOR", "PRESTACION_SERVICIOS"]),
  salaryType: z.enum(["ORDINARIO", "INTEGRAL"]),
  baseSalary: z.coerce.number().min(1, "El salario es requerido"),
  arlRiskLevel: z.enum(["LEVEL_I", "LEVEL_II", "LEVEL_III", "LEVEL_IV", "LEVEL_V"]),
  epsName: z.string().max(100).optional(),
  afpName: z.string().max(100).optional(),
  cajaName: z.string().max(100).optional(),
  bankName: z.string().max(100).optional(),
  bankAccountType: z.string().max(20).optional(),
  bankAccountNumber: z.string().max(30).optional(),
  startDate: z.string().min(1, "La fecha de ingreso es requerida"),
  endDate: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

const documentTypeOptions = [
  { value: "CC", label: "Cedula de Ciudadania" },
  { value: "CE", label: "Cedula de Extranjeria" },
  { value: "TI", label: "Tarjeta de Identidad" },
  { value: "NIT", label: "NIT" },
  { value: "PP", label: "Pasaporte" },
  { value: "PEP", label: "PEP" },
];

const contractTypeOptions = [
  { value: "TERMINO_FIJO", label: "Termino Fijo" },
  { value: "TERMINO_INDEFINIDO", label: "Termino Indefinido" },
  { value: "OBRA_O_LABOR", label: "Obra o Labor" },
  { value: "PRESTACION_SERVICIOS", label: "Prestacion de Servicios" },
];

const salaryTypeOptions = [
  { value: "ORDINARIO", label: "Ordinario" },
  { value: "INTEGRAL", label: "Integral" },
];

const arlOptions = [
  { value: "LEVEL_I", label: "Nivel I (0.522%)" },
  { value: "LEVEL_II", label: "Nivel II (1.044%)" },
  { value: "LEVEL_III", label: "Nivel III (2.436%)" },
  { value: "LEVEL_IV", label: "Nivel IV (4.35%)" },
  { value: "LEVEL_V", label: "Nivel V (6.96%)" },
];

const bankAccountTypeOptions = [
  { value: "", label: "Seleccionar..." },
  { value: "AHORROS", label: "Ahorros" },
  { value: "CORRIENTE", label: "Corriente" },
];

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const { data: employee, isLoading } = useEmployee(id!);
  const updateEmployee = useUpdateEmployee();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema) as any,
  });

  useEffect(() => {
    if (employee) {
      reset({
        documentType: employee.documentType as EmployeeFormData["documentType"],
        documentNumber: employee.documentNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email || "",
        phone: employee.phone || "",
        address: employee.address || "",
        city: employee.city || "",
        department: employee.department || "",
        contractType: employee.contractType,
        salaryType: employee.salaryType,
        baseSalary: employee.baseSalary,
        arlRiskLevel: employee.arlRiskLevel,
        epsName: employee.epsName || "",
        afpName: employee.afpName || "",
        cajaName: employee.cajaName || "",
        bankName: employee.bankName || "",
        bankAccountType: employee.bankAccountType || "",
        bankAccountNumber: employee.bankAccountNumber || "",
        startDate: employee.startDate.split("T")[0],
        endDate: employee.endDate ? employee.endDate.split("T")[0] : "",
      });
    }
  }, [employee, reset]);

  if (isLoading) {
    return (
      <PageWrapper>
        <PageSection>
          <Skeleton className="h-8 w-48" />
        </PageSection>
        <Card><CardContent className="p-6"><Skeleton className="h-60 w-full" /></CardContent></Card>
      </PageWrapper>
    );
  }

  const onSubmit = (data: EmployeeFormData) => {
    updateEmployee.mutate({
      id: id!,
      data: {
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        department: data.department || undefined,
        epsName: data.epsName || undefined,
        afpName: data.afpName || undefined,
        cajaName: data.cajaName || undefined,
        bankName: data.bankName || undefined,
        bankAccountType: data.bankAccountType || undefined,
        bankAccountNumber: data.bankAccountNumber || undefined,
        endDate: data.endDate || undefined,
      },
    });
  };

  return (
    <PageWrapper>
      <PageSection>
        <div className="flex items-center gap-4">
          <Link to={`/payroll/employees/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Editar Empleado
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              {employee?.firstName} {employee?.lastName}
            </p>
          </div>
        </div>
      </PageSection>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PageSection>
              <Card>
                <CardHeader><CardTitle>Informacion Personal</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Nombre *</label>
                      <Input {...register("firstName")} error={!!errors.firstName} />
                      {errors.firstName && <p className="mt-1 text-sm text-error-500">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Apellido *</label>
                      <Input {...register("lastName")} error={!!errors.lastName} />
                      {errors.lastName && <p className="mt-1 text-sm text-error-500">{errors.lastName.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Tipo de Documento</label>
                      <Controller name="documentType" control={control} render={({ field }) => (
                        <Select options={documentTypeOptions} value={field.value} onChange={field.onChange} />
                      )} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Numero de Documento *</label>
                      <Input {...register("documentNumber")} error={!!errors.documentNumber} />
                      {errors.documentNumber && <p className="mt-1 text-sm text-error-500">{errors.documentNumber.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Email</label>
                      <Input {...register("email")} type="email" error={!!errors.email} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Telefono</label>
                      <Input {...register("phone")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Direccion</label>
                      <Input {...register("address")} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Ciudad</label>
                      <Input {...register("city")} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Departamento</label>
                      <Input {...register("department")} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PageSection>

            <PageSection>
              <Card>
                <CardHeader><CardTitle>Informacion Laboral</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Tipo de Contrato</label>
                      <Controller name="contractType" control={control} render={({ field }) => (
                        <Select options={contractTypeOptions} value={field.value} onChange={field.onChange} />
                      )} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Tipo de Salario</label>
                      <Controller name="salaryType" control={control} render={({ field }) => (
                        <Select options={salaryTypeOptions} value={field.value} onChange={field.onChange} />
                      )} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Salario Base *</label>
                      <Input {...register("baseSalary")} type="number" error={!!errors.baseSalary} />
                      {errors.baseSalary && <p className="mt-1 text-sm text-error-500">{errors.baseSalary.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Nivel de Riesgo ARL</label>
                      <Controller name="arlRiskLevel" control={control} render={({ field }) => (
                        <Select options={arlOptions} value={field.value} onChange={field.onChange} />
                      )} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Fecha de Ingreso *</label>
                      <Input {...register("startDate")} type="date" error={!!errors.startDate} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Fecha de Retiro</label>
                      <Input {...register("endDate")} type="date" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PageSection>

            <PageSection>
              <Card>
                <CardHeader><CardTitle>Seguridad Social</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">EPS</label>
                      <Input {...register("epsName")} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">AFP</label>
                      <Input {...register("afpName")} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Caja</label>
                      <Input {...register("cajaName")} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PageSection>

            <PageSection>
              <Card>
                <CardHeader><CardTitle>Informacion Bancaria</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Banco</label>
                      <Input {...register("bankName")} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Tipo de Cuenta</label>
                      <Controller name="bankAccountType" control={control} render={({ field }) => (
                        <Select options={bankAccountTypeOptions} value={field.value || ""} onChange={field.onChange} />
                      )} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Numero de Cuenta</label>
                      <Input {...register("bankAccountNumber")} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PageSection>
          </div>

          <div className="space-y-6">
            <PageSection>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button type="submit" className="w-full" isLoading={isSubmitting || updateEmployee.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                  <Link to={`/payroll/employees/${id}`} className="block">
                    <Button type="button" variant="outline" className="w-full">Cancelar</Button>
                  </Link>
                </CardContent>
              </Card>
            </PageSection>
          </div>
        </div>
      </form>
    </PageWrapper>
  );
}
