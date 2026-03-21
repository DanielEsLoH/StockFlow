import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/Badge";
import { Card } from "~/components/ui/Card";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const cardReveal = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

interface Testimonial {
  name: string;
  role: string;
  company: string;
  industry: string;
  content: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: "Camila R.",
    role: "Gerente Comercial",
    company: "Distribuidora del Valle",
    industry: "Distribución",
    content:
      "Pasamos de Excel a StockFlow y redujimos los errores de inventario en un 80%. El control multi-bodega nos permite manejar 3 sedes sin perder trazabilidad.",
    rating: 5.0,
  },
  {
    name: "Andrés M.",
    role: "Director de Operaciones",
    company: "TechStore Colombia",
    industry: "Retail",
    content:
      "Antes la facturación DIAN nos tomaba medio día. Ahora es automática. Llevamos más de 2.000 facturas sin un solo rechazo.",
    rating: 4.8,
  },
  {
    name: "Patricia V.",
    role: "Contadora Pública",
    company: "Asesorías Contables Orion",
    industry: "Contaduría",
    content:
      "Manejo 12 empresas desde StockFlow. Los reportes contables, la exógena y los cierres mensuales me toman la mitad del tiempo que antes.",
    rating: 4.7,
  },
  {
    name: "Felipe T.",
    role: "Propietario",
    company: "El Fogón Parrilla Bar",
    industry: "Restaurante",
    content:
      "El POS funciona rápido incluso en horas pico. Las sesiones de caja nos dan control total y el cierre diario se hace solo.",
    rating: 4.9,
  },
  {
    name: "Sandra L.",
    role: "Directora Administrativa",
    company: "Importadora Costa Pacífico",
    industry: "Importaciones",
    content:
      "Nómina, contabilidad y facturación en un solo lugar. Dejamos de pagar 3 softwares diferentes y el soporte responde el mismo día.",
    rating: 4.8,
  },
];

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasPartial = rating % 1 !== 0;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < fullStars) {
          return (
            <Star
              key={i}
              className="h-4 w-4 fill-amber-400 text-amber-400"
            />
          );
        }
        if (i === fullStars && hasPartial) {
          return (
            <div key={i} className="relative">
              <Star className="h-4 w-4 text-neutral-200 dark:text-neutral-700" />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${(rating % 1) * 100}%` }}
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              </div>
            </div>
          );
        }
        return (
          <Star
            key={i}
            className="h-4 w-4 text-neutral-200 dark:text-neutral-700"
          />
        );
      })}
      <span className="ml-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
        "bg-gradient-to-br from-primary-500 to-accent-600 text-sm font-bold text-white",
        "shadow-md shadow-primary-500/20",
      )}
    >
      {initials}
    </div>
  );
}

export function TestimonialsSection({ isMounted }: { isMounted: boolean }) {
  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-white py-20 sm:py-28 dark:bg-neutral-950"
    >
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
            <Badge variant="primary" size="lg" icon={<Quote className="h-4 w-4" />}>
              Testimonios
            </Badge>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl dark:text-white"
          >
            Lo que dicen{" "}
            <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent dark:from-primary-400 dark:to-accent-400">
              nuestros clientes
            </span>
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="mt-4 text-lg text-neutral-600 dark:text-neutral-400"
          >
            Empresas colombianas que transformaron su operación con StockFlow
          </motion.p>
        </motion.div>

        {/* Testimonials grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className={cn(
            "mt-14 grid gap-6",
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {/* First row: 3 cards */}
          {testimonials.slice(0, 3).map((t) => (
            <motion.div key={t.name} variants={cardReveal}>
              <Card
                variant="glass"
                padding="md"
                hover="lift"
                className="flex h-full flex-col"
              >
                {/* Quote icon */}
                <Quote className="mb-4 h-8 w-8 text-primary-300 dark:text-primary-700" />

                {/* Content */}
                <p className="flex-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  &ldquo;{t.content}&rdquo;
                </p>

                {/* Rating */}
                <div className="mt-5">
                  <StarRating rating={t.rating} />
                </div>

                {/* Divider */}
                <div className="my-4 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />

                {/* Author */}
                <div className="flex items-center gap-3">
                  <Initials name={t.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {t.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {t.role}, {t.company}
                    </p>
                  </div>
                  <Badge variant="outline" size="xs">
                    {t.industry}
                  </Badge>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* Second row: 2 cards centered */}
          {testimonials.slice(3).map((t) => (
            <motion.div
              key={t.name}
              variants={fadeInUp}
              className="sm:first:col-start-1 lg:first:col-start-1 lg:last:col-start-2"
            >
              <Card
                variant="glass"
                padding="md"
                hover="lift"
                className="flex h-full flex-col"
              >
                {/* Quote icon */}
                <Quote className="mb-4 h-8 w-8 text-primary-300 dark:text-primary-700" />

                {/* Content */}
                <p className="flex-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  &ldquo;{t.content}&rdquo;
                </p>

                {/* Rating */}
                <div className="mt-5">
                  <StarRating rating={t.rating} />
                </div>

                {/* Divider */}
                <div className="my-4 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />

                {/* Author */}
                <div className="flex items-center gap-3">
                  <Initials name={t.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {t.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {t.role}, {t.company}
                    </p>
                  </div>
                  <Badge variant="outline" size="xs">
                    {t.industry}
                  </Badge>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile horizontal scroll hint */}
        <div className="mt-6 flex justify-center sm:hidden">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Desliza para ver más testimonios
          </p>
        </div>
      </div>
    </section>
  );
}
