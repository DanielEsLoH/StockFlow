import { Link } from "react-router";
import { ArrowLeft, Save } from "lucide-react";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Route } from "./+types/_app.customers.new";
import { useCreateCustomer } from "~/hooks/useCustomers";
import { CustomerContactFields } from "~/components/customers/CustomerContactFields";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";

// noinspection JSUnusedGlobalSymbols - consumed by React Router v7 framework
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Nuevo Cliente - StockFlow" },
    { name: "description", content: "Crear un nuevo cliente" },
  ];
};

// Form schema
const customerSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "Maximo 100 caracteres"),
  email: z.email({ message: "Email invalido" }),
  phone: z.string().max(20, "Maximo 20 caracteres").optional(),
  documentNumber: z
    .string()
    .min(5, "Minimo 5 caracteres")
    .max(20, "Maximo 20 caracteres"),
  documentType: z.enum(["CC", "NIT", "CE", "PASSPORT", "RUT", "DNI", "OTHER"]),
  dv: z.string().max(1, "Maximo 1 caracter").optional(),
  type: z.enum(["INDIVIDUAL", "BUSINESS"]),
  address: z.string().max(200, "Maximo 200 caracteres").optional(),
  city: z.string().max(100, "Maximo 100 caracteres").optional(),
  notes: z.string().max(500, "Maximo 500 caracteres").optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

// Type options
const typeOptions = [
  { value: "INDIVIDUAL", label: "Persona Natural" },
  { value: "BUSINESS", label: "Empresa" },
];

// Document type options
const documentTypeOptions = [
  { value: "CC", label: "Cedula de Ciudadania" },
  { value: "NIT", label: "NIT" },
  { value: "CE", label: "Cedula de Extranjeria" },
  { value: "PASSPORT", label: "Pasaporte" },
  { value: "RUT", label: "RUT" },
  { value: "DNI", label: "DNI" },
  { value: "OTHER", label: "Otro" },
];

// noinspection JSUnusedGlobalSymbols - consumed by React Router v7 framework
export default function NewCustomerPage() {
  const createCustomer = useCreateCustomer();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      documentNumber: "",
      documentType: "CC",
      dv: "",
      type: "INDIVIDUAL",
      address: "",
      city: "",
      notes: "",
    },
  });

  const customerType = watch("type");

  const onSubmit = (data: CustomerFormData) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, ...customerData } = data;
    createCustomer.mutate({
      ...customerData,
      phone: data.phone || undefined,
      dv: data.dv || undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      notes: data.notes || undefined,
    });
  };

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex items-center gap-4">
          <Link to="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Nuevo Cliente
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Agrega un nuevo cliente a tu base de datos
            </p>
          </div>
        </div>
      </PageSection>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <PageSection>
              <Card>
                <CardHeader>
                  <CardTitle>Informacion Basica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Nombre Completo *
                    </label>
                    <Input
                      {...register("name")}
                      placeholder={
                        customerType === "BUSINESS"
                          ? "Razon social de la empresa"
                          : "Nombre completo del cliente"
                      }
                      error={!!errors.name}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-error-500">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px] gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Tipo de Documento
                      </label>
                      <Controller
                        name="documentType"
                        control={control}
                        render={({ field }) => (
                          <Select
                            options={documentTypeOptions}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Numero de Documento
                      </label>
                      <Input
                        {...register("documentNumber")}
                        placeholder={
                          customerType === "BUSINESS"
                            ? "900123456-7"
                            : "12345678"
                        }
                        error={!!errors.documentNumber}
                      />
                      {errors.documentNumber && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.documentNumber.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        DV
                      </label>
                      <Input
                        {...register("dv")}
                        placeholder="7"
                        maxLength={1}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PageSection>

            <CustomerContactFields
              register={register}
              errors={errors}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Type */}
            <PageSection>
              <Card>
                <CardHeader>
                  <CardTitle>Tipo de Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={typeOptions}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <p className="text-sm text-neutral-500 mt-2">
                    {customerType === "BUSINESS"
                      ? "Para empresas y negocios"
                      : "Para personas naturales"}
                  </p>
                </CardContent>
              </Card>
            </PageSection>

            {/* Actions */}
            <PageSection>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isSubmitting || createCustomer.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Crear Cliente
                  </Button>
                  <Link to="/customers" className="block">
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
