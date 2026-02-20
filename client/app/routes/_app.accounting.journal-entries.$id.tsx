import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  BookMarked,
  CheckCircle,
  Ban,
  Calendar,
  ExternalLink,
} from "lucide-react";
import type { Route } from "./+types/_app.accounting.journal-entries.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatDate, formatCurrency } from "~/lib/utils";
import {
  useJournalEntry,
  usePostJournalEntry,
  useVoidJournalEntry,
} from "~/hooks/useAccounting";
import {
  JournalEntryStatusLabels,
  JournalEntrySourceLabels,
} from "~/types/accounting";
import type { JournalEntryStatus } from "~/types/accounting";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/Modal";
import { Input } from "~/components/ui/Input";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Asiento Contable - StockFlow" },
    { name: "description", content: "Detalle de asiento contable" },
  ];
};

const statusVariant: Record<JournalEntryStatus, "warning" | "success" | "error"> = {
  DRAFT: "warning",
  POSTED: "success",
  VOIDED: "error",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
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
  );
}

export default function JournalEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = usePermissions();
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  const { data: entry, isLoading, isError } = useJournalEntry(id!);
  const postJournalEntry = usePostJournalEntry();
  const voidJournalEntry = useVoidJournalEntry();

  const handlePost = () => {
    postJournalEntry.mutate(id!);
  };

  const handleVoid = () => {
    if (!voidReason.trim()) return;
    voidJournalEntry.mutate(
      { id: id!, reason: voidReason.trim() },
      {
        onSuccess: () => {
          setShowVoidModal(false);
          setVoidReason("");
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !entry) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <BookMarked className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Asiento no encontrado
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          El asiento contable que buscas no existe o fue eliminado.
        </p>
        <Link to="/accounting/journal-entries">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a asientos
          </Button>
        </Link>
      </div>
    );
  }

  const isBalanced = entry.totalDebit === entry.totalCredit;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Link to="/accounting/journal-entries">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                <BookMarked className="h-7 w-7 text-primary-500" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                    {entry.entryNumber}
                  </h1>
                  <Badge variant={statusVariant[entry.status]}>
                    {JournalEntryStatusLabels[entry.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">
                    {JournalEntrySourceLabels[entry.source]}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-14 sm:ml-0">
            {entry.status === "DRAFT" && hasPermission(Permission.ACCOUNTING_EDIT) && (
              <Button
                variant="success"
                onClick={handlePost}
                isLoading={postJournalEntry.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Contabilizar
              </Button>
            )}
            {entry.status === "POSTED" && hasPermission(Permission.ACCOUNTING_EDIT) && (
              <Button variant="danger" onClick={() => setShowVoidModal(true)}>
                <Ban className="h-4 w-4 mr-2" />
                Anular
              </Button>
            )}
          </div>
        </div>
      </PageSection>

      {/* Info */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle>Informacion del Asiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 mt-4">
            <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400">Fecha</span>
              <span className="font-medium text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-neutral-400" />
                {formatDate(entry.date)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400">Descripcion</span>
              <span className="font-medium text-neutral-900 dark:text-white text-right max-w-[60%]">
                {entry.description}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400">Fuente</span>
              <Badge variant="outline">
                {JournalEntrySourceLabels[entry.source]}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400">Periodo</span>
              <span className="font-medium text-neutral-900 dark:text-white">
                {entry.periodId ? entry.periodId : "Sin periodo"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400">Creado</span>
              <span className="text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-neutral-400" />
                {formatDate(entry.createdAt)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400">Contabilizado</span>
              <span className="text-neutral-900 dark:text-white flex items-center gap-1.5">
                {entry.postedAt ? (
                  <>
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    {formatDate(entry.postedAt)}
                  </>
                ) : (
                  "-"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">Anulado</span>
              <span className="text-neutral-900 dark:text-white flex items-center gap-1.5">
                {entry.voidedAt ? (
                  <span className="text-right">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-neutral-400" />
                      {formatDate(entry.voidedAt)}
                    </span>
                    {entry.voidReason && (
                      <span className="text-sm text-neutral-500 dark:text-neutral-400 block mt-1">
                        Razon: {entry.voidReason}
                      </span>
                    )}
                  </span>
                ) : (
                  "-"
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Lines Table */}
      <PageSection>
        <Card padding="none">
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <CardTitle>Lineas del Asiento</CardTitle>
              {isBalanced ? (
                <Badge variant="success">Balanceado</Badge>
              ) : (
                <Badge variant="error">Desbalanceado</Badge>
              )}
            </div>
          </div>
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead className="text-right">Debito</TableHead>
                  <TableHead className="text-right">Credito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div>
                        <span className="font-mono text-sm text-neutral-600 dark:text-neutral-400">
                          {line.accountCode}
                        </span>
                        <span className="ml-2 text-neutral-900 dark:text-white">
                          {line.accountName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-600 dark:text-neutral-400">
                      {line.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.debit > 0 ? formatCurrency(line.debit) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.credit > 0 ? formatCurrency(line.credit) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-bold text-neutral-900 dark:text-white">
                    Totales
                  </TableCell>
                  <TableCell className="text-right font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(entry.totalDebit)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(entry.totalCredit)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </Card>
      </PageSection>

      {/* Related Documents */}
      {(entry.invoiceId || entry.paymentId || entry.purchaseOrderId) && (
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Documentos Relacionados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 mt-4">
              {entry.invoiceId && (
                <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-500 dark:text-neutral-400">Factura</span>
                  <Link to={`/invoices/${entry.invoiceId}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Factura
                    </Button>
                  </Link>
                </div>
              )}
              {entry.paymentId && (
                <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-500 dark:text-neutral-400">Pago</span>
                  <Link to={`/payments/${entry.paymentId}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Pago
                    </Button>
                  </Link>
                </div>
              )}
              {entry.purchaseOrderId && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-neutral-500 dark:text-neutral-400">Orden de Compra</span>
                  <Link to={`/purchases/${entry.purchaseOrderId}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Orden de Compra
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </PageSection>
      )}

      {/* Void Modal */}
      <Dialog open={showVoidModal} onOpenChange={setShowVoidModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular Asiento Contable</DialogTitle>
            <DialogDescription>
              Esta accion anulara el asiento {entry.entryNumber}. Ingresa la razon de la anulacion.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
              Razon de anulacion
            </label>
            <Input
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Ingresa la razon..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVoidModal(false);
                setVoidReason("");
              }}
              disabled={voidJournalEntry.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleVoid}
              disabled={!voidReason.trim()}
              isLoading={voidJournalEntry.isPending}
            >
              Confirmar Anulacion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
