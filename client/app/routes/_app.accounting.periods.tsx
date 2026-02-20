import { useState } from "react";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { CalendarDays, Plus } from "lucide-react";
import type { Route } from "./+types/_app.accounting.periods";
import { formatDate } from "~/lib/utils";
import {
  useAccountingPeriods,
  useCreateAccountingPeriod,
  useCloseAccountingPeriod,
} from "~/hooks/useAccounting";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Textarea } from "~/components/ui/Textarea";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/Modal";
import type {
  AccountingPeriod,
  AccountingPeriodStatus,
  CreateAccountingPeriodData,
} from "~/types/accounting";
import { AccountingPeriodStatusLabels } from "~/types/accounting";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Periodos Contables - StockFlow" },
    { name: "description", content: "Gestion de periodos contables" },
  ];
};

const statusBadgeVariant: Record<
  AccountingPeriodStatus,
  "success" | "warning" | "default"
> = {
  OPEN: "success",
  CLOSING: "warning",
  CLOSED: "default",
};

export default function AccountingPeriodsPage() {
  const { hasPermission } = usePermissions();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [closingPeriod, setClosingPeriod] = useState<AccountingPeriod | null>(
    null,
  );
  const [closeNotes, setCloseNotes] = useState("");
  const [newPeriod, setNewPeriod] = useState<CreateAccountingPeriodData>({
    name: "",
    startDate: "",
    endDate: "",
  });

  const { data: periods, isLoading, isError } = useAccountingPeriods();
  const createPeriod = useCreateAccountingPeriod();
  const closePeriod = useCloseAccountingPeriod();

  const handleCreatePeriod = async () => {
    if (!newPeriod.name || !newPeriod.startDate || !newPeriod.endDate) return;
    await createPeriod.mutateAsync(newPeriod);
    setShowCreateModal(false);
    setNewPeriod({ name: "", startDate: "", endDate: "" });
  };

  const handleClosePeriod = async () => {
    if (!closingPeriod) return;
    await closePeriod.mutateAsync({
      id: closingPeriod.id,
      notes: closeNotes || undefined,
    });
    setClosingPeriod(null);
    setCloseNotes("");
  };

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/20 to-primary-500/10 dark:from-accent-500/20 dark:to-primary-900/30">
            <CalendarDays className="h-7 w-7 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Periodos Contables
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              Administra los periodos de tu contabilidad
            </p>
          </div>
        </div>
        {hasPermission(Permission.ACCOUNTING_CONFIG) && (
          <Button
            variant="gradient"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Nuevo Periodo
          </Button>
        )}
      </PageSection>

      {/* Table */}
      <PageSection>
        <Card variant="elevated">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Fecha Fin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Asientos
                  </TableHead>
                  <TableHead className="w-36">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={6} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar los periodos"
              description="Hubo un problema al cargar los periodos contables. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : !periods || periods.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-16 w-16" />}
              title="No hay periodos contables"
              description="Comienza creando tu primer periodo contable."
              action={
                hasPermission(Permission.ACCOUNTING_CONFIG)
                  ? {
                      label: "Nuevo Periodo",
                      onClick: () => setShowCreateModal(true),
                    }
                  : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Fecha Fin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Asientos
                  </TableHead>
                  <TableHead className="w-36">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period, i) => (
                  <AnimatedTableRow key={period.id} index={i} className="group">
                    <TableCell>
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {period.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {formatDate(period.startDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {formatDate(period.endDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusBadgeVariant[period.status]}
                        dot
                      >
                        {AccountingPeriodStatusLabels[period.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {period.entryCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      {period.status === "OPEN" &&
                        hasPermission(Permission.ACCOUNTING_CLOSE_PERIOD) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setClosingPeriod(period)}
                          >
                            Cerrar Periodo
                          </Button>
                        )}
                    </TableCell>
                  </AnimatedTableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </PageSection>

      {/* Create Period Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Periodo Contable</DialogTitle>
            <DialogDescription>
              Crea un nuevo periodo para registrar asientos contables.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Nombre
              </label>
              <Input
                placeholder="Ej: Enero 2025"
                value={newPeriod.name}
                onChange={(e) =>
                  setNewPeriod({ ...newPeriod, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Fecha Inicio
                </label>
                <Input
                  type="date"
                  value={newPeriod.startDate}
                  onChange={(e) =>
                    setNewPeriod({ ...newPeriod, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Fecha Fin
                </label>
                <Input
                  type="date"
                  value={newPeriod.endDate}
                  onChange={(e) =>
                    setNewPeriod({ ...newPeriod, endDate: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="gradient"
              onClick={handleCreatePeriod}
              isLoading={createPeriod.isPending}
              disabled={
                !newPeriod.name || !newPeriod.startDate || !newPeriod.endDate
              }
            >
              Crear Periodo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Period Confirmation Modal */}
      <Dialog
        open={!!closingPeriod}
        onOpenChange={(open) => {
          if (!open) {
            setClosingPeriod(null);
            setCloseNotes("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cerrar Periodo Contable</DialogTitle>
            <DialogDescription>
              {`¿Estas seguro de que deseas cerrar el periodo "${closingPeriod?.name || ""}"? Una vez cerrado, no se podran registrar mas asientos en este periodo.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Notas (opcional)
            </label>
            <Textarea
              placeholder="Notas sobre el cierre del periodo..."
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setClosingPeriod(null);
                setCloseNotes("");
              }}
              disabled={closePeriod.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleClosePeriod}
              isLoading={closePeriod.isPending}
            >
              Cerrar Periodo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
