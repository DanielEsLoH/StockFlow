import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router";
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
  ImagePlus,
  X,
  Loader2,
} from "lucide-react";
import type { Route } from "./+types/_app.products.$id.edit";
import { cn } from "~/lib/utils";
import {
  useProduct,
  useUpdateProduct,
  useProductFormData,
} from "~/hooks/useProducts";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";
import { Skeleton } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import { toast } from "~/components/ui/Toast";
import { productsService } from "~/services/products.service";
import type { UpdateProductData } from "~/types/product";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: `Editar Producto - StockFlow` },
    { name: "description", content: "Editar producto" },
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
  salePrice: z.number().min(0, "El precio debe ser mayor o igual a 0"),
  costPrice: z.number().min(0, "El costo debe ser mayor o igual a 0"),
  taxRate: z.number().min(0).max(100).optional(),
  minStock: z
    .number()
    .int()
    .min(0, "El stock minimo debe ser mayor o igual a 0"),
  maxStock: z.preprocess(
    (val) => (val === "" || Number.isNaN(val) ? undefined : Number(val)),
    z
      .number()
      .int()
      .min(0, "El stock maximo debe ser mayor o igual a 0")
      .optional(),
  ),
  categoryId: z.string().optional(),
  brand: z.string().max(100).optional(),
  unit: z.string().max(20).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED", "OUT_OF_STOCK"]),
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

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten archivos de imagen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }
    setIsUploading(true);
    try {
      const { url } = await productsService.uploadProductImage(file);
      setImageUrl(url);
    } catch {
      toast.error("Error al subir la imagen");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleImageUpload(file);
    },
    [handleImageUpload],
  );

  const {
    data: product,
    isLoading: isLoadingProduct,
    isError,
    error,
  } = useProduct(id!);
  const { categories, isLoading: isLoadingFormData } = useProductFormData();
  const updateProduct = useUpdateProduct();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  // Populate form when product data is loaded
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description || "",
        sku: product.sku,
        barcode: product.barcode || "",
        salePrice: product.salePrice,
        costPrice: product.costPrice,
        taxRate: product.taxRate,
        minStock: product.minStock,
        maxStock: product.maxStock || undefined,
        categoryId: product.categoryId || undefined,
        brand: product.brand || "",
        unit: product.unit,
        status: product.status,
      });
      setImageUrl(product.imageUrl || null);
    }
  }, [product, reset]);

  const onSubmit = (data: ProductFormData) => {
    if (!id) return;

    const productData: UpdateProductData = {
      ...data,
      description: data.description || undefined,
      barcode: data.barcode || undefined,
      maxStock: data.maxStock || undefined,
      imageUrl: imageUrl || undefined,
    };

    updateProduct.mutate({ id, data: productData });
  };

  // Category options
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  // Calculate margin for preview
  const salePrice = watch("salePrice") || 0;
  const costPrice = watch("costPrice") || 0;
  const margin =
    salePrice > 0 ? ((salePrice - costPrice) / salePrice) * 100 : 0;

  const isLoading = isLoadingProduct || isLoadingFormData;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !product) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/products")}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Volver a productos
        </Button>
        <Card>
          <EmptyState
            type="error"
            title="Producto no encontrado"
            description={
              error?.message ||
              "El producto que buscas no existe o fue eliminado."
            }
            action={{
              label: "Ver productos",
              onClick: () => navigate("/products"),
            }}
          />
        </Card>
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
          <Link to={`/products/${id}`}>
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Editar Producto
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              {product.name}
            </p>
          </div>
        </div>

        {(isDirty || imageUrl !== (product?.imageUrl || null)) && (
          <div className="flex items-center gap-2 text-sm text-warning-600 dark:text-warning-400">
            <span className="h-2 w-2 rounded-full bg-warning-500" />
            Tienes cambios sin guardar
          </div>
        )}
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
                  {/* Sale Price */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Precio de Venta *
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      {...register("salePrice", { valueAsNumber: true })}
                      placeholder="0"
                      error={!!errors.salePrice}
                      leftElement={<span className="text-neutral-400">$</span>}
                    />
                    {errors.salePrice && (
                      <p className="text-sm text-error-500">
                        {errors.salePrice.message}
                      </p>
                    )}
                  </div>

                  {/* Cost Price */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Costo *
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      {...register("costPrice", { valueAsNumber: true })}
                      placeholder="0"
                      error={!!errors.costPrice}
                      leftElement={<span className="text-neutral-400">$</span>}
                    />
                    {errors.costPrice && (
                      <p className="text-sm text-error-500">
                        {errors.costPrice.message}
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
                  {/* Stock info - read only */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Stock Actual
                    </label>
                    <div className="flex h-11 items-center rounded-xl bg-neutral-100 px-4 font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {product?.stock ?? 0} unidades
                    </div>
                    <p className="text-xs text-neutral-500">
                      El stock se ajusta desde movimientos de inventario
                    </p>
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
                  <Package className="h-5 w-5 text-purple-500" />
                  Clasificacion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Categoria
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

                  {/* Brand */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Marca
                    </label>
                    <Input
                      {...register("brand")}
                      placeholder="Marca del producto"
                      error={!!errors.brand}
                    />
                    {errors.brand && (
                      <p className="text-sm text-error-500">
                        {errors.brand.message}
                      </p>
                    )}
                  </div>

                  {/* Unit */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Unidad
                    </label>
                    <Input
                      {...register("unit")}
                      placeholder="UND, KG, L, etc."
                      error={!!errors.unit}
                    />
                    {errors.unit && (
                      <p className="text-sm text-error-500">
                        {errors.unit.message}
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

            {/* Image upload */}
            <Card>
              <CardHeader>
                <CardTitle>Imagen</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                    e.target.value = "";
                  }}
                />
                {imageUrl ? (
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <img
                      src={imageUrl}
                      alt={product?.name || "Producto"}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    disabled={isUploading}
                    className={cn(
                      "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
                      isDragging
                        ? "border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20"
                        : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800/50 dark:hover:border-neutral-600",
                    )}
                  >
                    {isUploading ? (
                      <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary-500" />
                    ) : (
                      <ImagePlus className="mb-3 h-10 w-10 text-neutral-400" />
                    )}
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      {isUploading ? "Subiendo..." : "Click o arrastra una imagen"}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      JPG, PNG, GIF o WebP. Max 5MB
                    </p>
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card padding="md">
              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={updateProduct.isPending || isSubmitting}
                  leftIcon={<Save className="h-4 w-4" />}
                  disabled={!isDirty && imageUrl === (product?.imageUrl || null)}
                >
                  Guardar Cambios
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/products/${id}`)}
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
