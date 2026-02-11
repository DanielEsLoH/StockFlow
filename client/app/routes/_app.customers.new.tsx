import { Link } from "react-router";
import { ArrowLeft, Save } from "lucide-react";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Route } from "./+types/_app.customers.new";
import { cn } from "~/lib/utils";
import { useCreateCustomer } from "~/hooks/useCustomers";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";

// Meta for SEO
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
  document: z.string().max(20, "Maximo 20 caracteres").optional(),
  documentType: z.enum(["CC", "NIT", "CE", "PASSPORT"]).optional(),
  type: z.enum(["INDIVIDUAL", "BUSINESS"]),
  address: z.string().max(200, "Maximo 200 caracteres").optional(),
  city: z.string().max(100, "Maximo 100 caracteres").optional(),
  notes: z.string().max(500, "Maximo 500 caracteres").optional(),
  isActive: z.boolean(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

// Type options
const typeOptions = [
  { value: "INDIVIDUAL", label: "Persona Natural" },
  { value: "BUSINESS", label: "Empresa" },
];

// Document type options
const documentTypeOptions = [
  { value: "", label: "Seleccionar tipo" },
  { value: "CC", label: "Cedula de Ciudadania" },
  { value: "NIT", label: "NIT" },
  { value: "CE", label: "Cedula de Extranjeria" },
  { value: "PASSPORT", label: "Pasaporte" },
];

// Status options
const statusOptions = [
  { value: "true", label: "Activo" },
  { value: "false", label: "Inactivo" },
];

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
      document: "",
      documentType: undefined,
      type: "INDIVIDUAL",
      address: "",
      city: "",
      notes: "",
      isActive: true,
    },
  });

  const customerType = watch("type");

  const onSubmit = (data: CustomerFormData) => {
    createCustomer.mutate({
      ...data,
      documentType: data.documentType || undefined,
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            value={field.value || ""}
                            onChange={(value) =>
                              field.onChange(value || undefined)
                            }
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Numero de Documento
                      </label>
                      <Input
                        {...register("document")}
                        placeholder={
                          customerType === "BUSINESS"
                            ? "900123456-7"
                            : "12345678"
                        }
                        error={!!errors.document}
                      />
                      {errors.document && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.document.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PageSection>

            {/* Contact Info */}
            <PageSection>
              <Card>
                <CardHeader>
                  <CardTitle>Informacion de Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Email *
                      </label>
                      <Input
                        {...register("email")}
                        type="email"
                        placeholder="cliente@email.com"
                        error={!!errors.email}
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Telefono
                      </label>
                      <Input
                        {...register("phone")}
                        placeholder="+57 300 123 4567"
                        error={!!errors.phone}
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Direccion
                      </label>
                      <Input
                        {...register("address")}
                        placeholder="Calle 123 #45-67"
                        error={!!errors.address}
                      />
                      {errors.address && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.address.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Ciudad
                      </label>
                      <Input
                        {...register("city")}
                        placeholder="Bogota"
                        error={!!errors.city}
                      />
                      {errors.city && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.city.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PageSection>

            {/* Notes */}
            <PageSection>
              <Card>
                <CardHeader>
                  <CardTitle>Notas Adicionales</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    {...register("notes")}
                    placeholder="Notas sobre el cliente (opcional)"
                    rows={4}
                    className={cn(
                      "w-full rounded-lg border border-neutral-300 dark:border-neutral-600",
                      "bg-white dark:bg-neutral-900 px-4 py-2.5",
                      "text-neutral-900 dark:text-white placeholder:text-neutral-400",
                      "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none",
                      "transition-colors resize-none",
                    )}
                  />
                  {errors.notes && (
                    <p className="mt-1 text-sm text-error-500">
                      {errors.notes.message}
                    </p>
                  )}
                </CardContent>
              </Card>
            </PageSection>
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

            {/* Status */}
            <PageSection>
              <Card>
                <CardHeader>
                  <CardTitle>Estado</CardTitle>
                </CardHeader>
                <CardContent>
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={statusOptions}
                        value={String(field.value)}
                        onChange={(value) => field.onChange(value === "true")}
                      />
                    )}
                  />
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
