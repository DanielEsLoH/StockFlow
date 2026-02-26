import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Receipt,
  Pencil,
  Trash2,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  CreditCard,
  DollarSign,
  FileText,
  X,
  Hash,
  Building2,
} from "lucide-react";
import type { Route } from "./+types/_app.expenses.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatDate, formatCurrency } from "~/lib/utils";
import {
  useExpense,
  useDeleteExpense,
  useApproveExpense,
  usePayExpense,
  useCancelExpense,
} from "~/hooks/useExpenses";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import { DeleteModal } from "~/components/ui/DeleteModal";
import { ConfirmModal } from "~/components/ui/Modal";
import type { ExpenseStatus, ExpenseCategory } from "~/types/expense";
import {
  ExpenseStatusLabels,
  ExpenseStatusVariants,
  ExpenseCategoryLabels,
  ExpenseCategoryColors,
} from "~/types/expense";
import { PaymentMethodLabels } from "~/types/payment";
import type { PaymentMethod } from "~/types/payment";

// ============================================================================
// META
// ============================================================================

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Detalle de Gasto - StockFlow" },
    { name: "description", content: "Detalles del gasto" },
  ];
};

// ============================================================================
// STATUS BADGE
// ============================================================================

function ExpenseStatusBadge({
  status,
  size = "md",
}: {
  status: ExpenseStatus;
  size?: "sm" | "md" | "lg";
}) {
  const config: Record<
    ExpenseStatus,
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
    APPROVED: {
      label: "Aprobado",
      variant: "warning",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    PAID: {
      label: "Pagado",
      variant: "success",
      icon: <DollarSign className="h-3 w-3" />,
    },
    CANCELLED: {
      label: "Cancelado",
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

// ============================================================================
// LOADING SKELETON
// ============================================================================

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
    </div>
  );
}

// ============================================================================
// PAYMENT MODAL
// ============================================================================

const EXPENSE_PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "BANK_TRANSFER",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "CHECK",
  "OTHER",
];

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

