import { useState } from "react";
import { Link, useParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CreditCard,
  Trash2,
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
  DollarSign,
  ChevronDown,
  FileText,
  RotateCcw,
  X,
  Banknote,
  Hash,
  Smartphone,
} from "lucide-react";
import type { Route } from "./+types/_app.payments.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatDate, formatCurrency } from "~/lib/utils";
import {
  usePayment,
  useDeletePayment,
  useUpdatePaymentStatus,
  useRefundPayment,
} from "~/hooks/usePayments";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import { DeleteModal } from "~/components/ui/DeleteModal";
import { Input } from "~/components/ui/Input";
import type { Payment, PaymentStatus, PaymentMethod } from "~/types/payment";
import { PaymentMethodLabels, PaymentStatusLabels } from "~/types/payment";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Pago - StockFlow" },
    { name: "description", content: "Detalles del pago" },
  ];
};

// Animation variants
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// Status badge component with icon
function PaymentStatusBadge({
  status,
  size = "md",
}: {
  status: PaymentStatus;
  size?: "sm" | "md" | "lg";
}) {
  const config: Record<
    PaymentStatus,
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
    PENDING: {
      label: PaymentStatusLabels.PENDING,
      variant: "warning",
      icon: <Clock className="h-3 w-3" />,
    },
    PROCESSING: {
      label: PaymentStatusLabels.PROCESSING,
      variant: "primary",
      icon: <Clock className="h-3 w-3" />,
    },
    COMPLETED: {
      label: PaymentStatusLabels.COMPLETED,
      variant: "success",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    FAILED: {
      label: PaymentStatusLabels.FAILED,
      variant: "error",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    REFUNDED: {
      label: PaymentStatusLabels.REFUNDED,
      variant: "secondary",
      icon: <RotateCcw className="h-3 w-3" />,
    },
    CANCELLED: {
      label: PaymentStatusLabels.CANCELLED,
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

// Payment method badge component
function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  const config: Record<
    PaymentMethod,
    {
      label: string;
      icon: React.ReactNode;
    }
  > = {
    CASH: {
      label: PaymentMethodLabels.CASH,
      icon: <Banknote className="h-3 w-3" />,
    },
    CREDIT_CARD: {
      label: PaymentMethodLabels.CREDIT_CARD,
      icon: <CreditCard className="h-3 w-3" />,
    },
    DEBIT_CARD: {
      label: PaymentMethodLabels.DEBIT_CARD,
      icon: <CreditCard className="h-3 w-3" />,
    },
    BANK_TRANSFER: {
      label: PaymentMethodLabels.BANK_TRANSFER,
      icon: <Building2 className="h-3 w-3" />,
    },
    WIRE_TRANSFER: {
      label: PaymentMethodLabels.WIRE_TRANSFER,
      icon: <Building2 className="h-3 w-3" />,
    },
    CHECK: {
      label: PaymentMethodLabels.CHECK,
      icon: <FileText className="h-3 w-3" />,
    },
    PSE: {
      label: PaymentMethodLabels.PSE,
      icon: <Building2 className="h-3 w-3" />,
    },
    NEQUI: {
      label: PaymentMethodLabels.NEQUI,
      icon: <Smartphone className="h-3 w-3" />,
    },
    DAVIPLATA: {
      label: PaymentMethodLabels.DAVIPLATA,
      icon: <Smartphone className="h-3 w-3" />,
    },
    OTHER: {
      label: PaymentMethodLabels.OTHER,
      icon: <DollarSign className="h-3 w-3" />,
    },
  };

  const { label, icon } = config[method];

  return (
    <Badge variant="default">
      {icon}
      <span className="ml-1">{label}</span>
    </Badge>
  );
}

// Status action dropdown
function StatusActions({
  currentStatus,
  onStatusChange,
  isLoading,
}: {
  currentStatus: PaymentStatus;
  onStatusChange: (status: PaymentStatus) => void;
  isLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Define available status transitions
  const getAvailableTransitions = (
    status: PaymentStatus,
  ): { status: PaymentStatus; label: string }[] => {
    switch (status) {
      case "PENDING":
        return [
          { status: "COMPLETED", label: "Marcar como completado" },
          { status: "FAILED", label: "Marcar como fallido" },
          { status: "CANCELLED", label: "Cancelar pago" },
        ];
      case "FAILED":
        return [
          { status: "PENDING", label: "Reintentar pago" },
          { status: "CANCELLED", label: "Cancelar pago" },
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
          <div className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
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

// Refund Modal component
function RefundModal({
  open,
  onOpenChange,
  payment,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment;
  onConfirm: (amount?: number) => void;
  isLoading: boolean;
}) {
  const [refundAmount, setRefundAmount] = useState<string>(
    payment.amount.toString(),
  );
  const [isPartialRefund, setIsPartialRefund] = useState(false);

  const handleConfirm = () => {
    if (isPartialRefund) {
      const amount = parseFloat(refundAmount);
      if (amount > 0 && amount <= payment.amount) {
        onConfirm(amount);
      }
    } else {
      onConfirm();
    }
  };

  const isValidAmount = () => {
    if (!isPartialRefund) return true;
    const amount = parseFloat(refundAmount);
    return amount > 0 && amount <= payment.amount;
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={() => !isLoading && onOpenChange(false)}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md mx-4 bg-white dark:bg-neutral-800 rounded-xl shadow-xl"
          >
            {/* Close button */}
            <button
              onClick={() => !isLoading && onOpenChange(false)}
              disabled={isLoading}
              className="absolute right-4 top-4 p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="p-6">
              {/* Icon */}
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-900/20">
                <RotateCcw className="h-7 w-7 text-warning-500" />
              </div>

              {/* Title */}
              <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white text-center">
                Procesar Reembolso
              </h3>

              {/* Description */}
              <p className="mb-6 text-neutral-500 dark:text-neutral-400 text-center">
                Monto original del pago:{" "}
                <span className="font-medium text-neutral-900 dark:text-white">
                  {formatCurrency(payment.amount)}
                </span>
              </p>

              {/* Refund type selection */}
              <div className="mb-4 space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                  <input
                    type="radio"
                    name="refundType"
                    checked={!isPartialRefund}
                    onChange={() => setIsPartialRefund(false)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      Reembolso completo
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Reembolsar {formatCurrency(payment.amount)}
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                  <input
                    type="radio"
                    name="refundType"
                    checked={isPartialRefund}
                    onChange={() => setIsPartialRefund(true)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900 dark:text-white">
                      Reembolso parcial
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Especificar monto a reembolsar
                    </p>
                  </div>
                </label>
              </div>

              {/* Partial refund amount input */}
              {isPartialRefund && (
                <div className="mb-6 space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Monto a reembolsar
                  </label>
                  <Input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    min={0}
                    max={payment.amount}
                    step={0.01}
                    leftElement={
                      <DollarSign className="h-4 w-4 text-neutral-400" />
                    }
                    error={!isValidAmount() && refundAmount !== ""}
                  />
                  {!isValidAmount() && refundAmount !== "" && (
                    <p className="text-sm text-error-500">
                      El monto debe ser entre 0 y{" "}
                      {formatCurrency(payment.amount)}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirm}
                  isLoading={isLoading}
                  disabled={!isValidAmount()}
                >
                  Procesar Reembolso
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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
  const [showRefundModal, setShowRefundModal] = useState(false);

  const { data: payment, isLoading, isError } = usePayment(id!);
  const deletePayment = useDeletePayment();
  const updateStatus = useUpdatePaymentStatus();
  const refundPayment = useRefundPayment();

  const handleDelete = async () => {
    await deletePayment.mutateAsync(id!);
    setShowDeleteModal(false);
  };

  const handleStatusChange = (newStatus: PaymentStatus) => {
    updateStatus.mutate({ id: id!, status: newStatus });
  };

  const handleRefund = (amount?: number) => {
    refundPayment.mutate(
      { id: id!, amount },
      {
        onSuccess: () => {
          setShowRefundModal(false);
        },
      },
    );
  };

  // Check permissions based on status
  const canDelete = payment && payment.status === "PENDING";
  const canRefund = payment && payment.status === "COMPLETED";

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
                  Pago {payment.paymentNumber}
                </h1>
                <PaymentStatusBadge status={payment.status} size="lg" />
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                Registrado el {formatDate(payment.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 ml-14 sm:ml-0">
            <StatusActions
              currentStatus={payment.status}
              onStatusChange={handleStatusChange}
              isLoading={updateStatus.isPending}
            />
            {canRefund && (
              <Button
                variant="outline"
                onClick={() => setShowRefundModal(true)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reembolsar
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            )}
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
                    Estado
                  </p>
                  <div className="mt-1.5">
                    <PaymentStatusBadge status={payment.status} />
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

                {payment.processedAt && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Procesado
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <CheckCircle className="h-4 w-4 text-success-500" />
                      <p className="font-medium text-success-600 dark:text-success-400">
                        {formatDate(payment.processedAt)}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Referencia
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Hash className="h-4 w-4 text-neutral-400" />
                    <p className="font-medium text-neutral-900 dark:text-white font-mono">
                      {payment.reference || "-"}
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
                {payment.customer?.type === "BUSINESS" ? (
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
                  {payment.customer?.name || "Cliente desconocido"}
                </p>
                {payment.customer?.document && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {payment.customer.documentType}: {payment.customer.document}
                  </p>
                )}
              </div>

              {payment.customer?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-neutral-400" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {payment.customer.email}
                  </span>
                </div>
              )}

              {payment.customer?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-neutral-400" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {payment.customer.phone}
                  </span>
                </div>
              )}

              {payment.customer?.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-neutral-400 mt-0.5" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {payment.customer.address}
                    {payment.customer.city && `, ${payment.customer.city}`}
                  </span>
                </div>
              )}

              <Link to={`/customers/${payment.customerId}`}>
                <Button variant="ghost" size="sm" className="w-full mt-2">
                  Ver cliente
                </Button>
              </Link>
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
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Emitida el {formatDate(payment.invoice.issueDate)}
                    </p>
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
        itemName={payment.paymentNumber}
        itemType="pago"
        onConfirm={handleDelete}
        isLoading={deletePayment.isPending}
      />

      {/* Refund Modal */}
      {payment && (
        <RefundModal
          open={showRefundModal}
          onOpenChange={setShowRefundModal}
          payment={payment}
          onConfirm={handleRefund}
          isLoading={refundPayment.isPending}
        />
      )}
    </PageWrapper>
  );
}
