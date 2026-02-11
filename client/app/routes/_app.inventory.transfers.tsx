import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  ArrowLeftRight,
  Package,
  Warehouse as WarehouseIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn, formatCompactNumber } from "~/lib/utils";
import { useProducts } from "~/hooks/useProducts";
import { useWarehouses } from "~/hooks/useWarehouses";
import { useCreateTransfer } from "~/hooks/useStockMovements";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";
import { Textarea } from "~/components/ui/Textarea";
import type { CreateTransferData } from "~/types/stock-movement";

// Meta for SEO
export function meta() {
  return [
    { title: "Transferencias de Inventario - StockFlow" },
    {
      name: "description",
      content: "Transferir productos entre bodegas",
    },
  ];
}

// Form state interface
interface TransferForm {
  productId: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  quantity: string;
  reason: string;
  notes: string;
}

const initialFormState: TransferForm = {
  productId: "",
  sourceWarehouseId: "",
  destinationWarehouseId: "",
  quantity: "",
  reason: "",
  notes: "",
};

export default function InventoryTransfersPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<TransferForm>(initialFormState);
  const [errors, setErrors] = useState<Partial<TransferForm>>({});

  // Queries
  const { data: productsData, isLoading: isLoadingProducts } = useProducts({
    limit: 100,
  });
  const { data: warehousesData, isLoading: isLoadingWarehouses } =
    useWarehouses();

  // Mutation
  const createTransfer = useCreateTransfer();

  // Product options for select
  const productOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar producto..." },
      ...(productsData?.data || []).map((p) => ({
        value: p.id,
        label: `${p.sku} - ${p.name} (Stock: ${p.stock})`,
      })),
    ],
    [productsData],
  );

  // Warehouse options for select
  const warehouseOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar bodega..." },
      ...(warehousesData || []).map((w) => ({
        value: w.id,
        label: w.name,
      })),
    ],
    [warehousesData],
  );

  // Get selected product details
  const selectedProduct = useMemo(
    () => productsData?.data?.find((p) => p.id === form.productId),
    [productsData, form.productId],
  );

  // Get selected source warehouse details
  const sourceWarehouse = useMemo(
    () => warehousesData?.find((w) => w.id === form.sourceWarehouseId),
    [warehousesData, form.sourceWarehouseId],
  );

  // Get selected destination warehouse details
  const destinationWarehouse = useMemo(
    () => warehousesData?.find((w) => w.id === form.destinationWarehouseId),
    [warehousesData, form.destinationWarehouseId],
  );

  // Handle input change (for Input and Textarea)
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof TransferForm]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle select change (for Select component)
  const handleSelectChange = (name: keyof TransferForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<TransferForm> = {};

    if (!form.productId) {
      newErrors.productId = "Seleccione un producto";
    }

    if (!form.sourceWarehouseId) {
      newErrors.sourceWarehouseId = "Seleccione la bodega de origen";
    }

    if (!form.destinationWarehouseId) {
      newErrors.destinationWarehouseId = "Seleccione la bodega de destino";
    }

    if (form.sourceWarehouseId === form.destinationWarehouseId) {
      newErrors.destinationWarehouseId =
        "La bodega de destino debe ser diferente";
    }

    const qty = parseInt(form.quantity, 10);
    if (!form.quantity || isNaN(qty) || qty <= 0) {
      newErrors.quantity = "Ingrese una cantidad valida mayor a 0";
    } else if (selectedProduct && qty > selectedProduct.stock) {
      newErrors.quantity = `Stock insuficiente. Disponible: ${selectedProduct.stock}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const data: CreateTransferData = {
      productId: form.productId,
      sourceWarehouseId: form.sourceWarehouseId,
      destinationWarehouseId: form.destinationWarehouseId,
      quantity: parseInt(form.quantity, 10),
      reason: form.reason || undefined,
      notes: form.notes || undefined,
    };

    try {
      await createTransfer.mutateAsync(data);
      // Reset form
      setForm(initialFormState);
    } catch {
      // Error handled by mutation
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate("/inventory/movements");
  };

  const isLoading = isLoadingProducts || isLoadingWarehouses;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
          <ArrowLeftRight className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Nueva Transferencia
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Transferir productos entre bodegas
          </p>
        </div>
      </PageSection>

      {/* Form Card */}
      <PageSection>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Selection */}
            <div>
              <label
                htmlFor="productId"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Producto *
              </label>
              <Select
                id="productId"
                name="productId"
                value={form.productId}
                onChange={handleSelectChange("productId")}
                options={productOptions}
                disabled={isLoading}
              />
              {errors.productId && (
                <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.productId}
                </p>
              )}
              {selectedProduct && (
                <div className="mt-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-neutral-500" />
                    <span className="font-medium">{selectedProduct.name}</span>
                  </div>
                  <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    SKU: {selectedProduct.sku} | Stock global:{" "}
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                      {formatCompactNumber(selectedProduct.stock)}
                    </span>{" "}
                    unidades
                  </div>
                </div>
              )}
            </div>

            {/* Warehouses Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Source Warehouse */}
              <div>
                <label
                  htmlFor="sourceWarehouseId"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Bodega Origen *
                </label>
                <Select
                  id="sourceWarehouseId"
                  name="sourceWarehouseId"
                  value={form.sourceWarehouseId}
                  onChange={handleSelectChange("sourceWarehouseId")}
                  options={warehouseOptions}
                  disabled={isLoading}
                />
                {errors.sourceWarehouseId && (
                  <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.sourceWarehouseId}
                  </p>
                )}
                {sourceWarehouse && (
                  <div className="mt-2 p-3 bg-error-50 dark:bg-error-900/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-error-700 dark:text-error-300">
                      <WarehouseIcon className="h-4 w-4" />
                      <span className="font-medium">
                        {sourceWarehouse.name}
                      </span>
                      <span className="text-error-500 dark:text-error-400">
                        (Salida)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Destination Warehouse */}
              <div>
                <label
                  htmlFor="destinationWarehouseId"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Bodega Destino *
                </label>
                <Select
                  id="destinationWarehouseId"
                  name="destinationWarehouseId"
                  value={form.destinationWarehouseId}
                  onChange={handleSelectChange("destinationWarehouseId")}
                  options={warehouseOptions.filter(
                    (w) => w.value !== form.sourceWarehouseId,
                  )}
                  disabled={isLoading || !form.sourceWarehouseId}
                />
                {errors.destinationWarehouseId && (
                  <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.destinationWarehouseId}
                  </p>
                )}
                {destinationWarehouse && (
                  <div className="mt-2 p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-success-700 dark:text-success-300">
                      <WarehouseIcon className="h-4 w-4" />
                      <span className="font-medium">
                        {destinationWarehouse.name}
                      </span>
                      <span className="text-success-500 dark:text-success-400">
                        (Entrada)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Transfer Arrow Visual */}
            {sourceWarehouse && destinationWarehouse && (
              <div className="flex items-center justify-center gap-4 py-4">
                <div className="text-center">
                  <WarehouseIcon className="h-8 w-8 mx-auto text-error-500" />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {sourceWarehouse.name}
                  </span>
                </div>
                <ArrowLeftRight className="h-6 w-6 text-primary-500" />
                <div className="text-center">
                  <WarehouseIcon className="h-8 w-8 mx-auto text-success-500" />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {destinationWarehouse.name}
                  </span>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="max-w-xs">
              <label
                htmlFor="quantity"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Cantidad a transferir *
              </label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                max={selectedProduct?.stock || 999999}
                value={form.quantity}
                onChange={handleInputChange}
                placeholder="Ej: 10"
                disabled={isLoading}
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.quantity}
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Razon de la transferencia
              </label>
              <Input
                id="reason"
                name="reason"
                value={form.reason}
                onChange={handleInputChange}
                placeholder="Ej: Reposicion de inventario en sucursal"
                maxLength={255}
                disabled={isLoading}
              />
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Notas adicionales
              </label>
              <Textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows={3}
                maxLength={1000}
                disabled={isLoading}
              />
            </div>

            {/* Summary */}
            {form.productId &&
              form.sourceWarehouseId &&
              form.destinationWarehouseId &&
              form.quantity && (
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-primary-900 dark:text-primary-100">
                        Resumen de la transferencia
                      </p>
                      <p className="mt-1 text-primary-700 dark:text-primary-300">
                        Se transferiran{" "}
                        <strong>{formatCompactNumber(parseInt(form.quantity, 10) || 0)}</strong>{" "}
                        unidades de{" "}
                        <strong>{selectedProduct?.name}</strong> desde{" "}
                        <strong>{sourceWarehouse?.name}</strong> hacia{" "}
                        <strong>{destinationWarehouse?.name}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={createTransfer.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createTransfer.isPending || isLoading}
              >
                {createTransfer.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transfiriendo...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Realizar Transferencia
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
