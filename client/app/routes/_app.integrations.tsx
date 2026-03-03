import { useState, useCallback } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  Plug,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Trash2,
  Wifi,
} from "lucide-react";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  useIntegrations,
  useCreateIntegration,
  useDeleteIntegration,
  useVerifyConnection,
  useSyncAll,
} from "~/hooks/useIntegrations";
import type {
  IntegrationPlatform,
  IntegrationStatus,
  CreateIntegrationDto,
} from "~/types/integration";
import { PLATFORM_INFO } from "~/types/integration";
import { cn } from "~/lib/utils";

/**
 * Integrations list page — manage e-commerce platform connections.
 *
 * vercel-react-best-practices applied:
 * - rerender-functional-setstate: functional setState for form fields
 * - bundle-barrel-imports: direct imports only
 */

const STATUS_STYLES: Record<
  IntegrationStatus,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  CONNECTED: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    label: "Conectado",
  },
  PENDING: {
    icon: Clock,
    color: "text-yellow-600 dark:text-yellow-400",
    label: "Pendiente",
  },
  DISCONNECTED: {
    icon: XCircle,
    color: "text-neutral-500",
    label: "Desconectado",
  },
  ERROR: {
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    label: "Error",
  },
};

export default function IntegrationsPage() {
  const { data: integrations, isLoading } = useIntegrations();
  const createIntegration = useCreateIntegration();
  const deleteIntegration = useDeleteIntegration();
  const verifyConnection = useVerifyConnection();
  const syncAll = useSyncAll();

  const [showForm, setShowForm] = useState(false);
  const [formPlatform, setFormPlatform] =
    useState<IntegrationPlatform>("SHOPIFY");
  const [formName, setFormName] = useState("");
  const [formShopUrl, setFormShopUrl] = useState("");
  const [formAccessToken, setFormAccessToken] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formName.trim()) return;

      const platformInfo = PLATFORM_INFO[formPlatform];
      const dto: CreateIntegrationDto = {
        platform: formPlatform,
        name: formName,
        ...(platformInfo.requiresShopUrl && formShopUrl
          ? { shopUrl: formShopUrl }
          : {}),
        ...(formAccessToken ? { accessToken: formAccessToken } : {}),
      };

      createIntegration.mutate(dto, {
        onSuccess: () => {
          setShowForm(false);
          setFormName("");
          setFormShopUrl("");
          setFormAccessToken("");
        },
      });
    },
    [formPlatform, formName, formShopUrl, formAccessToken, createIntegration],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm("¿Seguro que deseas eliminar esta integración?")) {
        deleteIntegration.mutate(id);
      }
    },
    [deleteIntegration],
  );

  const platformInfo = PLATFORM_INFO[formPlatform];

  return (
    <PageWrapper
      title="Integraciones"
      description="Conecta tus plataformas de e-commerce para sincronizar productos, pedidos e inventario"
      actions={
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nueva Integración
        </button>
      }
    >
      {/* Quick Add Form */}
      {showForm && (
        <PageSection>
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
              Conectar Plataforma
            </h3>

            {/* Platform selector */}
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(
                Object.keys(PLATFORM_INFO) as IntegrationPlatform[]
              ).map((p) => {
                const info = PLATFORM_INFO[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormPlatform(p)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                      formPlatform === p
                        ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-950/20"
                        : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600",
                    )}
                  >
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-white">
                        {info.name}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {info.description.substring(0, 50)}...
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={`Mi Tienda ${platformInfo.name}`}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                  required
                />
              </div>

              {platformInfo.requiresShopUrl && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    URL de la tienda
                  </label>
                  <input
                    type="url"
                    value={formShopUrl}
                    onChange={(e) => setFormShopUrl(e.target.value)}
                    placeholder={
                      formPlatform === "SHOPIFY"
                        ? "https://mitienda.myshopify.com"
                        : "https://mitienda.com"
                    }
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              )}

              <div className={platformInfo.requiresShopUrl ? "sm:col-span-2" : ""}>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Access Token (opcional)
                </label>
                <input
                  type="password"
                  value={formAccessToken}
                  onChange={(e) => setFormAccessToken(e.target.value)}
                  placeholder="Token de acceso de la plataforma"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createIntegration.isPending}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {createIntegration.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Conectar
              </button>
            </div>
          </motion.form>
        </PageSection>
      )}

      {/* Integrations List */}
      <PageSection>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : !integrations?.length ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white py-12 text-center shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            <Plug className="mb-3 h-12 w-12 text-neutral-300 dark:text-neutral-600" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
              Sin integraciones
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Conecta tu primera plataforma de e-commerce para empezar a
              sincronizar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => {
              const pInfo = PLATFORM_INFO[integration.platform];
              const statusInfo = STATUS_STYLES[integration.status];
              const StatusIcon = statusInfo.icon;

              return (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
                >
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pInfo.icon}</span>
                      <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">
                          {integration.name}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          {pInfo.name}
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium",
                        statusInfo.color,
                      )}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusInfo.label}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-800">
                      <div className="text-xs text-neutral-500">Mapeos</div>
                      <div className="font-semibold text-neutral-900 dark:text-white">
                        {integration._count?.productMappings ?? 0}
                      </div>
                    </div>
                    <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-800">
                      <div className="text-xs text-neutral-500">
                        Ultima sync
                      </div>
                      <div className="text-sm font-medium text-neutral-900 dark:text-white">
                        {integration.lastSyncAt
                          ? new Date(
                              integration.lastSyncAt,
                            ).toLocaleDateString("es-CO", {
                              month: "short",
                              day: "numeric",
                            })
                          : "Nunca"}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => verifyConnection.mutate(integration.id)}
                      disabled={verifyConnection.isPending}
                      className="flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      title="Verificar conexión"
                    >
                      <Wifi className="h-3 w-3" />
                      Verificar
                    </button>
                    <button
                      type="button"
                      onClick={() => syncAll.mutate(integration.id)}
                      disabled={
                        syncAll.isPending ||
                        integration.status !== "CONNECTED"
                      }
                      className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                      title="Sincronizar todo"
                    >
                      <RefreshCw
                        className={cn(
                          "h-3 w-3",
                          syncAll.isPending && "animate-spin",
                        )}
                      />
                      Sync
                    </button>
                    <Link
                      to={`/integrations/${integration.id}`}
                      className="flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Detalles
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(integration.id)}
                      disabled={deleteIntegration.isPending}
                      className="ml-auto rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </PageSection>
    </PageWrapper>
  );
}
