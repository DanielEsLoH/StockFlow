import { motion } from "framer-motion";
import { ArrowRight, Globe, Zap, Code } from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/Badge";
import { Card } from "~/components/ui/Card";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const cardPop = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

interface Platform {
  name: string;
  color: string;
  bgColor: string;
  darkBgColor: string;
  borderColor: string;
  description: string;
  letter: string;
}

const platforms: Platform[] = [
  {
    name: "Shopify",
    letter: "S",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50",
    darkBgColor: "dark:bg-green-900/20",
    borderColor:
      "border-green-200 dark:border-green-800/50 hover:border-green-300 dark:hover:border-green-700",
    description:
      "Sincroniza productos, inventario y pedidos automáticamente con tu tienda Shopify.",
  },
  {
    name: "WooCommerce",
    letter: "W",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50",
    darkBgColor: "dark:bg-purple-900/20",
    borderColor:
      "border-purple-200 dark:border-purple-800/50 hover:border-purple-300 dark:hover:border-purple-700",
    description:
      "Conecta tu tienda WordPress con WooCommerce y gestiona todo desde StockFlow.",
  },
  {
    name: "MercadoLibre",
    letter: "ML",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50",
    darkBgColor: "dark:bg-yellow-900/20",
    borderColor:
      "border-yellow-200 dark:border-yellow-800/50 hover:border-yellow-300 dark:hover:border-yellow-700",
    description:
      "Publica y actualiza productos en MercadoLibre con stock sincronizado en tiempo real.",
  },
];

export function IntegrationsSection({ isMounted }: { isMounted: boolean }) {
  return (
    <section
      id="integrations"
      className="relative overflow-hidden bg-white py-20 sm:py-28 dark:bg-neutral-950"
    >
      {/* Decorative connection lines */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <svg
          className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-[0.04] dark:opacity-[0.06]"
          viewBox="0 0 600 600"
          fill="none"
        >
          <circle
            cx="300"
            cy="300"
            r="150"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="8 8"
          />
          <circle
            cx="300"
            cy="300"
            r="250"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="8 8"
          />
          <line
            x1="150"
            y1="300"
            x2="450"
            y2="300"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <line
            x1="300"
            y1="50"
            x2="300"
            y2="550"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.div variants={fadeInUp} className="mb-4 flex justify-center">
            <Badge
              variant="primary"
              size="lg"
              icon={<Zap className="h-4 w-4" />}
            >
              Integraciones
            </Badge>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl dark:text-white"
          >
            Conecta con tus{" "}
            <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent dark:from-primary-400 dark:to-accent-400">
              plataformas favoritas
            </span>
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="mt-4 text-lg text-neutral-600 dark:text-neutral-400"
          >
            Integra tu tienda online y gestiona todo desde un solo lugar
          </motion.p>
        </motion.div>

        {/* Platform cards grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {platforms.map((platform) => (
            <motion.div key={platform.name} variants={cardPop}>
              <Card
                variant="default"
                padding="lg"
                hover="lift"
                className={cn("group border transition-colors", platform.borderColor)}
              >
                {/* Platform logo placeholder */}
                <div className="mb-5 flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-xl font-bold",
                      platform.bgColor,
                      platform.darkBgColor,
                      platform.color,
                    )}
                  >
                    <span className="text-xl">{platform.letter}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      {platform.name}
                    </h3>
                    <Badge variant="outline-success" size="xs">
                      Disponible
                    </Badge>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {platform.description}
                </p>

                {/* Connect arrow */}
                <div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                  <span>Conectar</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom features row */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-12 grid gap-6 sm:grid-cols-2"
        >
          {/* Multi-currency */}
          <motion.div variants={fadeInUp}>
            <Card variant="soft" padding="md" className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                  "bg-primary-100 text-primary-600",
                  "dark:bg-primary-900/30 dark:text-primary-400",
                )}
              >
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Soporte multi-moneda
                </h4>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  USD, EUR, MXN con tasas de cambio automáticas. Opera
                  internacionalmente sin complicaciones.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["USD", "EUR", "MXN", "COP"].map((currency) => (
                    <Badge key={currency} variant="default" size="xs">
                      {currency}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* API coming soon */}
          <motion.div variants={fadeInUp}>
            <Card variant="soft" padding="md" className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                  "bg-accent-100 text-accent-600",
                  "dark:bg-accent-900/30 dark:text-accent-400",
                )}
              >
                <Code className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  API REST
                </h4>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  API REST próximamente para integraciones personalizadas.
                  Conecta cualquier sistema externo con StockFlow.
                </p>
                <div className="mt-3">
                  <Badge variant="warning" size="xs">
                    Próximamente
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
