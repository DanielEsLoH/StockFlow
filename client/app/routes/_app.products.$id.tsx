import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Package,
  Tag,
  Calendar,
  Barcode,
  AlertTriangle,
  Warehouse,
} from "lucide-react";
import type { Route } from "./+types/_app.products.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatCurrency, formatDate } from "~/lib/utils";
import { useProduct, useDeleteProduct } from "~/hooks/useProducts";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge, StatusBadge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import { DeleteModal } from "~/components/ui/Modal";
import { EmptyState } from "~/components/ui/EmptyState";

// Meta for SEO
export const meta: Route.MetaFunction = ({ params }) => {
  return [
    { title: `Producto ${params.id} - StockFlow` },
    { name: "description", content: "Detalles del producto" },
  ];
};

// Info row component
function InfoRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
        <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {label}
        </p>
        <p className="font-medium text-neutral-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: product, isLoading, isError, error } = useProduct(id!);
  const deleteProduct = useDeleteProduct();

  const handleDelete = () => {
    if (id) {
      deleteProduct.mutate(id);
    }
  };

  // Calculate margin
  const margin = product
    ? ((product.salePrice - product.costPrice) / product.salePrice) * 100
    : 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-8 w-48" />
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Skeleton className="aspect-square w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
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
    <PageWrapper>
      {/* Header */}
      <PageSection
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
              {product.name}
            </h1>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-neutral-500 dark:text-neutral-400">
                SKU: {product.sku}
              </span>
              <StatusBadge status={product.status} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/products/${product.id}/edit`}>
            <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />}>
              Editar
            </Button>
          </Link>
          <Button
            variant="danger"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => setShowDeleteModal(true)}
          >
            Eliminar
          </Button>
        </div>
      </PageSection>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Product image */}
        <PageSection className="lg:col-span-1">
          <Card padding="none" className="overflow-hidden">
            <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-24 w-24 text-neutral-300 dark:text-neutral-600" />
                </div>
              )}
            </div>
          </Card>
        </PageSection>

        {/* Product info */}
        <PageSection className="space-y-6 lg:col-span-2">
          {/* Description */}
          {product.description && (
            <Card>
              <CardHeader>
                <CardTitle>Descripcion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {product.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Precio y Costo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="rounded-xl bg-primary-50 p-4 dark:bg-primary-900/20">
                  <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                    Precio de Venta
                  </p>
                  <p className="mt-1 text-2xl font-bold text-primary-700 dark:text-primary-300">
                    {formatCurrency(product.salePrice)}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-100 p-4 dark:bg-neutral-800">
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Costo
                  </p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(product.costPrice)}
                  </p>
                </div>
                <div className="rounded-xl bg-success-50 p-4 dark:bg-success-900/20">
                  <p className="text-sm font-medium text-success-600 dark:text-success-400">
                    Margen
                  </p>
                  <p className="mt-1 text-2xl font-bold text-success-700 dark:text-success-300">
                    {margin.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock */}
          <Card>
            <CardHeader>
              <CardTitle>Inventario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div
                  className={cn(
                    "rounded-xl p-4",
                    product.stock <= product.minStock
                      ? "bg-error-50 dark:bg-error-900/20"
                      : "bg-success-50 dark:bg-success-900/20",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          product.stock <= product.minStock
                            ? "text-error-600 dark:text-error-400"
                            : "text-success-600 dark:text-success-400",
                        )}
                      >
                        Stock Actual
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-3xl font-bold",
                          product.stock <= product.minStock
                            ? "text-error-700 dark:text-error-300"
                            : "text-success-700 dark:text-success-300",
                        )}
                      >
                        {product.stock} uds
                      </p>
                    </div>
                    {product.stock <= product.minStock && (
                      <AlertTriangle className="h-8 w-8 text-error-500" />
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-neutral-100 p-3 dark:bg-neutral-800">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      Stock Minimo
                    </span>
                    <span className="font-medium">{product.minStock} uds</span>
                  </div>
                  {product.maxStock && (
                    <div className="flex items-center justify-between rounded-lg bg-neutral-100 p-3 dark:bg-neutral-800">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        Stock Maximo
                      </span>
                      <span className="font-medium">
                        {product.maxStock} uds
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {product.warehouseStocks && product.warehouseStocks.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    Distribucion por Bodega
                  </p>
                  <div className="space-y-2">
                    {product.warehouseStocks.map((ws) => (
                      <div
                        key={ws.warehouseId}
                        className="flex items-center justify-between rounded-lg bg-neutral-100 p-3 dark:bg-neutral-800"
                      >
                        <div className="flex items-center gap-2">
                          <Warehouse className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            {ws.warehouseName}
                          </span>
                        </div>
                        <span className="font-medium">{ws.quantity} uds</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow
                  icon={Tag}
                  label="Categoria"
                  value={product.category?.name || "-"}
                />
                <InfoRow
                  icon={Package}
                  label="Marca"
                  value={product.brand || "-"}
                />
                <InfoRow
                  icon={Barcode}
                  label="Codigo de Barras"
                  value={product.barcode || "-"}
                />
                <InfoRow icon={Package} label="Unidad" value={product.unit} />
                <InfoRow
                  icon={Calendar}
                  label="Creado"
                  value={formatDate(product.createdAt)}
                />
                <InfoRow
                  icon={Calendar}
                  label="Ultima Actualizacion"
                  value={formatDate(product.updatedAt)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Stock Movement History Placeholder */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Historial de Movimientos</CardTitle>
              <Badge variant="secondary">Proximamente</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <p className="text-neutral-500 dark:text-neutral-400">
                  El historial de movimientos de stock estara disponible pronto.
                </p>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      </div>

      {/* Delete Modal */}
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        itemName={product.name}
        onConfirm={handleDelete}
        isLoading={deleteProduct.isPending}
      />
    </PageWrapper>
  );
}
