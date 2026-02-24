import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  FileText,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "~/components/ui/Button";
import { useCreateCreditNote } from "~/hooks/useDian";
import {
  CreditNoteReason,
  creditNoteReasonLabels,
} from "~/types/dian";
import type { Invoice, InvoiceItem } from "~/types/invoice";
import { formatCurrency } from "~/lib/utils";

interface CreditNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
}

interface ItemSelection {
  invoiceItemId: string;
  maxQuantity: number;
  quantity: number;
  description: string;
  unitPrice: number;
  taxRate: number;
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const REASON_OPTIONS = Object.values(CreditNoteReason);

export function CreditNoteModal({
  open,
  onOpenChange,
  invoice,
}: CreditNoteModalProps) {
  const [reasonCode, setReasonCode] = useState<CreditNoteReason>(
    CreditNoteReason.ANULACION,
  );
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isPartial, setIsPartial] = useState(false);
  const [itemSelections, setItemSelections] = useState<ItemSelection[]>(() =>
    invoice.items.map((item) => ({
      invoiceItemId: item.id,
      maxQuantity: item.quantity,
      quantity: item.quantity,
      description: item.product?.name || item.description || "Producto",
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
    })),
  );

  const createCreditNote = useCreateCreditNote();

  const handleClose = () => {
    if (!createCreditNote.isPending) {
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const items = isPartial
      ? itemSelections
          .filter((i) => i.quantity > 0)
          .map((i) => ({
            invoiceItemId: i.invoiceItemId,
            quantity: i.quantity,
          }))
      : undefined;

    await createCreditNote.mutateAsync({
      invoiceId: invoice.id,
      reasonCode,
      reason: reason || creditNoteReasonLabels[reasonCode],
      description: description || undefined,
      items,
    });

    onOpenChange(false);
  };

  const updateItemQuantity = (index: number, delta: number) => {
    setItemSelections((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newQty = Math.max(0, Math.min(item.maxQuantity, item.quantity + delta));
        return { ...item, quantity: newQty };
      }),
    );
  };

  const partialTotal = itemSelections.reduce((sum, item) => {
    const lineSubtotal = item.quantity * item.unitPrice;
    const lineTax = lineSubtotal * (item.taxRate / 100);
    return sum + lineSubtotal + lineTax;
  }, 0);

  const creditTotal = isPartial ? partialTotal : invoice.total;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-lg mx-4 bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-900/20">
                    <FileText className="h-5 w-5 text-warning-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      Crear Nota Credito
                    </h3>
                    <p className="text-sm text-neutral-500">
                      {invoice.invoiceNumber} — Total: {formatCurrency(invoice.total)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={createCreditNote.isPending}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Reason Code */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Razon *
                  </label>
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value as CreditNoteReason)}
                    disabled={createCreditNote.isPending}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {REASON_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {creditNoteReasonLabels[r]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reason text */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Motivo
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={creditNoteReasonLabels[reasonCode]}
                    disabled={createCreditNote.isPending}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Descripcion adicional
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Descripcion opcional..."
                    disabled={createCreditNote.isPending}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Partial toggle */}
                <div className="flex items-center gap-3 pt-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPartial}
                      onChange={(e) => setIsPartial(e.target.checked)}
                      disabled={createCreditNote.isPending}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-neutral-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-primary-500" />
                  </label>
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Credito parcial (seleccionar items)
                  </span>
                </div>

                {/* Partial items */}
                {isPartial && (
                  <div className="space-y-2 border border-neutral-200 dark:border-neutral-600 rounded-lg p-3">
                    {itemSelections.map((item, index) => (
                      <div
                        key={item.invoiceItemId}
                        className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                            {item.description}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {formatCurrency(item.unitPrice)} x {item.maxQuantity} (max)
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(index, -1)}
                            disabled={item.quantity <= 0 || createCreditNote.isPending}
                            className="p-1 rounded-md border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-neutral-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(index, 1)}
                            disabled={
                              item.quantity >= item.maxQuantity ||
                              createCreditNote.isPending
                            }
                            className="p-1 rounded-md border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Total nota credito
                  </span>
                  <span className="text-lg font-bold text-warning-600 dark:text-warning-400">
                    {formatCurrency(creditTotal)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 p-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={createCreditNote.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={createCreditNote.isPending}
                >
                  {createCreditNote.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Crear Nota Credito
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
