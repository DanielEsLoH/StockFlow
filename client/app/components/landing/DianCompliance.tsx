import { motion } from "framer-motion";
import { Shield, Check } from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/Badge";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const slideFromLeft = {
  hidden: { opacity: 0, x: -40, filter: "blur(4px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.6 } },
};

const slideFromRight = {
  hidden: { opacity: 0, x: 40, filter: "blur(4px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.6, delay: 0.2 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const supportedDocuments = [
  "Factura electrónica",
  "Nota crédito",
  "Nota débito",
  "Doc. soporte",
  "Nómina electrónica",
  "Doc. equivalente POS",
];

export function DianCompliance({ isMounted }: { isMounted: boolean }) {
  return (
    <section
      id="dian"
      className="relative overflow-hidden bg-neutral-50 py-20 sm:py-28 dark:bg-neutral-900/50"
    >
      {/* Subtle background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -right-40 top-20 h-[400px] w-[400px] rounded-full bg-primary-400/5 blur-[100px] dark:bg-primary-600/5" />
        <div className="absolute -left-40 bottom-20 h-[350px] w-[350px] rounded-full bg-accent-400/5 blur-[100px] dark:bg-accent-600/5" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Content */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {/* Gradient Badge */}
            <motion.div variants={slideFromLeft} className="mb-6">
              <Badge
                variant="gradient"
                size="lg"
                icon={<Shield className="h-4 w-4" />}
              >
                Proveedor Tecnológico Autorizado DIAN
              </Badge>
            </motion.div>

            {/* Heading */}
            <motion.h2
              variants={fadeInUp}
              className="font-display text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl dark:text-white"
            >
              Cumplimiento{" "}
              <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent dark:from-primary-400 dark:to-accent-400">
                100% DIAN
              </span>
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400"
            >
              Genera y valida todos los documentos electrónicos exigidos por la
              DIAN directamente desde tu plataforma. Sin software adicional, sin
              complicaciones.
            </motion.p>

            {/* Supported documents list */}
            <motion.div variants={fadeInUp} className="mt-8">
              <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Documentos soportados
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {supportedDocuments.map((doc) => (
                  <div key={doc} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                        "bg-success-100 text-success-600",
                        "dark:bg-success-900/30 dark:text-success-400",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {doc}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Resolution mockup visual */}
          <motion.div
            variants={slideFromRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <div
              className={cn(
                "relative rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xl shadow-neutral-900/5",
                "dark:border-neutral-700/60 dark:bg-neutral-800/80 dark:shadow-black/20",
              )}
            >
              {/* Card header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      "bg-gradient-to-br from-primary-500 to-accent-600 shadow-md shadow-primary-500/20",
                    )}
                  >
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">
                      Resolución de Facturación
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Habilitación DIAN
                    </p>
                  </div>
                </div>
                <Badge variant="success" size="sm">
                  Activa
                </Badge>
              </div>

              {/* Resolution fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={cn(
                      "rounded-xl p-3",
                      "bg-neutral-50 dark:bg-neutral-700/50",
                    )}
                  >
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      Resolución
                    </p>
                    <p className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">
                      18764000XXXXXX
                    </p>
                  </div>
                  <div
                    className={cn(
                      "rounded-xl p-3",
                      "bg-neutral-50 dark:bg-neutral-700/50",
                    )}
                  >
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      Prefijo
                    </p>
                    <p className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">
                      SETT
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={cn(
                      "rounded-xl p-3",
                      "bg-neutral-50 dark:bg-neutral-700/50",
                    )}
                  >
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      Rango
                    </p>
                    <p className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">
                      1 - 5.000.000
                    </p>
                  </div>
                  <div
                    className={cn(
                      "rounded-xl p-3",
                      "bg-neutral-50 dark:bg-neutral-700/50",
                    )}
                  >
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      Vigencia
                    </p>
                    <p className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">
                      2025 - 2027
                    </p>
                  </div>
                </div>
              </div>

              {/* Validated badge */}
              <div
                className={cn(
                  "mt-6 flex items-center justify-center gap-2 rounded-xl border py-3",
                  "border-success-200 bg-success-50 text-success-700",
                  "dark:border-success-800/50 dark:bg-success-900/20 dark:text-success-400",
                )}
              >
                <Check className="h-5 w-5" />
                <span className="text-sm font-semibold">
                  Documento Validado
                </span>
              </div>

              {/* Decorative glow behind card */}
              <div className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-primary-500/20 via-transparent to-accent-500/20 blur-xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
