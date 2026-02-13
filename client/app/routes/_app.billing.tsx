import { useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Check,
  Star,
  Users,
  Warehouse,
  Package,
  FileText,
  Calendar,
  CreditCard,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Clock,
  Receipt,
} from "lucide-react";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { cn, formatCurrency, formatDate } from "~/lib/utils";
import {
  useSubscriptionStatus,
  usePlans,
  useBillingHistory,
  useCheckoutConfig,
  useVerifyPayment,
} from "~/hooks/useBilling";
import { openWompiCheckout } from "~/lib/wompi";
import { toast } from "~/components/ui/Toast";
import type { Route } from "./+types/_app.billing";
import type {
  SubscriptionPlan,
  SubscriptionPeriod,
  PlanInfo,
} from "~/types/billing";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Suscripcion y Facturacion - StockFlow" },
    {
      name: "description",
      content: "Gestiona tu suscripcion y facturacion en StockFlow",
    },
  ];
};

// Plan display configuration
const planConfig: Record<
  SubscriptionPlan,
  {
    gradient: string;
    iconBg: string;
    border: string;
    badgeVariant: "default" | "primary" | "warning" | "gradient";
  }
> = {
  EMPRENDEDOR: {
    gradient: "from-neutral-500 to-neutral-600",
    iconBg: "bg-neutral-100 dark:bg-neutral-800",
    border: "border-neutral-200 dark:border-neutral-700",
    badgeVariant: "default",
  },
  PYME: {
    gradient: "from-primary-500 to-primary-600",
    iconBg: "bg-primary-100 dark:bg-primary-900/30",
    border: "border-primary-200 dark:border-primary-700",
    badgeVariant: "primary",
  },
  PRO: {
    gradient: "from-warning-500 to-warning-600",
    iconBg: "bg-warning-100 dark:bg-warning-900/30",
    border: "border-warning-200 dark:border-warning-700",
    badgeVariant: "warning",
  },
  PLUS: {
    gradient: "from-accent-500 to-accent-600",
    iconBg: "bg-accent-100 dark:bg-accent-900/30",
    border: "border-accent-200 dark:border-accent-700",
    badgeVariant: "gradient",
  },
};

// Period labels for the segmented control
const periodLabels: Record<SubscriptionPeriod, string> = {
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  ANNUAL: "Anual",
};

const periodDiscountLabels: Record<SubscriptionPeriod, string | null> = {
  MONTHLY: null,
  QUARTERLY: "10% dto.",
  ANNUAL: "20% dto.",
};

// Status badge configuration
const statusConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "error" | "default" }
> = {
  ACTIVE: { label: "Activa", variant: "success" },
  EXPIRED: { label: "Expirada", variant: "error" },
  SUSPENDED: { label: "Suspendida", variant: "warning" },
  CANCELLED: { label: "Cancelada", variant: "default" },
};

const billingStatusConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "error" | "default" }
> = {
  APPROVED: { label: "Aprobado", variant: "success" },
  PENDING: { label: "Pendiente", variant: "warning" },
  DECLINED: { label: "Rechazado", variant: "error" },
  VOIDED: { label: "Anulado", variant: "default" },
  ERROR: { label: "Error", variant: "error" },
};

// Format COP price
const formatPriceCOP = (amount: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount);

// Shimmer skeleton
function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-neutral-200 dark:bg-neutral-800 rounded-2xl",
        className,
      )}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/10 animate-shimmer" />
    </div>
  );
}

