import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Save, Receipt } from "lucide-react";
import type { Route } from "./+types/_app.expenses.new";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatCurrency } from "~/lib/utils";
import { useCreateExpense } from "~/hooks/useExpenses";
import { useSupplierOptions } from "~/hooks/useSupplierOptions";
import { useAccounts } from "~/hooks/useAccounting";
import { useCostCenterOptions } from "~/hooks/useCostCenters";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";
import { toast } from "~/components/ui/Toast";
import {
  ExpenseCategoryLabels,
  type ExpenseCategory,
  type CreateExpenseData,
} from "~/types/expense";

// ============================================================================
// META
// ============================================================================

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Nuevo Gasto - StockFlow" },
    { name: "description", content: "Registrar un nuevo gasto" },
  ];
};

// ============================================================================
// CONSTANTS
// ============================================================================

const TAX_RATE_OPTIONS = [
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "19", label: "19%" },
];

const RETEFUENTE_THRESHOLD = 1_168_000;
const RETEFUENTE_RATE = 0.11;

function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function NewExpensePage() {
  const navigate = useNavigate();
  const createExpense = useCreateExpense();

  // Data hooks
  const supplierOptions = useSupplierOptions();
  const { data: accountsData } = useAccounts();
  const { data: costCenterOptionsData } = useCostCenterOptions();

  // Form state
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [subtotal, setSubtotal] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<string>("19");
  const [supplierId, setSupplierId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [issueDate, setIssueDate] = useState(getTodayISO());
  const [dueDate, setDueDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Supplier options for form (without "Todos" placeholder)
  const supplierFormOptions = useMemo(
    () => [
      { value: "", label: "Sin proveedor" },
      ...supplierOptions.filter((o) => o.value !== ""),
    ],
    [supplierOptions],
  );

  // Category options
  const categoryOptions = useMemo(
    () =>
      Object.entries(ExpenseCategoryLabels).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  // Account options for form
  const accountFormOptions = useMemo(
    () => [
      { value: "", label: "Sin cuenta contable" },
      ...(accountsData ?? []).map((a) => ({
        value: a.id,
        label: `${a.code} - ${a.name}`,
      })),
    ],
    [accountsData],
  );

  // Cost center options for form
  const costCenterFormOptions = useMemo(
    () => [
      { value: "", label: "Sin centro de costo" },
      ...(costCenterOptionsData ?? []).map((cc) => ({
        value: cc.id,
        label: `${cc.code} - ${cc.name}`,
      })),
    ],
    [costCenterOptionsData],
  );

  // Calculations
  const calculations = useMemo(() => {
    const taxRateNum = parseFloat(taxRate) || 0;
    const iva = subtotal * (taxRateNum / 100);

    const isHonorarios = category === "HONORARIOS";
    const reteFuente =
      isHonorarios && subtotal >= RETEFUENTE_THRESHOLD
        ? subtotal * RETEFUENTE_RATE
        : 0;

    const total = subtotal + iva - reteFuente;

    return {
      iva,
      reteFuente,
      total,
      showReteFuente: isHonorarios && subtotal >= RETEFUENTE_THRESHOLD,
    };
  }, [subtotal, taxRate, category]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!category) {
      toast.error("Selecciona una categoria");
      return;
    }

    if (!description.trim()) {
      toast.error("La descripcion es requerida");
      return;
    }

    if (subtotal <= 0) {
      toast.error("El subtotal debe ser mayor a 0");
      return;
    }

    const data: CreateExpenseData = {
      category: category as ExpenseCategory,
      description: description.trim(),
      subtotal,
      taxRate: parseFloat(taxRate) || 0,
      supplierId: supplierId || undefined,
      accountId: accountId || undefined,
      costCenterId: costCenterId || undefined,
      issueDate: issueDate || undefined,
      dueDate: dueDate || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    createExpense.mutate(data);
  }, [
    category,
    description,
    subtotal,
    taxRate,
    supplierId,
    accountId,
    costCenterId,
    issueDate,
    dueDate,
    invoiceNumber,
    notes,
    createExpense,
  ]);

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/expenses">
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Nuevo Gasto
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Registra un nuevo gasto para tu empresa
            </p>
          </div>
        </div>
      </PageSection>

      {/* Form layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - Main form fields */}
        <PageSection className="space-y-6 lg:col-span-2">
          {/* Basic info card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary-500" />
                Informacion del Gasto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Categoria *
                </label>
                <Select
                  options={categoryOptions}
                  value={category}
                  onChange={(val) => setCategory(val)}
                  placeholder="Seleccionar categoria"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Descripcion *
                </label>
                <Input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe el gasto..."
                />
              </div>

              {/* Subtotal and Tax Rate row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Subtotal */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Subtotal *
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={subtotal}
                    onChange={(e) =>
                      setSubtotal(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    leftElement={
                      <span className="text-neutral-400 text-xs">$</span>
                    }
                  />
                </div>

                {/* Tax Rate */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Tasa IVA
                  </label>
                  <Select
                    options={TAX_RATE_OPTIONS}
                    value={taxRate}
                    onChange={(val) => setTaxRate(val)}
                  />
                </div>
              </div>

              {/* Supplier */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Proveedor
                </label>
                <Select
                  options={supplierFormOptions}
                  value={supplierId}
                  onChange={(val) => setSupplierId(val)}
                  placeholder="Seleccionar proveedor"
                />
              </div>

              {/* Account and Cost Center row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Account */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Cuenta contable
                  </label>
                  <Select
                    options={accountFormOptions}
                    value={accountId}
                    onChange={(val) => setAccountId(val)}
                    placeholder="Seleccionar cuenta"
                  />
                </div>

                {/* Cost Center */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Centro de costo
                  </label>
                  <Select
                    options={costCenterFormOptions}
                    value={costCenterId}
                    onChange={(val) => setCostCenterId(val)}
                    placeholder="Seleccionar centro de costo"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details card */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles Adicionales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Issue date and Due date row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Issue date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Fecha de emision
                  </label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>

                {/* Due date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Fecha de vencimiento
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Invoice number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Nro. factura proveedor
                </label>
                <Input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Ej: FAC-001234"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Notas
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales sobre el gasto..."
                  rows={4}
                  className={cn(
                    "flex w-full rounded-xl border bg-white px-4 py-3 text-sm",
                    "transition-colors duration-200 resize-none",
                    "placeholder:text-neutral-400",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                    "dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500",
                    "border-neutral-200 dark:border-neutral-700",
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* Right column - Summary */}
        <PageSection className="space-y-6">
          <Card variant="elevated" className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Subtotal
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  IVA ({taxRate}%)
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {formatCurrency(calculations.iva)}
                </span>
              </div>

              {/* ReteFuente - conditional */}
              {calculations.showReteFuente && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    ReteFuente (11%)
                  </span>
                  <span className="font-medium text-error-500">
                    - {formatCurrency(calculations.reteFuente)}
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700 my-2" />

              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-neutral-900 dark:text-white">
                  Total
                </span>
                <span className="text-xl font-bold text-neutral-900 dark:text-white">
                  {formatCurrency(calculations.total)}
                </span>
              </div>

              {/* ReteFuente info message */}
              {calculations.showReteFuente && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Se aplica retencion en la fuente del 11% por honorarios con
                  base mayor o igual a{" "}
                  {formatCurrency(RETEFUENTE_THRESHOLD)}.
                </p>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-4">
                <Button
                  type="button"
                  className="w-full"
                  isLoading={createExpense.isPending}
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={() => handleSubmit()}
                >
                  Guardar Borrador
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/expenses")}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      </div>
    </PageWrapper>
  );
}
