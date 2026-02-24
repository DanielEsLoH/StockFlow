import { Link } from "react-router";
import { ArrowLeft, Save } from "lucide-react";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Route } from "./+types/_app.payroll.employees.new";
import { cn } from "~/lib/utils";
import { useCreateEmployee } from "~/hooks/usePayroll";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";

export const meta: Route.MetaFunction = () => [
  { title: "Nuevo Empleado - StockFlow" },
  { name: "description", content: "Crear un nuevo empleado" },
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
  contractType: z.enum([
    "TERMINO_FIJO",
    "TERMINO_INDEFINIDO",
    "OBRA_O_LABOR",
    "PRESTACION_SERVICIOS",
  ]),
  salaryType: z.enum(["ORDINARIO", "INTEGRAL"]),
  baseSalary: z.coerce.number().min(1, "El salario es requerido"),
  arlRiskLevel: z.enum([
    "LEVEL_I",
    "LEVEL_II",
    "LEVEL_III",
    "LEVEL_IV",
    "LEVEL_V",
  ]),
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

export default function NewEmployeePage() {
  const createEmployee = useCreateEmployee();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema) as any,
    defaultValues: {
      documentType: "CC",
      documentNumber: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      department: "",
      contractType: "TERMINO_INDEFINIDO",
      salaryType: "ORDINARIO",
      baseSalary: 0,
      arlRiskLevel: "LEVEL_I",
      epsName: "",
      afpName: "",
      cajaName: "",
      bankName: "",
      bankAccountType: "",
      bankAccountNumber: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
    },
  });

  const onSubmit = (data: EmployeeFormData) => {
    createEmployee.mutate({
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
    });
  };

  return (
    <PageWrapper>
      <PageSection>
        <div className="flex items-center gap-4">
          <Link to="/payroll/employees">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Nuevo Empleado
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Registra un nuevo empleado en la nomina
            </p>
          </div>
        </div>
      </PageSection>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info */}
            <PageSection>
              <Card>
                <CardHeader>
                  <CardTitle>Informacion Personal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Nombre *
                      </label>
                      <Input
                        {...register("firstName")}
                        placeholder="Juan"
                        error={!!errors.firstName}
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-sm text-error-500">{errors.firstName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Apellido *
                      </label>
                      <Input
                        {...register("lastName")}
                        placeholder="Perez"
                        error={!!errors.lastName}
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-sm text-error-500">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Tipo de Documento
                      </label>
                      <Controller
                        name="documentType"
                        control={control}
                        render={({ field }) => (
                          <Select options={documentTypeOptions} value={field.value} onChange={field.onChange} />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Numero de Documento *
                      </label>
                      <Input
                        {...register("documentNumber")}
                        placeholder="1234567890"
                        error={!!errors.documentNumber}
                      />
                      {errors.documentNumber && (
                        <p className="mt-1 text-sm text-error-500">{errors.documentNumber.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Email
                      </label>
                      <Input {...register("email")} type="email" placeholder="juan@email.com" error={!!errors.email} />
                      {errors.email && (
                        <p className="mt-1 text-sm text-error-500">{errors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Telefono
                      </label>
                      <Input {...register("phone")} placeholder="+57 300 123 4567" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Direccion
                      </label>
                      <Input {...register("address")} placeholder="Calle 1 #2-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Ciudad
                      </label>
                      <Input {...register("city")} placeholder="Bogota" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Departamento
                      </label>
                      <Input {...register("department")} placeholder="Cundinamarca" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PageSection>

            {/* Contract Info */}
            <PageSection>
              <Card>
                <CardHeader>
                  <CardTitle>Informacion Laboral</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Tipo de Contrato *
                      </label>
                      <Controller
                        name="contractType"
                        control={control}
                        render={({ field }) => (
                          <Select options={contractTypeOptions} value={field.value} onChange={field.onChange} />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Tipo de Salario
                      </label>
                      <Controller
                        name="salaryType"
                        control={control}
                        render={({ field }) => (
                          <Select options={salaryTypeOptions} value={field.value} onChange={field.onChange} />
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Salario Base *
                      </label>
                      <Input
                        {...register("baseSalary")}
                        type="number"
                        placeholder="1423500"
                        error={!!errors.baseSalary}
                      />
                      {errors.baseSalary && (
                        <p className="mt-1 text-sm text-error-500">{errors.baseSalary.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Nivel de Riesgo ARL
                      </label>
                      <Controller
                        name="arlRiskLevel"
                        control={control}
                        render={({ field }) => (
                          <Select options={arlOptions} value={field.value} onChange={field.onChange} />
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Fecha de Ingreso *
                      </label>
                      <Input {...register("startDate")} type="date" error={!!errors.startDate} />
                      {errors.startDate && (
                        <p className="mt-1 text-sm text-error-500">{errors.startDate.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Fecha de Retiro
                      </label>
                      <Input {...register("endDate")} type="date" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PageSection>

            {/* Social Security */}
            <PageSection>
              <Card>
                <CardHeader>
                  <CardTitle>Seguridad Social</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        EPS
                      </label>
                      <Input {...register("epsName")} placeholder="Sura, Sanitas..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        AFP (Pension)
                      </label>
                      <Input {...register("afpName")} placeholder="Porvenir, Proteccion..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Caja de Compensacion
                      </label>
                      <Input {...register("cajaName")} placeholder="Compensar, Comfamiliar..." />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PageSection>

            {/* Bank Info */}
            <PageSection>
              <Card>
                <CardHeader>
                  <CardTitle>Informacion Bancaria</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Banco
                      </label>
                      <Input {...register("bankName")} placeholder="Bancolombia, Davivienda..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Tipo de Cuenta
                      </label>
                      <Controller
                        name="bankAccountType"
                        control={control}
                        render={({ field }) => (
                          <Select
                            options={bankAccountTypeOptions}
                            value={field.value || ""}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Numero de Cuenta
                      </label>
                      <Input {...register("bankAccountNumber")} placeholder="1234567890" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PageSection>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            <PageSection>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isSubmitting || createEmployee.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Crear Empleado
                  </Button>
                  <Link to="/payroll/employees" className="block">
                    <Button type="button" variant="outline" className="w-full">
                      Cancelar
                    </Button>
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
