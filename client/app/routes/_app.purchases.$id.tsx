import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  ShoppingCart,
  Pencil,
  Trash2,
  Calendar,
  User,
  Warehouse,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Package,
  Loader2,
  Truck,
} from "lucide-react";
import type { Route } from "./+types/_app.purchases.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatDate, formatCurrency } from "~/lib/utils";
import {
  usePurchaseOrder,
  useDeletePurchaseOrder,
  useSendPurchaseOrder,
  useConfirmPurchaseOrder,
  useReceivePurchaseOrder,
  useCancelPurchaseOrder,
} from "~/hooks/usePurchaseOrders";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import { DeleteModal } from "~/components/ui/DeleteModal";
import { ConfirmModal } from "~/components/ui/Modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import type { PurchaseOrderStatus } from "~/types/purchase-order";
import { PurchaseOrderStatusLabels } from "~/types/purchase-order";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Orden de Compra - StockFlow" },
    { name: "description", content: "Detalles de la orden de compra" },
  ];
};

// Status badge component with icon
function PurchaseOrderStatusBadge({
  status,
  size = "md",
}: {
  status: PurchaseOrderStatus;
  size?: "sm" | "md" | "lg";
}) {
  const config: Record<
    PurchaseOrderStatus,
    {
      label: string;
      variant:
        | "default"
        | "primary"
        | "secondary"
        | "success"
        | "warning"
        | "error";
      icon: React.ReactNode;
    }
  > = {
    DRAFT: {
      label: "Borrador",
      variant: "secondary",
      icon: <ShoppingCart className="h-3 w-3" />,
    },
    SENT: {
      label: "Enviada",
      variant: "primary",
      icon: <Send className="h-3 w-3" />,
    },
    CONFIRMED: {
      label: "Confirmada",
      variant: "warning",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    RECEIVED: {
      label: "Recibida",
      variant: "success",
      icon: <Package className="h-3 w-3" />,
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data: order, isLoading, isError } = usePurchaseOrder(id!);
  const deletePurchaseOrder = useDeletePurchaseOrder();
  const sendPurchaseOrder = useSendPurchaseOrder();
  const confirmPurchaseOrder = useConfirmPurchaseOrder();
  const receivePurchaseOrder = useReceivePurchaseOrder();
  const cancelPurchaseOrder = useCancelPurchaseOrder();
  const { hasPermission } = usePermissions();

  const canEdit = hasPermission(Permission.PURCHASE_ORDERS_EDIT);
  const canDeletePO = hasPermission(Permission.PURCHASE_ORDERS_DELETE);
  const canSend = hasPermission(Permission.PURCHASE_ORDERS_SEND);
  const canConfirm = hasPermission(Permission.PURCHASE_ORDERS_CONFIRM);
  const canReceive = hasPermission(Permission.PURCHASE_ORDERS_RECEIVE);
  const canCancel = hasPermission(Permission.PURCHASE_ORDERS_CANCEL);

  const handleDelete = async () => {
    await deletePurchaseOrder.mutateAsync(id!);
    setShowDeleteModal(false);
    navigate("/purchases");
  };

  const handleSend = () => {
    if (id) {
      sendPurchaseOrder.mutate(id);
    }
  };

  const handleConfirm = () => {
    if (id) {
      confirmPurchaseOrder.mutate(id);
    }
  };

  const handleReceive = () => {
    if (id) {
      receivePurchaseOrder.mutate(id, {
        onSuccess: () => setShowReceiveModal(false),
      });
    }
  };

  const handleCancel = () => {
    if (id) {
      cancelPurchaseOrder.mutate(id, {
        onSuccess: () => setShowCancelModal(false),
      });
    }
  };

  const getUserDisplayName = () => {
    if (!order?.user) return null;
    return order.user.name || order.user.email;
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ShoppingCart className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Orden de compra no encontrada
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          La orden de compra que buscas no existe o fue eliminada.
        </p>
        <Link to="/purchases">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a ordenes de compra
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
            <Link to="/purchases">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                  Orden de Compra {order.purchaseOrderNumber}
                </h1>
                <PurchaseOrderStatusBadge status={order.status} size="lg" />
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                Creada el {formatDate(order.createdAt)}
              </p>
            </div>
          </div>

          {/* Action buttons by status */}
          <div className="flex flex-wrap gap-2 ml-14 sm:ml-0">
            {/* DRAFT actions */}
            {order.status === "DRAFT" && (
              <>
                {canEdit && (
                  <Link to={`/purchases/${id}/edit`}>
                    <Button variant="outline">
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </Link>
                )}
                {canSend && (
                  <Button
                    variant="primary"
                    onClick={handleSend}
                    disabled={sendPurchaseOrder.isPending}
                  >
                    {sendPurchaseOrder.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar
                  </Button>
                )}
                {canDeletePO && (
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                )}
              </>
            )}

            {/* SENT actions */}
            {order.status === "SENT" && (
              <>
                {canConfirm && (
                  <Button
                    variant="primary"
                    onClick={handleConfirm}
                    disabled={confirmPurchaseOrder.isPending}
                  >
                    {confirmPurchaseOrder.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Confirmar
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="danger"
                    onClick={() => setShowCancelModal(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
              </>
            )}

            {/* CONFIRMED actions */}
            {order.status === "CONFIRMED" && (
              <>
                {canReceive && (
                  <Button
                    variant="primary"
                    onClick={() => setShowReceiveModal(true)}
                    disabled={receivePurchaseOrder.isPending}
                  >
                    {receivePurchaseOrder.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Truck className="h-4 w-4 mr-2" />
                    )}
                    Recibir Mercancia
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="danger"
                    onClick={() => setShowCancelModal(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </PageSection>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Supplier data */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary-500" />
                Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.supplier ? (
                <>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {order.supplier.name}
                    </p>
                    {order.supplier.documentNumber && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        NIT: {order.supplier.documentNumber}
                      </p>
                    )}
                  </div>

                  {order.supplier.email && (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      {order.supplier.email}
                    </p>
                  )}

                  {order.supplier.phone && (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      {order.supplier.phone}
                    </p>
                  )}

                  {order.supplierId && (
                    <Link to={`/suppliers/${order.supplierId}`}>
                      <Button variant="ghost" size="sm" className="w-full mt-2">
                        Ver proveedor
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center py-6 text-neutral-400 dark:text-neutral-500">
                  <User className="h-8 w-8 mb-2" />
                  <p className="text-sm">Sin proveedor asignado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </PageSection>

        {/* Warehouse data */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-primary-500" />
                Bodega Destino
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.warehouse ? (
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    {order.warehouse.name}
                  </p>
                  {order.warehouse.code && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Codigo: {order.warehouse.code}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-neutral-400 dark:text-neutral-500">
                  <Warehouse className="h-8 w-8 mb-2" />
                  <p className="text-sm">Sin bodega asignada</p>
                </div>
              )}

              {order.user && (
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Creado por
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <User className="h-4 w-4 text-neutral-400" />
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {getUserDisplayName()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </PageSection>

        {/* Order details */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary-500" />
                Detalles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Fecha de Emision
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {formatDate(order.issueDate)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Fecha Entrega Esperada
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="h-4 w-4 text-neutral-400" />
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {order.expectedDeliveryDate
                        ? formatDate(order.expectedDeliveryDate)
                        : "No especificada"}
                    </p>
                  </div>
                </div>

                {order.receivedDate && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Fecha de Recepcion
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Package className="h-4 w-4 text-success-500" />
                      <p className="font-medium text-success-600 dark:text-success-400">
                        {formatDate(order.receivedDate)}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Estado
                  </p>
                  <div className="mt-1">
                    <PurchaseOrderStatusBadge status={order.status} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      </div>

      {/* Items table */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle>Items de la Orden</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">
                      Impuesto
                    </TableHead>
                    <TableHead className="text-right hidden md:table-cell">
                      Descuento
                    </TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {item.product?.name || "Producto eliminado"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                          {item.product?.sku || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {item.taxRate > 0 ? `${item.taxRate}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {item.discount > 0 ? (
                          <span className="text-error-600 dark:text-error-400">
                            {formatCurrency(item.discount)}
                          </span>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Totals section */}
      <PageSection>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2 sm:w-64 sm:ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Subtotal
                </span>
                <span className="text-neutral-900 dark:text-white">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  IVA
                </span>
                <span className="text-neutral-900 dark:text-white">
                  {formatCurrency(order.tax)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Descuento
                  </span>
                  <span className="text-error-600 dark:text-error-400">
                    -{formatCurrency(order.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span className="font-semibold text-neutral-900 dark:text-white">
                  Total
                </span>
                <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Notes */}
      {order.notes && (
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {order.notes}
              </p>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Delete Modal */}
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        itemName={order.purchaseOrderNumber}
        itemType="orden de compra"
        onConfirm={handleDelete}
        isLoading={deletePurchaseOrder.isPending}
      />

      {/* Receive Confirmation Modal */}
      <ConfirmModal
        open={showReceiveModal}
        onOpenChange={setShowReceiveModal}
        title="Recibir Mercancia"
        description="Esta accion actualizara el inventario y los precios de costo de los productos. No se puede deshacer."
        confirmLabel="Recibir Mercancia"
        cancelLabel="Cancelar"
        onConfirm={handleReceive}
        isLoading={receivePurchaseOrder.isPending}
        variant="warning"
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        title="Cancelar Orden de Compra"
        description={`¿Estas seguro de cancelar la orden "${order.purchaseOrderNumber}"? Esta accion no se puede deshacer.`}
        confirmLabel="Cancelar Orden"
        cancelLabel="Volver"
        onConfirm={handleCancel}
        isLoading={cancelPurchaseOrder.isPending}
        variant="danger"
      />
    </PageWrapper>
  );
}
