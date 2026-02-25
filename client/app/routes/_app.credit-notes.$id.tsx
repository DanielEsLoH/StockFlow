import { Link, useParams } from "react-router";
import {
  FileMinus,
  ArrowLeft,
  Calendar,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  Hash,
} from "lucide-react";
import type { Route } from "./+types/_app.credit-notes.$id";
import { formatDate, formatCurrency } from "~/lib/utils";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { useDianDocument, useDownloadDianXml } from "~/hooks/useDian";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import {
  DianDocumentStatus,
  dianStatusLabels,
  dianStatusColors,
  creditNoteReasonLabels,
  type CreditNoteReason,
} from "~/types/dian";
import { EmptyState } from "~/components/ui/EmptyState";

export const meta: Route.MetaFunction = () => [
  { title: "Detalle Nota Credito - StockFlow" },
];

const statusIcon: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4" />,
  GENERATED: <Clock className="h-4 w-4" />,
  SIGNED: <Clock className="h-4 w-4" />,
  SENT: <Clock className="h-4 w-4" />,
  ACCEPTED: <CheckCircle className="h-4 w-4" />,
  REJECTED: <XCircle className="h-4 w-4" />,
};

export default function CreditNoteDetailPage() {
  const { id } = useParams();
  const { data: doc, isLoading, isError } = useDianDocument(id!);
  const downloadXml = useDownloadDianXml();

  if (isLoading) {
    return (
      <PageWrapper>
        <PageSection>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-64" />
            <div className="h-64 bg-neutral-200 dark:bg-neutral-700 rounded" />
          </div>
        </PageSection>
      </PageWrapper>
    );
  }

  if (isError || !doc) {
    return (
      <PageWrapper>
        <PageSection>
          <EmptyState
            type="error"
            title="Nota credito no encontrada"
            description="No se pudo encontrar la nota credito solicitada."
            action={{ label: "Volver", onClick: () => window.history.back() }}
          />
        </PageSection>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/credit-notes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-error-500/20 to-error-500/10 dark:from-error-500/20 dark:to-error-900/30">
            <FileMinus className="h-7 w-7 text-error-600 dark:text-error-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              {doc.documentNumber}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              Nota Credito Electronica
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={dianStatusColors[doc.status as DianDocumentStatus]}
            size="md"
            icon={statusIcon[doc.status]}
          >
            {dianStatusLabels[doc.status as DianDocumentStatus]}
          </Badge>
          <Button
            variant="outline"
            onClick={() => downloadXml.mutate(doc.id)}
            disabled={downloadXml.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar XML
          </Button>
        </div>
      </PageSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6">
        {/* Document Info */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Informacion del Documento
          </h2>
          <dl className="space-y-3">
            <div className="flex items-center gap-3">
              <Hash className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              <dt className="text-sm text-neutral-500 w-32">Numero</dt>
              <dd className="text-sm font-medium text-neutral-900 dark:text-white">
                {doc.documentNumber}
              </dd>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              <dt className="text-sm text-neutral-500 w-32">
                Factura Original
              </dt>
              <dd className="text-sm font-medium">
                {doc.invoice ? (
                  <Link
                    to={`/invoices/${doc.invoice.id}`}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    {doc.invoice.invoiceNumber}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              <dt className="text-sm text-neutral-500 w-32">Fecha</dt>
              <dd className="text-sm font-medium text-neutral-900 dark:text-white">
                {formatDate(doc.createdAt)}
              </dd>
            </div>
            {(doc as any).creditNoteReason && (
              <div className="flex items-start gap-3">
                <FileMinus className="h-4 w-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                <dt className="text-sm text-neutral-500 w-32">Razon</dt>
                <dd className="text-sm font-medium text-neutral-900 dark:text-white">
                  {creditNoteReasonLabels[
                    (doc as any).creditNoteReason as CreditNoteReason
                  ] || (doc as any).creditNoteReason}
                </dd>
              </div>
            )}
            {(doc.cufe || (doc as any).cude) && (
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                <dt className="text-sm text-neutral-500 w-32">CUDE</dt>
                <dd className="text-xs font-mono text-neutral-600 dark:text-neutral-300 break-all">
                  {(doc as any).cude || doc.cufe}
                </dd>
              </div>
            )}
            {doc.errorMessage && (
              <div className="mt-4 p-3 rounded-lg bg-error-50 dark:bg-error-900/20">
                <p className="text-sm text-error-700 dark:text-error-400">
                  {doc.errorMessage}
                </p>
              </div>
            )}
          </dl>
        </Card>

        {/* Customer & Totals */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Cliente y Totales
          </h2>
          {doc.invoice?.customer && (
            <div className="mb-6 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-neutral-400" />
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {doc.invoice.customer.name}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {doc.invoice.customer.documentNumber}
                  </p>
                </div>
              </div>
            </div>
          )}

          {doc.invoice && (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-sm text-neutral-500">Subtotal</span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {formatCurrency(Number(doc.invoice.subtotal))}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-sm text-neutral-500">IVA</span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {formatCurrency(Number(doc.invoice.tax))}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-base font-semibold text-neutral-900 dark:text-white">
                  Total
                </span>
                <span className="text-base font-bold text-error-600 dark:text-error-400">
                  {formatCurrency(Number(doc.invoice.total))}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Items */}
      {doc.invoice?.items && doc.invoice.items.length > 0 && (
        <PageSection>
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Items
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-left py-2 text-neutral-500 font-medium">
                      #
                    </th>
                    <th className="text-left py-2 text-neutral-500 font-medium">
                      Cantidad
                    </th>
                    <th className="text-right py-2 text-neutral-500 font-medium">
                      Precio Unit.
                    </th>
                    <th className="text-right py-2 text-neutral-500 font-medium">
                      Subtotal
                    </th>
                    <th className="text-right py-2 text-neutral-500 font-medium">
                      IVA
                    </th>
                    <th className="text-right py-2 text-neutral-500 font-medium">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {doc.invoice.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                    >
                      <td className="py-2 text-neutral-700 dark:text-neutral-300">
                        {idx + 1}
                      </td>
                      <td className="py-2 text-neutral-700 dark:text-neutral-300">
                        {item.quantity}
                      </td>
                      <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">
                        {formatCurrency(Number(item.unitPrice))}
                      </td>
                      <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">
                        {formatCurrency(Number(item.subtotal))}
                      </td>
                      <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">
                        {formatCurrency(Number(item.tax))}
                      </td>
                      <td className="py-2 text-right font-medium text-neutral-900 dark:text-white">
                        {formatCurrency(Number(item.total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </PageSection>
      )}
    </PageWrapper>
  );
}
