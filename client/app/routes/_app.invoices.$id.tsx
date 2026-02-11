import { useState } from "react";
import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
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
} from "lucide-react";
import type { Route } from "./+types/_app.invoices.$id";
import { cn, formatDate, formatCurrency } from "~/lib/utils";
import {
  useInvoice,
  useDeleteInvoice,
  useUpdateInvoiceStatus,
  useSendInvoiceToDian,
} from "~/hooks/useInvoices";
import { useDianConfig, useDownloadDianXml } from "~/hooks/useDian";
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
import type { InvoiceStatus, InvoiceSource } from "~/types/invoice";
import { POSTicketModal } from "~/components/pos";
import { useAuthStore } from "~/stores/auth.store";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Factura - StockFlow" },
    { name: "description", content: "Detalles de la factura" },
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

  const { data: invoice, isLoading, isError } = useInvoice(id!);
  const { data: dianConfig } = useDianConfig();
  const deleteInvoice = useDeleteInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const sendToDian = useSendInvoiceToDian();
  const downloadXml = useDownloadDianXml();

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

  // Can send to DIAN if: has DIAN config, invoice is PENDING or PAID, and no CUFE yet
  const canSendToDian =
    dianConfig &&
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
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
                <InvoiceSourceBadge source={invoice.source} />
                <DianStatusBadge hasCufe={!!invoice.dianCufe} />
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                Creada el {formatDate(invoice.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 ml-14 sm:ml-0">
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
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
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
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {invoice.customer?.name || "Cliente desconocido"}
                </p>
                {invoice.customer?.document && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {invoice.customer.documentType}: {invoice.customer.document}
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

              <Link to={`/customers/${invoice.customerId}`}>
                <Button variant="ghost" size="sm" className="w-full mt-2">
                  Ver cliente
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Invoice Details */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
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
        </motion.div>
      </div>

      {/* Line Items */}
      <motion.div variants={itemVariants}>
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
      </motion.div>

      {/* DIAN Section */}
      {invoice.dianCufe && (
        <motion.div variants={itemVariants}>
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
        </motion.div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <motion.div variants={itemVariants}>
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
        </motion.div>
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

      {/* POS Ticket Modal - Solo para facturas POS */}
      {invoice.source === "POS" && (
        <POSTicketModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          // Datos del negocio - usar DianConfig si existe, fallback a tenant name
          businessName={
            dianConfig?.businessName ||
            useAuthStore.getState().tenant?.name ||
            "Mi Empresa"
          }
          businessNit={
            dianConfig?.nit
              ? `NIT: ${dianConfig.nit}-${dianConfig.dv}`
              : undefined
          }
          businessAddress={
            dianConfig?.address
              ? `${dianConfig.address}, ${dianConfig.city}`
              : undefined
          }
          businessPhone={dianConfig?.phone}
          // Datos de la factura
          invoiceNumber={invoice.invoiceNumber}
          date={invoice.issueDate}
          // Datos del cliente
          customerName={invoice.customer?.name}
          customerDocument={invoice.customer?.document}
          customerDocumentType={invoice.customer?.documentType}
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
    </motion.div>
  );
}
