import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  CreditCard,
  Trash2,
  Calendar,
  User,
  Building2,
  DollarSign,
  FileText,
  Hash,
  Banknote,
  Smartphone,
} from "lucide-react";
import type { Route } from "./+types/_app.payments.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatDate, formatCurrency } from "~/lib/utils";
import { usePayment, useDeletePayment } from "~/hooks/usePayments";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import { DeleteModal } from "~/components/ui/DeleteModal";
import type { PaymentMethod } from "~/types/payment";
import { PaymentMethodLabels } from "~/types/payment";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Pago - StockFlow" },
    { name: "description", content: "Detalles del pago" },
  ];
};

// Invoice payment status badge
function InvoicePaymentStatusBadge({
  status,
  size = "md",
}: {
  status?: string;
  size?: "sm" | "md" | "lg";
}) {
  const config: Record<
    string,
    {
      label: string;
      variant: "success" | "warning" | "error" | "default";
    }
  > = {
    PAID: { label: "Pagada", variant: "success" },
    PARTIALLY_PAID: { label: "Parcial", variant: "warning" },
    UNPAID: { label: "Sin pagar", variant: "error" },
  };

  const statusConfig = config[status || ""] || {
    label: "—",
    variant: "default" as const,
  };

  return (
    <Badge variant={statusConfig.variant} size={size}>
      {statusConfig.label}
    </Badge>
  );
}

// Payment method badge component with icon
function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  const iconMap: Record<string, React.ReactNode> = {
    CASH: <Banknote className="h-3 w-3" />,
    CREDIT_CARD: <CreditCard className="h-3 w-3" />,
    DEBIT_CARD: <CreditCard className="h-3 w-3" />,
    BANK_TRANSFER: <Building2 className="h-3 w-3" />,
    WIRE_TRANSFER: <Building2 className="h-3 w-3" />,
    CHECK: <FileText className="h-3 w-3" />,
    PSE: <Building2 className="h-3 w-3" />,
    NEQUI: <Smartphone className="h-3 w-3" />,
    DAVIPLATA: <Smartphone className="h-3 w-3" />,
    OTHER: <DollarSign className="h-3 w-3" />,
  };

  return (
    <Badge variant="default">
      {iconMap[method] || <DollarSign className="h-3 w-3" />}
      <span className="ml-1">{PaymentMethodLabels[method] || method}</span>
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
        <Card className="lg:col-span-2">
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
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: payment, isLoading, isError } = usePayment(id!);
  const deletePayment = useDeletePayment();

  const handleDelete = async () => {
    await deletePayment.mutateAsync(id!);
    setShowDeleteModal(false);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !payment) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CreditCard className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Pago no encontrado
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          El pago que buscas no existe o fue eliminado.
        </p>
        <Link to="/payments">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a pagos
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
            <Link to="/payments">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                  Pago — {payment.invoice?.invoiceNumber || "Sin factura"}
                </h1>
                <InvoicePaymentStatusBadge
                  status={payment.invoice?.paymentStatus}
                  size="lg"
                />
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                Registrado el {formatDate(payment.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 ml-14 sm:ml-0">
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      </PageSection>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Details */}
        <PageSection className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Monto
                  </p>
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                    {formatCurrency(payment.amount)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Metodo de Pago
                  </p>
                  <div className="mt-1.5">
                    <PaymentMethodBadge method={payment.method} />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Estado de Factura
                  </p>
                  <div className="mt-1.5">
                    <InvoicePaymentStatusBadge
                      status={payment.invoice?.paymentStatus}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Fecha de Pago
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {formatDate(payment.paymentDate)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Referencia
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Hash className="h-4 w-4 text-neutral-400" />
                    <p className="font-medium text-neutral-900 dark:text-white font-mono">
                      {payment.reference || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* Customer Information */}
        <PageSection className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary-500" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {payment.invoice?.customer?.name || "Cliente desconocido"}
                </p>
              </div>

              {payment.invoice?.customer?.id && (
                <Link to={`/customers/${payment.invoice.customer.id}`}>
                  <Button variant="ghost" size="sm" className="w-full mt-2">
                    Ver cliente
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </PageSection>
      </div>

      {/* Related Invoice */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-500" />
              Factura Asociada
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payment.invoice ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                    <FileText className="h-6 w-6 text-primary-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {payment.invoice.invoiceNumber}
                    </p>
                    <div className="mt-1">
                      <InvoicePaymentStatusBadge
                        status={payment.invoice.paymentStatus}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Total de la factura
                    </p>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {formatCurrency(payment.invoice.total)}
                    </p>
                  </div>
                  <Link to={`/invoices/${payment.invoiceId}`}>
                    <Button variant="outline" size="sm">
                      Ver factura
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-neutral-500 dark:text-neutral-400">
                <FileText className="h-5 w-5" />
                <span>No hay factura asociada a este pago</span>
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>

      {/* Notes */}
      {payment.notes && (
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {payment.notes}
              </p>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Delete Modal */}
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        itemName={
          payment.invoice?.invoiceNumber
            ? `Pago de ${payment.invoice.invoiceNumber}`
            : "este pago"
        }
        itemType="pago"
        onConfirm={handleDelete}
        isLoading={deletePayment.isPending}
      />
    </PageWrapper>
  );
}
