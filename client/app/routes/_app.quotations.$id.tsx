import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  ClipboardList,
  Pencil,
  Trash2,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  FileText,
  Loader2,
  ArrowRight,
} from "lucide-react";
import type { Route } from "./+types/_app.quotations.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatDate, formatCurrency } from "~/lib/utils";
import {
  useQuotation,
  useDeleteQuotation,
  useSendQuotation,
  useAcceptQuotation,
  useRejectQuotation,
  useConvertToInvoice,
} from "~/hooks/useQuotations";
import { usePermissions } from "~/hooks/usePermissions";
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
import type { QuotationStatus } from "~/types/quotation";
import { QuotationStatusLabels } from "~/types/quotation";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Cotizacion - StockFlow" },
    { name: "description", content: "Detalles de la cotizacion" },
  ];
};

// Status badge component with icon
function QuotationStatusBadge({
  status,
  size = "md",
}: {
  status: QuotationStatus;
  size?: "sm" | "md" | "lg";
}) {
  const config: Record<
    QuotationStatus,
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
      icon: <ClipboardList className="h-3 w-3" />,
    },
    SENT: {
      label: "Enviada",
      variant: "primary",
      icon: <Send className="h-3 w-3" />,
    },
    ACCEPTED: {
      label: "Aceptada",
      variant: "success",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    REJECTED: {
      label: "Rechazada",
      variant: "error",
      icon: <XCircle className="h-3 w-3" />,
    },
    EXPIRED: {
      label: "Vencida",
      variant: "warning",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    CONVERTED: {
      label: "Convertida",
      variant: "primary",
      icon: <FileText className="h-3 w-3" />,
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

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: quotation, isLoading, isError } = useQuotation(id!);
  const deleteQuotation = useDeleteQuotation();
  const sendQuotation = useSendQuotation();
  const acceptQuotation = useAcceptQuotation();
  const rejectQuotation = useRejectQuotation();
  const convertToInvoice = useConvertToInvoice();
  const { canEditQuotations, canDeleteQuotations, canConvertQuotations } =
    usePermissions();

  const handleDelete = async () => {
    await deleteQuotation.mutateAsync(id!);
    setShowDeleteModal(false);
    navigate("/quotations");
  };

  const handleSend = () => {
    if (id) {
      sendQuotation.mutate(id);
    }
  };

  const handleAccept = () => {
    if (id) {
      acceptQuotation.mutate(id);
    }
  };

  const handleReject = () => {
    if (id) {
      rejectQuotation.mutate(id);
    }
  };

  const handleConvert = () => {
    if (id) {
      convertToInvoice.mutate(id);
    }
  };

  const getUserDisplayName = () => {
    if (!quotation?.user) return null;
    return quotation.user.name || quotation.user.email;
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ClipboardList className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Cotizacion no encontrada
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          La cotizacion que buscas no existe o fue eliminada.
        </p>
        <Link to="/quotations">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a cotizaciones
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
            <Link to="/quotations">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                  Cotizacion {quotation.quotationNumber}
                </h1>
                <QuotationStatusBadge status={quotation.status} size="lg" />
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                Creada el {formatDate(quotation.createdAt)}
              </p>
            </div>
          </div>

          {/* Action buttons by status */}
          <div className="flex flex-wrap gap-2 ml-14 sm:ml-0">
            {/* DRAFT actions */}
            {quotation.status === "DRAFT" && (
              <>
                {canEditQuotations && (
                  <Link to={`/quotations/${id}/edit`}>
                    <Button variant="outline">
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </Link>
                )}
                <Button
                  variant="primary"
                  onClick={handleSend}
                  disabled={sendQuotation.isPending}
                >
                  {sendQuotation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar
                </Button>
                {canDeleteQuotations && (
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
            {quotation.status === "SENT" && (
              <>
                <Button
                  variant="primary"
                  onClick={handleAccept}
                  disabled={acceptQuotation.isPending}
                >
                  {acceptQuotation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Aceptar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleReject}
                  disabled={rejectQuotation.isPending}
                >
                  {rejectQuotation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Rechazar
                </Button>
              </>
            )}

            {/* ACCEPTED actions */}
            {quotation.status === "ACCEPTED" && canConvertQuotations && (
              <Button
                variant="primary"
                onClick={handleConvert}
                disabled={convertToInvoice.isPending}
              >
                {convertToInvoice.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Convertir a Factura
              </Button>
            )}

            {/* CONVERTED action */}
            {quotation.status === "CONVERTED" &&
              quotation.convertedToInvoiceId && (
                <Link to={`/invoices/${quotation.convertedToInvoiceId}`}>
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
        {/* Quotation data */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary-500" />
                Datos de la Cotizacion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Numero
                  </p>
                  <p className="font-medium text-neutral-900 dark:text-white mt-1">
                    {quotation.quotationNumber}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Estado
                  </p>
                  <div className="mt-1">
                    <QuotationStatusBadge status={quotation.status} />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Fecha de Emision
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {formatDate(quotation.issueDate)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Valida Hasta
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar
                      className={cn(
                        "h-4 w-4",
                        quotation.status === "EXPIRED"
                          ? "text-error-500"
                          : "text-neutral-400",
                      )}
                    />
                    <p
                      className={cn(
                        "font-medium",
                        quotation.status === "EXPIRED"
                          ? "text-error-600 dark:text-error-400"
                          : "text-neutral-900 dark:text-white",
                      )}
                    >
                      {quotation.validUntil
                        ? formatDate(quotation.validUntil)
                        : "Sin fecha limite"}
                    </p>
                  </div>
                </div>
              </div>

              {quotation.user && (
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Creada por
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

        {/* Customer data */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary-500" />
                Datos del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quotation.customer ? (
                <>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {quotation.customer.name}
                    </p>
                    {quotation.customer.document && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {quotation.customer.documentType || "Doc"}:{" "}
                        {quotation.customer.document}
                      </p>
                    )}
                  </div>

                  {quotation.customer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-neutral-400" />
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {quotation.customer.email}
                      </span>
                    </div>
                  )}

                  {quotation.customer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-neutral-400" />
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {quotation.customer.phone}
                      </span>
                    </div>
                  )}

                  {quotation.customer.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-neutral-400 mt-0.5" />
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {quotation.customer.address}
                        {quotation.customer.city &&
                          `, ${quotation.customer.city}`}
                      </span>
                    </div>
                  )}

                  {quotation.customerId && (
                    <Link to={`/customers/${quotation.customerId}`}>
                      <Button variant="ghost" size="sm" className="w-full mt-2">
                        Ver cliente
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center py-6 text-neutral-400 dark:text-neutral-500">
                  <User className="h-8 w-8 mb-2" />
                  <p className="text-sm">Sin cliente asignado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </PageSection>
      </div>

      {/* Items table */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle>Items de la Cotizacion</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Producto</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">
                      Descuento
                    </TableHead>
                    <TableHead className="text-right hidden md:table-cell">
                      Impuesto
                    </TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {item.product?.name || "Producto eliminado"}
                          </p>
                          {item.product?.sku && (
                            <p className="text-xs text-neutral-400 dark:text-neutral-500">
                              SKU: {item.product.sku}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {item.discount > 0 ? (
                          <span className="text-error-600 dark:text-error-400">
                            -{item.discount}%
                          </span>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {item.taxRate > 0 ? `${item.taxRate}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.subtotal)}
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
                  {formatCurrency(quotation.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Impuestos
                </span>
                <span className="text-neutral-900 dark:text-white">
                  {formatCurrency(quotation.tax)}
                </span>
              </div>
              {quotation.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Descuento
                  </span>
                  <span className="text-error-600 dark:text-error-400">
                    -{formatCurrency(quotation.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span className="font-semibold text-neutral-900 dark:text-white">
                  Total
                </span>
                <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  {formatCurrency(quotation.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Notes */}
      {quotation.notes && (
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {quotation.notes}
              </p>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Converted invoice section */}
      {quotation.status === "CONVERTED" && quotation.convertedToInvoice && (
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />
                Factura Generada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {quotation.convertedToInvoice.invoiceNumber}
                  </p>
                  {quotation.convertedAt && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                      Convertida el {formatDate(quotation.convertedAt)}
                    </p>
                  )}
                </div>
                <Link
                  to={`/invoices/${quotation.convertedToInvoice.id}`}
                >
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Factura
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Delete Modal */}
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        itemName={quotation.quotationNumber}
        itemType="cotizacion"
        onConfirm={handleDelete}
        isLoading={deleteQuotation.isPending}
      />
    </PageWrapper>
  );
}
