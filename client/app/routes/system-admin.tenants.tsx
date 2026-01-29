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
  Calendar,
  Ban,
  Play,
} from "lucide-react";
import {
  useSystemAdminTenants,
  useSystemAdminPlanLimits,
} from "~/hooks/useSystemAdmin";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import type {
  TenantStatus,
  SubscriptionPlan,
  SubscriptionPeriod,
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

// Plan badge component - updated with new plans
function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) {
    return (
      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
        Sin plan
      </span>
    );
  }

  const planConfig: Record<string, { bg: string; text: string; label: string }> =
    {
      EMPRENDEDOR: {
        bg: "bg-slate-100 dark:bg-slate-900/20",
        text: "text-slate-700 dark:text-slate-400",
        label: "Emprendedor",
      },
      PYME: {
        bg: "bg-blue-100 dark:bg-blue-900/20",
        text: "text-blue-700 dark:text-blue-400",
        label: "PYME",
      },
      PRO: {
        bg: "bg-purple-100 dark:bg-purple-900/20",
        text: "text-purple-700 dark:text-purple-400",
        label: "PRO",
      },
      PLUS: {
        bg: "bg-amber-100 dark:bg-amber-900/20",
        text: "text-amber-700 dark:text-amber-400",
        label: "PLUS",
      },
    };

  const config = planConfig[plan] || {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-700 dark:text-neutral-400",
    label: plan,
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

// Activate plan dialog
function ActivatePlanDialog({
  isOpen,
  tenantName,
  currentPlan,
  onConfirm,
  onCancel,
  isLoading,
}: {
  isOpen: boolean;
  tenantName: string;
  currentPlan: string | null;
  onConfirm: (plan: SubscriptionPlan, period: SubscriptionPeriod) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  );
  const [selectedPeriod, setSelectedPeriod] =
    useState<SubscriptionPeriod>("MONTHLY");

  const { data: planLimits } = useSystemAdminPlanLimits();

  if (!isOpen) return null;

  const plans: {
    value: SubscriptionPlan;
    name: string;
    description: string;
    priceMonthly: string;
    priceQuarterly: string;
    priceAnnual: string;
  }[] = [
    {
      value: "EMPRENDEDOR",
      name: "Emprendedor",
      description: "1 usuario, 1 bodega, 100 productos",
      priceMonthly: "$69,900/mes",
      priceQuarterly: "$188,730/trim",
      priceAnnual: "$699,000/ano",
    },
    {
      value: "PYME",
      name: "PYME",
      description: "2 usuarios, 2 bodegas, 500 productos",
      priceMonthly: "$149,900/mes",
      priceQuarterly: "$404,730/trim",
      priceAnnual: "$1,498,800/ano",
    },
    {
      value: "PRO",
      name: "PRO",
      description: "3 usuarios, 10 bodegas, 2000 productos",
      priceMonthly: "$219,900/mes",
      priceQuarterly: "$593,730/trim",
      priceAnnual: "$2,198,800/ano",
    },
    {
      value: "PLUS",
      name: "PLUS",
      description: "8 usuarios, 100 bodegas, productos ilimitados",
      priceMonthly: "$279,900/mes",
      priceQuarterly: "$755,730/trim",
      priceAnnual: "$2,798,800/ano",
    },
  ];

  const periods: { value: SubscriptionPeriod; label: string; days: number }[] =
    [
      { value: "MONTHLY", label: "Mensual (30 dias)", days: 30 },
      { value: "QUARTERLY", label: "Trimestral (90 dias)", days: 90 },
      { value: "ANNUAL", label: "Anual (365 dias)", days: 365 },
    ];

  const getPrice = (
    plan: (typeof plans)[0],
    period: SubscriptionPeriod
  ): string => {
    switch (period) {
      case "MONTHLY":
        return plan.priceMonthly;
      case "QUARTERLY":
        return plan.priceQuarterly;
      case "ANNUAL":
        return plan.priceAnnual;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Activar Plan - {tenantName}
        </h3>
        {currentPlan && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Plan actual: <PlanBadge plan={currentPlan} />
          </p>
        )}

        {/* Period Selection */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Periodo de suscripcion
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {periods.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`rounded-lg border p-3 text-center transition-colors ${
                  selectedPeriod === period.value
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"
                }`}
              >
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {period.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Plan Selection */}
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Selecciona un plan
          </h4>
          {plans.map((plan) => (
            <button
              key={plan.value}
              onClick={() => setSelectedPlan(plan.value)}
              disabled={plan.value === currentPlan}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                plan.value === currentPlan
                  ? "cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-50 dark:border-neutral-700 dark:bg-neutral-800"
                  : selectedPlan === plan.value
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10"
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
                    {getPrice(plan, selectedPeriod)}
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
            className="bg-primary-600 hover:bg-primary-700"
            onClick={() =>
              selectedPlan && onConfirm(selectedPlan, selectedPeriod)
            }
            disabled={isLoading || !selectedPlan}
            isLoading={isLoading}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Activar Plan
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// Suspend plan dialog
function SuspendPlanDialog({
  isOpen,
  tenantName,
  onConfirm,
  onCancel,
  isLoading,
}: {
  isOpen: boolean;
  tenantName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Suspender Plan - {tenantName}
        </h3>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Esta accion suspende inmediatamente el plan del tenant. El tenant no
          podra acceder a la plataforma hasta que se reactive.
        </p>

        <div className="mt-4">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Razon de la suspension *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Violacion de terminos de servicio..."
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            rows={3}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => onConfirm(reason)}
            disabled={isLoading || !reason.trim()}
            isLoading={isLoading}
          >
            <Ban className="h-4 w-4 mr-2" />
            Suspender
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SystemAdminTenantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || ""
  );
  const [activatePlanDialog, setActivatePlanDialog] = useState<{
    tenantId: string;
    tenantName: string;
    currentPlan: string | null;
  } | null>(null);
  const [suspendPlanDialog, setSuspendPlanDialog] = useState<{
    tenantId: string;
    tenantName: string;
  } | null>(null);

  // Get query params
  const page = parseInt(searchParams.get("page") || "1", 10);
  const status = searchParams.get("status") as TenantStatus | undefined;
  const plan = searchParams.get("plan") as SubscriptionPlan | undefined;
  const search = searchParams.get("search") || undefined;

  const {
    tenants,
    meta,
    isLoading,
    error,
    activatePlan,
    isActivatingPlan,
    suspendPlan,
    isSuspendingPlan,
    reactivatePlan,
    isReactivatingPlan,
  } = useSystemAdminTenants({ page, status, plan, search, limit: 20 });

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

  // Handle activate plan
  const handleActivatePlan = (
    newPlan: SubscriptionPlan,
    period: SubscriptionPeriod
  ) => {
    if (activatePlanDialog) {
      activatePlan({
        tenantId: activatePlanDialog.tenantId,
        plan: newPlan,
        period,
      });
      setActivatePlanDialog(null);
    }
  };

  // Handle suspend plan
  const handleSuspendPlan = (reason: string) => {
    if (suspendPlanDialog) {
      suspendPlan({ tenantId: suspendPlanDialog.tenantId, reason });
      setSuspendPlanDialog(null);
    }
  };

  // Handle reactivate plan
  const handleReactivatePlan = (tenantId: string) => {
    reactivatePlan(tenantId);
  };

  // Status filter options
  const statusOptions: { value: TenantStatus | ""; label: string }[] = [
    { value: "", label: "Todos los estados" },
    { value: "TRIAL", label: "Prueba" },
    { value: "ACTIVE", label: "Activo" },
    { value: "SUSPENDED", label: "Suspendido" },
    { value: "INACTIVE", label: "Inactivo" },
  ];

  // Plan filter options - updated with new plans
  const planOptions: { value: SubscriptionPlan | ""; label: string }[] = [
    { value: "", label: "Todos los planes" },
    { value: "EMPRENDEDOR", label: "Emprendedor" },
    { value: "PYME", label: "PYME" },
    { value: "PRO", label: "PRO" },
    { value: "PLUS", label: "PLUS" },
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
              Plan: {planOptions.find((o) => o.value === plan)?.label}
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
                        {/* Activate/Change Plan Button */}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setActivatePlanDialog({
                              tenantId: tenant.id,
                              tenantName: tenant.name,
                              currentPlan: tenant.plan,
                            })
                          }
                          disabled={tenant.status === "SUSPENDED"}
                        >
                          <Calendar className="h-4 w-4" />
                          <span className="hidden sm:inline ml-1">
                            {tenant.plan ? "Cambiar" : "Activar"} Plan
                          </span>
                        </Button>

                        {/* Suspend/Reactivate Button */}
                        {tenant.status === "SUSPENDED" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleReactivatePlan(tenant.id)}
                            disabled={isReactivatingPlan}
                          >
                            <Play className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">
                              Reactivar
                            </span>
                          </Button>
                        ) : tenant.plan ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-red-600 hover:text-red-700"
                            onClick={() =>
                              setSuspendPlanDialog({
                                tenantId: tenant.id,
                                tenantName: tenant.name,
                              })
                            }
                          >
                            <Ban className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">
                              Suspender
                            </span>
                          </Button>
                        ) : null}
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

      {/* Activate Plan Dialog */}
      <ActivatePlanDialog
        isOpen={!!activatePlanDialog}
        tenantName={activatePlanDialog?.tenantName || ""}
        currentPlan={activatePlanDialog?.currentPlan || null}
        onConfirm={handleActivatePlan}
        onCancel={() => setActivatePlanDialog(null)}
        isLoading={isActivatingPlan}
      />

      {/* Suspend Plan Dialog */}
      <SuspendPlanDialog
        isOpen={!!suspendPlanDialog}
        tenantName={suspendPlanDialog?.tenantName || ""}
        onConfirm={handleSuspendPlan}
        onCancel={() => setSuspendPlanDialog(null)}
        isLoading={isSuspendingPlan}
      />
    </div>
  );
}
