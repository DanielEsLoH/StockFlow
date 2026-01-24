import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Save } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Route } from "./+types/_app.customers.$id.edit";
import { cn } from "~/lib/utils";
import { useCustomer, useUpdateCustomer } from "~/hooks/useCustomers";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";
import { Skeleton } from "~/components/ui/Skeleton";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Editar Cliente - StockFlow" },
    { name: "description", content: "Editar informacion del cliente" },
  ];
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

// Form schema
const customerSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "Maximo 100 caracteres"),
  email: z.string().min(1, "El email es requerido").email("Email invalido"),
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

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading, isError } = useCustomer(id!);
  const updateCustomer = useUpdateCustomer();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
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

  // Populate form when customer loads
  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
        document: customer.document || "",
        documentType: customer.documentType || undefined,
        type: customer.type,
        address: customer.address || "",
        city: customer.city || "",
        notes: customer.notes || "",
        isActive: customer.isActive,
      });
    }
  }, [customer, reset]);

  const onSubmit = (data: CustomerFormData) => {
    updateCustomer.mutate({
      id: id!,
      data: {
        ...data,
        documentType: data.documentType || undefined,
      },
    });
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Users className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Cliente no encontrado
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          El cliente que buscas no existe o fue eliminado.
        </p>
        <Link to="/customers">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a clientes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-4">
          <Link to={`/customers/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Editar Cliente
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              {customer.name}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <motion.div variants={itemVariants}>
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
            </motion.div>

            {/* Contact Info */}
            <motion.div variants={itemVariants}>
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
            </motion.div>

            {/* Notes */}
            <motion.div variants={itemVariants}>
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
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Type */}
            <motion.div variants={itemVariants}>
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
            </motion.div>

            {/* Status */}
            <motion.div variants={itemVariants}>
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
            </motion.div>

            {/* Actions */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isSubmitting || updateCustomer.isPending}
                    disabled={!isDirty}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                  <Link to={`/customers/${id}`} className="block">
                    <Button type="button" variant="outline" className="w-full">
                      Cancelar
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
