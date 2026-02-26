import { Link } from "react-router";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  Loader2,
  Package,
} from "lucide-react";
import { formatCurrency } from "~/lib/utils";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { useCreateRecurringInvoice } from "~/hooks/useRecurringInvoices";
import { useCustomers } from "~/hooks/useCustomers";
import { useProducts } from "~/hooks/useProducts";
import { useWarehouses } from "~/hooks/useWarehouses";
import { INTERVAL_LABELS } from "~/types/recurring-invoice";
import type { RecurringInterval } from "~/types/recurring-invoice";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";
import { Textarea } from "~/components/ui/Textarea";

export const meta = () => {
  return [
    { title: "Nueva Factura Recurrente - StockFlow" },
    {
      name: "description",
      content: "Crear nueva plantilla de factura recurrente",
    },
  ];
};

const itemSchema = z.object({
  productId: z.string().min(1, "Selecciona un producto"),
  quantity: z.number().min(1, "Minimo 1"),
  unitPrice: z.number().min(0, "Precio invalido"),
  taxRate: z.number().min(0).max(100),
  discount: z.number().min(0).max(100).optional(),
});

const formSchema = z.object({
  customerId: z.string().min(1, "Selecciona un cliente"),
  warehouseId: z.string().optional(),
  notes: z.string().optional(),
  interval: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"]),
  nextIssueDate: z.string().min(1, "Fecha requerida"),
  endDate: z.string().optional(),
  autoSend: z.boolean().optional(),
  autoEmail: z.boolean().optional(),
  items: z.array(itemSchema).min(1, "Agrega al menos un item"),
});

type FormValues = z.infer<typeof formSchema>;

