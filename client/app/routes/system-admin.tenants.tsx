import { useState } from "react";
import { useSearchParams } from "react-router";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Building2,
  Users,
  AlertCircle,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useSystemAdminTenants } from "~/hooks/useSystemAdmin";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import type {
  TenantStatus,
  SubscriptionPlan,
} from "~/services/system-admin.service";

export function meta() {
  return [
    { title: "Tenants - System Admin - StockFlow" },
    { name: "description", content: "Gestion de tenants del sistema" },
  ];
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    TRIAL: {
      bg: "bg-blue-100 dark:bg-blue-900/20",
      text: "text-blue-700 dark:text-blue-400",
      label: "Prueba",
    },
    ACTIVE: {
      bg: "bg-green-100 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-400",
      label: "Activo",
    },
    SUSPENDED: {
      bg: "bg-red-100 dark:bg-red-900/20",
      text: "text-red-700 dark:text-red-400",
      label: "Suspendido",
    },
    INACTIVE: {
      bg: "bg-neutral-100 dark:bg-neutral-800",
      text: "text-neutral-700 dark:text-neutral-400",
      label: "Inactivo",
    },
  };

  const config = statusConfig[status] || statusConfig.INACTIVE;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

// Plan badge component
function PlanBadge({ plan }: { plan: string }) {
  const planConfig: Record<string, { bg: string; text: string }> = {
    FREE: {
      bg: "bg-neutral-100 dark:bg-neutral-800",
      text: "text-neutral-700 dark:text-neutral-400",
    },
    BASIC: {
      bg: "bg-blue-100 dark:bg-blue-900/20",
      text: "text-blue-700 dark:text-blue-400",
    },
    PRO: {
      bg: "bg-purple-100 dark:bg-purple-900/20",
      text: "text-purple-700 dark:text-purple-400",
    },
    ENTERPRISE: {
      bg: "bg-amber-100 dark:bg-amber-900/20",
      text: "text-amber-700 dark:text-amber-400",
    },
  };

  const config = planConfig[plan] || planConfig.FREE;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      {plan}
    </span>
  );
}

