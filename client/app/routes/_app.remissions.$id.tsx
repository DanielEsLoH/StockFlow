import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Truck,
  Trash2,
  Calendar,
  User,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Loader2,
  Warehouse,
  FileText,
  Send,
} from "lucide-react";
import type { Route } from "./+types/_app.remissions.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatDate } from "~/lib/utils";
import {
  useRemission,
  useDeleteRemission,
  useDispatchRemission,
  useDeliverRemission,
  useCancelRemission,
} from "~/hooks/useRemissions";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import { DeleteModal } from "~/components/ui/DeleteModal";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import type { RemissionStatus } from "~/types/remission";
import { remissionStatusLabels } from "~/types/remission";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Remision - StockFlow" },
    { name: "description", content: "Detalles de la remision" },
  ];
};

// Status badge with icon
function RemissionStatusBadge({
  status,
  size = "md",
}: {
  status: RemissionStatus;
  size?: "sm" | "md" | "lg";
}) {
  const config: Record<
    RemissionStatus,
    {
      label: string;
      variant: "default" | "primary" | "secondary" | "success" | "warning" | "error";
      icon: React.ReactNode;
    }
  > = {
    DRAFT: {
      label: "Borrador",
      variant: "secondary",
      icon: <Clock className="h-3 w-3" />,
    },
    DISPATCHED: {
      label: "Despachada",
      variant: "warning",
      icon: <Truck className="h-3 w-3" />,
    },
    DELIVERED: {
      label: "Entregada",
      variant: "success",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    CANCELLED: {
      label: "Cancelada",
      variant: "error",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const { label, variant, icon } = config[status];

  return (
    <Badge variant={variant} size={size} icon={icon}>
      {label}
    </Badge>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// Info row component
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | React.ReactNode | null;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-neutral-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {label}
        </p>
        <p className="text-sm font-medium text-neutral-900 dark:text-white">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

export default function RemissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: remission, isLoading, isError } = useRemission(id!);
  const deleteRemission = useDeleteRemission();
  const dispatchRemission = useDispatchRemission();
  const deliverRemission = useDeliverRemission();
  const cancelRemission = useCancelRemission();

  const handleDelete = async () => {
    await deleteRemission.mutateAsync(id!);
    setShowDeleteModal(false);
    navigate("/remissions");
  };

  const handleDispatch = () => {
    if (id) dispatchRemission.mutate(id);
  };

  const handleDeliver = () => {
    if (id) deliverRemission.mutate(id);
  };

  const handleCancel = () => {
    if (id) cancelRemission.mutate(id);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !remission) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Truck className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Remision no encontrada
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          La remision que buscas no existe o fue eliminada.
        </p>
        <Link to="/remissions">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a remisiones
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
            <Link to="/remissions">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                  Remision {remission.remissionNumber}
                </h1>
                <RemissionStatusBadge status={remission.status} size="lg" />
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                Creada el {formatDate(remission.createdAt)}
              </p>
            </div>
          </div>

          {/* Action buttons by status */}
          <div className="flex flex-wrap gap-2 ml-14 sm:ml-0">
            {/* DRAFT actions */}
            {remission.status === "DRAFT" && (
              <>
                <Button
                  variant="primary"
                  onClick={handleDispatch}
                  disabled={dispatchRemission.isPending}
                >
                  {dispatchRemission.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Despachar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={cancelRemission.isPending}
                >
                  {cancelRemission.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </>
            )}

            {/* DISPATCHED actions */}
            {remission.status === "DISPATCHED" && (
              <>
                <Button
                  variant="primary"
                  onClick={handleDeliver}
                  disabled={deliverRemission.isPending}
                >
                  {deliverRemission.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Marcar Entregada
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={cancelRemission.isPending}
                >
                  {cancelRemission.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Cancelar
                </Button>
              </>
            )}

            {/* DELIVERED - link to invoice if exists */}
            {remission.status === "DELIVERED" && remission.invoiceId && (
              <Link to={`/invoices/${remission.invoiceId}`}>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Factura
                </Button>
              </Link>
            )}
          </div>
        </div>
      </PageSection>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer & general info */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary-500" />
                Informacion General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow
                icon={User}
                label="Cliente"
                value={remission.customer?.name}
              />
              <InfoRow
                icon={Calendar}
                label="Fecha de emision"
                value={formatDate(remission.issueDate)}
              />
              <InfoRow
                icon={Calendar}
                label="Fecha de entrega"
                value={
                  remission.deliveryDate
                    ? formatDate(remission.deliveryDate)
                    : null
                }
              />
              {remission.invoice && (
                <InfoRow
                  icon={FileText}
                  label="Factura asociada"
                  value={
                    <Link
                      to={`/invoices/${remission.invoice.id}`}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                      {remission.invoice.invoiceNumber}
                    </Link>
                  }
                />
              )}
            </CardContent>
          </Card>
        </PageSection>

        {/* Delivery info */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary-500" />
                Informacion de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow
                icon={Warehouse}
                label="Bodega de origen"
                value={remission.warehouse?.name}
              />
              <InfoRow
                icon={MapPin}
                label="Direccion de entrega"
                value={remission.deliveryAddress}
              />
              <InfoRow
                icon={Truck}
                label="Informacion de transporte"
                value={remission.transportInfo}
              />
              {remission.notes && (
                <InfoRow
                  icon={FileText}
                  label="Notas"
                  value={remission.notes}
                />
              )}
            </CardContent>
          </Card>
        </PageSection>
      </div>

      {/* Items table */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary-500" />
              Items ({remission.items?.length || 0})
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Descripcion</TableHead>
                <TableHead className="text-center">Cantidad</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="hidden sm:table-cell">Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(remission.items || []).map((item) => (
                <TableRow
                  key={item.id}
                  className="border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                >
                  <TableCell>
                    {item.product ? (
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {item.product.sku}
                        </p>
                      </div>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      {item.description}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {item.quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {item.unit}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-xs">
                      {item.notes || "—"}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
              {(!remission.items || remission.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-neutral-500 dark:text-neutral-400">
                      No hay items en esta remision
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </PageSection>

      {/* Delete Modal */}
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        itemName={remission.remissionNumber}
        itemType="remision"
        onConfirm={handleDelete}
        isLoading={deleteRemission.isPending}
      />
    </PageWrapper>
  );
}
