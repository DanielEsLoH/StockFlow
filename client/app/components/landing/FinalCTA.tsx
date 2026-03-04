import { Link } from "react-router";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { handleScrollToSection } from "./LandingHeader";

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
// FinalCTA
// ---------------------------------------------------------------------------

export function FinalCTA({ isMounted }: { isMounted: boolean }) {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      {/* Background: gradient mesh orbs */}
      <div className="absolute inset-0 -z-10">
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
        <motion.div
          variants={staggerContainer}
          initial={isMounted ? "hidden" : false}
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl dark:text-white"
          >
            &iquest;Listo para transformar tu negocio?
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="mt-5 text-base text-neutral-500 sm:text-lg dark:text-neutral-400"
          >
            &Uacute;nete a cientos de empresas colombianas que ya conf&iacute;an
            en StockFlow
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            {/* Primary CTA */}
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

            {/* Secondary CTA */}
            <a
              href="#pricing"
              onClick={(e) => handleScrollToSection(e, "#pricing")}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5",
                "border border-neutral-300 bg-white text-base font-semibold text-neutral-700",
                "shadow-sm transition-all duration-200",
                "hover:border-neutral-400 hover:bg-neutral-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                "dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-750",
              )}
            >
              Ver Planes
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
