import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { motion } from "framer-motion";
import { requireGuest } from "~/lib/auth.server";

import {
  Package,
  Users,
  ShieldCheck,
  FileText,
  BarChart3,
  CreditCard,
  Menu,
  X,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";

// Social media icons as components to avoid deprecated lucide-react icons
const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export function meta() {
  return [
    { title: "StockFlow - Sistema de Inventario y Facturación" },
    {
      name: "description",
      content:
        "Plataforma multi-tenant para PYMEs colombianas. Control total de inventario, facturación electrónica DIAN y reportes en tiempo real.",
    },
  ];
}

// Redirect authenticated users to dashboard
export function loader({ request }: Route.LoaderArgs) {
  requireGuest(request);
  return null;
}

// Animation variants - hoisted outside component for performance
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

// Features data - hoisted outside component
const features = [
  {
    icon: Package,
    title: "Gestión de Inventario Multi-Bodega",
    description:
      "Control de stock en tiempo real con alertas de bajo inventario y transferencias entre bodegas.",
  },
  {
    icon: Users,
    title: "Multi-Tenancy Seguro",
    description:
      "Organizaciones completamente aisladas con datos protegidos y encriptación de extremo a extremo.",
  },
  {
    icon: ShieldCheck,
    title: "Control de Acceso (RBAC)",
    description:
      "4 roles configurables: Super Admin, Admin, Manager, Employee con permisos granulares.",
  },
  {
    icon: FileText,
    title: "Facturación Electrónica DIAN",
    description:
      "Generación de facturas compatibles con la normativa colombiana y envío automático.",
  },
  {
    icon: BarChart3,
    title: "Reportes & Analytics",
    description:
      "Dashboard con métricas en tiempo real, exportación a PDF/Excel y análisis de tendencias.",
  },
  {
    icon: CreditCard,
    title: "Pagos con Stripe",
    description:
      "Gestión de suscripciones, pagos recurrentes y facturación automatizada.",
  },
];

// Tech stack data - hoisted outside component
const techStack = [
  { name: "NestJS 11", category: "Backend" },
  { name: "React 19", category: "Frontend" },
  { name: "React Router 7", category: "Routing + SSR" },
  { name: "PostgreSQL 16", category: "Database" },
  { name: "Prisma 7", category: "ORM" },
  { name: "TypeScript 5", category: "Type Safety" },
  { name: "Tailwind CSS 4", category: "Styling" },
  { name: "Docker", category: "Containerization" },
];

// Pricing plans data - hoisted outside component
// Plans based on Alegra model with UNLIMITED products and invoices in ALL plans
const pricingPlans = [
  {
    name: "EMPRENDEDOR",
    price: "$69,900",
    period: "COP/mes",
    description: "Para emprendedores que inician",
    features: [
      "1 usuario + 1 contador gratis",
      "1 bodega",
      "Productos ilimitados",
      "Facturas ilimitadas",
      "Facturacion electronica DIAN",
      "Soporte por email",
      "Reportes basicos",
    ],
    cta: "Comenzar Ahora",
    href: "/register?plan=emprendedor",
    highlighted: false,
  },
  {
    name: "PYME",
    price: "$149,900",
    period: "COP/mes",
    description: "Para pequenas empresas en crecimiento",
    features: [
      "2 usuarios + 1 contador gratis",
      "2 bodegas",
      "Productos ilimitados",
      "Facturas ilimitadas",
      "Facturacion electronica DIAN",
      "Soporte prioritario",
      "Reportes avanzados",
      "Notificaciones de stock",
    ],
    cta: "Comenzar Ahora",
    href: "/register?plan=pyme",
    highlighted: true,
    badge: "Mas Popular",
  },
  {
    name: "PRO",
    price: "$219,900",
    period: "COP/mes",
    description: "Para empresas en expansion",
    features: [
      "3 usuarios + 1 contador gratis",
      "10 bodegas",
      "Productos ilimitados",
      "Facturas ilimitadas",
      "Facturacion electronica DIAN",
      "Soporte 24/7",
      "Reportes personalizados",
      "Integraciones basicas",
      "Alertas automatizadas",
    ],
    cta: "Comenzar Ahora",
    href: "/register?plan=pro",
    highlighted: false,
  },
  {
    name: "PLUS",
    price: "$279,900",
    period: "COP/mes",
    description: "Para empresas consolidadas",
    features: [
      "8 usuarios + 1 contador gratis",
      "100 bodegas",
      "Productos ilimitados",
      "Facturas ilimitadas",
      "Facturacion electronica DIAN",
      "Soporte dedicado",
      "API access",
      "Integraciones avanzadas",
      "Dashboard personalizado",
      "Multi-sucursal",
    ],
    cta: "Comenzar Ahora",
    href: "/register?plan=plus",
    highlighted: false,
  },
];

// Navigation links - hoisted outside component
const navLinks = [
  { name: "Características", href: "#features" },
  { name: "Tecnología", href: "#tech" },
  { name: "Precios", href: "#pricing" },
];

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const scrollToSection = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (href.startsWith("#")) {
        e.preventDefault();
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          setMobileMenuOpen(false);
        }
      }
    },
    [],
  );

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-950/80">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary-500 to-primary-700">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-neutral-900 dark:text-white">
              Stock<span className="text-primary-500">Flow</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-4 md:flex">
            <ThemeToggle />
            <Link
              to="/login"
              className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              Comenzar Ahora
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-neutral-200 bg-white px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950 md:hidden"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => scrollToSection(e, link.href)}
                  className="text-base font-medium text-neutral-600 dark:text-neutral-400"
                >
                  {link.name}
                </a>
              ))}
              <hr className="border-neutral-200 dark:border-neutral-800" />
              <Link
                to="/login"
                className="text-base font-medium text-neutral-600 dark:text-neutral-400"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-primary-500 px-4 py-2 text-center text-base font-medium text-white"
              >
                Comenzar Ahora
              </Link>
            </div>
          </motion.div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-linear-to-br from-primary-50 via-white to-purple-50 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50 dark:opacity-20" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={isMounted ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-300">
                <Sparkles className="h-4 w-4" />
                <span>Nuevo: Facturación electrónica DIAN</span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl lg:text-6xl">
                Gestiona tu inventario de forma{" "}
                <span className="bg-linear-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">
                  inteligente
                </span>
              </h1>

              {/* Subheadline */}
              <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400 sm:text-xl">
                Plataforma multi-tenant para PYMEs colombianas. Control total de
                inventario, facturación electrónica DIAN y reportes en tiempo
                real.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-600 hover:shadow-xl hover:shadow-primary-500/40"
                  >
                    Ver Planes
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-8 py-4 text-base font-semibold text-neutral-900 transition-all hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
                  >
                    Ver Demo
                  </Link>
                </motion.div>
              </div>

              {/* Social proof */}
              <p className="mt-8 text-sm text-neutral-500 dark:text-neutral-500">
                +500 empresas ya confían en StockFlow
              </p>
            </motion.div>
          </div>

          {/* Hero Image Placeholder */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: 40 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-16 max-w-5xl"
          >
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <span className="ml-2 text-sm text-neutral-500">
                  dashboard.stockflow.co
                </span>
              </div>
              <div>
                <img
                  src="/dashboard-preview.png"
                  alt="Vista previa del Dashboard de StockFlow"
                  className="block w-full h-auto border-0"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-24 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Todo lo que necesitas para tu negocio
            </h2>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
              Herramientas potentes diseñadas para simplificar la gestión de tu
              empresa
            </p>
          </motion.div>

          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="group relative rounded-2xl border border-neutral-200 bg-white p-8 transition-all hover:border-primary-200 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-primary-800"
              >
                <div className="mb-4 inline-flex rounded-xl bg-primary-50 p-3 dark:bg-primary-950">
                  <feature.icon className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section id="tech" className="bg-neutral-50 py-24 dark:bg-neutral-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Tecnología de Vanguardia
            </h2>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
              Stack moderno y escalable para garantizar el mejor rendimiento
            </p>
          </motion.div>

          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-4"
          >
            {techStack.map((tech) => (
              <motion.div
                key={tech.name}
                variants={fadeInUp}
                className="group flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-5 py-2.5 transition-all hover:border-primary-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-700"
              >
                <span className="font-medium text-neutral-900 dark:text-white">
                  {tech.name}
                </span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
                  {tech.category}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-white py-24 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Planes para cada etapa de tu negocio
            </h2>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
              Elige el plan perfecto para tu empresa y escala segun creces
            </p>
          </motion.div>

          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mx-auto mt-16 grid gap-8 lg:grid-cols-4"
          >
            {pricingPlans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
                className={`relative rounded-2xl border p-8 ${
                  plan.highlighted
                    ? "border-primary-500 bg-primary-50 shadow-xl dark:border-primary-500 dark:bg-primary-950/50"
                    : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary-500 px-4 py-1 text-sm font-medium text-white">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-neutral-900 dark:text-white">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {" "}
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {plan.description}
                  </p>
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 shrink-0 text-primary-500" />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Link
                    to={plan.href}
                    className={`block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
                      plan.highlighted
                        ? "bg-primary-500 text-white hover:bg-primary-600"
                        : "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-linear-to-r from-primary-500 to-primary-700 py-24">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              ¿Listo para transformar tu negocio?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-100">
              Únete a cientos de empresas que ya confían en StockFlow para
              gestionar su inventario y facturación de forma eficiente.
            </p>
            <div className="mt-10">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-block"
              >
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-primary-600 shadow-lg transition-all hover:bg-primary-50"
                >
                  Comenzar Ahora
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary-500 to-primary-700">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <span className="font-display text-xl font-bold text-neutral-900 dark:text-white">
                  Stock<span className="text-primary-500">Flow</span>
                </span>
              </Link>
              <p className="mt-4 max-w-xs text-sm text-neutral-600 dark:text-neutral-400">
                Plataforma multi-tenant de inventario y facturación para PYMEs
                colombianas.
              </p>
            </div>

            {/* Producto */}
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Producto
              </h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <a
                    href="#features"
                    className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    Características
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    Precios
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    Casos de Uso
                  </a>
                </li>
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Empresa
              </h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    Sobre Nosotros
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    Contacto
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Legal
              </h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    Términos y Condiciones
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    Política de Privacidad
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    Cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-8 dark:border-neutral-800 sm:flex-row">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              © 2026 StockFlow. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                <GithubIcon className="h-5 w-5" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                <XIcon className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                <LinkedInIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
