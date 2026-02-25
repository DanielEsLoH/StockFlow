import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Filter,
  Eye,
  Trash2,
  X,
  Calendar,
  FileCheck,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  DollarSign,
} from "lucide-react";
import type { Route } from "./+types/_app.support-documents";
import { cn, debounce, formatCurrency, formatDate } from "~/lib/utils";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  useSupportDocuments,
  useSupportDocumentStats,
  useDeleteSupportDocument,
  useGenerateSupportDocument,
} from "~/hooks/useSupportDocuments";
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
import { DeleteModal } from "~/components/ui/DeleteModal";
import type { SupportDocumentStatus, SupportDocument } from "~/types/support-document";
import { supportDocStatusLabels } from "~/types/support-document";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Documentos Soporte - StockFlow" },
    { name: "description", content: "Gestion de documentos soporte" },
  ];
};

// Status filter options
const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "DRAFT", label: "Borrador" },
  { value: "GENERATED", label: "Generado" },
  { value: "SENT", label: "Enviado" },
  { value: "ACCEPTED", label: "Aceptado" },
  { value: "REJECTED", label: "Rechazado" },
];

// Items per page
const pageSizeOptions = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
];

// Badge variant mapping
const statusBadgeVariant: Record<
  SupportDocumentStatus,
  "default" | "primary" | "secondary" | "success" | "warning" | "error"
> = {
  DRAFT: "secondary",
  GENERATED: "default",
  SENT: "warning",
  ACCEPTED: "success",
  REJECTED: "error",
};

// Status icon mapping
const statusIcon: Record<SupportDocumentStatus, React.ReactNode> = {
  DRAFT: <Clock className="h-3 w-3" />,
  GENERATED: <FileCheck className="h-3 w-3" />,
  SENT: <Send className="h-3 w-3" />,
  ACCEPTED: <CheckCircle className="h-3 w-3" />,
  REJECTED: <XCircle className="h-3 w-3" />,
};

// Filters type
interface SupportDocumentFilters {
  search?: string;
  status?: SupportDocumentStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// Date filter input
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

// Table header
function DocTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>No. Documento</TableHead>
        <TableHead>Proveedor</TableHead>
        <TableHead className="hidden md:table-cell">Fecha</TableHead>
        <TableHead className="text-right hidden sm:table-cell">Total</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead className="w-30">Acciones</TableHead>
      </TableRow>
    </TableHeader>
  );
}

