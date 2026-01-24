import { Link, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Save,
  Package,
  DollarSign,
  Barcode,
  Layers,
  Warehouse,
  ImagePlus,
} from "lucide-react";
import type { Route } from "./+types/_app.products.new";
import { cn } from "~/lib/utils";
import { useCreateProduct, useProductFormData } from "~/hooks/useProducts";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";
import { Skeleton } from "~/components/ui/Skeleton";
import type { CreateProductData } from "~/types/product";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Nuevo Producto - StockFlow" },
    { name: "description", content: "Crear un nuevo producto" },
  ];
};

// Validation schema
const productSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "Maximo 100 caracteres"),
  description: z.string().max(500, "Maximo 500 caracteres").optional(),
  sku: z.string().min(1, "El SKU es requerido").max(50, "Maximo 50 caracteres"),
  barcode: z.string().max(50, "Maximo 50 caracteres").optional(),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0"),
  cost: z.number().min(0, "El costo debe ser mayor o igual a 0"),
  quantity: z.number().int().min(0, "La cantidad debe ser mayor o igual a 0"),
  minStock: z
    .number()
    .int()
    .min(0, "El stock minimo debe ser mayor o igual a 0"),
  maxStock: z
    .number()
    .int()
    .min(0, "El stock maximo debe ser mayor o igual a 0")
    .optional(),
  categoryId: z.string().min(1, "La categoria es requerida"),
  warehouseId: z.string().min(1, "La bodega es requerida"),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]),
});

type ProductFormData = z.infer<typeof productSchema>;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

// Status options
const statusOptions = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "DISCONTINUED", label: "Descontinuado" },
];

export default function NewProductPage() {
  const navigate = useNavigate();
  const {
    categories,
    warehouses,
    isLoading: isLoadingFormData,
  } = useProductFormData();
  const createProduct = useCreateProduct();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      barcode: "",
      price: 0,
      cost: 0,
      quantity: 0,
      minStock: 10,
      maxStock: undefined,
      categoryId: "",
      warehouseId: "",
      status: "ACTIVE",
    },
  });

  const onSubmit = (data: ProductFormData) => {
    const productData: CreateProductData = {
      ...data,
      description: data.description || undefined,
      barcode: data.barcode || undefined,
      maxStock: data.maxStock || undefined,
    };
    createProduct.mutate(productData);
  };

  // Category and warehouse options
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const warehouseOptions = warehouses.map((w) => ({
    value: w.id,
    label: w.name,
  }));

  // Calculate margin for preview
  const price = watch("price");
  const cost = watch("cost");
  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

  if (isLoadingFormData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
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
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-4">
          <Link to="/products">
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Nuevo Producto
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Agrega un nuevo producto al inventario
            </p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main form */}
          <motion.div
            variants={itemVariants}
            className="space-y-6 lg:col-span-2"
          >
            {/* Basic info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary-500" />
                  Informacion Basica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Nombre del producto *
                  </label>
                  <Input
                    {...register("name")}
                    placeholder="Ej: iPhone 15 Pro Max"
                    error={!!errors.name}
                  />
                  {errors.name && (
                    <p className="text-sm text-error-500">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Descripcion
                  </label>
                  <textarea
                    {...register("description")}
                    placeholder="Descripcion del producto..."
                    rows={3}
                    className={cn(
                      "flex w-full rounded-xl border bg-white px-4 py-3 text-sm",
                      "transition-colors duration-200 resize-none",
                      "placeholder:text-neutral-400",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                      "dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500",
                      errors.description
                        ? "border-error-500 focus:ring-error-500 focus:border-error-500"
                        : "border-neutral-200 dark:border-neutral-700",
                    )}
                  />
                  {errors.description && (
                    <p className="text-sm text-error-500">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* SKU and Barcode */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      SKU *
                    </label>
                    <Input
                      {...register("sku")}
                      placeholder="Ej: APL-IP15PM-256"
                      error={!!errors.sku}
                      leftElement={
                        <Barcode className="h-4 w-4 text-neutral-400" />
                      }
                    />
                    {errors.sku && (
                      <p className="text-sm text-error-500">
                        {errors.sku.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Codigo de Barras
                    </label>
                    <Input
                      {...register("barcode")}
                      placeholder="Ej: 194253121234"
                      error={!!errors.barcode}
                    />
                    {errors.barcode && (
                      <p className="text-sm text-error-500">
                        {errors.barcode.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-success-500" />
                  Precio y Costo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Price */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Precio de Venta *
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      {...register("price", { valueAsNumber: true })}
                      placeholder="0"
                      error={!!errors.price}
                      leftElement={<span className="text-neutral-400">$</span>}
                    />
                    {errors.price && (
                      <p className="text-sm text-error-500">
                        {errors.price.message}
                      </p>
                    )}
                  </div>

                  {/* Cost */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Costo *
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      {...register("cost", { valueAsNumber: true })}
                      placeholder="0"
                      error={!!errors.cost}
                      leftElement={<span className="text-neutral-400">$</span>}
                    />
                    {errors.cost && (
                      <p className="text-sm text-error-500">
                        {errors.cost.message}
                      </p>
                    )}
                  </div>

                  {/* Margin preview */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Margen
                    </label>
                    <div
                      className={cn(
                        "flex h-11 items-center justify-center rounded-xl px-4 font-semibold",
                        margin >= 30
                          ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300"
                          : margin >= 15
                            ? "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300"
                            : "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300",
                      )}
                    >
                      {margin.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-warning-500" />
                  Inventario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Quantity */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Cantidad Inicial *
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      {...register("quantity", { valueAsNumber: true })}
                      placeholder="0"
                      error={!!errors.quantity}
                    />
                    {errors.quantity && (
                      <p className="text-sm text-error-500">
                        {errors.quantity.message}
                      </p>
                    )}
                  </div>

                  {/* Min Stock */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Stock Minimo *
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      {...register("minStock", { valueAsNumber: true })}
                      placeholder="10"
                      error={!!errors.minStock}
                    />
                    {errors.minStock && (
                      <p className="text-sm text-error-500">
                        {errors.minStock.message}
                      </p>
                    )}
                  </div>

                  {/* Max Stock */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Stock Maximo
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      {...register("maxStock", { valueAsNumber: true })}
                      placeholder="100"
                      error={!!errors.maxStock}
                    />
                    {errors.maxStock && (
                      <p className="text-sm text-error-500">
                        {errors.maxStock.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Classification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5 text-purple-500" />
                  Clasificacion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Categoria *
                    </label>
                    <Controller
                      name="categoryId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          options={categoryOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Seleccionar categoria"
                          error={!!errors.categoryId}
                        />
                      )}
                    />
                    {errors.categoryId && (
                      <p className="text-sm text-error-500">
                        {errors.categoryId.message}
                      </p>
                    )}
                  </div>

                  {/* Warehouse */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Bodega *
                    </label>
                    <Controller
                      name="warehouseId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          options={warehouseOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Seleccionar bodega"
                          error={!!errors.warehouseId}
                        />
                      )}
                    />
                    {errors.warehouseId && (
                      <p className="text-sm text-error-500">
                        {errors.warehouseId.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={statusOptions}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* Image upload placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Imagenes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-8 dark:border-neutral-700 dark:bg-neutral-800/50">
                  <ImagePlus className="mb-3 h-10 w-10 text-neutral-400" />
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Subir imagenes
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">Proximamente</p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card padding="md">
              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={createProduct.isPending || isSubmitting}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Guardar Producto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/products")}
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </form>
    </motion.div>
  );
}
