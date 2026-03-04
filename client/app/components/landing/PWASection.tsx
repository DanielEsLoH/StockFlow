import { motion } from "framer-motion";
import { Smartphone, WifiOff, Bell, Moon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/Badge";

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

interface PWAHighlight {
  icon: React.ElementType;
  title: string;
  description: string;
}

const highlights: PWAHighlight[] = [
  {
    icon: Smartphone,
    title: "Instala como app nativa",
    description: "Sin tienda de apps, directo desde el navegador",
  },
  {
    icon: WifiOff,
    title: "Funciona sin conexión",
    description: "Accede a datos críticos incluso offline",
  },
  {
    icon: Bell,
    title: "Notificaciones push",
    description: "Alertas de stock bajo, pagos y más",
  },
  {
    icon: Moon,
    title: "Modo oscuro",
    description: "Interfaz adaptada a tu preferencia",
  },
];

export function PWASection({ isMounted }: { isMounted: boolean }) {
  return (
    <section
      id="pwa"
      className="relative overflow-hidden bg-neutral-50 py-20 sm:py-28 dark:bg-neutral-900/50"
    >
      {/* Subtle background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-1/4 top-0 h-[400px] w-[400px] rounded-full bg-accent-400/5 blur-[120px] dark:bg-accent-600/5" />
        <div className="absolute bottom-0 left-1/4 h-[350px] w-[350px] rounded-full bg-primary-400/5 blur-[120px] dark:bg-primary-600/5" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Content */}
          <motion.div
            variants={staggerContainer}
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <Badge
                variant="primary"
                size="lg"
                icon={<Smartphone className="h-4 w-4" />}
              >
                Progressive Web App
              </Badge>
            </motion.div>

            <motion.h2
              variants={fadeInUp}
              className="font-display text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl dark:text-white"
            >
              Tu negocio en{" "}
              <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent dark:from-primary-400 dark:to-accent-400">
                tu bolsillo
              </span>
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400"
            >
              Accede desde cualquier dispositivo, en cualquier momento
            </motion.p>

            {/* Highlights list */}
            <motion.div variants={fadeInUp} className="mt-8 space-y-5">
              {highlights.map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      "bg-primary-100 text-primary-600",
                      "dark:bg-primary-900/30 dark:text-primary-400",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Phone mockup */}
          <motion.div
            variants={fadeInUp}
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="relative">
              {/* Phone frame */}
              <div
                className={cn(
                  "relative w-[280px] overflow-hidden rounded-[3rem] border-[6px] shadow-2xl",
                  "border-neutral-800 bg-neutral-900 shadow-neutral-900/20",
                  "dark:border-neutral-600 dark:shadow-black/40",
                )}
              >
                {/* Notch */}
                <div className="absolute left-1/2 top-0 z-20 h-7 w-[120px] -translate-x-1/2 rounded-b-2xl bg-neutral-800 dark:bg-neutral-600" />

                {/* Screen content */}
                <div className="relative h-[560px] overflow-hidden bg-white dark:bg-neutral-950">
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-6 pb-1 pt-9">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                      9:41
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-4 rounded-sm border border-neutral-400 p-px dark:border-neutral-500">
                        <div className="h-full w-3/4 rounded-xs bg-success-500" />
                      </div>
                    </div>
                  </div>

                  {/* App header */}
                  <div className="border-b border-neutral-100 px-5 pb-3 pt-2 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-600">
                        <span className="text-[10px] font-bold text-white">
                          SF
                        </span>
                      </div>
                      <span className="text-sm font-bold text-neutral-900 dark:text-white">
                        StockFlow
                      </span>
                    </div>
                  </div>

                  {/* Dashboard content mockup */}
                  <div className="space-y-4 p-5">
                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-primary-50 p-3 dark:bg-primary-900/20">
                        <p className="text-[10px] text-primary-600 dark:text-primary-400">
                          Ventas hoy
                        </p>
                        <p className="mt-1 text-lg font-bold text-primary-700 dark:text-primary-300">
                          $2.4M
                        </p>
                      </div>
                      <div className="rounded-xl bg-success-50 p-3 dark:bg-success-900/20">
                        <p className="text-[10px] text-success-600 dark:text-success-400">
                          Productos
                        </p>
                        <p className="mt-1 text-lg font-bold text-success-700 dark:text-success-300">
                          1,247
                        </p>
                      </div>
                    </div>

                    {/* Mini chart placeholder */}
                    <div className="rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
                      <p className="mb-2 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                        Ventas semanales
                      </p>
                      <div className="flex items-end gap-1.5">
                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t-sm bg-gradient-to-t from-primary-500 to-accent-500"
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Recent items */}
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                        Actividad reciente
                      </p>
                      {[
                        { label: "Factura #1042", status: "Enviada" },
                        { label: "Stock actualizado", status: "Bodega 1" },
                        { label: "Pago recibido", status: "$450K" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={cn(
                            "flex items-center justify-between rounded-lg px-3 py-2",
                            "bg-neutral-50 dark:bg-neutral-800/50",
                          )}
                        >
                          <span className="text-xs text-neutral-700 dark:text-neutral-300">
                            {item.label}
                          </span>
                          <span className="text-[10px] font-medium text-primary-600 dark:text-primary-400">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative glow behind phone */}
              <div className="absolute -inset-8 -z-10 rounded-full bg-gradient-to-br from-primary-500/10 via-transparent to-accent-500/10 blur-2xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
