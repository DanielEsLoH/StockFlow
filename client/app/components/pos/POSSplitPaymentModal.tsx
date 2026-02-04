import { useState, useMemo } from "react";
import {
  X,
  Banknote,
  CreditCard,
  Smartphone,
  Building2,
  Plus,
  Trash2,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { formatCurrency } from "~/lib/utils";
import type { PaymentMethod } from "~/types/payment";
import type { SalePaymentData } from "~/types/pos";

interface POSSplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payments: SalePaymentData[]) => void;
  total: number;
  isProcessing?: boolean;
}

interface PaymentRow {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  cardLastFour?: string;
}

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "CASH", label: "Efectivo", icon: <Banknote className="h-5 w-5" /> },
  {
    value: "CREDIT_CARD",
    label: "Tarjeta Credito",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    value: "DEBIT_CARD",
    label: "Tarjeta Debito",
    icon: <CreditCard className="h-5 w-5" />,
  },
  { value: "NEQUI", label: "Nequi", icon: <Smartphone className="h-5 w-5" /> },
  {
    value: "DAVIPLATA",
    label: "Daviplata",
    icon: <Smartphone className="h-5 w-5" />,
  },
  { value: "PSE", label: "PSE", icon: <Building2 className="h-5 w-5" /> },
  {
    value: "BANK_TRANSFER",
    label: "Transferencia",
    icon: <Building2 className="h-5 w-5" />,
  },
];

export function POSSplitPaymentModal({
  isOpen,
  onClose,
  onConfirm,
  total,
  isProcessing = false,
}: POSSplitPaymentModalProps) {
  const [payments, setPayments] = useState<PaymentRow[]>([
    { id: "1", method: "CASH", amount: total },
  ]);

  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    [payments],
  );

  const remaining = total - totalPaid;
  const change = totalPaid > total ? totalPaid - total : 0;
  const isValid = Math.abs(remaining) < 0.01 || change > 0;

  const addPayment = () => {
    const unusedMethods = PAYMENT_METHODS.filter(
      (m) => !payments.some((p) => p.method === m.value),
    );
    const defaultMethod = unusedMethods[0]?.value || "CASH";

    setPayments([
      ...payments,
      {
        id: Date.now().toString(),
        method: defaultMethod,
        amount: remaining > 0 ? remaining : 0,
      },
    ]);
  };

  const removePayment = (id: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter((p) => p.id !== id));
    }
  };

  const updatePayment = (id: string, updates: Partial<PaymentRow>) => {
    setPayments(payments.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleConfirm = () => {
    const paymentData: SalePaymentData[] = payments
      .filter((p) => p.amount > 0)
      .map((p) => ({
        method: p.method,
        amount:
          p.method === "CASH" && change > 0 ? p.amount - change : p.amount,
        reference: p.reference,
        cardLastFour: p.cardLastFour,
      }));
    onConfirm(paymentData);
  };

  const handleQuickCash = (amount: number) => {
    if (payments.length === 1 && payments[0].method === "CASH") {
      updatePayment(payments[0].id, { amount });
    }
  };

  if (!isOpen) return null;

  // Quick cash amounts
  const quickAmounts = [
    Math.ceil(total / 1000) * 1000,
    Math.ceil(total / 5000) * 5000,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 20000) * 20000,
    Math.ceil(total / 50000) * 50000,
  ].filter((a, i, arr) => arr.indexOf(a) === i && a >= total);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold">Procesar Pago</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Total */}
          <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
            <p className="text-sm text-neutral-500">Total a pagar</p>
            <p className="text-4xl font-bold text-primary-600">
              {formatCurrency(total)}
            </p>
          </div>

          {/* Quick Cash Buttons */}
          {payments.length === 1 && payments[0].method === "CASH" && (
            <div className="flex flex-wrap gap-2">
              {quickAmounts.slice(0, 4).map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickCash(amount)}
                >
                  {formatCurrency(amount)}
                </Button>
              ))}
            </div>
          )}

          {/* Payment Rows */}
          <div className="space-y-3">
            {payments.map((payment, index) => (
              <div
                key={payment.id}
                className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg space-y-3"
              >
                <div className="flex items-center gap-3">
                  {/* Method Selector */}
                  <select
                    value={payment.method}
                    onChange={(e) =>
                      updatePayment(payment.id, {
                        method: e.target.value as PaymentMethod,
                      })
                    }
                    className="flex-1 h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  {/* Amount */}
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payment.amount || ""}
                    onChange={(e) =>
                      updatePayment(payment.id, {
                        amount: Number(e.target.value),
                      })
                    }
                    className="w-40"
                    placeholder="Monto"
                  />

                  {/* Remove Button */}
                  {payments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePayment(payment.id)}
                      className="text-error-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Reference for cards/transfers */}
                {["CREDIT_CARD", "DEBIT_CARD"].includes(payment.method) && (
                  <Input
                    type="text"
                    maxLength={4}
                    value={payment.cardLastFour || ""}
                    onChange={(e) =>
                      updatePayment(payment.id, {
                        cardLastFour: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    placeholder="Ultimos 4 digitos de la tarjeta"
                    className="w-full"
                  />
                )}

                {["PSE", "BANK_TRANSFER", "NEQUI", "DAVIPLATA"].includes(
                  payment.method,
                ) && (
                  <Input
                    type="text"
                    value={payment.reference || ""}
                    onChange={(e) =>
                      updatePayment(payment.id, { reference: e.target.value })
                    }
                    placeholder="Referencia de transaccion"
                    className="w-full"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Add Payment Button */}
          <Button
            variant="outline"
            onClick={addPayment}
            className="w-full"
            disabled={payments.length >= PAYMENT_METHODS.length}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar otro metodo de pago
          </Button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 space-y-3">
          {/* Summary */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Total pagado</span>
              <span className="font-medium">{formatCurrency(totalPaid)}</span>
            </div>
            {remaining > 0.01 && (
              <div className="flex justify-between text-error-500">
                <span>Falta</span>
                <span className="font-medium">{formatCurrency(remaining)}</span>
              </div>
            )}
            {change > 0 && (
              <div className="flex justify-between text-success-600">
                <span>Cambio a devolver</span>
                <span className="font-medium">{formatCurrency(change)}</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {!isValid && (
            <div className="flex items-center gap-2 text-error-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>El monto pagado debe ser igual o mayor al total</span>
            </div>
          )}

          {/* Confirm Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleConfirm}
            disabled={!isValid || isProcessing}
          >
            <Check className="h-5 w-5 mr-2" />
            {isProcessing ? "Procesando..." : "Confirmar Pago"}
          </Button>
        </div>
      </div>
    </div>
  );
}
