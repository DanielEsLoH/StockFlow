import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ClipboardList,
  Save,
} from "lucide-react";
import type { Route } from "./+types/_app.quotations.new";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatCurrency } from "~/lib/utils";
import { useCreateQuotation } from "~/hooks/useQuotations";
import { useProducts } from "~/hooks/useProducts";
import { useCustomers } from "~/hooks/useCustomers";
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
import type { CreateQuotationData } from "~/types/quotation";

// ============================================================================
// META
// ============================================================================

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Nueva Cotizacion - StockFlow" },
    { name: "description", content: "Crear una nueva cotizacion" },
  ];
};

// ============================================================================
// TYPES
// ============================================================================

interface QuotationItemRow {
  id: string; // local key for React
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

function createEmptyItem(): QuotationItemRow {
  return {
    id: crypto.randomUUID(),
    productId: "",
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    taxRate: 19,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function NewQuotationPage() {
  const navigate = useNavigate();
  const createQuotation = useCreateQuotation();

  // Data hooks
  const { data: productsData } = useProducts({ limit: 100 });
  const { data: customersData } = useCustomers({ limit: 100 });

  // Form state
  const [items, setItems] = useState<QuotationItemRow[]>([createEmptyItem()]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  // Product and customer options
  const productOptions = useMemo(() => {
    const products = productsData?.data ?? [];
    return products.map((p) => ({
      value: p.id,
      label: `${p.name} - ${p.sku}`,
      salePrice: p.salePrice,
    }));
  }, [productsData]);

  const customerOptions = useMemo(() => {
    const customers = customersData?.data ?? [];
    return [
      { value: "", label: "Sin cliente" },
      ...customers.map((c) => ({ value: c.id, label: c.name })),
    ];
  }, [customersData]);

  // Item handlers
  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItem()]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const updateItem = useCallback(
    (id: string, field: keyof QuotationItemRow, value: string | number) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const updated = { ...item, [field]: value };

          // Auto-fill unitPrice when product is selected
          if (field === "productId" && typeof value === "string") {
            const product = productOptions.find((p) => p.value === value);
            if (product) {
              updated.unitPrice = product.salePrice;
            }
          }

          return updated;
        }),
      );
    },
    [productOptions],
  );

  // Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    const lineDetails = items.map((item) => {
      const lineSubtotal = item.quantity * item.unitPrice - item.discount;
      const lineTax = lineSubtotal * (item.taxRate / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxTotal += lineTax;
      discountTotal += item.discount;

      return { lineSubtotal, lineTax, lineTotal };
    });

    return {
      lineDetails,
      subtotal,
      tax: taxTotal,
      discount: discountTotal,
      total: subtotal + taxTotal,
    };
  }, [items]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (items.length === 0) {
      toast.error("Agrega al menos un item");
      return;
    }

    const invalidItems = items.filter((i) => !i.productId);
    if (invalidItems.length > 0) {
      toast.error("Todos los items deben tener un producto seleccionado");
      return;
    }

    const data: CreateQuotationData = {
      customerId: selectedCustomerId || undefined,
      validUntil: validUntil || undefined,
      notes: notes || undefined,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        taxRate: i.taxRate,
      })),
    };

    createQuotation.mutate(data);
  }, [items, selectedCustomerId, validUntil, notes, createQuotation]);

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/quotations">
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Nueva Cotizacion
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Crea una nueva cotizacion para tu cliente
            </p>
          </div>
        </div>
      </PageSection>

      {/* Form layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - Items */}
        <PageSection className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              action={
                <Button
                  type="button"
                  variant="outline-primary"
                  size="sm"
                  onClick={addItem}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Agregar Producto
                </Button>
              }
            >
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary-500" />
                Items de la Cotizacion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Column headers (desktop) */}
              <div className="hidden lg:grid lg:grid-cols-12 lg:gap-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-1">
                <div className="col-span-3">Producto</div>
                <div className="col-span-1 text-center">Cant.</div>
                <div className="col-span-2">Precio Unit.</div>
                <div className="col-span-2">Descuento</div>
                <div className="col-span-1 text-center">IVA %</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1" />
              </div>

              {/* Item rows */}
              {items.map((item, index) => {
                const lineDetail = calculations.lineDetails[index];
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 lg:p-3 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-3 lg:items-center"
                  >
                    {/* Product select */}
                    <div className="lg:col-span-3">
                      <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 lg:hidden mb-1 block">
                        Producto
                      </label>
                      <Select
                        options={productOptions.map((p) => ({
                          value: p.value,
                          label: p.label,
                        }))}
                        value={item.productId}
                        onChange={(val) =>
                          updateItem(item.id, "productId", val)
                        }
                        placeholder="Seleccionar..."
                      />
                    </div>

                    {/* Quantity */}
                    <div className="lg:col-span-1">
                      <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 lg:hidden mb-1 block">
                        Cantidad
                      </label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "quantity",
                            Math.max(1, parseInt(e.target.value) || 1),
                          )
                        }
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="lg:col-span-2">
                      <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 lg:hidden mb-1 block">
                        Precio Unitario
                      </label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "unitPrice",
                            Math.max(0, parseFloat(e.target.value) || 0),
                          )
                        }
                        leftElement={
                          <span className="text-neutral-400 text-xs">$</span>
                        }
                      />
                    </div>

                    {/* Discount */}
                    <div className="lg:col-span-2">
                      <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 lg:hidden mb-1 block">
                        Descuento
                      </label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={item.discount}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "discount",
                            Math.max(0, parseFloat(e.target.value) || 0),
                          )
                        }
                        leftElement={
                          <span className="text-neutral-400 text-xs">$</span>
                        }
                      />
                    </div>

                    {/* Tax Rate */}
                    <div className="lg:col-span-1">
                      <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 lg:hidden mb-1 block">
                        IVA %
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={item.taxRate}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "taxRate",
                            Math.max(
                              0,
                              Math.min(
                                100,
                                parseFloat(e.target.value) || 0,
                              ),
                            ),
                          )
                        }
                      />
                    </div>

                    {/* Line Total */}
                    <div className="lg:col-span-2 flex items-center justify-between lg:justify-end">
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 lg:hidden">
                        Total
                      </span>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {formatCurrency(lineDetail?.lineTotal ?? 0)}
                      </span>
                    </div>

                    {/* Remove button */}
                    <div className="lg:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length <= 1}
                        aria-label="Eliminar item"
                        className="text-neutral-400 hover:text-error-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Add item button (bottom) */}
              <button
                type="button"
                onClick={addItem}
                className="w-full rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 py-3 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:border-primary-300 hover:text-primary-600 dark:hover:border-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <span className="flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar otro producto
                </span>
              </button>
            </CardContent>
          </Card>
        </PageSection>

        {/* Right column - Customer, Details, Totals */}
        <PageSection className="space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                options={customerOptions}
                value={selectedCustomerId}
                onChange={(val) => setSelectedCustomerId(val)}
                placeholder="Seleccionar cliente"
              />
              <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                Opcional. Puedes crear la cotizacion sin cliente.
              </p>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Valid until */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Valida hasta
                </label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
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
                  placeholder="Notas adicionales para el cliente..."
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

          {/* Totals */}
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
                  Impuestos
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {formatCurrency(calculations.tax)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Descuento
                </span>
                <span className="font-medium text-error-500">
                  {calculations.discount > 0
                    ? `- ${formatCurrency(calculations.discount)}`
                    : formatCurrency(0)}
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
                  isLoading={createQuotation.isPending}
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={() => handleSubmit()}
                >
                  Guardar Borrador
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/quotations")}
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
