import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { cn } from "~/lib/utils";
import { AnimatedNumber } from "~/components/ui/AnimatedNumber";

const stats = [
  {
    value: 500,
    suffix: "+",
    label: "Empresas activas",
    formatFn: (n: number) => Math.round(n).toLocaleString("es-CO"),
  },
  {
    value: 50000,
    suffix: "+",
    label: "Facturas generadas",
    formatFn: (n: number) => Math.round(n).toLocaleString("es-CO"),
  },
  {
    value: 99.9,
    suffix: "%",
    label: "Uptime",
    formatFn: (n: number) => n.toFixed(1),
  },
  {
    value: 4.8,
    suffix: "/5",
    label: "Satisfacción",
    formatFn: (n: number) => n.toFixed(1),
  },
];

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export function SocialProofBar({ isMounted }: { isMounted: boolean }) {
  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <motion.div
        variants={fadeIn}
        initial={isMounted ? "hidden" : false}
        animate="visible"
        transition={{ duration: 0.6, delay: 0.7 }}
        className={cn(
          "-mt-12 rounded-2xl border p-6 sm:p-8",
          /* Glass effect */
          "border-white/60 bg-white/70 shadow-xl shadow-neutral-900/5 backdrop-blur-xl",
          "dark:border-neutral-700/50 dark:bg-neutral-900/70 dark:shadow-black/20",
        )}
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-0">
          {/* Stats grid */}
          <div className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-2xl font-bold text-neutral-900 tabular-nums sm:text-3xl dark:text-white">
                  <AnimatedNumber
                    value={stat.value}
                    duration={1}
                    formatFn={stat.formatFn}
                  />
                  <span>{stat.suffix}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-neutral-500 sm:text-sm dark:text-neutral-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden h-12 w-px bg-neutral-200 sm:mx-6 sm:block dark:bg-neutral-700" />
          <div className="h-px w-full bg-neutral-200 sm:hidden dark:bg-neutral-700" />

          {/* DIAN badge */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <ShieldCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                Certificado DIAN
              </p>
              <p className="text-[11px] leading-tight text-neutral-500 dark:text-neutral-400">
                Facturación electrónica
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
