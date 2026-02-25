import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Truck,
  Save,
  MapPin,
  Calendar,
  Loader2,
} from "lucide-react";
import type { Route } from "./+types/_app.remissions.new";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { useCreateRemission } from "~/hooks/useRemissions";
import { useProducts } from "~/hooks/useProducts";
import { useCustomers } from "~/hooks/useCustomers";
import { useWarehouses } from "~/hooks/useWarehouses";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Textarea } from "~/components/ui/Textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";
import { toast } from "~/components/ui/Toast";
import type { CreateRemissionData, CreateRemissionItemData } from "~/types/remission";

// ============================================================================
// META
// ============================================================================

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Nueva Remision - StockFlow" },
    { name: "description", content: "Crear una nueva remision" },
  ];
};

// ============================================================================
// TYPES
// ============================================================================

interface RemissionItemRow {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unit: string;
  notes: string;
}

function createEmptyItem(): RemissionItemRow {
  return {
    id: crypto.randomUUID(),
    productId: "",
    description: "",
    quantity: 1,
    unit: "unidad",
    notes: "",
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function NewRemissionPage() {
  const navigate = useNavigate();
  const createRemission = useCreateRemission();

  // Data hooks
  const { data: productsData } = useProducts({ limit: 100 });
  const { data: customersData } = useCustomers({ limit: 100 });
  const { data: warehousesData } = useWarehouses();

  // Form state
  const [items, setItems] = useState<RemissionItemRow[]>([createEmptyItem()]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [transportInfo, setTransportInfo] = useState("");
  const [notes, setNotes] = useState("");

  // Product options
  const productOptions = useMemo(() => {
    const products = productsData?.data ?? [];
    return [
      { value: "", label: "Seleccionar producto..." },
      ...products.map((p) => ({
        value: p.id,
        label: `${p.name} - ${p.sku}`,
      })),
    ];
  }, [productsData]);

  // Customer options
  const customerOptions = useMemo(() => {
    const customers = customersData?.data ?? [];
    return [
      { value: "", label: "Sin cliente" },
      ...customers.map((c) => ({ value: c.id, label: c.name })),
    ];
  }, [customersData]);

  // Warehouse options
  const warehouseOptions = useMemo(() => {
    const warehouses = warehousesData ?? [];
    return [
      { value: "", label: "Sin bodega" },
      ...warehouses.map((w: { id: string; name: string }) => ({
        value: w.id,
        label: w.name,
      })),
    ];
  }, [warehousesData]);

  // Unit options
  const unitOptions = [
    { value: "unidad", label: "Unidad" },
    { value: "kg", label: "Kilogramo" },
    { value: "lt", label: "Litro" },
    { value: "mt", label: "Metro" },
    { value: "caja", label: "Caja" },
    { value: "paquete", label: "Paquete" },
  ];

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
    (id: string, field: keyof RemissionItemRow, value: string | number) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const updated = { ...item, [field]: value };

          // Auto-fill description when product is selected
          if (field === "productId" && typeof value === "string") {
            const product = (productsData?.data ?? []).find(
              (p) => p.id === value,
            );
            if (product) {
              updated.description = product.name;
            }
          }

          return updated;
        }),
      );
    },
    [productsData],
  );

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (items.length === 0) {
      toast.error("Agrega al menos un item");
      return;
    }

    const invalidItems = items.filter(
      (i) => !i.description.trim() || i.quantity <= 0,
    );
    if (invalidItems.length > 0) {
      toast.error("Todos los items deben tener descripcion y cantidad valida");
      return;
    }

    const data: CreateRemissionData = {
      customerId: selectedCustomerId || undefined,
      warehouseId: selectedWarehouseId || undefined,
      deliveryAddress: deliveryAddress || undefined,
      deliveryDate: deliveryDate || undefined,
      transportInfo: transportInfo || undefined,
      notes: notes || undefined,
      items: items.map(
        (i): CreateRemissionItemData => ({
          productId: i.productId || undefined,
          description: i.description,
          quantity: i.quantity,
          unit: i.unit || undefined,
          notes: i.notes || undefined,
        }),
      ),
    };

    createRemission.mutate(data);
  }, [
    items,
    selectedCustomerId,
    selectedWarehouseId,
    deliveryAddress,
    deliveryDate,
    transportInfo,
    notes,
    createRemission,
  ]);

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/remissions">
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Nueva Remision
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Crea una nueva remision de despacho
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
                  Agregar Item
                </Button>
              }
            >
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary-500" />
                Items de la Remision
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Column headers (desktop) */}
              <div className="hidden lg:grid lg:grid-cols-12 lg:gap-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-1">
                <div className="col-span-3">Producto</div>
                <div className="col-span-3">Descripcion</div>
                <div className="col-span-1 text-center">Cant.</div>
                <div className="col-span-2">Unidad</div>
                <div className="col-span-2">Notas</div>
                <div className="col-span-1" />
              </div>

              {/* Item rows */}
              {items.map((item) => (
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
                      options={productOptions}
                      value={item.productId}
                      onChange={(val) =>
                        updateItem(item.id, "productId", val)
                      }
                      placeholder="Seleccionar..."
                    />
                  </div>

                  {/* Description */}
                  <div className="lg:col-span-3">
                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 lg:hidden mb-1 block">
                      Descripcion
                    </label>
                    <Input
                      placeholder="Descripcion del item"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
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

                  {/* Unit */}
                  <div className="lg:col-span-2">
                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 lg:hidden mb-1 block">
                      Unidad
                    </label>
                    <Select
                      options={unitOptions}
                      value={item.unit}
                      onChange={(val) =>
                        updateItem(item.id, "unit", val)
                      }
                    />
                  </div>

                  {/* Notes */}
                  <div className="lg:col-span-2">
                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 lg:hidden mb-1 block">
                      Notas
                    </label>
                    <Input
                      placeholder="Notas (opcional)"
                      value={item.notes}
                      onChange={(e) =>
                        updateItem(item.id, "notes", e.target.value)
                      }
                    />
                  </div>

                  {/* Remove */}
                  <div className="lg:col-span-1 flex lg:justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length <= 1}
                      title="Eliminar item"
                      className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </PageSection>

        {/* Right column - Details */}
        <PageSection className="space-y-6">
          {/* Customer & Warehouse */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Remision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
                  Cliente
                </label>
                <Select
                  options={customerOptions}
                  value={selectedCustomerId}
                  onChange={setSelectedCustomerId}
                  placeholder="Seleccionar cliente..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
                  Bodega de origen
                </label>
                <Select
                  options={warehouseOptions}
                  value={selectedWarehouseId}
                  onChange={setSelectedWarehouseId}
                  placeholder="Seleccionar bodega..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary-500" />
                Informacion de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
                  Direccion de entrega
                </label>
                <Input
                  placeholder="Direccion de entrega"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  leftElement={<MapPin className="h-4 w-4 text-neutral-400" />}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
                  Fecha de entrega
                </label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
                  Informacion de transporte
                </label>
                <Input
                  placeholder="Transportador, placa, etc."
                  value={transportInfo}
                  onChange={(e) => setTransportInfo(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
                  Notas
                </label>
                <Textarea
                  placeholder="Notas adicionales..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={createRemission.isPending}
              leftIcon={
                createRemission.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )
              }
            >
              {createRemission.isPending ? "Creando..." : "Crear Remision"}
            </Button>
            <Link to="/remissions" className="w-full">
              <Button variant="outline" className="w-full">
                Cancelar
              </Button>
            </Link>
          </div>
        </PageSection>
      </div>
    </PageWrapper>
  );
}
