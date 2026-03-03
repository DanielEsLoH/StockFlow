import { useState, useCallback } from "react";
import { useParams, Link } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Wifi,
  Package,
  ShoppingCart,
  Boxes,
  Trash2,
  Link2,
  Plus,
} from "lucide-react";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  useIntegration,
  useIntegrationMappings,
  useIntegrationSyncLogs,
  useVerifyConnection,
  useSyncProducts,
  useSyncOrders,
  useSyncInventory,
  useDeleteMapping,
} from "~/hooks/useIntegrations";
import { PLATFORM_INFO } from "~/types/integration";
import type { IntegrationStatus, SyncStatus } from "~/types/integration";
import { cn } from "~/lib/utils";

/**
 * Integration detail page — view mappings, sync logs, and manage connection.
 *
 * vercel-react-best-practices applied:
 * - rerender-functional-setstate: functional setState
 * - bundle-barrel-imports: direct imports only
 */

const STATUS_BADGE: Record<IntegrationStatus, { bg: string; text: string; label: string }> = {
  CONNECTED: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-300",
    label: "Conectado",
  },
  PENDING: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-800 dark:text-yellow-300",
    label: "Pendiente",
  },
  DISCONNECTED: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-700 dark:text-neutral-300",
    label: "Desconectado",
  },
  ERROR: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-300",
    label: "Error",
  },
};

const SYNC_STATUS_BADGE: Record<SyncStatus, { bg: string; text: string; label: string }> = {
  PENDING: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-700 dark:text-neutral-300",
    label: "Pendiente",
  },
  IN_PROGRESS: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-800 dark:text-blue-300",
    label: "En progreso",
  },
  COMPLETED: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-300",
    label: "Completado",
  },
  FAILED: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-300",
    label: "Fallido",
  },
  PARTIAL: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-800 dark:text-yellow-300",
    label: "Parcial",
  },
};

