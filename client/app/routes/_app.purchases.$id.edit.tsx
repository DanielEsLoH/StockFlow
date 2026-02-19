import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Save, ShoppingCart, Plus, Trash2 } from "lucide-react";
import type { Route } from "./+types/_app.purchases.$id.edit";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatCurrency } from "~/lib/utils";
import {
  usePurchaseOrder,
  useUpdatePurchaseOrder,
} from "~/hooks/usePurchaseOrders";
import { useProducts } from "~/hooks/useProducts";
import { useSupplierOptions } from "~/hooks/useSupplierOptions";
import { useWarehouses } from "~/hooks/useWarehouses";
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
import type { UpdatePurchaseOrderData } from "~/types/purchase-order";

// ============================================================================
// META
// ============================================================================

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Editar Orden de Compra - StockFlow" },
    { name: "description", content: "Editar orden de compra" },
  ];
};

// ============================================================================
// TYPES
// ============================================================================

interface PurchaseOrderItemRow {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

function createEmptyItem(): PurchaseOrderItemRow {
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

export default function EditPurchaseOrderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data hooks
  const {
    data: order,
    isLoading: isLoadingOrder,
    isError,
    error,
  } = usePurchaseOrder(id!);
  const { data: productsData } = useProducts({ limit: 100 });
  const supplierOptions = useSupplierOptions();
  const { data: warehousesData } = useWarehouses();
  const updatePurchaseOrder = useUpdatePurchaseOrder();

  // Form state
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseOrderItemRow[]>([
    createEmptyItem(),
  ]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Populate form when order loads
  useEffect(() => {
    if (order && !isInitialized) {
      setSupplierId(order.supplierId || "");
      setWarehouseId(order.warehouseId || "");
      setExpectedDeliveryDate(
        order.expectedDeliveryDate
          ? order.expectedDeliveryDate.substring(0, 10)
          : "",
      );
      setNotes(order.notes || "");

      // Populate items from order
      if (order.items && order.items.length > 0) {
        setItems(
          order.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
          })),
        );
      }

      setIsInitialized(true);
    }
  }, [order, isInitialized]);

  // Product options (with costPrice for auto-fill)
  const productOptions = useMemo(() => {
    const products = productsData?.data ?? [];
    return products.map((p) => ({
      value: p.id,
      label: `${p.name} - ${p.sku}`,
      costPrice: p.costPrice,
    }));
  }, [productsData]);

  // Supplier options for form
  const supplierFormOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar proveedor" },
      ...supplierOptions.filter((o) => o.value !== ""),
    ],
    [supplierOptions],
  );

  // Warehouse options for form
  const warehouseFormOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar bodega" },
      ...(warehousesData ?? []).map((w) => ({
        value: w.id,
        label: w.name,
      })),
    ],
    [warehousesData],
  );

  // Item handlers
  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItem()]);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== itemId);
    });
  }, []);

  const updateItem = useCallback(
    (
      itemId: string,
      field: keyof PurchaseOrderItemRow,
      value: string | number,
    ) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const updated = { ...item, [field]: value };

          // Auto-fill unitPrice with costPrice when product is selected
          if (field === "productId" && typeof value === "string") {
            const product = productOptions.find((p) => p.value === value);
            if (product) {
              updated.unitPrice = product.costPrice;
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
  const handleSubmit = useCallback(() => {
    if (!id) return;

    if (!supplierId) {
      toast.error("Selecciona un proveedor");
      return;
    }

    if (!warehouseId) {
      toast.error("Selecciona una bodega de destino");
      return;
    }

    const invalidItems = items.filter((i) => !i.productId);
    if (invalidItems.length > 0) {
      toast.error("Todos los items deben tener un producto seleccionado");
      return;
    }

    const data: UpdatePurchaseOrderData = {
      supplierId,
      warehouseId,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      notes: notes || undefined,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        taxRate: i.taxRate,
      })),
    };

    updatePurchaseOrder.mutate(
      { id, data },
      {
        onSuccess: () => {
          navigate(`/purchases/${id}`);
        },
      },
    );
  }, [
    id,
    supplierId,
    warehouseId,
    expectedDeliveryDate,
    notes,
    items,
    updatePurchaseOrder,
    navigate,
  ]);

  // Loading state
  if (isLoadingOrder) {
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
  if (isError || !order) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/purchases")}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Volver a ordenes de compra
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-error-100 dark:bg-error-900/30 mb-4">
              <ShoppingCart className="h-10 w-10 text-error-500 dark:text-error-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Orden de compra no encontrada
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
              {error?.message ||
                "La orden de compra que buscas no existe o fue eliminada."}
            </p>
            <Button onClick={() => navigate("/purchases")}>
              Ver ordenes de compra
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guard: only DRAFT orders can be edited
  if (order.status !== "DRAFT") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to={`/purchases/${id}`}>
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Editar Orden de Compra
            </h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-warning-100 dark:bg-warning-900/30 mb-4">
              <ShoppingCart className="h-10 w-10 text-warning-500 dark:text-warning-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              No se puede editar
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
              Solo se pueden editar ordenes de compra en estado borrador. Esta
              orden tiene estado{" "}
              <span className="font-medium capitalize">
                {order.status.toLowerCase()}
              </span>
              .
            </p>
            <Link to={`/purchases/${id}`}>
              <Button>Volver a la orden</Button>
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
          <Link to={`/purchases/${id}`}>
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Editar Orden de Compra
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              {order.purchaseOrderNumber}
            </p>
          </div>
        </div>
      </PageSection>

      {/* Form */}
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
                <ShoppingCart className="h-5 w-5 text-primary-500" />
                Items de la Orden
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

        {/* Right column - Supplier, Warehouse, Details, Actions */}
        <PageSection className="space-y-6">
          {/* Supplier */}
          <Card>
            <CardHeader>
              <CardTitle>Proveedor *</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                options={supplierFormOptions}
                value={supplierId}
                onChange={(val) => setSupplierId(val)}
                placeholder="Seleccionar proveedor"
              />
            </CardContent>
          </Card>

          {/* Warehouse */}
          <Card>
            <CardHeader>
              <CardTitle>Bodega Destino *</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                options={warehouseFormOptions}
                value={warehouseId}
                onChange={(val) => setWarehouseId(val)}
                placeholder="Seleccionar bodega"
              />
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Expected delivery date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Fecha de entrega esperada
                </label>
                <Input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
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
                  placeholder="Notas adicionales para el proveedor..."
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
                  isLoading={updatePurchaseOrder.isPending}
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={handleSubmit}
                >
                  Guardar Cambios
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/purchases/${id}`)}
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
