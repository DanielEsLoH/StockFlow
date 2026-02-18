import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  FileText,
  Pencil,
  Trash2,
  Printer,
  Calendar,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  Send,
  Download,
  Store,
  ShoppingCart,
  Loader2,
  CreditCard,
  Banknote,
  Smartphone,
  DollarSign,
  Hash,
} from "lucide-react";
import type { Route } from "./+types/_app.invoices.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatDate, formatCurrency } from "~/lib/utils";
import {
  useInvoice,
  useDeleteInvoice,
  useUpdateInvoiceStatus,
  useSendInvoiceToDian,
} from "~/hooks/useInvoices";
import { useDownloadDianXml } from "~/hooks/useDian";
import { usePaymentsByInvoice } from "~/hooks/usePayments";
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
import type { InvoiceStatus, InvoiceSource, InvoicePaymentStatus } from "~/types/invoice";
import { InvoicePaymentStatusLabels } from "~/types/invoice";
import { PaymentMethodLabels } from "~/types/payment";
import type { PaymentMethod } from "~/types/payment";
import { POSTicketModal } from "~/components/pos";
import { PaymentModal } from "~/components/payments/PaymentModal";
import { useUserPreferences } from "~/hooks/useSettings";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Factura - StockFlow" },
    { name: "description", content: "Detalles de la factura" },
  ];
};

