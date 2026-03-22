import { motion } from "framer-motion";
import { UserPlus, Settings, TrendingUp } from "lucide-react";
import { Badge } from "~/components/ui/Badge";

const fadeInUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

const howItWorksSteps = [
  {
    step: 1,
    title: "Crea tu cuenta",
    description:
      "Regístrate en menos de 2 minutos. Sin tarjeta de crédito requerida.",
    icon: UserPlus,
  },
  {
    step: 2,
    title: "Configura tu negocio",
    description:
      "Añade tus productos, bodegas y configura tu facturación electrónica.",
    icon: Settings,
  },
  {
    step: 3,
    title: "Gestiona y crece",
    description:
      "Controla tu inventario, genera facturas y toma decisiones basadas en datos.",
    icon: TrendingUp,
  },
];

export function HowItWorks({ isMounted }: { isMounted: boolean }) {
  return (
    <section
      id="how-it-works"
      className="bg-neutral-50 py-24 dark:bg-neutral-900/50"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="mx-auto max-w-2xl text-center"
        >
          <Badge variant="primary" pill className="mb-4">
            Cómo Funciona
          </Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
            Empieza en minutos, no en días
          </h2>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            Tres pasos simples para transformar la gestión de tu negocio
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-3"
        >
          {howItWorksSteps.map((step, index) => (
            <motion.div
              key={step.step}
              variants={scaleIn}
              className="relative text-center"
            >
              {/* Connector line between steps */}
              {index < howItWorksSteps.length - 1 && (
                <div className="absolute left-1/2 top-12 hidden h-0.5 w-full bg-gradient-to-r from-primary-300 to-accent-300 dark:from-primary-700 dark:to-accent-700 md:block" />
              )}

              {/* Step circle */}
              <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md dark:bg-neutral-800">
                  <step.icon className="h-7 w-7 text-primary-500" />
                </div>
                {/* Step number badge */}
                <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-xs font-bold text-white shadow-sm">
                  {step.step}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
