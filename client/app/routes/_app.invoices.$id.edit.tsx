import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  FileText,
  Plus,
  Trash2,
  Package,
  AlertCircle,
} from "lucide-react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Route } from "./+types/_app.invoices.$id.edit";
import { cn, formatCurrency, generateId, formatDate } from "~/lib/utils";
import { useInvoice, useUpdateInvoice } from "~/hooks/useInvoices";
import { useCustomers } from "~/hooks/useCustomers";
import { useProducts } from "~/hooks/useProducts";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";
import { Skeleton } from "~/components/ui/Skeleton";
import { Badge } from "~/components/ui/Badge";
import type { InvoiceStatus, InvoiceItem } from "~/types/invoice";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Editar Factura - StockFlow" },
    { name: "description", content: "Editar factura existente" },
  ];
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

// Line item schema
const lineItemSchema = z.object({
  id: z.string(),
  productId: z.string().min(1, "Seleccione un producto"),
  description: z.string().min(1, "La descripcion es requerida"),
  quantity: z.number().min(1, "La cantidad debe ser mayor a 0"),
  unitPrice: z.number().min(0, "El precio debe ser mayor o igual a 0"),
  discount: z.number().min(0).max(100),
  tax: z.number().min(0).max(100),
});

// Form schema
const invoiceSchema = z.object({
  customerId: z.string().min(1, "Seleccione un cliente"),
  issueDate: z.string().min(1, "La fecha de emision es requerida"),
  dueDate: z.string().min(1, "La fecha de vencimiento es requerida"),
  notes: z.string().max(500, "Maximo 500 caracteres").optional(),
  items: z.array(lineItemSchema).min(1, "Debe agregar al menos un item"),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;
type LineItem = z.infer<typeof lineItemSchema>;

// Calculate line item totals
function calculateLineItemTotals(item: LineItem) {
  const subtotal = item.quantity * item.unitPrice;
  const discountAmount = subtotal * (item.discount / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (item.tax / 100);
  const total = taxableAmount + taxAmount;
  return { subtotal, discountAmount, taxAmount, total };
}

// Calculate invoice totals
function calculateInvoiceTotals(items: LineItem[]) {
  return items.reduce(
    (acc, item) => {
      const { subtotal, discountAmount, taxAmount, total } =
        calculateLineItemTotals(item);
      return {
        subtotal: acc.subtotal + subtotal,
        discountAmount: acc.discountAmount + discountAmount,
        taxAmount: acc.taxAmount + taxAmount,
        total: acc.total + total,
      };
    },
    { subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0 },
  );
}

// Create empty line item
function createEmptyLineItem(): LineItem {
  return {
    id: generateId(),
    productId: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    tax: 19,
  };
}

// Convert InvoiceItem to LineItem for form
function invoiceItemToLineItem(item: InvoiceItem): LineItem {
  return {
    id: item.id,
    productId: item.productId,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount,
    tax: item.tax,
  };
}

// Format date string to YYYY-MM-DD for input
function formatDateForInput(dateString: string): string {
  return dateString.split("T")[0];
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-60 w-full" />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Status badge component
function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config: Record<
    InvoiceStatus,
    {
      label: string;
      variant:
        | "default"
        | "primary"
        | "secondary"
        | "success"
        | "warning"
        | "error";
    }
  > = {
    DRAFT: { label: "Borrador", variant: "secondary" },
    PENDING: { label: "Pendiente", variant: "warning" },
    PAID: { label: "Pagada", variant: "success" },
    OVERDUE: { label: "Vencida", variant: "error" },
    CANCELLED: { label: "Cancelada", variant: "secondary" },
  };

  const { label, variant } = config[status];

  return <Badge variant={variant}>{label}</Badge>;
}

// Read-only view for non-editable invoices
function ReadOnlyView({
  invoice,
  id,
}: {
  invoice: {
    invoiceNumber: string;
    status: InvoiceStatus;
    customer?: { name: string };
    issueDate: string;
    dueDate: string;
    total: number;
    items: InvoiceItem[];
  };
  id: string;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-4">
          <Link to={`/invoices/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                Factura {invoice.invoiceNumber}
              </h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Esta factura no puede ser editada
            </p>
          </div>
        </div>
      </motion.div>

      {/* Warning Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-warning-800 dark:text-warning-200">
                  Factura no editable
                </h3>
                <p className="text-sm text-warning-700 dark:text-warning-300 mt-1">
                  {invoice.status === "PAID"
                    ? "Esta factura ya ha sido pagada y no puede ser modificada. Si necesitas hacer cambios, debes crear una nota credito o una nueva factura."
                    : 'Esta factura ha sido cancelada y no puede ser modificada. Si necesitas crear una nueva factura, usa el boton "Nueva Factura".'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Invoice Summary */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Resumen de la Factura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Cliente
                </p>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {invoice.customer?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Fecha Emision
                </p>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {formatDate(invoice.issueDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Fecha Vencimiento
                </p>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Total
                </p>
                <p className="font-bold text-lg text-neutral-900 dark:text-white">
                  {formatCurrency(invoice.total)}
                </p>
              </div>
            </div>

            {/* Items summary */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                Items ({invoice.items.length})
              </h4>
              <div className="space-y-2">
                {invoice.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-2 px-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {item.description}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-3">
          <Link to={`/invoices/${id}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ver Factura
            </Button>
          </Link>
          <Link to="/invoices/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Factura
            </Button>
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [saveAsStatus, setSaveAsStatus] = useState<InvoiceStatus>("PENDING");

  // Queries
  const { data: invoice, isLoading, isError } = useInvoice(id!);
  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers({
    limit: 100,
  });
  const { data: productsData, isLoading: isLoadingProducts } = useProducts({
    limit: 100,
  });
  const updateInvoice = useUpdateInvoice();

  // Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: "",
      issueDate: "",
      dueDate: "",
      notes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");

  // Populate form when invoice loads
  useEffect(() => {
    if (invoice) {
      reset({
        customerId: invoice.customerId,
        issueDate: formatDateForInput(invoice.issueDate),
        dueDate: formatDateForInput(invoice.dueDate),
        notes: invoice.notes || "",
        items: invoice.items.map(invoiceItemToLineItem),
      });
      setSaveAsStatus(invoice.status);
    }
  }, [invoice, reset]);

  // Memoized options
  const customerOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar cliente..." },
      ...(customersData?.data || [])
        .filter((c) => c.isActive)
        .map((c) => ({ value: c.id, label: c.name })),
    ],
    [customersData],
  );

  const productOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar producto..." },
      ...(productsData?.data || [])
        .filter((p) => p.status === "ACTIVE")
        .map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })),
    ],
    [productsData],
  );

  // Product lookup map
  const productsMap = useMemo(() => {
    const map = new Map<
      string,
      { name: string; price: number; description?: string }
    >();
    (productsData?.data || []).forEach((p) => {
      map.set(p.id, {
        name: p.name,
        price: p.price,
        description: p.description,
      });
    });
    return map;
  }, [productsData]);

  // Handle product selection - auto-fill price and description
  const handleProductChange = useCallback(
    (index: number, productId: string) => {
      const product = productsMap.get(productId);
      if (product) {
        setValue(`items.${index}.productId`, productId);
        setValue(`items.${index}.unitPrice`, product.price);
        setValue(
          `items.${index}.description`,
          product.description || product.name,
        );
      }
    },
    [productsMap, setValue],
  );

  // Add new line item
  const handleAddItem = () => {
    append(createEmptyLineItem());
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Calculate totals
  const totals = useMemo(
    () => calculateInvoiceTotals(watchedItems || []),
    [watchedItems],
  );

  // Submit handler
  const onSubmit = (data: InvoiceFormData) => {
    updateInvoice.mutate({
      id: id!,
      data: {
        customerId: data.customerId,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        notes: data.notes,
        status: saveAsStatus,
        items: data.items.map((item) => ({
          id: item.id.length > 10 ? item.id : undefined, // Only include existing IDs
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          tax: item.tax,
        })),
      },
    });
  };

  const handleSaveAsDraft = () => {
    setSaveAsStatus("DRAFT");
  };

  const handleSaveAsPending = () => {
    setSaveAsStatus("PENDING");
  };

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (isError || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Factura no encontrada
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          La factura que buscas no existe o fue eliminada.
        </p>
        <Link to="/invoices">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a facturas
          </Button>
        </Link>
      </div>
    );
  }

  // Check if invoice can be edited (only DRAFT and PENDING)
  if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
    return <ReadOnlyView invoice={invoice} id={id!} />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-4">
          <Link to={`/invoices/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                Editar Factura {invoice.invoiceNumber}
              </h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Modifica los datos de la factura
            </p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Dates */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Informacion de la Factura</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Cliente *
                    </label>
                    <Controller
                      name="customerId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          options={customerOptions}
                          value={field.value}
                          onChange={field.onChange}
                          error={!!errors.customerId}
                          disabled={isLoadingCustomers}
                        />
                      )}
                    />
                    {errors.customerId && (
                      <p className="mt-1 text-sm text-error-500">
                        {errors.customerId.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Fecha de Emision *
                      </label>
                      <Input
                        {...register("issueDate")}
                        type="date"
                        error={!!errors.issueDate}
                      />
                      {errors.issueDate && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.issueDate.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Fecha de Vencimiento *
                      </label>
                      <Input
                        {...register("dueDate")}
                        type="date"
                        error={!!errors.dueDate}
                      />
                      {errors.dueDate && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.dueDate.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Line Items */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Items de la Factura</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Agregar Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {errors.items?.message && (
                    <p className="mb-4 text-sm text-error-500">
                      {errors.items.message}
                    </p>
                  )}

                  <div className="space-y-4">
                    {fields.map((field, index) => {
                      const item = watchedItems?.[index];
                      const itemTotals = item
                        ? calculateLineItemTotals(item)
                        : { subtotal: 0, total: 0 };

                      return (
                        <div
                          key={field.id}
                          className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg space-y-4"
                        >
                          {/* Item header */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                              Item #{index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(index)}
                              disabled={fields.length === 1}
                              className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Product selection */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                Producto *
                              </label>
                              <Controller
                                name={`items.${index}.productId`}
                                control={control}
                                render={({ field: selectField }) => (
                                  <Select
                                    options={productOptions}
                                    value={selectField.value}
                                    onChange={(value) =>
                                      handleProductChange(index, value)
                                    }
                                    error={!!errors.items?.[index]?.productId}
                                    disabled={isLoadingProducts}
                                  />
                                )}
                              />
                              {errors.items?.[index]?.productId && (
                                <p className="mt-1 text-sm text-error-500">
                                  {errors.items[index]?.productId?.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                Descripcion *
                              </label>
                              <Input
                                {...register(`items.${index}.description`)}
                                placeholder="Descripcion del item"
                                error={!!errors.items?.[index]?.description}
                              />
                              {errors.items?.[index]?.description && (
                                <p className="mt-1 text-sm text-error-500">
                                  {errors.items[index]?.description?.message}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Quantity, Price, Discount, Tax */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                Cantidad *
                              </label>
                              <Input
                                {...register(`items.${index}.quantity`, {
                                  valueAsNumber: true,
                                })}
                                type="number"
                                min="1"
                                step="1"
                                error={!!errors.items?.[index]?.quantity}
                              />
                              {errors.items?.[index]?.quantity && (
                                <p className="mt-1 text-sm text-error-500">
                                  {errors.items[index]?.quantity?.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                Precio Unit. *
                              </label>
                              <Input
                                {...register(`items.${index}.unitPrice`, {
                                  valueAsNumber: true,
                                })}
                                type="number"
                                min="0"
                                step="100"
                                error={!!errors.items?.[index]?.unitPrice}
                              />
                              {errors.items?.[index]?.unitPrice && (
                                <p className="mt-1 text-sm text-error-500">
                                  {errors.items[index]?.unitPrice?.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                Descuento %
                              </label>
                              <Input
                                {...register(`items.${index}.discount`, {
                                  valueAsNumber: true,
                                })}
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                error={!!errors.items?.[index]?.discount}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                IVA %
                              </label>
                              <Input
                                {...register(`items.${index}.tax`, {
                                  valueAsNumber: true,
                                })}
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                error={!!errors.items?.[index]?.tax}
                              />
                            </div>
                          </div>

                          {/* Item totals */}
                          <div className="flex justify-end gap-6 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                            <div className="text-right">
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Subtotal
                              </p>
                              <p className="font-medium text-neutral-900 dark:text-white">
                                {formatCurrency(itemTotals.subtotal)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Total
                              </p>
                              <p className="font-semibold text-neutral-900 dark:text-white">
                                {formatCurrency(itemTotals.total)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Empty state */}
                  {fields.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Package className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-3" />
                      <p className="text-neutral-500 dark:text-neutral-400">
                        No hay items en la factura
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddItem}
                        className="mt-3"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar primer item
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Notes */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    {...register("notes")}
                    placeholder="Notas adicionales para la factura (opcional)"
                    rows={4}
                    className={cn(
                      "w-full rounded-lg border border-neutral-300 dark:border-neutral-600",
                      "bg-white dark:bg-neutral-900 px-4 py-2.5",
                      "text-neutral-900 dark:text-white placeholder:text-neutral-400",
                      "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none",
                      "transition-colors resize-none",
                    )}
                  />
                  {errors.notes && (
                    <p className="mt-1 text-sm text-error-500">
                      {errors.notes.message}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Totals Summary */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Resumen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Subtotal
                    </span>
                    <span className="text-neutral-900 dark:text-white">
                      {formatCurrency(totals.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Descuento
                    </span>
                    <span className="text-error-500">
                      -{formatCurrency(totals.discountAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      IVA
                    </span>
                    <span className="text-neutral-900 dark:text-white">
                      {formatCurrency(totals.taxAmount)}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="flex justify-between">
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        Total
                      </span>
                      <span className="text-xl font-bold text-neutral-900 dark:text-white">
                        {formatCurrency(totals.total)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Current Status */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Estado Actual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <InvoiceStatusBadge status={invoice.status} />
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      {invoice.status === "DRAFT" ? "Editable" : "Editable"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Actions */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={
                      isSubmitting ||
                      (updateInvoice.isPending && saveAsStatus === "PENDING")
                    }
                    disabled={!isDirty && saveAsStatus === invoice.status}
                    onClick={handleSaveAsPending}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Guardar como Pendiente
                  </Button>
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    isLoading={
                      isSubmitting ||
                      (updateInvoice.isPending && saveAsStatus === "DRAFT")
                    }
                    disabled={!isDirty && saveAsStatus === invoice.status}
                    onClick={handleSaveAsDraft}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar como Borrador
                  </Button>
                  <Link to={`/invoices/${id}`} className="block">
                    <Button type="button" variant="ghost" className="w-full">
                      Cancelar
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Help Info */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    Informacion
                  </h4>
                  <ul className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1">
                    <li>- Los cambios no guardados se perderan</li>
                    <li>- Las facturas pagadas no pueden editarse</li>
                    <li>- El numero de factura no puede cambiarse</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