function ExpensePaymentModal({
  open,
  onOpenChange,
  expenseId,
  expenseNumber,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string;
  expenseNumber: string;
  onSubmit: (data: {
    paymentMethod: string;
    paymentReference?: string;
    paymentDate?: string;
  }) => void;
  isPending: boolean;
}) {
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      paymentMethod: method,
      paymentReference: reference.trim() || undefined,
      paymentDate: paymentDate || undefined,
    });
  };

  const handleClose = () => {
    if (!isPending) {
      onOpenChange(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-lg mx-4 bg-white dark:bg-neutral-800 rounded-xl shadow-xl"
          >
            <button
              onClick={handleClose}
              disabled={isPending}
              className="absolute right-4 top-4 p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 pb-0">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
                  <CreditCard className="h-5 w-5 text-primary-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    Registrar Pago de Gasto
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {expenseNumber}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Metodo de Pago *
                </label>
                <select
                  value={method}
                  onChange={(e) =>
                    setMethod(e.target.value as PaymentMethod)
                  }
                  disabled={isPending}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white disabled:opacity-50"
                >
                  {EXPENSE_PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {PaymentMethodLabels[m]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Referencia
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    disabled={isPending}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white dark:placeholder:text-neutral-500 disabled:opacity-50"
                    placeholder="No. transaccion"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Fecha de Pago
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    disabled={isPending}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Registrar Pago
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: expense, isLoading, isError } = useExpense(id!);
  const deleteExpense = useDeleteExpense();
  const approveExpense = useApproveExpense();
  const payExpense = usePayExpense();
  const cancelExpense = useCancelExpense();
  const { hasPermission } = usePermissions();

  const canEdit = hasPermission(Permission.EXPENSES_EDIT);
  const canDelete = hasPermission(Permission.EXPENSES_DELETE);
  const canApprove = hasPermission(Permission.EXPENSES_APPROVE);

  // Handlers
  const handleDelete = async () => {
    await deleteExpense.mutateAsync(id!);
    setShowDeleteModal(false);
  };

  const handleApprove = () => {
    if (id) {
      approveExpense.mutate(id);
    }
  };

  const handleCancel = () => {
    if (id) {
      cancelExpense.mutate(id, {
        onSuccess: () => setShowCancelModal(false),
      });
    }
  };

  const handlePayExpense = (data: {
    paymentMethod: string;
    paymentReference?: string;
    paymentDate?: string;
  }) => {
    if (id) {
      payExpense.mutate(
        { id, data },
        {
          onSuccess: () => {
            setShowPaymentModal(false);
          },
        },
      );
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (isError || !expense) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Receipt className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Gasto no encontrado
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          El gasto que buscas no existe o fue eliminado.
        </p>
        <Link to="/expenses">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a gastos
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
            <Link to="/expenses">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                  Gasto {expense.expenseNumber}
                </h1>
                <ExpenseStatusBadge status={expense.status} size="lg" />
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                Creado el {formatDate(expense.createdAt)}
              </p>
            </div>
          </div>

          {/* Action buttons by status */}
          <div className="flex flex-wrap gap-2 ml-14 sm:ml-0">
            {/* DRAFT actions */}
            {expense.status === "DRAFT" && (
              <>
                {canEdit && (
                  <Link to={`/expenses/${id}/edit`}>
                    <Button variant="outline">
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </Link>
                )}
                {canApprove && (
                  <Button
                    variant="primary"
                    onClick={handleApprove}
                    disabled={approveExpense.isPending}
                  >
                    {approveExpense.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Aprobar
                  </Button>
                )}
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelModal(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
                {canDelete && (
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

            {/* APPROVED actions */}
            {expense.status === "APPROVED" && (
              <>
                {canEdit && (
                  <Button
                    variant="primary"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </Button>
                )}
                {canEdit && (
                  <Button
                    variant="outline"
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
        {/* Expense Info Card */}
        <PageSection className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary-500" />
                Informacion del Gasto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category badge */}
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                  Categoria
                </p>
                <span
                  className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                    ExpenseCategoryColors[expense.category],
                  )}
                >
                  {ExpenseCategoryLabels[expense.category]}
                </span>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                  Descripcion
                </p>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {expense.description || "Sin descripcion"}
                </p>
              </div>

              {/* Invoice number */}
              {expense.invoiceNumber && (
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                    No. Factura
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-4 w-4 text-neutral-400" />
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {expense.invoiceNumber}
                    </p>
                  </div>
                </div>
              )}

              {/* Amounts */}
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                <div className="flex flex-col gap-2 sm:w-72 sm:ml-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Subtotal
                    </span>
                    <span className="text-neutral-900 dark:text-white">
                      {formatCurrency(expense.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      IVA ({expense.taxRate}%)
                    </span>
                    <span className="text-neutral-900 dark:text-white">
                      {formatCurrency(expense.tax)}
                    </span>
                  </div>
                  {expense.reteFuente > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        ReteFuente
                      </span>
                      <span className="text-error-600 dark:text-error-400">
                        -{formatCurrency(expense.reteFuente)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      Total
                    </span>
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      {formatCurrency(expense.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Fecha de Emision
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {formatDate(expense.issueDate)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Fecha de Vencimiento
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="h-4 w-4 text-neutral-400" />
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {expense.dueDate
                        ? formatDate(expense.dueDate)
                        : "No especificada"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account & Cost Center */}
              {(expense.account || expense.costCenter) && (
                <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {expense.account && (
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Cuenta Contable
                      </p>
                      <p className="font-medium text-neutral-900 dark:text-white mt-1">
                        {expense.account.code} - {expense.account.name}
                      </p>
                    </div>
                  )}
                  {expense.costCenter && (
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Centro de Costo
                      </p>
                      <p className="font-medium text-neutral-900 dark:text-white mt-1">
                        {expense.costCenter.code} - {expense.costCenter.name}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </PageSection>

        {/* Right column */}
        <PageSection className="space-y-6">
          {/* Supplier Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary-500" />
                Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {expense.supplier ? (
                <>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {expense.supplier.name}
                    </p>
                    {expense.supplier.documentNumber && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        NIT: {expense.supplier.documentNumber}
                      </p>
                    )}
                  </div>

                  {expense.supplierId && (
                    <Link to={`/suppliers/${expense.supplierId}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2"
                      >
                        Ver proveedor
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center py-6 text-neutral-400 dark:text-neutral-500">
                  <Building2 className="h-8 w-8 mb-2" />
                  <p className="text-sm">Sin proveedor asignado</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info Card (only for PAID status) */}
          {expense.status === "PAID" && expense.paymentMethod && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-success-500" />
                  Informacion de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Metodo de Pago
                  </p>
                  <p className="font-medium text-neutral-900 dark:text-white mt-1">
                    {PaymentMethodLabels[
                      expense.paymentMethod as PaymentMethod
                    ] || expense.paymentMethod}
                  </p>
                </div>

                {expense.paymentReference && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Referencia
                    </p>
                    <p className="font-medium text-neutral-900 dark:text-white mt-1">
                      {expense.paymentReference}
                    </p>
                  </div>
                )}

                {expense.paymentDate && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Fecha de Pago
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar className="h-4 w-4 text-success-500" />
                      <p className="font-medium text-success-600 dark:text-success-400">
                        {formatDate(expense.paymentDate)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Approval info */}
          {expense.approvedAt && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-warning-500" />
                  Aprobacion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Fecha de Aprobacion
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="h-4 w-4 text-warning-500" />
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {formatDate(expense.approvedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </PageSection>
      </div>

      {/* Notes */}
      {expense.notes && (
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {expense.notes}
              </p>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Delete Modal */}
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        itemName={expense.expenseNumber}
        itemType="gasto"
        onConfirm={handleDelete}
        isLoading={deleteExpense.isPending}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        title="Cancelar Gasto"
        description={`¿Estas seguro de cancelar el gasto "${expense.expenseNumber}"? Esta accion no se puede deshacer.`}
        confirmLabel="Cancelar Gasto"
        cancelLabel="Volver"
        onConfirm={handleCancel}
        isLoading={cancelExpense.isPending}
        variant="danger"
      />

      {/* Payment Modal */}
      <ExpensePaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        expenseId={expense.id}
        expenseNumber={expense.expenseNumber}
        onSubmit={handlePayExpense}
        isPending={payExpense.isPending}
      />
    </PageWrapper>
  );
}