const intervalOptions = Object.entries(INTERVAL_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export default function NewRecurringInvoicePage() {
  const createMutation = useCreateRecurringInvoice();
  const { data: customersData } = useCustomers({ limit: 100 });
  const { data: productsData } = useProducts({ limit: 200 });
  const { data: warehousesList } = useWarehouses();

  const customers = customersData?.data || [];
  const products = productsData?.data || [];
  const warehouses = warehousesList || [];

  const customerOptions = [
    { value: "", label: "Seleccionar cliente..." },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ];

  const warehouseOptions = [
    { value: "", label: "Sin bodega" },
    ...warehouses.map((w) => ({ value: w.id, label: w.name })),
  ];

  const productOptions = [
    { value: "", label: "Seleccionar producto..." },
    ...products.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.sku})`,
    })),
  ];

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      warehouseId: "",
      notes: "",
      interval: "MONTHLY",
      nextIssueDate: "",
      endDate: "",
      autoSend: false,
      autoEmail: false,
      items: [
        { productId: "", quantity: 1, unitPrice: 0, taxRate: 19, discount: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");

  const totals = watchedItems.reduce(
    (acc, item) => {
      const subtotal = (item.quantity || 0) * (item.unitPrice || 0);
      const discountAmount = subtotal * ((item.discount || 0) / 100);
      const taxableAmount = subtotal - discountAmount;
      const tax = taxableAmount * ((item.taxRate || 0) / 100);
      return {
        subtotal: acc.subtotal + taxableAmount,
        tax: acc.tax + tax,
        total: acc.total + taxableAmount + tax,
      };
    },
    { subtotal: 0, tax: 0, total: 0 },
  );

  const onSubmit = (data: FormValues) => {
    createMutation.mutate({
      ...data,
      warehouseId: data.warehouseId || undefined,
      notes: data.notes || undefined,
      endDate: data.endDate || undefined,
      interval: data.interval as RecurringInterval,
    });
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setValue(`items.${index}.unitPrice`, Number(product.salePrice));
      setValue(`items.${index}.taxRate`, product.taxRate ?? 19);
    }
  };

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex items-center gap-4">
        <Link to="/invoices/recurring">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-900/30">
            <RefreshCw className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Nueva Factura Recurrente
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              Configura una plantilla de facturacion automatica
            </p>
          </div>
        </div>
      </PageSection>

      <form onSubmit={handleSubmit(onSubmit as any)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 sm:px-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Warehouse */}
            <Card variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Informacion General
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Cliente *
                  </label>
                  <Select
                    options={customerOptions}
                    value={watch("customerId")}
                    onChange={(val) => setValue("customerId", val)}
                    error={!!errors.customerId}
                  />
                  {errors.customerId && (
                    <p className="mt-1 text-sm text-error-500">
                      {errors.customerId.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Bodega
                  </label>
                  <Select
                    options={warehouseOptions}
                    value={watch("warehouseId") || ""}
                    onChange={(val) => setValue("warehouseId", val)}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Notas
                </label>
                <Textarea
                  {...register("notes")}
                  placeholder="Notas opcionales para las facturas generadas..."
                  rows={2}
                />
              </div>
            </Card>

            {/* Items */}
            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Items
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      productId: "",
                      quantity: 1,
                      unitPrice: 0,
                      taxRate: 19,
                      discount: 0,
                    })
                  }
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Agregar Item
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay items. Agrega al menos uno.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-3 items-start p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50"
                    >
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-xs font-medium text-neutral-500 mb-1">
                          Producto
                        </label>
                        <Select
                          options={productOptions}
                          value={watchedItems[index]?.productId || ""}
                          onChange={(val) => {
                            setValue(`items.${index}.productId`, val);
                            handleProductChange(index, val);
                          }}
                          error={!!errors.items?.[index]?.productId}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-xs font-medium text-neutral-500 mb-1">
                          Cantidad
                        </label>
                        <Input
                          type="number"
                          min={1}
                          {...register(`items.${index}.quantity`)}
                          error={!!errors.items?.[index]?.quantity}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-xs font-medium text-neutral-500 mb-1">
                          Precio
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...register(`items.${index}.unitPrice`)}
                          error={!!errors.items?.[index]?.unitPrice}
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <label className="block text-xs font-medium text-neutral-500 mb-1">
                          IVA %
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...register(`items.${index}.taxRate`)}
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <label className="block text-xs font-medium text-neutral-500 mb-1">
                          Desc. %
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...register(`items.${index}.discount`)}
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex items-end pb-0.5">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {errors.items?.message && (
                <p className="mt-2 text-sm text-error-500">
                  {errors.items.message}
                </p>
              )}
            </Card>
          </div>

          {/* Sidebar: Schedule & Totals */}
          <div className="space-y-6">
            {/* Schedule config */}
            <Card variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Programacion
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Intervalo *
                  </label>
                  <Select
                    options={intervalOptions}
                    value={watch("interval")}
                    onChange={(val) =>
                      setValue("interval", val as FormValues["interval"])
                    }
                    error={!!errors.interval}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Primera emision *
                  </label>
                  <Input
                    type="date"
                    {...register("nextIssueDate")}
                    error={!!errors.nextIssueDate}
                  />
                  {errors.nextIssueDate && (
                    <p className="mt-1 text-sm text-error-500">
                      {errors.nextIssueDate.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Fecha fin (opcional)
                  </label>
                  <Input type="date" {...register("endDate")} />
                </div>
              </div>
            </Card>

            {/* Options */}
            <Card variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Opciones
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("autoSend")}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Enviar automaticamente (marcar como Enviada)
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("autoEmail")}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Enviar por email al cliente
                  </span>
                </label>
              </div>
            </Card>

            {/* Totals */}
            <Card variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Resumen por Factura
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Subtotal</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {formatCurrency(totals.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">IVA</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {formatCurrency(totals.tax)}
                  </span>
                </div>
                <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      Total
                    </span>
                    <span className="text-xl font-bold bg-gradient-to-br from-primary-600 to-accent-600 bg-clip-text text-transparent">
                      {formatCurrency(totals.total)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Submit */}
            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              disabled={createMutation.isPending}
              leftIcon={
                createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )
              }
            >
              {createMutation.isPending ? "Creando..." : "Crear Recurrente"}
            </Button>
          </div>
        </div>
      </form>
    </PageWrapper>
  );
}
