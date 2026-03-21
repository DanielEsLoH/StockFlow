import { Link } from "react-router";
import { motion } from "framer-motion";
import { Check, ShieldCheck, Users } from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/Badge";
import { Switch } from "~/components/ui/Switch";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

// ---------------------------------------------------------------------------
// Types & data
// ---------------------------------------------------------------------------

interface Plan {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  users: string;
  bodegas: string;
  highlighted: boolean;
  badge?: string;
  features: string[];
}

const plans: Plan[] = [
  {
    name: "Emprendedor",
    monthlyPrice: 69_900,
    annualPrice: 59_400,
    users: "1 usuario",
    bodegas: "1 bodega",
    highlighted: false,
    features: [
      "Productos ilimitados",
      "Facturas ilimitadas",
      "Facturaci\u00f3n electr\u00f3nica DIAN",
      "Soporte por email",
      "Reportes b\u00e1sicos",
    ],
  },
  {
    name: "Pyme",
    monthlyPrice: 149_900,
    annualPrice: 127_400,
    users: "2 usuarios",
    bodegas: "2 bodegas",
    highlighted: true,
    badge: "M\u00e1s Popular",
    features: [
      "Todo en Emprendedor",
      "Soporte prioritario",
      "Reportes avanzados",
      "Alertas de stock",
    ],
  },
  {
    name: "Pro",
    monthlyPrice: 219_900,
    annualPrice: 186_900,
    users: "3 usuarios",
    bodegas: "10 bodegas",
    highlighted: false,
    features: [
      "Todo en Pyme",
      "Soporte 24/7",
      "Reportes personalizados",
      "Integraciones b\u00e1sicas",
      "Alertas automatizadas",
    ],
  },
  {
    name: "Plus",
    monthlyPrice: 279_900,
    annualPrice: 237_900,
    users: "8 usuarios",
    bodegas: "100 bodegas",
    highlighted: false,
    features: [
      "Todo en Pro",
      "Soporte dedicado",
      "Acceso API",
      "Integraciones avanzadas",
      "Dashboard personalizado",
      "Multi-sucursal",
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ---------------------------------------------------------------------------
// PricingSection
// ---------------------------------------------------------------------------

export function PricingSection({
  isMounted,
  isAnnual,
  setIsAnnual,
}: {
  isMounted: boolean;
  isAnnual: boolean;
  setIsAnnual: (v: boolean) => void;
}) {
  return (
    <section
      id="precios"
      className="bg-white py-20 sm:py-28 dark:bg-neutral-950"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.div variants={fadeInUp}>
            <Badge variant="primary" size="lg">
              Precios
            </Badge>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="mt-4 text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl dark:text-white"
          >
            Planes para cada etapa de tu negocio
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="mt-4 text-base text-neutral-500 sm:text-lg dark:text-neutral-400"
          >
            Sin contratos largos. Cancela cuando quieras. Todos los planes
            incluyen facturaci&oacute;n electr&oacute;nica DIAN.
          </motion.p>

          {/* Billing toggle */}
          <motion.div
            variants={fadeInUp}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                !isAnnual
                  ? "text-neutral-900 dark:text-white"
                  : "text-neutral-400 dark:text-neutral-500",
              )}
            >
              Mensual
            </span>
            <Switch checked={isAnnual} onChange={setIsAnnual} size="sm" />
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                isAnnual
                  ? "text-neutral-900 dark:text-white"
                  : "text-neutral-400 dark:text-neutral-500",
              )}
            >
              Anual
            </span>
            {isAnnual && (
              <Badge variant="gradient" size="sm">
                -15%
              </Badge>
            )}
          </motion.div>
        </motion.div>

        {/* Plan cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {plans.map((plan) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

            return (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6 transition-shadow",
                  plan.highlighted
                    ? "border-primary-300 bg-primary-50/40 shadow-lg shadow-primary-500/10 dark:border-primary-700 dark:bg-primary-950/20 dark:shadow-primary-900/20"
                    : "border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
                )}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="gradient" size="sm">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                {/* Plan name */}
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mt-4">
                  <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                    {formatCOP(price)}
                  </span>
                  <span className="ml-1 text-sm text-neutral-500 dark:text-neutral-400">
                    /mes
                  </span>
                </div>

                {/* Users & bodegas */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                    <Users className="h-4 w-4 shrink-0 text-primary-500" />
                    <span>
                      {plan.users} +{" "}
                      <span className="font-bold text-primary-600 dark:text-primary-400">
                        1 contador gratis incluido
                      </span>
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {plan.bodegas}
                  </p>
                </div>

                {/* DIAN compliance row */}
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 dark:border-primary-800 dark:bg-primary-950/30">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
                  <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                    Cumplimiento DIAN incluido
                  </span>
                </div>

                {/* Feature list */}
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-300"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  to={`/register?plan=${plan.name.toLowerCase()}`}
                  className={cn(
                    "mt-8 block rounded-xl px-4 py-3 text-center text-sm font-semibold transition-all",
                    plan.highlighted
                      ? "bg-gradient-to-r from-primary-500 to-accent-600 text-white shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30 hover:brightness-110"
                      : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-750",
                  )}
                >
                  Empieza Gratis
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
