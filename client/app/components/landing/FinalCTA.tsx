import { Link } from "react-router";
import { motion } from "framer-motion";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { cn } from "~/lib/utils";
import { handleScrollToSection } from "./LandingHeader";

const fadeInUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5 } },
};

const scaleReveal = {
  hidden: { opacity: 0, scale: 0.92, filter: "blur(8px)" },
  visible: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

export function FinalCTA({ isMounted }: { isMounted: boolean }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 py-20 sm:py-24 dark:from-primary-900 dark:via-primary-950 dark:to-accent-950">
      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial={isMounted ? "hidden" : false}
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div variants={fadeInUp} className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4" />
              Certificado DIAN · Soporte en español
            </span>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            ¿Listo para simplificar tu negocio?
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="mt-5 text-base text-primary-100/80 sm:text-lg"
          >
            Únete a cientos de empresas colombianas que ya gestionan todo desde
            una sola plataforma.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              to="/register"
              className={cn(
                "group inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5",
                "bg-white text-base font-semibold text-primary-700",
                "shadow-lg shadow-black/10 transition-all duration-200",
                "hover:bg-primary-50 hover:shadow-xl",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-700",
              )}
            >
              Empieza Gratis — 15 días
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <a
              href="#precios"
              onClick={(e) => handleScrollToSection(e, "#precios")}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5",
                "border border-white/30 text-base font-semibold text-white",
                "transition-all duration-200",
                "hover:border-white/50 hover:bg-white/10",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-700",
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