// Current Plan Card
function CurrentPlanCard() {
  const { data: subscription, isLoading } = useSubscriptionStatus();

  if (isLoading) {
    return <ShimmerSkeleton className="h-44" />;
  }

  const plan = subscription?.plan;
  const status = subscription?.status;
  const daysRemaining = subscription?.daysRemaining;
  const periodType = subscription?.periodType;
  const endDate = subscription?.endDate;
  const config = plan ? planConfig[plan] : planConfig.EMPRENDEDOR;
  const statusCfg = status
    ? statusConfig[status]
    : { label: "Sin plan", variant: "default" as const };

  return (
    <Card variant="elevated" padding="md">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Plan icon */}
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br shrink-0",
            config.gradient,
          )}
        >
          <Crown className="h-8 w-8 text-white" />
        </div>

        {/* Plan info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              Plan {plan || "Sin plan"}
            </h2>
            <Badge variant={statusCfg.variant} dot>
              {statusCfg.label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
            {periodType && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {periodLabels[periodType]}
              </span>
            )}
            {endDate && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Vence: {formatDate(endDate)}
              </span>
            )}
            {daysRemaining !== null && daysRemaining !== undefined && (
              <span
                className={cn(
                  "flex items-center gap-1.5 font-medium",
                  daysRemaining <= 7
                    ? "text-error-600 dark:text-error-400"
                    : daysRemaining <= 30
                      ? "text-warning-600 dark:text-warning-400"
                      : "text-success-600 dark:text-success-400",
                )}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                {daysRemaining} dias restantes
              </span>
            )}
          </div>
        </div>

        {/* Limits summary */}
        {subscription?.limits && (
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <Users className="h-4 w-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {subscription.limits.maxUsers} usuarios
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <Warehouse className="h-4 w-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {subscription.limits.maxWarehouses} bodegas
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Period Selector - Segmented control
function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
}: {
  selectedPeriod: SubscriptionPeriod;
  onPeriodChange: (period: SubscriptionPeriod) => void;
}) {
  const periods: SubscriptionPeriod[] = ["MONTHLY", "QUARTERLY", "ANNUAL"];

  return (
    <div className="flex items-center justify-center">
      <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
        {periods.map((period) => (
          <button
            key={period}
            onClick={() => onPeriodChange(period)}
            className={cn(
              "relative px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              selectedPeriod === period
                ? "bg-white dark:bg-neutral-900 text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white",
            )}
          >
            <span className="flex items-center gap-2">
              {periodLabels[period]}
              {periodDiscountLabels[period] && (
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                    selectedPeriod === period
                      ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                      : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400",
                  )}
                >
                  {periodDiscountLabels[period]}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Plan Card Component
function PlanCard({
  plan,
  selectedPeriod,
  isCurrentPlan,
  isRecommended,
  onSelect,
  isSelecting,
}: {
  plan: PlanInfo;
  selectedPeriod: SubscriptionPeriod;
  isCurrentPlan: boolean;
  isRecommended: boolean;
  onSelect: (plan: SubscriptionPlan, period: SubscriptionPeriod) => void;
  isSelecting: boolean;
}) {
  const config = planConfig[plan.plan];
  const pricing = plan.prices[selectedPeriod];
  const monthlyPrice = pricing.monthly;

  return (
    <motion.div
      whileHover={!isCurrentPlan ? { scale: 1.02, y: -4 } : undefined}
      transition={{ duration: 0.2 }}
    >
      <Card
        variant={isRecommended ? "elevated" : "default"}
        padding="none"
        className={cn(
          "relative overflow-hidden h-full flex flex-col",
          isRecommended && "ring-2 ring-primary-500 dark:ring-primary-400",
          isCurrentPlan && "opacity-75",
        )}
      >
        {/* Recommended badge */}
        {isRecommended && (
          <div className="absolute top-0 right-0 bg-gradient-to-l from-primary-500 to-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-bl-xl">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Recomendado
            </span>
          </div>
        )}

        {/* Header with gradient */}
        <div
          className={cn(
            "px-6 pt-6 pb-4",
            isRecommended && "bg-primary-50/50 dark:bg-primary-900/10",
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br",
                config.gradient,
              )}
            >
              <Star className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {plan.displayName}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {plan.description}
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-neutral-900 dark:text-white">
                {formatPriceCOP(monthlyPrice)}
              </span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                /mes
              </span>
            </div>
            {selectedPeriod !== "MONTHLY" && (
              <p className="text-xs text-success-600 dark:text-success-400 mt-1">
                {formatPriceCOP(pricing.total)} total (ahorras{" "}
                {Math.round(pricing.discount * 100)}%)
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />

        {/* Features */}
        <div className="px-6 py-4 flex-1">
          {/* Limits */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-neutral-400" />
              <span className="text-neutral-700 dark:text-neutral-300">
                {plan.limits.maxUsers} usuarios
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Warehouse className="h-4 w-4 text-neutral-400" />
              <span className="text-neutral-700 dark:text-neutral-300">
                {plan.limits.maxWarehouses} bodegas
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-neutral-400" />
              <span className="text-neutral-700 dark:text-neutral-300">
                {plan.limits.maxProducts === -1
                  ? "Productos ilimitados"
                  : `${plan.limits.maxProducts} productos`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-neutral-400" />
              <span className="text-neutral-700 dark:text-neutral-300">
                {plan.limits.maxInvoices === -1
                  ? "Facturas ilimitadas"
                  : `${plan.limits.maxInvoices} facturas`}
              </span>
            </div>
          </div>

          {/* Feature list */}
          <ul className="space-y-2">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-success-500 mt-0.5 shrink-0" />
                <span className="text-neutral-600 dark:text-neutral-400">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action button */}
        <div className="px-6 pb-6">
          {isCurrentPlan ? (
            <Button
              variant="secondary"
              fullWidth
              disabled
              className="cursor-not-allowed"
            >
              Plan Actual
            </Button>
          ) : (
            <Button
              variant={isRecommended ? "gradient" : "outline-primary"}
              fullWidth
              onClick={() => onSelect(plan.plan, selectedPeriod)}
              isLoading={isSelecting}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Seleccionar
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// Plan Grid
function PlanGrid({
  selectedPeriod,
  currentPlan,
}: {
  selectedPeriod: SubscriptionPeriod;
  currentPlan: SubscriptionPlan | null;
}) {
  const { data: plans, isLoading } = usePlans();
  const checkoutConfig = useCheckoutConfig();
  const verifyPayment = useVerifyPayment();
  const [selectingPlan, setSelectingPlan] = useState<SubscriptionPlan | null>(
    null,
  );

  const handleSelectPlan = async (
    plan: SubscriptionPlan,
    period: SubscriptionPeriod,
  ) => {
    setSelectingPlan(plan);
    try {
      const config = await checkoutConfig.mutateAsync({ plan, period });

      const result = await openWompiCheckout({
        publicKey: config.publicKey,
        currency: config.currency,
        amountInCents: config.amountInCents,
        reference: config.reference,
        signatureIntegrity: config.integrityHash,
        redirectUrl: config.redirectUrl,
        customerData: undefined,
      });

      if (result.id) {
        await verifyPayment.mutateAsync({ transactionId: result.id });
        toast.success("Tu suscripcion ha sido actualizada exitosamente");
      }
    } catch (error) {
      if (error instanceof Error && error.message !== "Pago cancelado") {
        toast.error(error.message || "Error al procesar el pago");
      }
    } finally {
      setSelectingPlan(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <ShimmerSkeleton key={i} className="h-96" />
        ))}
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <Card variant="default" padding="lg">
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">
            No hay planes disponibles en este momento
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {plans.map((plan) => (
        <PlanCard
          key={plan.plan}
          plan={plan}
          selectedPeriod={selectedPeriod}
          isCurrentPlan={currentPlan === plan.plan}
          isRecommended={plan.plan === "PRO"}
          onSelect={handleSelectPlan}
          isSelecting={selectingPlan === plan.plan}
        />
      ))}
    </div>
  );
}

// Billing History Table
function BillingHistoryTable() {
  const { data: transactions, isLoading } = useBillingHistory();

  if (isLoading) {
    return <ShimmerSkeleton className="h-64" />;
  }

  return (
    <Card variant="elevated" padding="none" className="overflow-hidden">
      <div className="p-6 pb-0">
        <CardHeader className="flex-row items-center gap-3 p-0 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10">
            <Receipt className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
      </div>
      <CardContent>
        <div className="overflow-x-auto">
          <table
            className="w-full"
            role="table"
            aria-label="Historial de pagos"
          >
            <thead>
              <tr className="border-y border-neutral-100 dark:border-neutral-800">
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                >
                  Fecha
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                >
                  Plan
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                >
                  Periodo
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                >
                  Monto
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                >
                  Estado
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                >
                  Referencia
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {(transactions || []).map((tx) => {
                const statusCfg = billingStatusConfig[tx.status] || {
                  label: tx.status,
                  variant: "default" as const,
                };
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={planConfig[tx.plan]?.badgeVariant || "default"}
                        size="sm"
                      >
                        {tx.plan}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                      {periodLabels[tx.period]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-900 dark:text-white">
                      {formatPriceCOP(tx.amountInCents / 100)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={statusCfg.variant} size="sm" dot>
                        {statusCfg.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-neutral-500 dark:text-neutral-400">
                      {tx.wompiReference || "-"}
                    </td>
                  </tr>
                );
              })}
              {(!transactions || transactions.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 mx-auto mb-3">
                      <Receipt className="h-7 w-7 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      No hay transacciones aun
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                      Tu historial de pagos aparecera aqui
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Billing Page
export default function BillingPage() {
  const [selectedPeriod, setSelectedPeriod] =
    useState<SubscriptionPeriod>("MONTHLY");
  const { data: subscription } = useSubscriptionStatus();
  const currentPlan = subscription?.plan ?? null;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Suscripcion y Facturacion
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Gestiona tu plan y metodos de pago
          </p>
        </div>
      </PageSection>

      {/* Current Plan */}
      <PageSection>
        <CurrentPlanCard />
      </PageSection>

      {/* Period Selector */}
      <PageSection>
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      </PageSection>

      {/* Plan Grid */}
      <PageSection>
        <PlanGrid selectedPeriod={selectedPeriod} currentPlan={currentPlan} />
      </PageSection>

      {/* Billing History */}
      <PageSection>
        <BillingHistoryTable />
      </PageSection>
    </PageWrapper>
  );
}
