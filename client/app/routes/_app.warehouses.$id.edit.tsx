import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Warehouse, Save } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Route } from "./+types/_app.warehouses.$id.edit";
import { useWarehouse, useUpdateWarehouse } from "~/hooks/useWarehouses";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";
import { Skeleton } from "~/components/ui/Skeleton";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Editar Bodega - StockFlow" },
    { name: "description", content: "Editar informacion de la bodega" },
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
const warehouseSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "Maximo 100 caracteres"),
  address: z.string().max(200, "Maximo 200 caracteres").optional(),
  city: z.string().max(100, "Maximo 100 caracteres").optional(),
  phone: z.string().max(20, "Maximo 20 caracteres").optional(),
  email: z.email({ message: "Email invalido" }).optional().or(z.literal("")),
  manager: z.string().max(100, "Maximo 100 caracteres").optional(),
  capacity: z.number().min(0, "La capacidad no puede ser negativa").optional(),
  isActive: z.boolean(),
});

type WarehouseFormData = z.infer<typeof warehouseSchema>;

// Status options
const statusOptions = [
  { value: "true", label: "Activa" },
  { value: "false", label: "Inactiva" },
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

export default function EditWarehousePage() {
  const { id } = useParams<{ id: string }>();
  const { data: warehouse, isLoading, isError } = useWarehouse(id!);
  const updateWarehouse = useUpdateWarehouse();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      phone: "",
      email: "",
      manager: "",
      capacity: undefined,
      isActive: true,
    },
  });

  // Populate form when warehouse loads
  useEffect(() => {
    if (warehouse) {
      reset({
        name: warehouse.name,
        address: warehouse.address || "",
        city: warehouse.city || "",
        phone: warehouse.phone || "",
        email: warehouse.email || "",
        manager: warehouse.manager || "",
        capacity: warehouse.capacity || undefined,
        isActive: warehouse.isActive,
      });
    }
  }, [warehouse, reset]);

  const onSubmit = (data: WarehouseFormData) => {
    updateWarehouse.mutate({
      id: id!,
      data: {
        ...data,
        email: data.email || undefined,
      },
    });
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !warehouse) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Warehouse className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Bodega no encontrada
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          La bodega que buscas no existe o fue eliminada.
        </p>
        <Link to="/warehouses">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a bodegas
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
          <Link to={`/warehouses/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Editar Bodega
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              {warehouse.name}
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
                      Nombre *
                    </label>
                    <Input
                      {...register("name")}
                      placeholder="Nombre de la bodega"
                      error={!!errors.name}
                    />
                    {errors.name?.message && (
                      <p className="mt-1 text-sm text-error-500">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Direccion
                      </label>
                      <Input
                        {...register("address")}
                        placeholder="Direccion de la bodega"
                        error={!!errors.address}
                      />
                      {errors.address?.message && (
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
                        placeholder="Ciudad"
                        error={!!errors.city}
                      />
                      {errors.city?.message && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.city.message}
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
                        Telefono
                      </label>
                      <Input
                        {...register("phone")}
                        placeholder="+57 1 234 5678"
                        error={!!errors.phone}
                      />
                      {errors.phone?.message && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Email
                      </label>
                      <Input
                        {...register("email")}
                        type="email"
                        placeholder="bodega@empresa.com"
                        error={!!errors.email}
                      />
                      {errors.email?.message && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Encargado
                    </label>
                    <Input
                      {...register("manager")}
                      placeholder="Nombre del encargado"
                      error={!!errors.manager}
                    />
                    {errors.manager?.message && (
                      <p className="mt-1 text-sm text-error-500">
                        {errors.manager.message}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Capacity */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Capacidad</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Capacidad Maxima (unidades)
                    </label>
                    <Input
                      {...register("capacity")}
                      type="number"
                      min="0"
                      placeholder="10000"
                      error={!!errors.capacity}
                    />
                    {errors.capacity?.message && (
                      <p className="mt-1 text-sm text-error-500">
                        {errors.capacity.message}
                      </p>
                    )}
                    <p className="text-sm text-neutral-500 mt-1">
                      Deja vacio si no hay limite de capacidad
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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
                  <p className="text-sm text-neutral-500 mt-2">
                    Solo las bodegas activas pueden recibir productos
                  </p>
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
                    isLoading={isSubmitting || updateWarehouse.isPending}
                    disabled={!isDirty}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                  <Link to={`/warehouses/${id}`} className="block">
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