export default function IntegrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: integration, isLoading } = useIntegration(id!);
  const { data: mappings } = useIntegrationMappings(id!);
  const { data: syncLogs } = useIntegrationSyncLogs(id!);
  const verifyConnection = useVerifyConnection();
  const syncProducts = useSyncProducts();
  const syncOrders = useSyncOrders();
  const syncInventory = useSyncInventory();
  const deleteMapping = useDeleteMapping(id!);

  const [activeTab, setActiveTab] = useState<"mappings" | "logs">("mappings");

  const handleDeleteMapping = useCallback(
    (mappingId: string) => {
      deleteMapping.mutate(mappingId);
    },
    [deleteMapping],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Cargando...">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      </PageWrapper>
    );
  }

  if (!integration) {
    return (
      <PageWrapper title="Integración no encontrada">
        <div className="py-12 text-center text-neutral-500">
          La integración solicitada no existe.
        </div>
      </PageWrapper>
    );
  }

  const pInfo = PLATFORM_INFO[integration.platform];
  const statusBadge = STATUS_BADGE[integration.status];

  return (
    <PageWrapper
      title={integration.name}
      description={`${pInfo.name} — ${integration.shopUrl ?? "Sin URL"}`}
      actions={
        <div className="flex items-center gap-3">
          <Link
            to="/integrations"
            className="flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <button
            type="button"
            onClick={() => verifyConnection.mutate(integration.id)}
            disabled={verifyConnection.isPending}
            className="flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Wifi className="h-4 w-4" />
            Verificar
          </button>
        </div>
      }
    >
      {/* Status + Info */}
      <PageSection>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-3xl">{pInfo.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {integration.name}
                </h2>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    statusBadge.bg,
                    statusBadge.text,
                  )}
                >
                  {statusBadge.label}
                </span>
              </div>
              <p className="text-sm text-neutral-500">
                {integration.shopUrl ?? "Sin URL configurada"} ·{" "}
                {integration.lastSyncAt
                  ? `Ultima sync: ${new Date(integration.lastSyncAt).toLocaleString("es-CO")}`
                  : "Nunca sincronizado"}
              </p>
            </div>

            {/* Sync Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => syncProducts.mutate(integration.id)}
                disabled={
                  syncProducts.isPending || integration.status !== "CONNECTED"
                }
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Package className={cn("h-4 w-4", syncProducts.isPending && "animate-spin")} />
                Productos
              </button>
              <button
                type="button"
                onClick={() => syncOrders.mutate(integration.id)}
                disabled={
                  syncOrders.isPending || integration.status !== "CONNECTED"
                }
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <ShoppingCart className={cn("h-4 w-4", syncOrders.isPending && "animate-spin")} />
                Pedidos
              </button>
              <button
                type="button"
                onClick={() => syncInventory.mutate(integration.id)}
                disabled={
                  syncInventory.isPending ||
                  integration.status !== "CONNECTED"
                }
                className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <Boxes className={cn("h-4 w-4", syncInventory.isPending && "animate-spin")} />
                Inventario
              </button>
            </div>
          </div>

          {/* Sync config summary */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "Productos", enabled: integration.syncProducts },
              { label: "Pedidos", enabled: integration.syncOrders },
              { label: "Inventario", enabled: integration.syncInventory },
            ].map(({ label, enabled }) => (
              <span
                key={label}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  enabled
                    ? "bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
                    : "bg-neutral-100 text-neutral-500 line-through dark:bg-neutral-800",
                )}
              >
                {label}
              </span>
            ))}
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {integration.syncDirection === "BOTH"
                ? "Bidireccional"
                : integration.syncDirection === "INBOUND"
                  ? "Solo entrada"
                  : "Solo salida"}
            </span>
          </div>
        </div>
      </PageSection>

      {/* Tabs */}
      <PageSection>
        <div className="mb-4 flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab("mappings")}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "mappings"
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
            )}
          >
            <Link2 className="mr-1.5 inline h-4 w-4" />
            Mapeos ({mappings?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "logs"
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
            )}
          >
            <Clock className="mr-1.5 inline h-4 w-4" />
            Logs de Sync ({syncLogs?.length ?? 0})
          </button>
        </div>

        {/* Mappings Tab */}
        {activeTab === "mappings" && (
          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            {!mappings?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Link2 className="mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Sin mapeos de productos
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Los mapeos conectan tus productos de StockFlow con los de{" "}
                  {pInfo.name}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Producto StockFlow
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                        ID Externo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                        SKU Externo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Ultima Sync
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {mappings.map((mapping) => (
                      <motion.tr
                        key={mapping.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-white">
                              {mapping.product?.name ?? "—"}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {mapping.product?.sku ?? "—"}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-neutral-500">
                          {mapping.externalId}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                          {mapping.externalSku ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                          {mapping.lastSyncAt
                            ? new Date(mapping.lastSyncAt).toLocaleString(
                                "es-CO",
                                { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
                              )
                            : "Nunca"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteMapping(mapping.id)}
                            disabled={deleteMapping.isPending}
                            className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title="Eliminar mapeo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sync Logs Tab */}
        {activeTab === "logs" && (
          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            {!syncLogs?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Sin logs de sincronización
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Los logs aparecerán después de ejecutar una sincronización.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Dirección
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {syncLogs.map((log) => {
                      const syncBadge = SYNC_STATUS_BADGE[log.status];
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                        >
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium capitalize text-neutral-900 dark:text-white">
                            {log.entityType === "product"
                              ? "Productos"
                              : log.entityType === "order"
                                ? "Pedidos"
                                : "Inventario"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                            {log.direction === "INBOUND"
                              ? "Entrada"
                              : log.direction === "OUTBOUND"
                                ? "Salida"
                                : "Bidireccional"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                syncBadge.bg,
                                syncBadge.text,
                              )}
                            >
                              {syncBadge.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-neutral-900 dark:text-white">
                            <span className="text-green-600">
                              {log.processedItems}
                            </span>
                            {log.failedItems > 0 && (
                              <span className="text-red-600">
                                {" "}
                                / {log.failedItems} err
                              </span>
                            )}
                            <span className="text-neutral-400">
                              {" "}
                              / {log.totalItems}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                            {new Date(log.startedAt).toLocaleString("es-CO", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </PageSection>
    </PageWrapper>
  );
}