// Change plan dialog
function ChangePlanDialog({
  isOpen,
  tenantName,
  currentPlan,
  onConfirm,
  onCancel,
  isLoading,
}: {
  isOpen: boolean;
  tenantName: string;
  currentPlan: string;
  onConfirm: (plan: SubscriptionPlan) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null,
  );

  if (!isOpen) return null;

  const plans: {
    value: SubscriptionPlan;
    name: string;
    description: string;
    price: string;
  }[] = [
    {
      value: "FREE",
      name: "Free",
      description: "2 usuarios, 50 productos",
      price: "Gratis",
    },
    {
      value: "BASIC",
      name: "Basic",
      description: "5 usuarios, 500 productos",
      price: "$29/mes",
    },
    {
      value: "PRO",
      name: "Pro",
      description: "20 usuarios, 5000 productos",
      price: "$79/mes",
    },
    {
      value: "ENTERPRISE",
      name: "Enterprise",
      description: "Usuarios ilimitados",
      price: "$199/mes",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Cambiar Plan - {tenantName}
        </h3>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Plan actual: <PlanBadge plan={currentPlan} />
        </p>

        <div className="mt-6 space-y-3">
          {plans.map((plan) => (
            <button
              key={plan.value}
              onClick={() => setSelectedPlan(plan.value)}
              disabled={plan.value === currentPlan}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                plan.value === currentPlan
                  ? "cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-50 dark:border-neutral-700 dark:bg-neutral-800"
                  : selectedPlan === plan.value
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {plan.name}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {plan.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    {plan.price}
                  </p>
                  {plan.value === currentPlan && (
                    <span className="text-xs text-neutral-500">Actual</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700"
            onClick={() => selectedPlan && onConfirm(selectedPlan)}
            disabled={isLoading || !selectedPlan}
            isLoading={isLoading}
          >
            Cambiar Plan
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SystemAdminTenantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || "",
  );
  const [changePlanDialog, setChangePlanDialog] = useState<{
    tenantId: string;
    tenantName: string;
    currentPlan: string;
  } | null>(null);

  // Get query params
  const page = parseInt(searchParams.get("page") || "1", 10);
  const status = searchParams.get("status") as TenantStatus | undefined;
  const plan = searchParams.get("plan") as SubscriptionPlan | undefined;
  const search = searchParams.get("search") || undefined;

  const { tenants, meta, isLoading, error, changePlan, isChangingPlan } =
    useSystemAdminTenants({ page, status, plan, search, limit: 20 });

  // Update search params
  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    // Reset to page 1 when filters change (except when changing page)
    if (!("page" in updates)) {
      newParams.delete("page");
    }
    setSearchParams(newParams);
  };

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput || undefined });
  };

  // Handle change plan
  const handleChangePlan = (newPlan: SubscriptionPlan) => {
    if (changePlanDialog) {
      changePlan({ tenantId: changePlanDialog.tenantId, plan: newPlan });
      setChangePlanDialog(null);
    }
  };

  // Status filter options
  const statusOptions: { value: TenantStatus | ""; label: string }[] = [
    { value: "", label: "Todos los estados" },
    { value: "TRIAL", label: "Prueba" },
    { value: "ACTIVE", label: "Activo" },
    { value: "SUSPENDED", label: "Suspendido" },
    { value: "INACTIVE", label: "Inactivo" },
  ];

  // Plan filter options
  const planOptions: { value: SubscriptionPlan | ""; label: string }[] = [
    { value: "", label: "Todos los planes" },
    { value: "FREE", label: "Free" },
    { value: "BASIC", label: "Basic" },
    { value: "PRO", label: "Pro" },
    { value: "ENTERPRISE", label: "Enterprise" },
  ];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-error-500 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Error al cargar tenants
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          No se pudieron cargar los datos de tenants
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

        <div className="flex gap-2">
          <select
            value={status || ""}
            onChange={(e) =>
              updateParams({ status: e.target.value || undefined })
            }
            className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={plan || ""}
            onChange={(e) =>
              updateParams({ plan: e.target.value || undefined })
            }
            className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            {planOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filters */}
      {(status || plan || search) && (
        <div className="flex flex-wrap gap-2">
          {status && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              Estado: {statusOptions.find((o) => o.value === status)?.label}
              <button onClick={() => updateParams({ status: undefined })}>
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
          {plan && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
              Plan: {plan}
              <button onClick={() => updateParams({ plan: undefined })}>
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
          {search && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              Busqueda: {search}
              <button
                onClick={() => {
                  setSearchInput("");
                  updateParams({ search: undefined });
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Tenants Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Organizacion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Usuarios
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Registro
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700" />
                        <div>
                          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          <div className="mt-1 h-3 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Filter className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                    <p className="text-neutral-600 dark:text-neutral-400">
                      No se encontraron tenants con los filtros seleccionados
                    </p>
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/20">
                          <Building2 className="h-5 w-5 text-primary-700 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {tenant.name}
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {tenant.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <PlanBadge plan={tenant.plan} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-neutral-900 dark:text-white">
                        <Users className="h-4 w-4 text-neutral-400" />
                        {tenant.userCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                      {new Date(tenant.createdAt).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setChangePlanDialog({
                              tenantId: tenant.id,
                              tenantName: tenant.name,
                              currentPlan: tenant.plan,
                            })
                          }
                        >
                          <ArrowUpRight className="h-4 w-4" />
                          <span className="hidden sm:inline ml-1">
                            Cambiar Plan
                          </span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Mostrando {(meta.page - 1) * meta.limit + 1} a{" "}
              {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}{" "}
              tenants
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!meta.hasPreviousPage}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!meta.hasNextPage}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Change Plan Dialog */}
      <ChangePlanDialog
        isOpen={!!changePlanDialog}
        tenantName={changePlanDialog?.tenantName || ""}
        currentPlan={changePlanDialog?.currentPlan || ""}
        onConfirm={handleChangePlan}
        onCancel={() => setChangePlanDialog(null)}
        isLoading={isChangingPlan}
      />
    </div>
  );
}
