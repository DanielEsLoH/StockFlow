import { useState, useMemo } from "react";
import { Link } from "react-router";
import {
  FileCheck,
  Calendar,
  DollarSign,
  Hash,
  RefreshCw,
  Loader2,
  Download,
  Eye,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { Route } from "./+types/_app.withholding-certificates";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency, formatDate } from "~/lib/utils";
import {
  useWithholdingCertificates,
  useCertificateStats,
  useGenerateAllCertificates,
  useDeleteCertificate,
} from "~/hooks/useWithholdingCertificates";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import { DeleteModal } from "~/components/ui/DeleteModal";
import type { WithholdingCertificate } from "~/types/withholding-certificate";

// ============================================================================
// META
// ============================================================================

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Certificados de Retencion - StockFlow" },
    {
      name: "description",
      content: "Gestion de certificados de retencion en la fuente",
    },
  ];
};

// ============================================================================
// HELPERS
// ============================================================================

const WITHHOLDING_TYPE_LABELS: Record<string, string> = {
  RENTA: "Retencion en la Fuente",
  IVA: "Retencion de IVA",
  ICA: "Retencion de ICA",
  CREE: "Autorretencion CREE",
};

function getWithholdingTypeLabel(type: string) {
  return WITHHOLDING_TYPE_LABELS[type] || type;
}

// ============================================================================
// STATS CARDS
// ============================================================================

function StatsCards({
  stats,
  isLoading,
}: {
  stats: { totalCertificates: number; totalBase: number; totalWithheld: number } | undefined;
  isLoading: boolean;
}) {
  const cards = [
    {
      label: "Total Certificados",
      value: stats?.totalCertificates ?? 0,
      icon: <Hash className="h-5 w-5 text-primary-500" />,
      format: "number" as const,
    },
    {
      label: "Base Total Retenida",
      value: stats?.totalBase ?? 0,
      icon: <DollarSign className="h-5 w-5 text-success-500" />,
      format: "currency" as const,
    },
    {
      label: "Total Retenido",
      value: stats?.totalWithheld ?? 0,
      icon: <DollarSign className="h-5 w-5 text-warning-500" />,
      format: "currency" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {card.label}
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                    {card.format === "currency"
                      ? formatCurrency(card.value)
                      : card.value.toLocaleString("es-CO")}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                {card.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function WithholdingCertificatesPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteNumber, setDeleteNumber] = useState("");

  const {
    data: certificatesData,
    isLoading: isLoadingCerts,
  } = useWithholdingCertificates({ year: selectedYear });
  const { data: stats, isLoading: isLoadingStats } =
    useCertificateStats(selectedYear);
  const generateAll = useGenerateAllCertificates();
  const deleteCertificate = useDeleteCertificate();

  const certificates = useMemo(() => {
    if (!certificatesData) return [];
    if (Array.isArray(certificatesData)) return certificatesData;
    return [];
  }, [certificatesData]);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const handleGenerateAll = () => {
    generateAll.mutate({ year: selectedYear });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteCertificate.mutateAsync(deleteId);
    setDeleteId(null);
    setDeleteNumber("");
  };

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Certificados de Retencion
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Certificados de retencion en la fuente para proveedores
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium dark:border-neutral-700 dark:bg-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Generate All */}
          <Button
            onClick={handleGenerateAll}
            isLoading={generateAll.isPending}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Generar Todos
          </Button>
        </div>
      </PageSection>

      {/* Stats */}
      <PageSection>
        <StatsCards stats={stats as { totalCertificates: number; totalBase: number; totalWithheld: number } | undefined} isLoading={isLoadingStats} />
      </PageSection>

      {/* Certificates Table */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary-500" />
              Certificados - {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingCerts ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : certificates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileCheck className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                  Sin certificados
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4 text-center max-w-sm">
                  No hay certificados de retencion generados para el ano{" "}
                  {selectedYear}. Haz clic en "Generar Todos" para crearlos.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Certificado</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Retenido</TableHead>
                      <TableHead className="text-center">Generado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {cert.certificateNumber}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">
                              {cert.supplier?.name || "Proveedor desconocido"}
                            </p>
                            {cert.supplier?.documentNumber && (
                              <p className="text-xs text-neutral-400">
                                {cert.supplier.documentNumber}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" size="sm">
                            {getWithholdingTypeLabel(cert.withholdingType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cert.totalBase)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-warning-600 dark:text-warning-400">
                          {formatCurrency(cert.totalWithheld)}
                        </TableCell>
                        <TableCell className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                          {formatDate(cert.generatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {cert.pdfUrl && (
                              <a
                                href={cert.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Descargar PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Eliminar"
                              className="text-neutral-400 hover:text-error-500"
                              onClick={() => {
                                setDeleteId(cert.id);
                                setDeleteNumber(cert.certificateNumber);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>

      {/* Delete Modal */}
      <DeleteModal
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
            setDeleteNumber("");
          }
        }}
        itemName={deleteNumber}
        itemType="certificado de retencion"
        onConfirm={handleDelete}
        isLoading={deleteCertificate.isPending}
      />
    </PageWrapper>
  );
}
