import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Warehouse,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Mail,
  User,
  Package,
  AlertTriangle,
  DollarSign,
  Percent,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { Route } from "./+types/_app.warehouses.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatDate, formatCurrency } from "~/lib/utils";
import {
  useWarehouse,
  useWarehouseStats,
  useDeleteWarehouse,
} from "~/hooks/useWarehouses";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { StatCard } from "~/components/ui/StatCard";
import { Skeleton } from "~/components/ui/Skeleton";
import { DeleteModal } from "~/components/ui/DeleteModal";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: `Bodega - StockFlow` },
    { name: "description", content: "Detalles de la bodega" },
  ];
};

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: warehouse, isLoading, isError } = useWarehouse(id!);
  const { data: stats } = useWarehouseStats(id!);
  const deleteWarehouse = useDeleteWarehouse();

  const handleDelete = async () => {
    await deleteWarehouse.mutateAsync(id!);
    setShowDeleteModal(false);
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
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Link to="/warehouses">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                <Warehouse className="h-7 w-7 text-primary-500" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                    {warehouse.name}
                  </h1>
                  {warehouse.isActive ? (
                    <Badge variant="success">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Activa
                    </Badge>
                  ) : (
                    <Badge variant="error">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactiva
                    </Badge>
                  )}
                </div>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                  {warehouse.address}, {warehouse.city}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-14 sm:ml-0">
            <Link to={`/warehouses/${id}/edit`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </Link>
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      </PageSection>

      {/* Stats */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Package}
            label="Total Productos"
            value={stats?.totalProducts || 0}
            color="primary"
          />
          <StatCard
            icon={AlertTriangle}
            label="Stock Bajo"
            value={stats?.lowStockProducts || 0}
            color="warning"
          />
          <StatCard
            icon={DollarSign}
            label="Valor Inventario"
            value={formatCurrency(stats?.totalValue || 0)}
            color="success"
          />
          <StatCard
            icon={Percent}
            label="Utilizacion"
            value={`${stats?.utilizationPercentage || 0}%`}
            subtitle={
              warehouse.capacity
                ? `${warehouse.currentOccupancy || 0} / ${warehouse.capacity}`
                : "Sin capacidad definida"
            }
            color={
              (stats?.utilizationPercentage || 0) > 90
                ? "error"
                : (stats?.utilizationPercentage || 0) > 70
                  ? "warning"
                  : "primary"
            }
          />
        </div>
      </PageSection>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Info */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Informacion de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <MapPin className="h-5 w-5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Direccion
                  </p>
                  <p className="text-neutral-900 dark:text-white">
                    {warehouse.address || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <MapPin className="h-5 w-5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Ciudad
                  </p>
                  <p className="text-neutral-900 dark:text-white">
                    {warehouse.city || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <Phone className="h-5 w-5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Telefono
                  </p>
                  <p className="text-neutral-900 dark:text-white">
                    {warehouse.phone || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <Mail className="h-5 w-5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Email
                  </p>
                  <p className="text-neutral-900 dark:text-white">
                    {warehouse.email || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <User className="h-5 w-5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Encargado
                  </p>
                  <p className="text-neutral-900 dark:text-white">
                    {warehouse.manager || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* Additional Info */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Informacion Adicional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Capacidad
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {warehouse.capacity
                    ? `${warehouse.capacity} unidades`
                    : "No definida"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Ocupacion Actual
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {warehouse.currentOccupancy || 0} unidades
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Total Productos
                </span>
                <Badge variant="secondary">
                  <Package className="h-3 w-3 mr-1" />
                  {warehouse.productCount || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Fecha de Creacion
                </span>
                <span className="text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-neutral-400" />
                  {formatDate(warehouse.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Ultima Actualizacion
                </span>
                <span className="text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-neutral-400" />
                  {formatDate(warehouse.updatedAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      </div>

      {/* Delete Modal */}
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        itemName={warehouse.name}
        itemType="bodega"
        onConfirm={handleDelete}
        isLoading={deleteWarehouse.isPending}
      />
    </PageWrapper>
  );
}
