import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
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
import {
  pageVariants,
  pageItemVariants,
  tableRowVariants,
  modalOverlayVariants,
  modalContentVariants,
} from "~/lib/animations";
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

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { classes: string; label: string }> = {
    TRIAL: {
      classes: "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400",
      label: "Prueba",
    },
    ACTIVE: {
      classes: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
      label: "Activo",
    },
    SUSPENDED: {
      classes: "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
      label: "Suspendido",
    },
    INACTIVE: {
      classes: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
      label: "Inactivo",
    },
  };
  const c = config[status] || config.INACTIVE;
  return (
    <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium ${c.classes}`}>
      {c.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) {
    return (
      <span className="inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
        Sin plan
      </span>
    );
  }
  const config: Record<string, string> = {
    EMPRENDEDOR: "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400",
    PYME: "bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400",
    PRO: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
    PLUS: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400",
  };
  return (
    <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium ${config[plan] || "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"}`}>
      {plan}
    </span>
  );
}

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
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<SubscriptionPeriod>("MONTHLY");
  useSystemAdminPlanLimits();

  if (!isOpen) return null;

  const plans: { value: SubscriptionPlan; name: string; desc: string; price: Record<SubscriptionPeriod, string> }[] = [
    { value: "EMPRENDEDOR", name: "Emprendedor", desc: "1 usuario, 1 bodega, 100 productos", price: { MONTHLY: "$69,900/mes", QUARTERLY: "$188,730/trim", ANNUAL: "$699,000/año" } },
    { value: "PYME", name: "PYME", desc: "2 usuarios, 2 bodegas, 500 productos", price: { MONTHLY: "$149,900/mes", QUARTERLY: "$404,730/trim", ANNUAL: "$1,498,800/año" } },
    { value: "PRO", name: "PRO", desc: "3 usuarios, 10 bodegas, 2000 productos", price: { MONTHLY: "$219,900/mes", QUARTERLY: "$593,730/trim", ANNUAL: "$2,198,800/año" } },
    { value: "PLUS", name: "PLUS", desc: "8 usuarios, 100 bodegas, ilimitados", price: { MONTHLY: "$279,900/mes", QUARTERLY: "$755,730/trim", ANNUAL: "$2,798,800/año" } },
  ];

  const periods: { value: SubscriptionPeriod; label: string }[] = [
    { value: "MONTHLY", label: "Mensual" },
    { value: "QUARTERLY", label: "Trimestral" },
    { value: "ANNUAL", label: "Anual" },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          variants={modalOverlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onCancel}
        />
        <motion.div
          variants={modalContentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        >
          <h3 className="font-display text-lg font-semibold text-neutral-900 dark:text-white">
            Activar Plan — {tenantName}
          </h3>
          {currentPlan && (
            <p className="mt-1 text-sm text-neutral-500">
              Plan actual: <PlanBadge plan={currentPlan} />
            </p>
          )}

          {/* Period */}
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2">Periodo</p>
            <div className="flex gap-2">
              {periods.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setSelectedPeriod(p.value)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    selectedPeriod === p.value
                      ? "border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plans */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Plan</p>
            {plans.map((plan) => (
              <button
                key={plan.value}
                onClick={() => setSelectedPlan(plan.value)}
                disabled={plan.value === currentPlan}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  plan.value === currentPlan
                    ? "cursor-not-allowed border-neutral-200 opacity-40 dark:border-neutral-700"
                    : selectedPlan === plan.value
                      ? "border-primary-500 bg-primary-50/50 dark:bg-primary-500/5"
                      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">{plan.name}</p>
                    <p className="text-xs text-neutral-500">{plan.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">{plan.price[selectedPeriod]}</p>
                    {plan.value === currentPlan && <span className="text-[11px] text-neutral-400">Actual</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => selectedPlan && onConfirm(selectedPlan, selectedPeriod)}
              disabled={isLoading || !selectedPlan}
              isLoading={isLoading}
              leftIcon={<Calendar className="h-4 w-4" />}
            >
              Activar Plan
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          variants={modalOverlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onCancel}
        />
        <motion.div
          variants={modalContentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        >
          <h3 className="font-display text-lg font-semibold text-neutral-900 dark:text-white">
            Suspender Plan — {tenantName}
          </h3>
          <p className="mt-2 text-sm text-neutral-500">
            El tenant no podra acceder hasta que se reactive.
          </p>
          <div className="mt-4">
            <label className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Razon *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Violacion de terminos..."
              className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              rows={3}
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onConfirm(reason)}
              disabled={isLoading || !reason.trim()}
              isLoading={isLoading}
              leftIcon={<Ban className="h-4 w-4" />}
            >
              Suspender
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const statusOptions: { value: TenantStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "TRIAL", label: "Prueba" },
  { value: "ACTIVE", label: "Activo" },
  { value: "SUSPENDED", label: "Suspendido" },
  { value: "INACTIVE", label: "Inactivo" },
];

const planOptions: { value: SubscriptionPlan | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "EMPRENDEDOR", label: "Emprendedor" },
  { value: "PYME", label: "PYME" },
  { value: "PRO", label: "PRO" },
  { value: "PLUS", label: "PLUS" },
];

export default function SystemAdminTenantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [activatePlanDialog, setActivatePlanDialog] = useState<{ tenantId: string; tenantName: string; currentPlan: string | null } | null>(null);
  const [suspendPlanDialog, setSuspendPlanDialog] = useState<{ tenantId: string; tenantName: string } | null>(null);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const status = searchParams.get("status") as TenantStatus | undefined;
  const plan = searchParams.get("plan") as SubscriptionPlan | undefined;
  const search = searchParams.get("search") || undefined;

  const {
    tenants, meta, isLoading, error,
    activatePlan, isActivatingPlan,
    suspendPlan, isSuspendingPlan,
    reactivatePlan, isReactivatingPlan,
  } = useSystemAdminTenants({ page, status, plan, search, limit: 20 });

  const updateParams = useCallback((updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") newParams.delete(key);
      else newParams.set(key, value);
    });
    if (!("page" in updates)) newParams.delete("page");
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get("search") || "";
      if (searchInput !== current) updateParams({ search: searchInput || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, searchParams, updateParams]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 dark:bg-error-500/10">
          <AlertCircle className="h-7 w-7 text-error-500" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">Error al cargar tenants</h2>
        <p className="mt-1 text-sm text-neutral-500">No se pudieron cargar los datos</p>
      </div>
    );
  }

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-5">
      {/* Header */}
      <motion.div variants={pageItemVariants}>
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">Tenants</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {meta ? `${meta.total} organizaciones en total` : "Gestion de organizaciones"}
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={pageItemVariants} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-4 text-sm transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500"
          />
        </div>
        <div className="flex gap-2">
          <select value={status || ""} onChange={(e) => updateParams({ status: e.target.value || undefined })}
            className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={plan || ""} onChange={(e) => updateParams({ plan: e.target.value || undefined })}
            className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            {planOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </motion.div>

      {/* Filter pills */}
      {(status || plan || search) && (
        <motion.div variants={pageItemVariants} className="flex flex-wrap gap-2">
          {status && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              {statusOptions.find((o) => o.value === status)?.label}
              <button onClick={() => updateParams({ status: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          {plan && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-600 dark:bg-accent-500/10 dark:text-accent-400">
              {plan}
              <button onClick={() => updateParams({ plan: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          {search && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              "{search}"
              <button onClick={() => { setSearchInput(""); updateParams({ search: undefined }); }}><X className="h-3 w-3" /></button>
            </span>
          )}
        </motion.div>
      )}

      {/* Table */}
      <motion.div variants={pageItemVariants} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-400">Organizacion</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-400">Plan</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-400">Estado</th>
                <th className="hidden px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-400 md:table-cell">Usuarios</th>
                <th className="hidden px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-400 lg:table-cell">Registro</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-neutral-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="h-9 w-9 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700" /><div><div className="h-3.5 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /><div className="mt-1.5 h-3 w-36 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /></div></div></td>
                      <td className="px-5 py-3.5"><div className="h-5 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /></td>
                      <td className="px-5 py-3.5"><div className="h-5 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /></td>
                      <td className="hidden px-5 py-3.5 md:table-cell"><div className="h-3.5 w-8 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /></td>
                      <td className="hidden px-5 py-3.5 lg:table-cell"><div className="h-3.5 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /></td>
                      <td className="px-5 py-3.5"><div className="ml-auto h-8 w-24 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700" /></td>
                    </tr>
                  ))
                : tenants.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                          <Building2 className="h-6 w-6 text-neutral-400" />
                        </div>
                        <p className="mt-3 text-sm text-neutral-500">No se encontraron tenants</p>
                      </td>
                    </tr>
                  )
                  : tenants.map((tenant, i) => (
                    <motion.tr
                      key={tenant.id}
                      custom={i}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10">
                            <Building2 className="h-4 w-4 text-primary-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{tenant.name}</p>
                            <p className="truncate text-xs text-neutral-500">{tenant.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><PlanBadge plan={tenant.plan} /></td>
                      <td className="px-5 py-3.5"><StatusBadge status={tenant.status} /></td>
                      <td className="hidden px-5 py-3.5 md:table-cell">
                        <div className="flex items-center gap-1 text-sm text-neutral-700 dark:text-neutral-300">
                          <Users className="h-3.5 w-3.5 text-neutral-400" />
                          {tenant.userCount}
                        </div>
                      </td>
                      <td className="hidden px-5 py-3.5 text-xs text-neutral-400 lg:table-cell">
                        {new Date(tenant.createdAt).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="icon-xs"
                            variant="soft-primary"
                            title={tenant.plan ? "Cambiar Plan" : "Activar Plan"}
                            onClick={() => setActivatePlanDialog({ tenantId: tenant.id, tenantName: tenant.name, currentPlan: tenant.plan })}
                            disabled={tenant.status === "SUSPENDED"}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                          </Button>
                          {tenant.status === "SUSPENDED" ? (
                            <Button
                              size="icon-xs"
                              variant="soft-success"
                              title="Reactivar"
                              onClick={() => reactivatePlan(tenant.id)}
                              disabled={isReactivatingPlan}
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          ) : tenant.plan ? (
                            <Button
                              size="icon-xs"
                              variant="soft-danger"
                              title="Suspender"
                              onClick={() => setSuspendPlanDialog({ tenantId: tenant.id, tenantName: tenant.name })}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
            <p className="text-xs text-neutral-400">
              {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
            </p>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="icon-xs" disabled={!meta.hasPreviousPage} onClick={() => updateParams({ page: String(page - 1) })}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-xs" disabled={!meta.hasNextPage} onClick={() => updateParams({ page: String(page + 1) })}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      <ActivatePlanDialog
        isOpen={!!activatePlanDialog}
        tenantName={activatePlanDialog?.tenantName || ""}
        currentPlan={activatePlanDialog?.currentPlan || null}
        onConfirm={(p, per) => { if (activatePlanDialog) { activatePlan({ tenantId: activatePlanDialog.tenantId, plan: p, period: per }); setActivatePlanDialog(null); } }}
        onCancel={() => setActivatePlanDialog(null)}
        isLoading={isActivatingPlan}
      />

      <SuspendPlanDialog
        isOpen={!!suspendPlanDialog}
        tenantName={suspendPlanDialog?.tenantName || ""}
        onConfirm={(reason) => { if (suspendPlanDialog) { suspendPlan({ tenantId: suspendPlanDialog.tenantId, reason }); setSuspendPlanDialog(null); } }}
        onCancel={() => setSuspendPlanDialog(null)}
        isLoading={isSuspendingPlan}
      />
    </motion.div>
  );
}
