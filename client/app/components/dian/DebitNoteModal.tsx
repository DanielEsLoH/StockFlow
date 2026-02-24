import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  FilePlus,
  Loader2,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "~/components/ui/Button";
import { useCreateDebitNote } from "~/hooks/useDian";
import {
  DebitNoteReason,
  debitNoteReasonLabels,
} from "~/types/dian";
import type { Invoice } from "~/types/invoice";
import { formatCurrency } from "~/lib/utils";

interface DebitNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
}

interface DebitItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const REASON_OPTIONS = Object.values(DebitNoteReason);

let nextId = 1;

export function DebitNoteModal({
  open,
  onOpenChange,
  invoice,
}: DebitNoteModalProps) {
  const [reasonCode, setReasonCode] = useState<DebitNoteReason>(
    DebitNoteReason.INTERESES,
  );
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<DebitItem[]>([
    { id: String(nextId++), description: "", quantity: 1, unitPrice: 0, taxRate: 19 },
  ]);

  const createDebitNote = useCreateDebitNote();

  const handleClose = () => {
    if (!createDebitNote.isPending) {
      onOpenChange(false);
    }
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: String(nextId++), description: "", quantity: 1, unitPrice: 0, taxRate: 19 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof Omit<DebitItem, "id">, value: string | number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const debitTotal = items.reduce((sum, item) => {
    const lineSubtotal = item.quantity * item.unitPrice;
    const lineTax = lineSubtotal * (item.taxRate / 100);
    return sum + lineSubtotal + lineTax;
  }, 0);

  const isValid = items.length > 0 && items.every(
    (i) => i.description.trim() && i.quantity >= 1 && i.unitPrice > 0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    await createDebitNote.mutateAsync({
      invoiceId: invoice.id,
      reasonCode,
      reason: reason || debitNoteReasonLabels[reasonCode],
      description: description || undefined,
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxRate: i.taxRate,
      })),
    });

    onOpenChange(false);
  };

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
            className="relative w-full max-w-2xl mx-4 bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-50 dark:bg-error-900/20">
                    <FilePlus className="h-5 w-5 text-error-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      Crear Nota Debito
                    </h3>
                    <p className="text-sm text-neutral-500">
                      {invoice.invoiceNumber} — Total original: {formatCurrency(invoice.total)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={createDebitNote.isPending}
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
                    onChange={(e) => setReasonCode(e.target.value as DebitNoteReason)}
                    disabled={createDebitNote.isPending}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {REASON_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {debitNoteReasonLabels[r]}
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
                    placeholder={debitNoteReasonLabels[reasonCode]}
                    disabled={createDebitNote.isPending}
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
                    disabled={createDebitNote.isPending}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Items */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Items de cargo adicional *
                  </label>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateItem(item.id, "description", e.target.value)
                            }
                            placeholder="Descripcion del cargo"
                            disabled={createDebitNote.isPending}
                            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              disabled={createDebitNote.isPending}
                              className="p-2 text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-neutral-500 mb-0.5">
                              Cantidad
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "quantity",
                                  Math.max(1, parseInt(e.target.value) || 1),
                                )
                              }
                              disabled={createDebitNote.isPending}
                              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-1.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-neutral-500 mb-0.5">
                              Precio unitario
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice || ""}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "unitPrice",
                                  Math.max(0, parseFloat(e.target.value) || 0),
                                )
                              }
                              disabled={createDebitNote.isPending}
                              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-1.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-neutral-500 mb-0.5">
                              IVA %
                            </label>
                            <select
                              value={item.taxRate}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "taxRate",
                                  parseFloat(e.target.value),
                                )
                              }
                              disabled={createDebitNote.isPending}
                              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-1.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value={0}>0%</option>
                              <option value={5}>5%</option>
                              <option value={19}>19%</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    disabled={createDebitNote.isPending}
                    className="w-full mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar item
                  </Button>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Total nota debito
                  </span>
                  <span className="text-lg font-bold text-error-600 dark:text-error-400">
                    {formatCurrency(debitTotal)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 p-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={createDebitNote.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!isValid || createDebitNote.isPending}
                >
                  {createDebitNote.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <FilePlus className="h-4 w-4 mr-2" />
                      Crear Nota Debito
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
