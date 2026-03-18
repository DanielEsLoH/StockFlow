import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ChevronRight, Play, Sparkles } from "lucide-react";
import { cn } from "~/lib/utils";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const modules = [
  "Inventario",
  "Facturación",
  "Punto de Venta",
  "Contabilidad",
  "Nómina",
  "Compras",
];

function RotatingModule({ isMounted }: { isMounted: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isMounted) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % modules.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isMounted]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={modules[index]}
        initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -16, filter: "blur(4px)" }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="inline-block bg-gradient-to-r from-primary-600 via-accent-500 to-primary-500 bg-clip-text text-transparent
                   dark:from-primary-400 dark:via-accent-400 dark:to-primary-300"
      >
        {modules[index]}
      </motion.span>
    </AnimatePresence>
  );
}


export function HeroSection({ isMounted }: { isMounted: boolean }) {
  return (
    <section className="relative overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/80 via-white to-neutral-50/50 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Orbs */}
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-primary-400/15 blur-[160px] dark:bg-primary-600/8" />
        <div className="absolute -right-40 top-1/4 h-[500px] w-[500px] rounded-full bg-accent-400/12 blur-[140px] dark:bg-accent-600/8" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-primary-300/10 blur-[120px] dark:bg-primary-500/5" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="pb-12 pt-16 sm:pt-24 lg:pt-28">
          <motion.div
            variants={staggerContainer}
            initial={isMounted ? "hidden" : false}
            animate="visible"
            className="mx-auto max-w-4xl text-center"
          >
            {/* DIAN Badge */}
            <motion.div variants={fadeInUp} className="mb-8 flex justify-center">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-1.5",
                  "border border-primary-200/80 bg-primary-50/80 text-sm font-medium text-primary-700",
                  "backdrop-blur-sm",
                  "dark:border-primary-800/60 dark:bg-primary-950/40 dark:text-primary-300",
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Proveedor Tecnológico Autorizado DIAN
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeInUp}
              className="font-display text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl xl:text-[3.5rem] dark:text-white"
            >
              <RotatingModule isMounted={isMounted} />
              <br className="hidden sm:block" />
              <span className="mt-1 block sm:mt-2">simple y sin estrés</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeInUp}
              className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg sm:leading-relaxed dark:text-neutral-400"
            >
              La plataforma todo-en-uno para PYMEs colombianas. Facturación electrónica DIAN,
              inventario multi-bodega, POS, contabilidad y nómina — integrados desde el día uno.
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
                <Sparkles className="h-4 w-4" />
                Empieza Gratis — 15 días
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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

            {/* Trust signals */}
            <motion.div
              variants={fadeInUp}
              className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-400 dark:text-neutral-500"
            >
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Sin tarjeta de crédito
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Configuración en minutos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Soporte incluido
              </span>
            </motion.div>
          </motion.div>

          {/* Dashboard mockup with perspective */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: 40 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative mx-auto mt-16 max-w-5xl"
          >
            {/* Dashboard mockup */}
            <div
              className={cn(
                "overflow-hidden rounded-xl border border-neutral-200/80 bg-white",
                "shadow-2xl shadow-neutral-900/10",
                "transition-transform duration-500",
                "dark:border-neutral-700/60 dark:bg-neutral-900 dark:shadow-black/30",
              )}
              style={{
                perspective: "1200px",
              }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-100 px-4 py-2.5 dark:border-neutral-700 dark:bg-neutral-800">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
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
                <div className="w-[44px]" />
              </div>

              {/* Screenshot */}
              <img
                src="/dashboard-preview.png"
                alt="Vista previa del dashboard de StockFlow mostrando inventario, facturación y métricas en tiempo real"
                className="w-full"
                loading="eager"
              />
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-neutral-950 dark:via-neutral-950/80" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
