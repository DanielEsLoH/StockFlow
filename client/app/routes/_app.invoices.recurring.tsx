import { useState } from "react";
import { Link } from "react-router";
import {
  Plus,
  RefreshCw,
  Power,
  Trash2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { cn, formatDate } from "~/lib/utils";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  useRecurringInvoices,
  useToggleRecurringInvoice,
  useDeleteRecurringInvoice,
} from "~/hooks/useRecurringInvoices";
import { INTERVAL_LABELS } from "~/types/recurring-invoice";
import type { RecurringInvoice } from "~/types/recurring-invoice";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
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

export const meta = () => {
  return [
    { title: "Facturas Recurrentes - StockFlow" },
    { name: "description", content: "Gestion de facturas recurrentes" },
  ];
};

export default function RecurringInvoicesPage() {
  const [page, setPage] = useState(1);
  const [deletingItem, setDeletingItem] = useState<RecurringInvoice | null>(
    null,
  );
  const { data, isLoading, isError } = useRecurringInvoices(page);
  const toggleMutation = useToggleRecurringInvoice();
  const deleteMutation = useDeleteRecurringInvoice();

  const items = data?.data || [];
  const meta = data?.meta;

  const handleDelete = async () => {
    if (deletingItem) {
      await deleteMutation.mutateAsync(deletingItem.id);
      setDeletingItem(null);
    }
  };

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-900/30">
            <RefreshCw className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Facturas Recurrentes
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {meta?.total || 0} plantillas configuradas
            </p>
          </div>
        </div>
        <Link to="/invoices/recurring/new">
          <Button variant="gradient" leftIcon={<Plus className="h-4 w-4" />}>
            Nueva Recurrente
          </Button>
        </Link>
      </PageSection>

      {/* Stats summary */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-100 dark:bg-success-900/30">
                <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Activas
                </p>
                <p className="text-xl font-bold text-neutral-900 dark:text-white">
                  {items.filter((i) => i.isActive).length}
                </p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                <XCircle className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Inactivas
                </p>
                <p className="text-xl font-bold text-neutral-900 dark:text-white">
                  {items.filter((i) => !i.isActive).length}
                </p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Facturas Generadas
                </p>
                <p className="text-xl font-bold text-neutral-900 dark:text-white">
                  {items.reduce((sum, i) => sum + (i._count?.invoices || 0), 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </PageSection>

      {/* Table */}
      <PageSection>
        <Card variant="elevated">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Intervalo</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Proxima Emision
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Ultima Emision
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Facturas
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-36">Acciones</TableHead>
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
              title="Error al cargar"
              description="Hubo un problema al cargar las facturas recurrentes."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<RefreshCw className="h-16 w-16" />}
              title="No hay facturas recurrentes"
              description="Automatiza la facturacion creando plantillas recurrentes."
              action={{
                label: "Crear recurrente",
                onClick: () => window.location.assign("/invoices/recurring/new"),
              }}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Intervalo</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Proxima Emision
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Ultima Emision
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Facturas
                    </TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-36">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <AnimatedTableRow
                      key={item.id}
                      index={i}
                      className="group border-b border-neutral-200 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {item.customer?.name || "Sin cliente"}
                          </p>
                          {item.customer?.email && (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              {item.customer.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" size="sm">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          {INTERVAL_LABELS[item.interval]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                          {formatDate(item.nextIssueDate)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {item.lastIssuedAt ? (
                          <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                            <Clock className="h-3.5 w-3.5 text-neutral-400" />
                            {formatDate(item.lastIssuedAt)}
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-400">
                            Nunca
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                          {item._count?.invoices || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.isActive ? (
                          <Badge variant="success" size="sm">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activa
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactiva
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={
                              item.isActive ? "Desactivar" : "Activar"
                            }
                            onClick={() =>
                              toggleMutation.mutate(item.id)
                            }
                            disabled={toggleMutation.isPending}
                          >
                            <Power
                              className={cn(
                                "h-4 w-4",
                                item.isActive
                                  ? "text-success-500"
                                  : "text-neutral-400",
                              )}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Desactivar"
                            onClick={() => setDeletingItem(item)}
                            className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </AnimatedTableRow>
                  ))}
                </TableBody>
              </Table>

              {meta && meta.totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-neutral-200 dark:border-neutral-700">
                  <PaginationInfo
                    currentPage={meta.page}
                    pageSize={meta.limit}
                    totalItems={meta.total}
                  />
                  <Pagination
                    currentPage={meta.page}
                    totalPages={meta.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </PageSection>

      {/* Delete Modal */}
      <DeleteModal
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        itemName={deletingItem?.customer?.name || ""}
        itemType="factura recurrente"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </PageWrapper>
  );
}
