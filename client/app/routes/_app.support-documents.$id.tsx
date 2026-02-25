import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  FileText,
  Pencil,
  Trash2,
  Calendar,
  User,
  Hash,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Loader2,
} from "lucide-react";
import type { Route } from "./+types/_app.support-documents.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatDate, formatCurrency } from "~/lib/utils";
import {
  useSupportDocument,
  useDeleteSupportDocument,
  useGenerateSupportDocument,
} from "~/hooks/useSupportDocuments";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import { DeleteModal } from "~/components/ui/DeleteModal";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import type { SupportDocumentStatus } from "~/types/support-document";
import { supportDocStatusLabels } from "~/types/support-document";

// ============================================================================
// META
// ============================================================================

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Documento Soporte - StockFlow" },
    { name: "description", content: "Detalles del documento soporte" },
  ];
};

// ============================================================================
// STATUS BADGE
// ============================================================================

function SupportDocStatusBadge({
  status,
  size = "md",
}: {
  status: SupportDocumentStatus;
  size?: "sm" | "md" | "lg";
}) {
  const config: Record<
    SupportDocumentStatus,
    {
      label: string;
      variant:
        | "default"
        | "primary"
        | "secondary"
        | "success"
        | "warning"
        | "error";
      icon: React.ReactNode;
    }
  > = {
    DRAFT: {
      label: "Borrador",
      variant: "secondary",
      icon: <Clock className="h-3 w-3" />,
    },
    GENERATED: {
      label: "Generado",
      variant: "primary",
      icon: <FileText className="h-3 w-3" />,
    },
    SENT: {
      label: "Enviado",
      variant: "warning",
      icon: <Send className="h-3 w-3" />,
    },
    ACCEPTED: {
      label: "Aceptado",
      variant: "success",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    REJECTED: {
      label: "Rechazado",
      variant: "error",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const { label, variant, icon } = config[status];

  return (
    <Badge variant={variant} size={size} icon={icon}>
      {label}
    </Badge>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SupportDocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: doc, isLoading, isError } = useSupportDocument(id!);
  const deleteDocument = useDeleteSupportDocument();
  const generateDocument = useGenerateSupportDocument();

  const handleDelete = async () => {
    await deleteDocument.mutateAsync(id!);
    setShowDeleteModal(false);
    navigate("/support-documents");
  };

  const handleGenerate = () => {
    if (id) {
      generateDocument.mutate(id);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !doc) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Documento no encontrado
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          El documento soporte que buscas no existe o fue eliminado.
        </p>
        <Link to="/support-documents">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a documentos soporte
          </Button>
        </Link>
      </div>
    );
  }

  const isDraft = doc.status === "DRAFT";

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Link to="/support-documents">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                  {doc.documentNumber}
                </h1>
                <SupportDocStatusBadge status={doc.status} size="lg" />
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                Emitido el {formatDate(doc.issueDate)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 ml-14 sm:ml-0">
            {isDraft && (
              <>
                <Link to={`/support-documents/${id}/edit`}>
                  <Button variant="outline">
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </Link>
                <Button
                  variant="primary"
                  onClick={handleGenerate}
                  disabled={generateDocument.isPending}
                >
                  {generateDocument.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Generar ante DIAN
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </>
            )}
          </div>
        </div>
      </PageSection>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document data */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />
                Datos del Documento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Numero
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Hash className="h-4 w-4 text-neutral-400" />
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {doc.documentNumber}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Estado
                  </p>
                  <div className="mt-1">
                    <SupportDocStatusBadge status={doc.status} />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Fecha de Emision
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {formatDate(doc.issueDate)}
                    </p>
                  </div>
                </div>

                {doc.dianCude && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      CUDE DIAN
                    </p>
                    <p className="font-mono text-xs text-neutral-700 dark:text-neutral-300 mt-1 break-all">
                      {doc.dianCude}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* Supplier data */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary-500" />
                Datos del Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {doc.supplierName}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {doc.supplierDocType}: {doc.supplierDocument}
                </p>
              </div>

              {doc.supplier && doc.supplierId && (
                <Link to={`/suppliers/${doc.supplierId}`}>
                  <Button variant="ghost" size="sm" className="w-full mt-2">
                    Ver proveedor
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </PageSection>
      </div>

      {/* Items table */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle>Items del Documento</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Descripcion</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">
                      IVA
                    </TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doc.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {item.description}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {item.taxRate > 0 ? `${item.taxRate}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.subtotal)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Totals section */}
      <PageSection>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2 sm:w-64 sm:ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Subtotal
                </span>
                <span className="text-neutral-900 dark:text-white">
                  {formatCurrency(doc.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  IVA
                </span>
                <span className="text-neutral-900 dark:text-white">
                  {formatCurrency(doc.tax)}
                </span>
              </div>
              {doc.withholdings > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Retenciones
                  </span>
                  <span className="text-error-600 dark:text-error-400">
                    -{formatCurrency(doc.withholdings)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span className="font-semibold text-neutral-900 dark:text-white">
                  Total
                </span>
                <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  {formatCurrency(doc.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Notes */}
      {doc.notes && (
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {doc.notes}
              </p>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Delete Modal */}
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        itemName={doc.documentNumber}
        itemType="documento soporte"
        onConfirm={handleDelete}
        isLoading={deleteDocument.isPending}
      />
    </PageWrapper>
  );
}
