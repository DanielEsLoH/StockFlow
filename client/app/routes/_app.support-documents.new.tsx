import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Save,
} from "lucide-react";
import type { Route } from "./+types/_app.support-documents.new";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatCurrency } from "~/lib/utils";
import { useCreateSupportDocument } from "~/hooks/useSupportDocuments";
import { useSuppliers } from "~/hooks/useSuppliers";
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
import type { CreateSupportDocumentData } from "~/types/support-document";

// ============================================================================
// META
// ============================================================================

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Nuevo Documento Soporte - StockFlow" },
    { name: "description", content: "Crear un nuevo documento soporte" },
  ];
};

// ============================================================================
// TYPES
// ============================================================================

interface SupportDocItemRow {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

function createEmptyItem(): SupportDocItemRow {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 19,
  };
}

const DOC_TYPE_OPTIONS = [
  { value: "NIT", label: "NIT" },
  { value: "CC", label: "Cedula de Ciudadania" },
  { value: "CE", label: "Cedula de Extranjeria" },
  { value: "PP", label: "Pasaporte" },
  { value: "TI", label: "Tarjeta de Identidad" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function NewSupportDocumentPage() {
  const navigate = useNavigate();
  const createDocument = useCreateSupportDocument();

  // Data hooks
  const { data: suppliersData } = useSuppliers({ limit: 100 });

  // Form state - supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierDocument, setSupplierDocument] = useState("");
  const [supplierDocType, setSupplierDocType] = useState("NIT");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");

  // Items
  const [items, setItems] = useState<SupportDocItemRow[]>([createEmptyItem()]);

  // Supplier options for select
  const supplierOptions = useMemo(() => {
    const suppliers = suppliersData?.data ?? [];
    return [
      { value: "", label: "Proveedor manual (no registrado)" },
      ...suppliers.map((s) => ({
        value: s.id,
        label: s.name,
        document: s.documentNumber,
        docType: s.documentType,
      })),
    ];
  }, [suppliersData]);

  // When a supplier is selected from dropdown, auto-fill fields
  const handleSupplierSelect = useCallback(
    (supplierId: string) => {
      setSelectedSupplierId(supplierId);
      if (supplierId) {
        const suppliers = suppliersData?.data ?? [];
        const supplier = suppliers.find((s) => s.id === supplierId);
        if (supplier) {
          setSupplierName(supplier.name);
          setSupplierDocument(supplier.documentNumber || "");
          setSupplierDocType(supplier.documentType || "NIT");
        }
      }
    },
    [suppliersData],
  );

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
    (id: string, field: keyof SupportDocItemRow, value: string | number) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          return { ...item, [field]: value };
        }),
      );
    },
    [],
  );

  // Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;

    const lineDetails = items.map((item) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineTax = lineSubtotal * (item.taxRate / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxTotal += lineTax;

      return { lineSubtotal, lineTax, lineTotal };
    });

    return {
      lineDetails,
      subtotal,
      tax: taxTotal,
      total: subtotal + taxTotal,
    };
  }, [items]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!supplierName.trim()) {
      toast.error("El nombre del proveedor es obligatorio");
      return;
    }

    if (!supplierDocument.trim()) {
      toast.error("El documento del proveedor es obligatorio");
      return;
    }

    if (items.length === 0) {
      toast.error("Agrega al menos un item");
      return;
    }

    const invalidItems = items.filter((i) => !i.description.trim());
    if (invalidItems.length > 0) {
      toast.error("Todos los items deben tener una descripcion");
      return;
    }

    const zeroItems = items.filter((i) => i.unitPrice <= 0);
    if (zeroItems.length > 0) {
      toast.error("Todos los items deben tener un precio mayor a cero");
      return;
    }

    const data: CreateSupportDocumentData = {
      supplierId: selectedSupplierId || undefined,
      supplierName: supplierName.trim(),
      supplierDocument: supplierDocument.trim(),
      supplierDocType,
      issueDate: issueDate || undefined,
      notes: notes || undefined,
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxRate: i.taxRate,
      })),
    };

    createDocument.mutate(data, {
      onSuccess: () => {
        navigate("/support-documents");
      },
    });
  }, [
    items,
    supplierName,
    supplierDocument,
    supplierDocType,
    selectedSupplierId,
    issueDate,
    notes,
    createDocument,
    navigate,
  ]);

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/support-documents">
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Nuevo Documento Soporte
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Documento soporte en adquisiciones con no obligados a facturar
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
                <FileText className="h-5 w-5 text-primary-500" />
                Items del Documento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Column headers (desktop) */}
              <div className="hidden lg:grid lg:grid-cols-12 lg:gap-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-1">
                <div className="col-span-4">Descripcion</div>
                <div className="col-span-1 text-center">Cant.</div>
                <div className="col-span-2">Precio Unit.</div>
                <div className="col-span-1 text-center">IVA %</div>
                <div className="col-span-2 text-right">Subtotal</div>
                <div className="col-span-1 text-right">Total</div>
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
                    {/* Description */}
                    <div className="lg:col-span-4">
                      <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 lg:hidden mb-1 block">
                        Descripcion
                      </label>
                      <Input
                        type="text"
                        placeholder="Descripcion del bien o servicio..."
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

                    {/* Subtotal */}
                    <div className="lg:col-span-2 flex items-center justify-between lg:justify-end">
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 lg:hidden">
                        Subtotal
                      </span>
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {formatCurrency(lineDetail?.lineSubtotal ?? 0)}
                      </span>
                    </div>

                    {/* Line Total */}
                    <div className="lg:col-span-1 flex items-center justify-between lg:justify-end">
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
                  Agregar otro item
                </span>
              </button>
            </CardContent>
          </Card>
        </PageSection>

        {/* Right column - Supplier, Details, Totals */}
        <PageSection className="space-y-6">
          {/* Supplier Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Proveedor Registrado</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                options={supplierOptions}
                value={selectedSupplierId}
                onChange={handleSupplierSelect}
                placeholder="Seleccionar proveedor"
              />
              <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                Opcional. Selecciona un proveedor existente o ingresa los datos
                manualmente.
              </p>
            </CardContent>
          </Card>

          {/* Supplier Info */}
          <Card>
            <CardHeader>
              <CardTitle>Datos del Proveedor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Nombre o Razon Social *
                </label>
                <Input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Tipo de Documento
                </label>
                <Select
                  options={DOC_TYPE_OPTIONS}
                  value={supplierDocType}
                  onChange={(val) => setSupplierDocType(val)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Numero de Documento *
                </label>
                <Input
                  type="text"
                  value={supplierDocument}
                  onChange={(e) => setSupplierDocument(e.target.value)}
                  placeholder="Ej: 900123456-7"
                />
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  IVA
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
                  isLoading={createDocument.isPending}
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={() => handleSubmit()}
                >
                  Guardar Borrador
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/support-documents")}
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
