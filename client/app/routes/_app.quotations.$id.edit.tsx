import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Save, ClipboardList } from "lucide-react";
import type { Route } from "./+types/_app.quotations.$id.edit";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn } from "~/lib/utils";
import { useQuotation, useUpdateQuotation } from "~/hooks/useQuotations";
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
import { Skeleton } from "~/components/ui/Skeleton";
import type { UpdateQuotationData } from "~/types/quotation";

// ============================================================================
// META
// ============================================================================

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Editar Cotizacion - StockFlow" },
    { name: "description", content: "Editar cotizacion" },
  ];
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function EditQuotationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data hooks
  const {
    data: quotation,
    isLoading: isLoadingQuotation,
    isError,
    error,
  } = useQuotation(id!);
  const { data: customersData } = useCustomers({ limit: 100 });
  const updateQuotation = useUpdateQuotation();

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Populate form when quotation loads
  useEffect(() => {
    if (quotation && !isInitialized) {
      setCustomerId(quotation.customerId || "");
      setValidUntil(
        quotation.validUntil
          ? quotation.validUntil.substring(0, 10)
          : "",
      );
      setNotes(quotation.notes || "");
      setIsInitialized(true);
    }
  }, [quotation, isInitialized]);

  // Customer options
  const customerOptions = [
    { value: "", label: "Sin cliente" },
    ...(customersData?.data ?? []).map((c) => ({
      value: c.id,
      label: c.name,
    })),
  ];

  // Submit handler
  const handleSubmit = () => {
    if (!id) return;

    const data: UpdateQuotationData = {
      customerId: customerId || undefined,
      validUntil: validUntil || undefined,
      notes: notes || undefined,
    };

    updateQuotation.mutate(
      { id, data },
      {
        onSuccess: () => {
          navigate(`/quotations/${id}`);
        },
      },
    );
  };

  // Loading state
  if (isLoadingQuotation) {
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
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !quotation) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/quotations")}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Volver a cotizaciones
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-error-100 dark:bg-error-900/30 mb-4">
              <ClipboardList className="h-10 w-10 text-error-500 dark:text-error-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Cotizacion no encontrada
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
              {error?.message ||
                "La cotizacion que buscas no existe o fue eliminada."}
            </p>
            <Button onClick={() => navigate("/quotations")}>
              Ver cotizaciones
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guard: only DRAFT quotations can be edited
  if (quotation.status !== "DRAFT") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to={`/quotations/${id}`}>
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Editar Cotizacion
            </h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-warning-100 dark:bg-warning-900/30 mb-4">
              <ClipboardList className="h-10 w-10 text-warning-500 dark:text-warning-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              No se puede editar
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
              Solo se pueden editar cotizaciones en estado borrador. Esta
              cotizacion tiene estado{" "}
              <span className="font-medium capitalize">
                {quotation.status.toLowerCase()}
              </span>
              .
            </p>
            <Link to={`/quotations/${id}`}>
              <Button>Volver a la cotizacion</Button>
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
          <Link to={`/quotations/${id}`}>
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Editar Cotizacion
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              {quotation.quotationNumber}
            </p>
          </div>
        </div>
      </PageSection>

      {/* Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - Editable fields */}
        <PageSection className="space-y-6 lg:col-span-2">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                options={customerOptions}
                value={customerId}
                onChange={(val) => setCustomerId(val)}
                placeholder="Seleccionar cliente"
              />
              <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                Opcional. Puedes dejar la cotizacion sin cliente.
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

          {/* Read-only items info */}
          <Card variant="soft">
            <CardContent className="flex items-start gap-3 py-4">
              <ClipboardList className="h-5 w-5 text-neutral-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Items de la cotizacion
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Los items no se pueden modificar despues de creada la
                  cotizacion. Esta cotizacion tiene{" "}
                  <span className="font-medium">
                    {quotation.items?.length ?? 0}
                  </span>{" "}
                  {(quotation.items?.length ?? 0) === 1 ? "item" : "items"}.
                  Si necesitas cambiar los items, crea una nueva cotizacion.
                </p>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* Right column - Actions */}
        <PageSection className="space-y-6">
          <Card padding="md">
            <div className="space-y-3">
              <Button
                type="button"
                className="w-full"
                isLoading={updateQuotation.isPending}
                leftIcon={<Save className="h-4 w-4" />}
                onClick={handleSubmit}
              >
                Guardar Cambios
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/quotations/${id}`)}
              >
                Cancelar
              </Button>
            </div>
          </Card>
        </PageSection>
      </div>
    </PageWrapper>
  );
}