// Status badge component with icon
function InvoiceStatusBadge({
  status,
  size = "md",
}: {
  status: InvoiceStatus;
  size?: "sm" | "md" | "lg";
}) {
  const config: Record<
    InvoiceStatus,
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
      icon: <FileText className="h-3 w-3" />,
    },
    PENDING: {
      label: "Pendiente",
      variant: "warning",
      icon: <Clock className="h-3 w-3" />,
    },
    SENT: {
      label: "Enviada",
      variant: "primary",
      icon: <Send className="h-3 w-3" />,
    },
    PAID: {
      label: "Pagada",
      variant: "success",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    OVERDUE: {
      label: "Vencida",
      variant: "error",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    CANCELLED: {
      label: "Cancelada",
      variant: "secondary",
      icon: <XCircle className="h-3 w-3" />,
    },
    VOID: {
      label: "Anulada",
      variant: "secondary",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const { label, variant, icon } = config[status];

  return (
    <Badge variant={variant} size={size}>
      {icon}
      <span className="ml-1">{label}</span>
    </Badge>
  );
}

// Source badge component
function InvoiceSourceBadge({ source }: { source?: InvoiceSource }) {
  const config: Record<
    InvoiceSource,
    {
      label: string;
      variant: "default" | "primary" | "secondary";
      icon: React.ReactNode;
    }
  > = {
    MANUAL: {
      label: "Manual",
      variant: "secondary",
      icon: <FileText className="h-3 w-3" />,
    },
    POS: {
      label: "POS",
      variant: "primary",
      icon: <ShoppingCart className="h-3 w-3" />,
    },
  };

  // Default to MANUAL if source is undefined (for backwards compatibility)
  const safeSource = source ?? "MANUAL";
  const { label, variant, icon } = config[safeSource];

  return (
    <Badge variant={variant} size="sm">
      {icon}
      <span className="ml-1">{label}</span>
    </Badge>
  );
}

// DIAN status badge component
function DianStatusBadge({ hasCufe }: { hasCufe: boolean }) {
  if (hasCufe) {
    return (
      <Badge variant="success" size="sm">
        <CheckCircle className="h-3 w-3" />
        <span className="ml-1">DIAN</span>
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" size="sm">
      <Clock className="h-3 w-3" />
      <span className="ml-1">Sin DIAN</span>
    </Badge>
  );
}

// Payment status badge
function PaymentStatusBadge({
  status,
  size = "md",
}: {
  status?: InvoicePaymentStatus;
  size?: "sm" | "md" | "lg";
}) {
  const config: Record<
    InvoicePaymentStatus,
    { variant: "success" | "warning" | "error" }
  > = {
    PAID: { variant: "success" },
    PARTIALLY_PAID: { variant: "warning" },
    UNPAID: { variant: "error" },
  };

  if (!status) return null;
  const { variant } = config[status] || { variant: "default" as const };
  const label = InvoicePaymentStatusLabels[status] || status;

  return (
    <Badge variant={variant} size={size}>
      {label}
    </Badge>
  );
}

// Payment method icon helper
function getPaymentMethodIcon(method: PaymentMethod) {
  const iconMap: Record<string, React.ReactNode> = {
    CASH: <Banknote className="h-3.5 w-3.5 text-neutral-500" />,
    CREDIT_CARD: <CreditCard className="h-3.5 w-3.5 text-neutral-500" />,
    DEBIT_CARD: <CreditCard className="h-3.5 w-3.5 text-neutral-500" />,
    BANK_TRANSFER: <Building2 className="h-3.5 w-3.5 text-neutral-500" />,
    WIRE_TRANSFER: <Building2 className="h-3.5 w-3.5 text-neutral-500" />,
    CHECK: <FileText className="h-3.5 w-3.5 text-neutral-500" />,
    PSE: <Building2 className="h-3.5 w-3.5 text-neutral-500" />,
    NEQUI: <Smartphone className="h-3.5 w-3.5 text-neutral-500" />,
    DAVIPLATA: <Smartphone className="h-3.5 w-3.5 text-neutral-500" />,
    OTHER: <DollarSign className="h-3.5 w-3.5 text-neutral-500" />,
  };
  return iconMap[method] || <DollarSign className="h-3.5 w-3.5 text-neutral-500" />;
}

// Status action dropdown
function StatusActions({
  currentStatus,
  onStatusChange,
  isLoading,
}: {
  currentStatus: InvoiceStatus;
  onStatusChange: (status: InvoiceStatus) => void;
  isLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Define available status transitions
  const getAvailableTransitions = (
    status: InvoiceStatus,
  ): { status: InvoiceStatus; label: string }[] => {
    switch (status) {
      case "DRAFT":
        return [
          { status: "PENDING", label: "Enviar factura" },
          { status: "CANCELLED", label: "Cancelar" },
        ];
      case "PENDING":
        return [
          { status: "PAID", label: "Marcar como pagada" },
          { status: "CANCELLED", label: "Cancelar" },
        ];
      case "SENT":
        return [
          { status: "PAID", label: "Marcar como pagada" },
          { status: "CANCELLED", label: "Cancelar" },
        ];
      case "OVERDUE":
        return [
          { status: "PAID", label: "Marcar como pagada" },
          { status: "CANCELLED", label: "Cancelar" },
        ];
      default:
        return [];
    }
  };

  const transitions = getAvailableTransitions(currentStatus);

  if (transitions.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        rightIcon={
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        }
      >
        Cambiar Estado
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            {transitions.map((transition) => (
              <button
                key={transition.status}
                onClick={() => {
                  onStatusChange(transition.status);
                  setIsOpen(false);
                }}
                className="flex w-full items-center px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                {transition.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
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
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: preferences } = useUserPreferences();
  const { data: invoice, isLoading, isError } = useInvoice(id!);
  const { data: invoicePayments = [], isLoading: isLoadingPayments } = usePaymentsByInvoice(id!);
  const deleteInvoice = useDeleteInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const sendToDian = useSendInvoiceToDian();
  const downloadXml = useDownloadDianXml();

  // Calculate payment totals
  const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = invoice ? Math.max(0, invoice.total - totalPaid) : 0;
  const paymentPercentage = invoice && invoice.total > 0 ? Math.min(100, (totalPaid / invoice.total) * 100) : 0;

  const handleDelete = async () => {
    await deleteInvoice.mutateAsync(id!);
    setShowDeleteModal(false);
  };

  const handleStatusChange = (newStatus: InvoiceStatus) => {
    updateStatus.mutate({ id: id!, status: newStatus });
  };

  const handlePrint = () => {
    // Si es factura POS, mostrar modal de ticket térmico
    if (invoice?.source === "POS") {
      setShowTicketModal(true);
    } else {
      // Facturas manuales usan impresión normal
      window.print();
    }
  };

  const handleSendToDian = () => {
    if (id) {
      sendToDian.mutate(id);
    }
  };

  const handleDownloadXml = () => {
    if (id) {
      downloadXml.mutate(id);
    }
  };

  // Check permissions based on status
  const canEdit =
    invoice && invoice.status !== "PAID" && invoice.status !== "CANCELLED";
  const canDelete = invoice && invoice.status === "DRAFT";

  // Can register payment if: not fully paid and not cancelled/void
  const canRegisterPayment =
    invoice &&
    invoice.paymentStatus !== "PAID" &&
    invoice.status !== "CANCELLED" &&
    invoice.status !== "VOID";

  // Can send to DIAN if: has DIAN config (tenant.nit), invoice is PENDING or PAID, and no CUFE yet
  const canSendToDian =
    invoice?.tenant?.nit &&
    invoice &&
    (invoice.status === "PENDING" || invoice.status === "PAID") &&
    !invoice.dianCufe;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Factura no encontrada
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          La factura que buscas no existe o fue eliminada.
        </p>
        <Link to="/invoices">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a facturas
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
            <Link to="/invoices">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                  Factura {invoice.invoiceNumber}
                </h1>
                <InvoiceStatusBadge status={invoice.status} size="lg" />
                <PaymentStatusBadge status={invoice.paymentStatus as InvoicePaymentStatus} size="lg" />
                <InvoiceSourceBadge source={invoice.source} />
                <DianStatusBadge hasCufe={!!invoice.dianCufe} />
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                Creada el {formatDate(invoice.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 ml-14 sm:ml-0">
            {canRegisterPayment && (
              <Button
                variant="primary"
                onClick={() => setShowPaymentModal(true)}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Registrar Pago
              </Button>
            )}
            <StatusActions
              currentStatus={invoice.status}
              onStatusChange={handleStatusChange}
              isLoading={updateStatus.isPending}
            />
            {canSendToDian && (
              <Button
                variant="primary"
                onClick={handleSendToDian}
                disabled={sendToDian.isPending}
              >
                {sendToDian.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar a DIAN
              </Button>
            )}
            {canEdit && (
              <Link to={`/invoices/${id}/edit`}>
                <Button variant="outline">
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            {canDelete && (
              <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </PageSection>

      {/* Emisor & Cliente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issuer / Emisor */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary-500" />
                Emisor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {invoice.tenant?.businessName || invoice.tenant?.name || "Sin configurar"}
                </p>
                {invoice.tenant?.nit && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    NIT: {invoice.tenant.nit}-{invoice.tenant.dv}
                  </p>
                )}
              </div>

              {invoice.tenant?.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-neutral-400 mt-0.5" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {invoice.tenant.address}
                    {invoice.tenant.city && `, ${invoice.tenant.city}`}
                  </span>
                </div>
              )}

              {invoice.tenant?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-neutral-400" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {invoice.tenant.phone}
                  </span>
                </div>
              )}

              {invoice.tenant?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-neutral-400" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {invoice.tenant.email}
                  </span>
                </div>
              )}

              {invoice.tenant?.resolutionNumber && (
                <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    <FileText className="inline h-3 w-3 mr-1" />
                    Resolución DIAN No. {invoice.tenant.resolutionNumber}
                    {invoice.tenant.resolutionDate &&
                      ` del ${formatDate(invoice.tenant.resolutionDate)}`}
                    {invoice.tenant.resolutionPrefix &&
                      `, Prefijo ${invoice.tenant.resolutionPrefix}`}
                    {invoice.tenant.resolutionRangeFrom != null &&
                      invoice.tenant.resolutionRangeTo != null &&
                      `, del ${invoice.tenant.resolutionRangeFrom} al ${invoice.tenant.resolutionRangeTo}`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </PageSection>

        {/* Customer Information */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {invoice.customer?.type === "BUSINESS" ? (
                  <Building2 className="h-5 w-5 text-primary-500" />
                ) : (
                  <User className="h-5 w-5 text-primary-500" />
                )}
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {invoice.customer?.name || "Cliente desconocido"}
                </p>
                {invoice.customer?.documentNumber && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {invoice.customer.documentType || "Doc"}: {invoice.customer.documentNumber}
                  </p>
                )}
              </div>

              {invoice.customer?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-neutral-400" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {invoice.customer.email}
                  </span>
                </div>
              )}

              {invoice.customer?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-neutral-400" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {invoice.customer.phone}
                  </span>
                </div>
              )}

              {invoice.customer?.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-neutral-400 mt-0.5" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {invoice.customer.address}
                    {invoice.customer.city && `, ${invoice.customer.city}`}
                  </span>
                </div>
              )}

              {invoice.customerId && (
                <Link to={`/customers/${invoice.customerId}`}>
                  <Button variant="ghost" size="sm" className="w-full mt-2">
                    Ver cliente
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </PageSection>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 gap-6">
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Factura</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Fecha de Emision
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {formatDate(invoice.issueDate)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Fecha de Vencimiento
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar
                      className={cn(
                        "h-4 w-4",
                        invoice.status === "OVERDUE"
                          ? "text-error-500"
                          : "text-neutral-400",
                      )}
                    />
                    <p
                      className={cn(
                        "font-medium",
                        invoice.status === "OVERDUE"
                          ? "text-error-600 dark:text-error-400"
                          : "text-neutral-900 dark:text-white",
                      )}
                    >
                      {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                </div>

                {invoice.paidAt && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Fecha de Pago
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <CheckCircle className="h-4 w-4 text-success-500" />
                      <p className="font-medium text-success-600 dark:text-success-400">
                        {formatDate(invoice.paidAt)}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Estado
                  </p>
                  <div className="mt-1">
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                </div>

                {invoice.warehouse && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Bodega
                    </p>
                    <p className="font-medium text-neutral-900 dark:text-white mt-1">
                      {invoice.warehouse.name}
                    </p>
                  </div>
                )}

                {invoice.user && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Facturado por
                    </p>
                    <p className="font-medium text-neutral-900 dark:text-white mt-1">
                      {invoice.user.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex flex-col gap-2 sm:w-64 sm:ml-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Subtotal
                    </span>
                    <span className="text-neutral-900 dark:text-white">
                      {formatCurrency(invoice.subtotal)}
                    </span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Descuento
                      </span>
                      <span className="text-error-600 dark:text-error-400">
                        -{formatCurrency(invoice.discount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      IVA
                    </span>
                    <span className="text-neutral-900 dark:text-white">
                      {formatCurrency(invoice.tax)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      Total
                    </span>
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      {formatCurrency(invoice.total)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      </div>

      {/* Line Items */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle>Items de la Factura</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">
                      Producto / Descripcion
                    </TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">
                      Descuento
                    </TableHead>
                    <TableHead className="text-right hidden md:table-cell">
                      IVA
                    </TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {item.description}
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

      {/* Payments Section */}
      <PageSection>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary-500" />
                Pagos Registrados
              </CardTitle>
              <PaymentStatusBadge status={invoice.paymentStatus as InvoicePaymentStatus} />
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Pagado: {formatCurrency(totalPaid)}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400">
                  Pendiente: {formatCurrency(remainingBalance)}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    paymentPercentage >= 100
                      ? "bg-success-500"
                      : paymentPercentage > 0
                        ? "bg-warning-500"
                        : "bg-neutral-300 dark:bg-neutral-600"
                  )}
                  style={{ width: `${paymentPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-neutral-400">
                  {paymentPercentage.toFixed(0)}% del total
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  Total: {formatCurrency(invoice.total)}
                </span>
              </div>
            </div>

            {/* Payments list */}
            {isLoadingPayments ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : invoicePayments.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-neutral-400 dark:text-neutral-500">
                <CreditCard className="h-8 w-8 mb-2" />
                <p className="text-sm">No hay pagos registrados para esta factura</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Metodo</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicePayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                            <span className="text-sm">{formatDate(payment.paymentDate)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {getPaymentMethodIcon(payment.method as PaymentMethod)}
                            <span className="text-sm">
                              {PaymentMethodLabels[payment.method as PaymentMethod] || payment.method}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.reference ? (
                            <div className="flex items-center gap-1.5">
                              <Hash className="h-3.5 w-3.5 text-neutral-400" />
                              <span className="text-sm font-mono">{payment.reference}</span>
                            </div>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            {formatCurrency(payment.amount)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>

      {/* DIAN Section */}
      {invoice.dianCufe && (
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary-500" />
                Facturacion Electronica DIAN
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    CUFE (Codigo Unico de Factura Electronica)
                  </p>
                  <p className="font-mono text-xs text-neutral-900 dark:text-white mt-1 break-all">
                    {invoice.dianCufe}
                  </p>
                </div>
                {invoice.dianSentAt && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Fecha de Envio
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar className="h-4 w-4 text-success-500" />
                      <p className="font-medium text-success-600 dark:text-success-400">
                        {formatDate(invoice.dianSentAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadXml}
                  disabled={downloadXml.isPending}
                >
                  {downloadXml.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Descargar XML
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Notes */}
      {invoice.notes && (
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Delete Modal */}
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        itemName={invoice.invoiceNumber}
        itemType="factura"
        onConfirm={handleDelete}
        isLoading={deleteInvoice.isPending}
      />

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        invoiceTotal={invoice.total}
        totalPaid={totalPaid}
      />

      {/* POS Ticket Modal - Solo para facturas POS */}
      {invoice.source === "POS" && (
        <POSTicketModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          paperWidth={preferences?.posPaperWidth ?? 80}
          // Datos del negocio desde invoice.tenant
          businessName={
            invoice.tenant?.businessName ||
            invoice.tenant?.name ||
            "Mi Empresa"
          }
          businessNit={
            invoice.tenant?.nit
              ? `${invoice.tenant.nit}-${invoice.tenant.dv}`
              : undefined
          }
          businessAddress={
            invoice.tenant?.address
              ? `${invoice.tenant.address}${invoice.tenant.city ? `, ${invoice.tenant.city}` : ""}`
              : undefined
          }
          businessPhone={invoice.tenant?.phone ?? undefined}
          // Resolución
          resolutionNumber={invoice.tenant?.resolutionNumber ?? undefined}
          resolutionPrefix={invoice.tenant?.resolutionPrefix ?? undefined}
          resolutionRangeFrom={invoice.tenant?.resolutionRangeFrom ?? undefined}
          resolutionRangeTo={invoice.tenant?.resolutionRangeTo ?? undefined}
          resolutionDate={invoice.tenant?.resolutionDate ?? undefined}
          // Datos de la factura
          invoiceNumber={invoice.invoiceNumber}
          date={invoice.issueDate}
          // Datos del cliente
          customerName={invoice.customer?.name}
          customerDocument={invoice.customer?.documentNumber}
          customerDocumentType={invoice.customer?.documentType ?? undefined}
          customerPhone={invoice.customer?.phone ?? undefined}
          customerAddress={invoice.customer?.address ?? undefined}
          // Items
          items={
            invoice.items?.map((item) => ({
              name: item.product?.name || item.description || "Producto",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.subtotal,
              discount: item.discount,
            })) || []
          }
          // Totales
          subtotal={invoice.subtotal}
          discountAmount={invoice.discount}
          taxAmount={invoice.tax}
          total={invoice.total}
          // Pagos y DIAN
          payments={[]}
          dianCufe={invoice.dianCufe}
          footerMessage="¡Gracias por su compra!"
        />
      )}
    </PageWrapper>
  );
}
