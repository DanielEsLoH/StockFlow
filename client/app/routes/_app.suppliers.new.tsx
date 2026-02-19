import { Link } from "react-router";
import { ArrowLeft, Save } from "lucide-react";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Route } from "./+types/_app.suppliers.new";
import { cn } from "~/lib/utils";
import { useCreateSupplier } from "~/hooks/useSuppliers";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Nuevo Proveedor - StockFlow" },
    { name: "description", content: "Crear un nuevo proveedor" },
  ];
};

// Form schema
const supplierSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "Maximo 100 caracteres"),
  documentType: z.string().max(20, "Maximo 20 caracteres").optional(),
  documentNumber: z
    .string()
    .min(1, "El numero de documento es requerido")
    .max(20, "Maximo 20 caracteres"),
  email: z.string().email("Email invalido").or(z.literal("")).optional(),
  phone: z.string().max(20, "Maximo 20 caracteres").optional(),
  address: z.string().max(200, "Maximo 200 caracteres").optional(),
  city: z.string().max(100, "Maximo 100 caracteres").optional(),
  state: z.string().max(100, "Maximo 100 caracteres").optional(),
  businessName: z.string().max(100, "Maximo 100 caracteres").optional(),
  taxId: z.string().max(20, "Maximo 20 caracteres").optional(),
  paymentTerms: z.enum(["IMMEDIATE", "NET_15", "NET_30", "NET_60"]).optional(),
  contactName: z.string().max(100, "Maximo 100 caracteres").optional(),
  contactPhone: z.string().max(20, "Maximo 20 caracteres").optional(),
  notes: z.string().max(500, "Maximo 500 caracteres").optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

// Document type options
const documentTypeOptions = [
  { value: "NIT", label: "NIT" },
  { value: "CC", label: "Cedula de Ciudadania" },
  { value: "CE", label: "Cedula de Extranjeria" },
  { value: "PASSPORT", label: "Pasaporte" },
];

// Payment terms options
const paymentTermsOptions = [
  { value: "IMMEDIATE", label: "Inmediato" },
  { value: "NET_15", label: "15 dias" },
  { value: "NET_30", label: "30 dias" },
  { value: "NET_60", label: "60 dias" },
];

export default function NewSupplierPage() {
  const createSupplier = useCreateSupplier();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      documentType: "NIT",
      documentNumber: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      businessName: "",
      taxId: "",
      paymentTerms: "NET_30",
      contactName: "",
      contactPhone: "",
      notes: "",
    },
  });

  const onSubmit = (data: SupplierFormData) => {
    createSupplier.mutate({
      ...data,
      email: data.email || undefined,
      phone: data.phone || undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      businessName: data.businessName || undefined,
      taxId: data.taxId || undefined,
      contactName: data.contactName || undefined,
      contactPhone: data.contactPhone || undefined,
      notes: data.notes || undefined,
    });
  };

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex items-center gap-4">
          <Link to="/suppliers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Nuevo Proveedor
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Agrega un nuevo proveedor a tu base de datos
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
                      Nombre del Proveedor *
                    </label>
                    <Input
                      {...register("name")}
                      placeholder="Nombre o razon social del proveedor"
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
                            value={field.value || "NIT"}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Numero de Documento *
                      </label>
                      <Input
                        {...register("documentNumber")}
                        placeholder="900123456-7"
                        error={!!errors.documentNumber}
                      />
                      {errors.documentNumber && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.documentNumber.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Razon Social
                      </label>
                      <Input
                        {...register("businessName")}
                        placeholder="Razon social de la empresa"
                        error={!!errors.businessName}
                      />
                      {errors.businessName && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.businessName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        RUT / Tax ID
                      </label>
                      <Input
                        {...register("taxId")}
                        placeholder="Numero de identificacion tributaria"
                        error={!!errors.taxId}
                      />
                      {errors.taxId && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.taxId.message}
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
                        Email
                      </label>
                      <Input
                        {...register("email")}
                        type="email"
                        placeholder="proveedor@email.com"
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

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Departamento
                    </label>
                    <Input
                      {...register("state")}
                      placeholder="Cundinamarca"
                      error={!!errors.state}
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-error-500">
                        {errors.state.message}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </PageSection>

            {/* Contact Person */}
            <PageSection>
              <Card>
                <CardHeader>
                  <CardTitle>Persona de Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Nombre de Contacto
                      </label>
                      <Input
                        {...register("contactName")}
                        placeholder="Nombre del contacto principal"
                        error={!!errors.contactName}
                      />
                      {errors.contactName && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.contactName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Telefono de Contacto
                      </label>
                      <Input
                        {...register("contactPhone")}
                        placeholder="+57 300 123 4567"
                        error={!!errors.contactPhone}
                      />
                      {errors.contactPhone && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.contactPhone.message}
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
                    placeholder="Notas sobre el proveedor (opcional)"
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
            {/* Payment Terms */}
            <PageSection>
              <Card>
                <CardHeader>
                  <CardTitle>Condiciones de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  <Controller
                    name="paymentTerms"
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={paymentTermsOptions}
                        value={field.value || "NET_30"}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <p className="text-sm text-neutral-500 mt-2">
                    Plazo de pago acordado con el proveedor
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
                    isLoading={isSubmitting || createSupplier.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Crear Proveedor
                  </Button>
                  <Link to="/suppliers" className="block">
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
