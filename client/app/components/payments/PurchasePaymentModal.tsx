import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, X, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { useCreatePurchasePayment } from "~/hooks/usePurchaseOrders";
import { formatCurrency } from "~/lib/utils";
import type { PaymentMethod } from "~/types/payment";
import { PaymentMethodLabels } from "~/types/payment";

export interface PurchasePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  purchaseOrderTotal: number;
  totalPaid: number;
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "BANK_TRANSFER",
  "PSE",
  "NEQUI",
  "DAVIPLATA",
  "OTHER",
];

export function PurchasePaymentModal({
  open,
  onOpenChange,
  purchaseOrderId,
  purchaseOrderNumber,
  purchaseOrderTotal,
  totalPaid,
}: PurchasePaymentModalProps) {
  const remainingBalance = Math.max(0, purchaseOrderTotal - totalPaid);

  const [amount, setAmount] = useState(remainingBalance.toString());
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const createPayment = useCreatePurchasePayment(purchaseOrderId);

  const parsedAmount = parseFloat(amount) || 0;
  const isValid = parsedAmount > 0 && parsedAmount <= remainingBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    await createPayment.mutateAsync({
      amount: parsedAmount,
      method,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
      paymentDate: paymentDate
        ? new Date(paymentDate + "T12:00:00").toISOString()
        : undefined,
    });

    onOpenChange(false);
    setAmount(remainingBalance.toString());
    setMethod("BANK_TRANSFER");
    setReference("");
    setNotes("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
  };

  const handleClose = () => {
    if (!createPayment.isPending) {
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
              disabled={createPayment.isPending}
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
                    Registrar Pago a Proveedor
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {purchaseOrderNumber} — Saldo: {formatCurrency(remainingBalance)}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Monto *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={createPayment.isPending}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white dark:placeholder:text-neutral-500 disabled:opacity-50"
                  placeholder="0.00"
                />
                {parsedAmount > remainingBalance && (
                  <p className="mt-1 text-xs text-error-500">
                    El monto excede el saldo pendiente ({formatCurrency(remainingBalance)})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Metodo de Pago *
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  disabled={createPayment.isPending}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white disabled:opacity-50"
                >
                  {PAYMENT_METHODS.map((m) => (
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
                    disabled={createPayment.isPending}
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
                    disabled={createPayment.isPending}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Notas
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={createPayment.isPending}
                  rows={2}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white dark:placeholder:text-neutral-500 disabled:opacity-50 resize-none"
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={createPayment.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!isValid || createPayment.isPending}
                >
                  {createPayment.isPending ? (
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
