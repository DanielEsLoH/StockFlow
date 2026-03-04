import { Link } from "react-router";
import { motion } from "framer-motion";
import { ShieldCheck, ChevronRight, Play } from "lucide-react";
import { cn } from "~/lib/utils";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

export function HeroSection({ isMounted }: { isMounted: boolean }) {
  return (
    <section className="relative overflow-hidden pt-16">
      {/* Background: gradient mesh with animated orbs + grid overlay */}
      <div className="absolute inset-0 -z-10">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50 via-white to-neutral-50 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Animated orbs */}
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary-400/20 blur-[128px] animate-gradient-mesh-1 dark:bg-primary-600/10" />
        <div className="absolute -right-32 top-1/4 h-[400px] w-[400px] rounded-full bg-accent-400/15 blur-[128px] animate-gradient-mesh-2 dark:bg-accent-600/10" />
        <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-primary-300/15 blur-[128px] animate-gradient-mesh-3 dark:bg-primary-500/5" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="pb-16 pt-20 sm:pt-28 lg:pt-32">
          <motion.div
            variants={staggerContainer}
            initial={isMounted ? "hidden" : false}
            animate="visible"
            className="mx-auto max-w-4xl text-center"
          >
            {/* DIAN Badge */}
            <motion.div variants={fadeInUp} className="mb-6 flex justify-center">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-1.5",
                  "border border-primary-200 bg-primary-50 text-sm font-medium text-primary-700",
                  "dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-300",
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Proveedor Tecnológico DIAN
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeInUp}
              className="font-display text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl dark:text-white"
            >
              Tu negocio, bajo{" "}
              <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent dark:from-primary-400 dark:to-accent-400">
                control total
              </span>
            </motion.h1>

            {/* Subheadline - keyword middot list */}
            <motion.p
              variants={fadeInUp}
              className="mt-5 text-base font-medium tracking-wide text-neutral-500 sm:text-lg dark:text-neutral-400"
            >
              Inventario &middot; Facturación DIAN &middot; POS &middot;
              Contabilidad &middot; Nómina
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeInUp}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link
                to="/register"
                className={cn(
                  "group inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5",
                  "bg-gradient-to-r from-primary-500 to-accent-600 text-base font-semibold text-white",
                  "shadow-lg shadow-primary-500/25 transition-all duration-200",
                  "hover:shadow-xl hover:shadow-primary-500/30 hover:brightness-110",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                  "dark:shadow-primary-900/30",
                )}
              >
                Empieza Gratis
                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                to="/login"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5",
                  "border border-neutral-300 bg-white text-base font-semibold text-neutral-700",
                  "shadow-sm transition-all duration-200",
                  "hover:border-neutral-400 hover:bg-neutral-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                  "dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-750",
                )}
              >
                <Play className="h-4 w-4" />
                Ver Demo
              </Link>
            </motion.div>

            {/* Trust line */}
            <motion.p
              variants={fadeInUp}
              className="mt-8 text-sm text-neutral-400 dark:text-neutral-500"
            >
              Más de 500 empresas colombianas confían en StockFlow &middot; Sin
              tarjeta de crédito
            </motion.p>
          </motion.div>

          {/* Dashboard screenshot mockup */}
          <motion.div
            variants={fadeInUp}
            initial={isMounted ? "hidden" : false}
            animate="visible"
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mx-auto mt-16 max-w-5xl"
          >
            <div
              className={cn(
                "overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-2xl shadow-neutral-900/10",
                "dark:border-neutral-700/60 dark:bg-neutral-900 dark:shadow-black/30",
              )}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-100 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
                {/* Window dots */}
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>

                {/* Address bar */}
                <div className="flex flex-1 items-center justify-center">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md px-4 py-1",
                      "bg-white text-xs text-neutral-500",
                      "dark:bg-neutral-700 dark:text-neutral-400",
                    )}
                  >
                    <svg
                      className="h-3 w-3 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    dashboard.stockflow.co
                  </div>
                </div>

                {/* Spacer to balance the dots */}
                <div className="w-[52px]" />
              </div>

              {/* Screenshot */}
              <img
                src="/dashboard-preview.png"
                alt="Vista previa del dashboard de StockFlow mostrando inventario, facturación y métricas en tiempo real"
                className="w-full"
                loading="eager"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
