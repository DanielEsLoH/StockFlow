import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Save, Receipt } from "lucide-react";
import type { Route } from "./+types/_app.expenses.$id.edit";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatCurrency } from "~/lib/utils";
import { useExpense, useUpdateExpense } from "~/hooks/useExpenses";
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
import { Skeleton } from "~/components/ui/Skeleton";
import { toast } from "~/components/ui/Toast";
import type { ExpenseCategory, UpdateExpenseData } from "~/types/expense";
import { ExpenseCategoryLabels } from "~/types/expense";

// ============================================================================
// META
// ============================================================================

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Editar Gasto - StockFlow" },
    { name: "description", content: "Editar gasto" },
  ];
};

// ============================================================================
// CONSTANTS
// ============================================================================

const categoryOptions = [
  { value: "", label: "Seleccionar categoria" },
  ...Object.entries(ExpenseCategoryLabels).map(([value, label]) => ({
    value,
    label,
  })),
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function EditExpensePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data hooks
  const {
    data: expense,
    isLoading: isLoadingExpense,
    isError,
    error,
  } = useExpense(id!);
  const supplierOptions = useSupplierOptions();
  const { data: accounts } = useAccounts();
  const { data: costCenterData } = useCostCenterOptions();
  const updateExpense = useUpdateExpense();

  // Form state
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Populate form when expense loads
  useEffect(() => {
    if (expense && !isInitialized) {
      setCategory(expense.category);
      setDescription(expense.description || "");
      setSubtotal(String(expense.subtotal));
      setTaxRate(String(expense.taxRate));
      setSupplierId(expense.supplierId || "");
      setAccountId(expense.accountId || "");
      setCostCenterId(expense.costCenterId || "");
      setIssueDate(
        expense.issueDate ? expense.issueDate.substring(0, 10) : "",
      );
      setDueDate(expense.dueDate ? expense.dueDate.substring(0, 10) : "");
      setInvoiceNumber(expense.invoiceNumber || "");
      setNotes(expense.notes || "");
      setIsInitialized(true);
    }
  }, [expense, isInitialized]);

  // Select options
  const supplierFormOptions = useMemo(
    () => [
      { value: "", label: "Sin proveedor" },
      ...supplierOptions.filter((o) => o.value !== ""),
    ],
    [supplierOptions],
  );

  const accountFormOptions = useMemo(
    () => [
      { value: "", label: "Sin cuenta contable" },
      ...(accounts ?? []).map((a) => ({
        value: a.id,
        label: `${a.code} - ${a.name}`,
      })),
    ],
    [accounts],
  );

  const costCenterFormOptions = useMemo(
    () => [
      { value: "", label: "Sin centro de costo" },
      ...(costCenterData ?? []).map((c) => ({
        value: c.id,
        label: `${c.code} - ${c.name}`,
      })),
    ],
    [costCenterData],
  );

  // Calculations
  const calculations = useMemo(() => {
    const sub = parseFloat(subtotal) || 0;
    const rate = parseFloat(taxRate) || 0;
    const tax = sub * (rate / 100);
    const total = sub + tax;
    return { subtotal: sub, tax, total };
  }, [subtotal, taxRate]);

  // Submit handler
  const handleSubmit = useCallback(() => {
    if (!id) return;

    if (!category) {
      toast.error("Selecciona una categoria");
      return;
    }

    if (!description.trim()) {
      toast.error("Ingresa una descripcion");
      return;
    }

    const sub = parseFloat(subtotal);
    if (!sub || sub <= 0) {
      toast.error("Ingresa un subtotal valido");
      return;
    }

    const data: UpdateExpenseData = {
      category: category as ExpenseCategory,
      description: description.trim(),
      subtotal: sub,
      taxRate: parseFloat(taxRate) || 0,
      supplierId: supplierId || undefined,
      accountId: accountId || undefined,
      costCenterId: costCenterId || undefined,
      issueDate: issueDate || undefined,
      dueDate: dueDate || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    updateExpense.mutate(
      { id, data },
      {
        onSuccess: () => {
          navigate(`/expenses/${id}`);
        },
      },
    );
  }, [
    id,
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
    updateExpense,
    navigate,
  ]);

  // Loading state
  if (isLoadingExpense) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !expense) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/expenses")}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Volver a gastos
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-error-100 dark:bg-error-900/30 mb-4">
              <Receipt className="h-10 w-10 text-error-500 dark:text-error-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Gasto no encontrado
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
              {error?.message ||
                "El gasto que buscas no existe o fue eliminado."}
            </p>
            <Button onClick={() => navigate("/expenses")}>Ver gastos</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guard: only DRAFT expenses can be edited
  if (expense.status !== "DRAFT") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to={`/expenses/${id}`}>
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Editar Gasto
            </h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-warning-100 dark:bg-warning-900/30 mb-4">
              <Receipt className="h-10 w-10 text-warning-500 dark:text-warning-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              No se puede editar
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
              Solo se pueden editar gastos en estado borrador. Este gasto tiene
              estado{" "}
              <span className="font-medium capitalize">
                {expense.status.toLowerCase()}
              </span>
              .
            </p>
            <Link to={`/expenses/${id}`}>
              <Button>Volver al gasto</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/expenses/${id}`}>
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Editar Gasto
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              {expense.expenseNumber}
            </p>
          </div>
        </div>
      </PageSection>

      {/* Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - Main form fields */}
        <PageSection className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary-500" />
                Datos del Gasto
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
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripcion del gasto..."
                  rows={3}
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

              {/* Subtotal and Tax Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Subtotal *
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={subtotal}
                    onChange={(e) => setSubtotal(e.target.value)}
                    placeholder="0"
                    leftElement={
                      <span className="text-neutral-400 text-xs">$</span>
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Tasa IVA (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Invoice number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  No. Factura del Proveedor
                </label>
                <Input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Numero de factura del proveedor"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Fecha de Emision
                  </label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Fecha de Vencimiento
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Notas
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={3}
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

        {/* Right column - Supplier, Account, Cost Center, Summary */}
        <PageSection className="space-y-6">
          {/* Supplier */}
          <Card>
            <CardHeader>
              <CardTitle>Proveedor</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                options={supplierFormOptions}
                value={supplierId}
                onChange={(val) => setSupplierId(val)}
                placeholder="Sin proveedor"
              />
            </CardContent>
          </Card>

          {/* Account */}
          <Card>
            <CardHeader>
              <CardTitle>Cuenta Contable</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                options={accountFormOptions}
                value={accountId}
                onChange={(val) => setAccountId(val)}
                placeholder="Sin cuenta contable"
              />
            </CardContent>
          </Card>

          {/* Cost Center */}
          <Card>
            <CardHeader>
              <CardTitle>Centro de Costo</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                options={costCenterFormOptions}
                value={costCenterId}
                onChange={(val) => setCostCenterId(val)}
                placeholder="Sin centro de costo"
              />
            </CardContent>
          </Card>

          {/* Totals & Actions */}
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
                  {formatCurrency(calculations.subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  IVA ({parseFloat(taxRate) || 0}%)
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {formatCurrency(calculations.tax)}
                </span>
              </div>

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

              {/* Actions */}
              <div className="space-y-3 pt-4">
                <Button
                  type="button"
                  className="w-full"
                  isLoading={updateExpense.isPending}
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={handleSubmit}
                >
                  Guardar Cambios
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/expenses/${id}`)}
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
