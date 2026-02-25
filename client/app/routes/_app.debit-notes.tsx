import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  Eye,
  X,
  Calendar,
  FilePlus,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Download,
} from "lucide-react";
import type { Route } from "./+types/_app.debit-notes";
import { formatDate, formatCurrency } from "~/lib/utils";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { useDianDocuments, useDownloadDianXml } from "~/hooks/useDian";
import { useUrlFilters } from "~/hooks/useUrlFilters";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { StatCard } from "~/components/ui/StatCard";
import { Select } from "~/components/ui/Select";
import { Pagination, PaginationInfo } from "~/components/ui/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  AnimatedTableRow,
} from "~/components/ui/Table";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import {
  DianDocumentStatus,
  dianStatusLabels,
  dianStatusColors,
  debitNoteReasonLabels,
  type DebitNoteReason,
} from "~/types/dian";

export const meta: Route.MetaFunction = () => [
  { title: "Notas Debito - StockFlow" },
  { name: "description", content: "Gestion de notas debito electronicas" },
];

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "ACCEPTED", label: "Aceptada" },
  { value: "REJECTED", label: "Rechazada" },
  { value: "SENT", label: "Enviada" },
  { value: "GENERATED", label: "Generada" },
];

const pageSizeOptions = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
];

const statusIcon: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3 w-3" />,
  GENERATED: <Clock className="h-3 w-3" />,
  SIGNED: <Clock className="h-3 w-3" />,
  SENT: <Send className="h-3 w-3" />,
  ACCEPTED: <CheckCircle className="h-3 w-3" />,
  REJECTED: <XCircle className="h-3 w-3" />,
};

interface DebitNoteFilters {
  status?: DianDocumentStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

const filtersParser = {
  parse: (searchParams: URLSearchParams): DebitNoteFilters => ({
    status: (searchParams.get("status") as DianDocumentStatus) || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

function DateFilterInput({
  value,
  onChange,
  placeholder,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
      <Input
        type="date"
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="pl-10"
      />
    </div>
  );
}

export default function DebitNotesPage() {
  const [showFilters, setShowFilters] = useState(false);
  const { filters, updateFilters, clearFilters } =
    useUrlFilters<DebitNoteFilters>({ parserConfig: filtersParser });

  const {
    data: documentsData,
    isLoading,
    isError,
  } = useDianDocuments({
    ...filters,
    documentType: "NOTA_DEBITO",
  });
  const downloadXml = useDownloadDianXml();

  const documents = documentsData?.data || [];
  const meta = documentsData?.meta;
  const total = meta?.total || 0;
  const totalPages = meta?.totalPages || 0;

  const stats = useMemo(() => {
    const all = documents;
    return {
      total,
      accepted: all.filter((d) => d.status === "ACCEPTED").length,
      rejected: all.filter((d) => d.status === "REJECTED").length,
      pending: all.filter(
        (d) => !["ACCEPTED", "REJECTED"].includes(d.status),
      ).length,
    };
  }, [documents, total]);

  const hasActiveFilters = filters.status || filters.fromDate || filters.toDate;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-warning-500/20 to-warning-500/10 dark:from-warning-500/20 dark:to-warning-900/30">
            <FilePlus className="h-7 w-7 text-warning-600 dark:text-warning-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Notas Debito
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {total} notas debito en total
            </p>
          </div>
        </div>
      </PageSection>

      {/* Stats Cards */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FilePlus}
            label="Total"
            value={stats.total}
            subtitle="notas debito"
            color="primary"
            variant="gradient"
            animate
            animationDelay={0}
          />
          <StatCard
            icon={CheckCircle}
            label="Aceptadas"
            value={stats.accepted}
            color="success"
            variant="gradient"
            animate
            animationDelay={0.1}
          />
          <StatCard
            icon={XCircle}
            label="Rechazadas"
            value={stats.rejected}
            color="error"
            variant="gradient"
            animate
            animationDelay={0.2}
          />
          <StatCard
            icon={Clock}
            label="En proceso"
            value={stats.pending}
            color="warning"
            variant="gradient"
            animate
            animationDelay={0.3}
          />
        </div>
      </PageSection>

      {/* Filters */}
      <PageSection>
        <Card variant="elevated" padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="text-sm text-neutral-500">
                  Las notas debito se crean desde el detalle de cada factura
                  electronica.
                </p>
              </div>
              <Button
                variant={showFilters ? "soft-primary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="gradient" size="xs" className="ml-2">
                    {
                      [filters.status, filters.fromDate, filters.toDate].filter(
                        Boolean,
                      ).length
                    }
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              )}
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Select
                      options={statusOptions}
                      value={filters.status || ""}
                      onChange={(value) =>
                        updateFilters({
                          status:
                            (value as DianDocumentStatus) || undefined,
                        })
                      }
                      placeholder="Todos los estados"
                    />
                    <DateFilterInput
                      value={filters.fromDate}
                      onChange={(value) => updateFilters({ fromDate: value })}
                      placeholder="Fecha desde"
                    />
                    <DateFilterInput
                      value={filters.toDate}
                      onChange={(value) => updateFilters({ toDate: value })}
                      placeholder="Fecha hasta"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </PageSection>

      {/* Table */}
      <PageSection>
        <Card variant="elevated">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Nota</TableHead>
                  <TableHead>Factura Original</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Cliente
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Razon</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={7} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar notas debito"
              description="Hubo un problema al cargar las notas debito."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={<FilePlus className="h-16 w-16" />}
              title={
                hasActiveFilters ? "Sin resultados" : "No hay notas debito"
              }
              description={
                hasActiveFilters
                  ? "No se encontraron notas debito con los filtros aplicados."
                  : "Las notas debito se generan desde el detalle de una factura electronica aceptada por la DIAN."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : undefined
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Nota</TableHead>
                    <TableHead>Factura Original</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Cliente
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Razon
                    </TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Fecha
                    </TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc, i) => (
                    <AnimatedTableRow
                      key={doc.id}
                      index={i}
                      className="group border-b border-neutral-200 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <TableCell>
                        <Link
                          to={`/debit-notes/${doc.id}`}
                          className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                        >
                          {doc.documentNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {doc.invoice ? (
                          <Link
                            to={`/invoices/${doc.invoice.id}`}
                            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                          >
                            {doc.invoice.invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {doc.invoice?.customer?.name || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-neutral-600 dark:text-neutral-300">
                          {(doc as any).creditNoteReason
                            ? debitNoteReasonLabels[
                                (doc as any)
                                  .creditNoteReason as DebitNoteReason
                              ] || (doc as any).creditNoteReason
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            dianStatusColors[doc.status as DianDocumentStatus]
                          }
                          size="sm"
                          icon={statusIcon[doc.status]}
                        >
                          {dianStatusLabels[doc.status as DianDocumentStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                          {formatDate(doc.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/debit-notes/${doc.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Descargar XML"
                            onClick={() => downloadXml.mutate(doc.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </AnimatedTableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-4">
                    <PaginationInfo
                      currentPage={filters.page || 1}
                      pageSize={filters.limit || 10}
                      totalItems={total}
                    />
                    <Select
                      options={pageSizeOptions}
                      value={String(filters.limit || 10)}
                      onChange={(value) =>
                        updateFilters({ limit: Number(value), page: 1 })
                      }
                      className="w-36"
                    />
                  </div>
                  <Pagination
                    currentPage={filters.page || 1}
                    totalPages={totalPages}
                    onPageChange={(page) => updateFilters({ page })}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
