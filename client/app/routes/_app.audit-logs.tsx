import { useState, useMemo } from "react";
import {
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Calendar,
  X,
} from "lucide-react";
import type { Route } from "./+types/_app.audit-logs";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { useUrlFilters } from "~/hooks/useUrlFilters";
import { useAuditLogs, useAuditStats } from "~/hooks/useAuditLogs";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Select } from "~/components/ui/Select";
import { Badge } from "~/components/ui/Badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "~/components/ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import { Pagination, PaginationInfo } from "~/components/ui/Pagination";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import type { AuditAction, AuditLog, AuditLogFilters } from "~/types/audit-log";
import { AuditActionLabels } from "~/types/audit-log";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Registro de Auditoria - StockFlow" },
    {
      name: "description",
      content: "Registro de actividad y cambios del sistema",
    },
  ];
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  User: "Usuario",
  Product: "Producto",
  Category: "Categoria",
  Warehouse: "Bodega",
  Customer: "Cliente",
  Invoice: "Factura",
  Payment: "Pago",
  StockMovement: "Movimiento",
  PurchaseOrder: "Orden de Compra",
  Supplier: "Proveedor",
  Quotation: "Cotizacion",
  JournalEntry: "Asiento Contable",
  Tenant: "Empresa",
};

const ACTION_BADGE_VARIANT: Record<AuditAction, "success" | "primary" | "error" | "secondary" | "warning"> = {
  CREATE: "success",
  UPDATE: "primary",
  DELETE: "error",
  LOGIN: "secondary",
  LOGOUT: "secondary",
  EXPORT: "warning",
  IMPORT: "warning",
};

const ACTION_OPTIONS = [
  { value: "", label: "Todas las acciones" },
  ...Object.entries(AuditActionLabels).map(([value, label]) => ({
    value,
    label,
  })),
];

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
  { value: "100", label: "100 por pagina" },
];

const filtersParser = {
  parse: (params: URLSearchParams): AuditLogFilters => ({
    action: (params.get("action") as AuditAction) || undefined,
    entityType: params.get("entityType") || undefined,
    userId: params.get("userId") || undefined,
    startDate: params.get("startDate") || undefined,
    endDate: params.get("endDate") || undefined,
    page: Number(params.get("page")) || 1,
    limit: Number(params.get("limit")) || 25,
  }),
};

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEntityLabel(type: string) {
  return ENTITY_TYPE_LABELS[type] || type;
}

function truncateId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

// ============================================================================
// VALUE DIFF COMPONENT
// ============================================================================