// Parser config
const docFiltersParser = {
  parse: (searchParams: URLSearchParams): SupportDocumentFilters => ({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as SupportDocumentStatus) || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

export default function SupportDocumentsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<SupportDocument | null>(null);
  const { filters, updateFilters, clearFilters } =
    useUrlFilters<SupportDocumentFilters>({
      parserConfig: docFiltersParser,
    });

  // Queries
  const {
    data: docsData,
    isLoading,
    isError,
  } = useSupportDocuments(filters as Record<string, unknown>);
  const { data: stats } = useSupportDocumentStats();
  const deleteDoc = useDeleteSupportDocument();
  const generateDoc = useGenerateSupportDocument();

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce(
        (value: string) => updateFilters({ search: value || undefined }),
        300,
      ),
    [updateFilters],
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Handle delete
  const handleDelete = async () => {
    if (deletingDoc) {
      await deleteDoc.mutateAsync(deletingDoc.id);
      setDeletingDoc(null);
    }
  };

  const documents = docsData?.data || [];
  const total = docsData?.total || 0;
  const totalPages = Math.ceil(total / (filters.limit || 10));
  const hasActiveFilters =
    filters.search || filters.status || filters.fromDate || filters.toDate;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-900/30">
            <FileCheck className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Documentos Soporte
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {total} documentos en total
            </p>
          </div>
        </div>
        <Link to="/support-documents/new">
          <Button variant="gradient" leftIcon={<Plus className="h-4 w-4" />}>
            Nuevo Documento
          </Button>
        </Link>
      </PageSection>

      {/* Stats Cards */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FileText}
            label="Total Documentos"
            value={stats?.total || 0}
            subtitle="en el sistema"
            color="primary"
            variant="gradient"
            animate
            animationDelay={0}
          />
          <StatCard
            icon={Clock}
            label="Borradores"
            value={stats?.DRAFT || 0}
            color="warning"
            variant="gradient"
            animate
            animationDelay={0.1}
          />
          <StatCard
            icon={CheckCircle}
            label="Aceptados"
            value={stats?.ACCEPTED || 0}
            color="success"
            variant="gradient"
            animate
            animationDelay={0.2}
          />
          <StatCard
            icon={DollarSign}
            label="Total Valor"
            value={formatCurrency(stats?.totalValue || 0)}
            color="primary"
            variant="gradient"
            animate
            animationDelay={0.3}
          />
        </div>
      </PageSection>

      {/* Search and Filters */}
      <PageSection>
        <Card variant="elevated" padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Buscar por numero de documento o proveedor..."
                  className="pl-10"
                  defaultValue={filters.search}
                  onChange={handleSearchChange}
                />
              </div>

              {/* Filter toggle */}
              <Button
                variant={showFilters ? "soft-primary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="gradient" size="xs" className="ml-2">
                    {
                      [
                        filters.status,
                        filters.fromDate,
                        filters.toDate,
                      ].filter(Boolean).length
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

            {/* Filter options */}
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
                          status: (value as SupportDocumentStatus) || undefined,
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
              <DocTableHeader />
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={6} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar documentos"
              description="Hubo un problema al cargar los documentos soporte. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={<FileCheck className="h-16 w-16" />}
              title={
                hasActiveFilters
                  ? "Sin resultados"
                  : "No hay documentos soporte"
              }
              description={
                hasActiveFilters
                  ? "No se encontraron documentos con los filtros aplicados."
                  : "Comienza creando tu primer documento soporte."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : {
                      label: "Crear documento",
                      onClick: () =>
                        (window.location.href = "/support-documents/new"),
                    }
              }
            />
          ) : (
            <>
              <Table>
                <DocTableHeader />
                <TableBody>
                  {documents.map((doc, i) => (
                    <AnimatedTableRow
                      key={doc.id}
                      index={i}
                      className="group border-b border-neutral-200 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <TableCell>
                        <Link
                          to={`/support-documents/${doc.id}`}
                          className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                        >
                          {doc.documentNumber}
                        </Link>
                        {doc.dianCude && (
                          <p className="text-xs text-neutral-400 truncate max-w-[120px]">
                            CUDE: {doc.dianCude}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {doc.supplierName}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {doc.supplierDocType}: {doc.supplierDocument}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                          {formatDate(doc.issueDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        <p className="font-bold text-lg bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                          {formatCurrency(doc.total)}
                        </p>
                        <div className="flex justify-end gap-2 text-xs text-neutral-500">
                          <span>Base: {formatCurrency(doc.subtotal)}</span>
                          {doc.tax > 0 && (
                            <span>IVA: {formatCurrency(doc.tax)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusBadgeVariant[doc.status]}
                          size="sm"
                          icon={statusIcon[doc.status]}
                        >
                          {supportDocStatusLabels[doc.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/support-documents/${doc.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {doc.status === "DRAFT" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => generateDoc.mutate(doc.id)}
                                disabled={generateDoc.isPending}
                                title="Generar documento"
                              >
                                <FileCheck className="h-4 w-4 text-primary-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingDoc(doc)}
                                title="Eliminar"
                                className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </AnimatedTableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
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

      {/* Delete Modal */}
      <DeleteModal
        open={!!deletingDoc}
        onOpenChange={(open) => !open && setDeletingDoc(null)}
        itemName={deletingDoc?.documentNumber || ""}
        itemType="documento soporte"
        onConfirm={handleDelete}
        isLoading={deleteDoc.isPending}
      />
    </PageWrapper>
  );
}