function ValueDiff({
  oldValues,
  newValues,
}: {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}) {
  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    if (oldValues) Object.keys(oldValues).forEach((k) => keys.add(k));
    if (newValues) Object.keys(newValues).forEach((k) => keys.add(k));
    // Filter out noisy fields
    ["updatedAt", "createdAt", "tenantId", "id"].forEach((k) => keys.delete(k));
    return Array.from(keys).sort();
  }, [oldValues, newValues]);

  if (allKeys.length === 0) {
    return (
      <p className="text-sm text-neutral-400 italic px-4 py-2">
        Sin detalles disponibles
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-700">
            <th className="text-left px-3 py-1.5 font-medium text-neutral-500 dark:text-neutral-400 w-1/4">
              Campo
            </th>
            <th className="text-left px-3 py-1.5 font-medium text-neutral-500 dark:text-neutral-400 w-[37.5%]">
              Antes
            </th>
            <th className="text-left px-3 py-1.5 font-medium text-neutral-500 dark:text-neutral-400 w-[37.5%]">
              Despues
            </th>
          </tr>
        </thead>
        <tbody>
          {allKeys.map((key) => {
            const oldVal = oldValues?.[key];
            const newVal = newValues?.[key];
            const changed =
              JSON.stringify(oldVal) !== JSON.stringify(newVal);
            return (
              <tr
                key={key}
                className={
                  changed
                    ? "bg-warning-50/50 dark:bg-warning-900/10"
                    : ""
                }
              >
                <td className="px-3 py-1 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                  {key}
                </td>
                <td className="px-3 py-1 font-mono text-xs">
                  {oldVal !== undefined ? (
                    <span
                      className={
                        changed
                          ? "text-error-600 dark:text-error-400"
                          : "text-neutral-500 dark:text-neutral-400"
                      }
                    >
                      {formatValue(oldVal)}
                    </span>
                  ) : (
                    <span className="text-neutral-300 dark:text-neutral-600">
                      —
                    </span>
                  )}
                </td>
                <td className="px-3 py-1 font-mono text-xs">
                  {newVal !== undefined ? (
                    <span
                      className={
                        changed
                          ? "text-success-600 dark:text-success-400"
                          : "text-neutral-500 dark:text-neutral-400"
                      }
                    >
                      {formatValue(newVal)}
                    </span>
                  ) : (
                    <span className="text-neutral-300 dark:text-neutral-600">
                      —
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatValue(val: unknown): string {
  if (val === null) return "null";
  if (val === undefined) return "";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

// ============================================================================
// EXPANDABLE ROW
// ============================================================================

function AuditRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = log.oldValues || log.newValues;

  return (
    <>
      <TableRow
        className={hasDetails ? "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50" : ""}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <TableCell className="w-8">
          {hasDetails && (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-neutral-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-neutral-400" />
            )
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">
          {formatDateTime(log.createdAt)}
        </TableCell>
        <TableCell>
          {log.user ? (
            <div>
              <span className="font-medium text-sm">
                {log.user.firstName} {log.user.lastName}
              </span>
              <span className="block text-xs text-neutral-400">
                {log.user.email}
              </span>
            </div>
          ) : (
            <span className="text-sm text-neutral-400 italic">Sistema</span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant={ACTION_BADGE_VARIANT[log.action]}>
            {AuditActionLabels[log.action]}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="text-sm font-medium">
            {getEntityLabel(log.entityType)}
          </span>
          <span className="block text-xs text-neutral-400 font-mono">
            {truncateId(log.entityId)}
          </span>
        </TableCell>
      </TableRow>
      {expanded && hasDetails && (
        <tr>
          <td colSpan={5} className="bg-neutral-50 dark:bg-neutral-800/30 p-0">
            <div className="px-4 py-3">
              <ValueDiff
                oldValues={log.oldValues}
                newValues={log.newValues}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================================================
// STATS CARDS
// ============================================================================

function StatsCards({
  stats,
  isLoading,
}: {
  stats: ReturnType<typeof useAuditStats>["data"];
  isLoading: boolean;
}) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-3" />
              <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const topEntityTypes = Object.entries(stats.entityTypeBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const topActions = Object.entries(stats.actionBreakdown)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Total Registros
          </p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1 tabular-nums">
            {stats.totalLogs.toLocaleString("es-CO")}
          </p>
        </CardContent>
      </Card>

      {/* Actions breakdown */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
            Por Accion
          </p>
          <div className="space-y-1.5">
            {topActions.slice(0, 4).map(([action, count]) => (
              <div key={action} className="flex items-center justify-between text-sm">
                <Badge variant={ACTION_BADGE_VARIANT[action as AuditAction]} className="text-xs">
                  {AuditActionLabels[action as AuditAction]}
                </Badge>
                <span className="tabular-nums text-neutral-600 dark:text-neutral-300">
                  {count.toLocaleString("es-CO")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top entity types */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
            Entidades Mas Activas
          </p>
          <div className="space-y-1.5">
            {topEntityTypes.slice(0, 4).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700 dark:text-neutral-300">
                  {getEntityLabel(type)}
                </span>
                <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                  {count.toLocaleString("es-CO")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top users */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
            Usuarios Mas Activos
          </p>
          <div className="space-y-1.5">
            {stats.topUsers.slice(0, 4).map((user) => (
              <div key={user.userId} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700 dark:text-neutral-300 truncate max-w-[140px]">
                  {user.firstName} {user.lastName}
                </span>
                <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                  {user.count.toLocaleString("es-CO")}
                </span>
              </div>
            ))}
            {stats.topUsers.length === 0 && (
              <p className="text-xs text-neutral-400 italic">Sin actividad</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function AuditLogsPage() {
  const { filters, updateFilters, clearFilters } =
    useUrlFilters<AuditLogFilters>({
      parserConfig: filtersParser,
    });

  const { data, isLoading, isError } = useAuditLogs(filters);
  const { data: stats, isLoading: statsLoading } = useAuditStats(
    filters.startDate,
    filters.endDate,
  );

  const entityTypeOptions = useMemo(() => {
    const types = stats?.entityTypeBreakdown
      ? Object.keys(stats.entityTypeBreakdown).sort()
      : [];
    return [
      { value: "", label: "Todos los tipos" },
      ...types.map((t) => ({ value: t, label: getEntityLabel(t) })),
    ];
  }, [stats]);

  const hasActiveFilters =
    filters.action || filters.entityType || filters.startDate || filters.endDate;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-50 text-primary-500 dark:bg-primary-900/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Registro de Auditoria
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Historial de actividad y cambios del sistema
            </p>
          </div>
        </div>
      </PageSection>

      {/* Stats */}
      <PageSection>
        <StatsCards stats={stats} isLoading={statsLoading} />
      </PageSection>

      {/* Filters */}
      <PageSection>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-end gap-4">
              <div className="space-y-2 w-full lg:w-auto">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Accion
                </label>
                <Select
                  options={ACTION_OPTIONS}
                  value={filters.action || ""}
                  onChange={(value) =>
                    updateFilters({
                      action: (value as AuditAction) || undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2 w-full lg:w-auto">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Tipo de Entidad
                </label>
                <Select
                  options={entityTypeOptions}
                  value={filters.entityType || ""}
                  onChange={(value) =>
                    updateFilters({ entityType: value || undefined })
                  }
                />
              </div>
              <div className="space-y-2 w-full lg:w-auto">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Desde
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={filters.startDate || ""}
                    onChange={(e) =>
                      updateFilters({
                        startDate: e.target.value || undefined,
                      })
                    }
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2 w-full lg:w-auto">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Hasta
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={filters.endDate || ""}
                    onChange={(e) =>
                      updateFilters({ endDate: e.target.value || undefined })
                    }
                    className="pl-10"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<X className="h-4 w-4" />}
                  onClick={clearFilters}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Table */}
      <PageSection>
        <Card padding="none">
          <CardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <CardTitle>Actividad</CardTitle>
              {data?.meta && (
                <span className="text-sm font-medium text-neutral-500">
                  {data.meta.total.toLocaleString("es-CO")} registro
                  {data.meta.total !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Accion</TableHead>
                    <TableHead>Entidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={5} />
                  ))}
                </TableBody>
              </Table>
            ) : isError ? (
              <EmptyState
                type="error"
                title="Error al cargar registros"
                description="No se pudieron obtener los datos de auditoria."
                action={{
                  label: "Reintentar",
                  onClick: () => window.location.reload(),
                }}
              />
            ) : !data || data.data.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="h-16 w-16" />}
                title="Sin registros"
                description="No se encontraron registros de auditoria para los filtros seleccionados."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Accion</TableHead>
                    <TableHead>Entidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((log) => (
                    <AuditRow key={log.id} log={log} />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {data?.meta && data.meta.total > 0 && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-4">
                <PaginationInfo
                  currentPage={data.meta.page}
                  pageSize={data.meta.limit}
                  totalItems={data.meta.total}
                />
                <Select
                  options={PAGE_SIZE_OPTIONS}
                  value={String(filters.limit || 25)}
                  onChange={(value) =>
                    updateFilters({ limit: Number(value), page: 1 })
                  }
                  className="w-36"
                />
              </div>
              {data.meta.totalPages > 1 && (
                <Pagination
                  currentPage={data.meta.page}
                  totalPages={data.meta.totalPages}
                  onPageChange={(page) => updateFilters({ page })}
                />
              )}
            </div>
          )}
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
