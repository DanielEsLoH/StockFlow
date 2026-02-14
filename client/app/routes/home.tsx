import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { AnimatedNumber } from "~/components/ui/AnimatedNumber";
import { Badge } from "~/components/ui/Badge";
import { Card } from "~/components/ui/Card";
import { Switch } from "~/components/ui/Switch";
import { motion, AnimatePresence } from "framer-motion";
import { requireGuest } from "~/lib/auth.server";
import { cn } from "~/lib/utils";

import {
  Package,
  FileText,
  BarChart3,
  CreditCard,
  ShieldCheck,
  ArrowRightLeft,
  Tag,
  Warehouse,
  UserPlus,
  Settings,
  TrendingUp,
  Menu,
  X,
  Check,
  ChevronRight,
  Sparkles,
  Shield,
  Quote,
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

/**
 * Handles smooth scrolling for hash-based anchor links.
 * For non-hash hrefs, does nothing (lets the browser handle navigation).
 */
export function handleScrollToSection(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onScrollComplete?: () => void,
): void {
  if (href.startsWith("#")) {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      onScrollComplete?.();
    }
  }
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

// Hero word rotation
const heroWords = ["simplificado", "automatizado", "en control"];

// Social proof stats
const socialProofStats = [
  { value: 500, label: "Empresas activas", suffix: "+" },
  { value: 50000, label: "Facturas generadas", suffix: "+" },
  { value: 99.9, label: "Uptime garantizado", suffix: "%" },
  { value: 24, label: "Soporte disponible", suffix: "/7" },
];

// Features data with bento grid sizes
const features = [
  {
    icon: Package,
    title: "Inventario Multi-Bodega",
    description:
      "Control de stock en tiempo real con alertas de bajo inventario, transferencias entre bodegas y trazabilidad completa de cada movimiento.",
    size: "large" as const,
  },
  {
    icon: FileText,
    title: "Facturación Electrónica DIAN",
    description:
      "Generación automática de facturas electrónicas validadas por la DIAN. Cumplimiento normativo colombiano garantizado con envío directo.",
    size: "large" as const,
  },
  {
    icon: Warehouse,
    title: "Gestión Multi-Bodega",
    description:
      "Administra múltiples bodegas y puntos de venta desde una sola plataforma con sincronización en tiempo real.",
    size: "medium" as const,
  },
  {
    icon: CreditCard,
    title: "Gestión de Pagos",
    description:
      "Seguimiento de pagos, métodos múltiples y conciliación automática con tu flujo de facturación.",
    size: "medium" as const,
  },
  {
    icon: BarChart3,
    title: "Reportes & Analytics",
    description: "Dashboard con métricas en tiempo real y análisis de tendencias.",
    size: "small" as const,
  },
  {
    icon: ArrowRightLeft,
    title: "Movimientos de Stock",
    description: "Trazabilidad completa de entradas, salidas y transferencias.",
    size: "small" as const,
  },
  {
    icon: Tag,
    title: "SKU & Categorías",
    description: "Organiza tu catálogo con códigos únicos y categorías flexibles.",
    size: "small" as const,
  },
  {
    icon: ShieldCheck,
    title: "Roles & Permisos",
    description: "4 roles configurables con permisos granulares por módulo.",
    size: "small" as const,
  },
];

// How it works steps
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

// Testimonials data
const testimonials = [
  {
    name: "María González",
    role: "Gerente, Distribuidora del Valle",
    content:
      "StockFlow transformó nuestra operación. Antes perdíamos horas en Excel, ahora todo está automatizado y en tiempo real.",
  },
  {
    name: "Carlos Rodríguez",
    role: "CEO, TechStore Colombia",
    content:
      "La facturación electrónica con DIAN fue lo que nos convenció. Funciona perfecto y nos ahorra tiempo cada mes.",
  },
  {
    name: "Ana Martínez",
    role: "Contadora, Grupo Orion",
    content:
      "Como contadora, necesito datos precisos. Los reportes de StockFlow me dan exactamente lo que necesito para mis clientes.",
  },
];

// DIAN trust points
const dianTrustPoints = [
  "Facturación electrónica autorizada por la DIAN",
  "Validación en tiempo real de documentos tributarios",
  "Numeración consecutiva automática",
  "Generación de CUFE para cada factura",
  "Cumplimiento total de la Resolución 000165 de 2023",
];

// Tech stack data
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

// Pricing plans data
const pricingPlans = [
  {
    name: "EMPRENDEDOR",
    price: "$69,900",
    annualPrice: "$59,400",
    period: "COP/mes",
    description: "Para emprendedores que inician",
    features: [
      "1 usuario + 1 contador gratis",
      "1 bodega",
      "Productos ilimitados",
      "Facturas ilimitadas",
      "Facturación electrónica DIAN",
      "Soporte por email",
      "Reportes básicos",
    ],
    cta: "Comenzar Ahora",
    href: "/register?plan=emprendedor",
    highlighted: false,
  },
  {
    name: "PYME",
    price: "$149,900",
    annualPrice: "$127,400",
    period: "COP/mes",
    description: "Para pequeñas empresas en crecimiento",
    features: [
      "2 usuarios + 1 contador gratis",
      "2 bodegas",
      "Productos ilimitados",
      "Facturas ilimitadas",
      "Facturación electrónica DIAN",
      "Soporte prioritario",
      "Reportes avanzados",
      "Notificaciones de stock",
    ],
    cta: "Comenzar Ahora",
    href: "/register?plan=pyme",
    highlighted: true,
    badge: "Más Popular",
  },
  {
    name: "PRO",
    price: "$219,900",
    annualPrice: "$186,900",
    period: "COP/mes",
    description: "Para empresas en expansión",
    features: [
      "3 usuarios + 1 contador gratis",
      "10 bodegas",
      "Productos ilimitados",
      "Facturas ilimitadas",
      "Facturación electrónica DIAN",
      "Soporte 24/7",
      "Reportes personalizados",
      "Integraciones básicas",
      "Alertas automatizadas",
    ],
    cta: "Comenzar Ahora",
    href: "/register?plan=pro",
    highlighted: false,
  },
  {
    name: "PLUS",
    price: "$279,900",
    annualPrice: "$237,900",
    period: "COP/mes",
    description: "Para empresas consolidadas",
    features: [
      "8 usuarios + 1 contador gratis",
      "100 bodegas",
      "Productos ilimitados",
      "Facturas ilimitadas",
      "Facturación electrónica DIAN",
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

// Navigation links
const navLinks = [
  { name: "Características", href: "#features" },
  { name: "Cómo Funciona", href: "#how-it-works" },
  { name: "Precios", href: "#pricing" },
  { name: "Tecnología", href: "#tech" },
];

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Header scroll effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hero word rotation
  useEffect(() => {
    if (!isMounted) return;
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % heroWords.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isMounted]);

  const scrollToSection = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      handleScrollToSection(e, href, () => setMobileMenuOpen(false));
    },
    [],
  );

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* ============================================
          HEADER - Sticky with Transparency Effect
          ============================================ */}
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
          isScrolled
            ? "border-b border-neutral-200 bg-white/80 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-950/80"
            : "bg-transparent",
        )}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary-500 to-primary-700">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span
              className={cn(
                "font-display text-xl font-bold transition-colors duration-300",
                isScrolled
                  ? "text-neutral-900 dark:text-white"
                  : "text-neutral-900 dark:text-white",
              )}
            >
              Stock
              <span className="text-primary-400">Flow</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className={cn(
                  "text-sm font-medium transition-colors",
                  isScrolled
                    ? "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white",
                )}
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
              className={cn(
                "text-sm font-medium transition-colors",
                isScrolled
                  ? "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white",
              )}
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
              className={cn(
                "rounded-lg p-2 transition-colors",
                isScrolled
                  ? "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10",
              )}
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

      {/* ============================================
          HERO SECTION - Dark Premium with Gradient Mesh
          ============================================ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-neutral-100 via-neutral-50 to-white pt-16 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-primary-500/10 blur-[120px] animate-gradient-mesh-1 dark:bg-primary-500/20" />
          <div className="absolute -right-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-accent-500/8 blur-[100px] animate-gradient-mesh-2 dark:bg-accent-500/15" />
          <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-primary-700/10 blur-[80px] animate-gradient-mesh-3 dark:bg-primary-700/20" />
        </div>

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30 dark:opacity-50" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={isMounted ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* DIAN Badge */}
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-sm font-medium text-primary-600 backdrop-blur-sm dark:border-primary-500/30 dark:text-primary-300">
                <Sparkles className="h-4 w-4" />
                <span>Nuevo: Facturación electrónica DIAN</span>
              </div>

              {/* Headline with word rotation */}
              <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl lg:text-7xl">
                Gestiona tu inventario de forma{" "}
                <span className="relative inline-block">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={heroWords[currentWordIndex]}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="text-gradient inline-block"
                    >
                      {heroWords[currentWordIndex]}
                    </motion.span>
                  </AnimatePresence>
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
                    className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-primary-500 to-accent-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:shadow-xl hover:shadow-primary-500/40"
                  >
                    Comenzar Ahora
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-neutral-100/50 px-8 py-4 text-base font-semibold text-neutral-700 backdrop-blur-sm transition-all hover:border-neutral-400 hover:bg-neutral-200/50 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/50"
                  >
                    Ver Demo
                  </Link>
                </motion.div>
              </div>

              {/* Trust text */}
              <p className="mt-8 text-sm text-neutral-500">
                Sin tarjeta de crédito · Listo en 2 minutos · +500 empresas
                confían en StockFlow
              </p>
            </motion.div>
          </div>

          {/* Dashboard Screenshot with glow */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: 40 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative mx-auto mt-16 max-w-5xl"
          >
            {/* Glow behind screenshot */}
            <div className="absolute -inset-4 rounded-3xl bg-linear-to-r from-primary-500/20 via-accent-500/10 to-primary-500/20 blur-2xl" />

            <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 shadow-2xl shadow-primary-500/10 dark:border-neutral-700/50 dark:bg-neutral-900">
              <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-200/80 px-4 py-3 dark:border-neutral-700/50 dark:bg-neutral-800/80">
                <div className="h-3 w-3 rounded-full bg-red-400/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <div className="h-3 w-3 rounded-full bg-green-400/80" />
                <span className="ml-2 text-sm text-neutral-500">
                  dashboard.stockflow.co
                </span>
              </div>
              <div>
                <img
                  src="/dashboard-preview.png"
                  alt="Vista previa del Dashboard de StockFlow"
                  className="block h-auto w-full border-0"
                  loading="lazy"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          SOCIAL PROOF BAR - Overlapping glass card
          ============================================ */}
      <section className="relative z-10 bg-white dark:bg-neutral-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={isMounted ? { opacity: 0, y: 20 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="-mt-12 rounded-2xl border border-neutral-200/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-900/80 sm:p-8"
          >
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
              {socialProofStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex items-baseline justify-center gap-0.5">
                    <AnimatedNumber
                      value={stat.value}
                      className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl"
                      formatFn={
                        stat.suffix === "%"
                          ? (n: number) => n.toFixed(1)
                          : (n: number) =>
                              Math.round(n).toLocaleString("es-CO")
                      }
                    />
                    <span className="text-gradient text-lg font-bold sm:text-xl">
                      {stat.suffix}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 sm:text-sm">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          BENTO GRID FEATURES
          ============================================ */}
      <section id="features" className="bg-white py-24 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-center"
          >
            <Badge variant="primary" pill className="mb-4">
              Características
            </Badge>
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
            className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:border-primary-200 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-primary-800",
                  feature.size === "large" && "sm:col-span-2 sm:row-span-2 p-8",
                  feature.size === "medium" && "sm:col-span-2 p-7",
                )}
              >
                <div
                  className={cn(
                    "mb-4 inline-flex rounded-xl p-3",
                    "bg-linear-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/30 dark:to-primary-800/20",
                  )}
                >
                  <feature.icon
                    className={cn(
                      "text-primary-500",
                      feature.size === "large" ? "h-8 w-8" : "h-6 w-6",
                    )}
                  />
                </div>
                <h3
                  className={cn(
                    "font-semibold text-neutral-900 dark:text-white",
                    feature.size === "large" ? "text-xl" : "text-lg",
                  )}
                >
                  {feature.title}
                </h3>
                <p
                  className={cn(
                    "mt-2 text-neutral-600 dark:text-neutral-400",
                    feature.size === "small" && "text-sm",
                  )}
                >
                  {feature.description}
                </p>
                {/* Accent line on hover */}
                <div className="absolute bottom-0 left-0 h-0.5 w-full scale-x-0 bg-linear-to-r from-primary-500 to-accent-500 transition-transform duration-300 group-hover:scale-x-100" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          HOW IT WORKS - 3 Step Process
          ============================================ */}
      <section
        id="how-it-works"
        className="bg-neutral-50 py-24 dark:bg-neutral-900/50"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={isMounted ? "hidden" : false}
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
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-3"
          >
            {howItWorksSteps.map((step, index) => (
              <motion.div
                key={step.step}
                variants={fadeInUp}
                className="relative text-center"
              >
                {/* Connector line between steps */}
                {index < howItWorksSteps.length - 1 && (
                  <div className="absolute left-1/2 top-12 hidden h-0.5 w-full bg-linear-to-r from-primary-300 to-accent-300 dark:from-primary-700 dark:to-accent-700 md:block" />
                )}

                {/* Step circle */}
                <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-linear-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md dark:bg-neutral-800">
                    <step.icon className="h-7 w-7 text-primary-500" />
                  </div>
                  {/* Step number badge */}
                  <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-r from-primary-500 to-accent-500 text-xs font-bold text-white shadow-sm">
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

      {/* ============================================
          TESTIMONIALS
          ============================================ */}
      <section className="bg-white py-24 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-center"
          >
            <Badge variant="primary" pill className="mb-4">
              Testimonios
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Lo que dicen nuestros clientes
            </h2>
          </motion.div>

          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3"
          >
            {testimonials.map((testimonial) => (
              <motion.div key={testimonial.name} variants={fadeInUp}>
                <Card
                  variant="glass-elevated"
                  hover="lift"
                  padding="lg"
                  className="h-full"
                >
                  <Quote className="mb-4 h-8 w-8 text-primary-300 dark:text-primary-700" />
                  <p className="text-neutral-600 dark:text-neutral-400">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    {/* Avatar with gradient initials */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-primary-500 to-accent-500 text-sm font-bold text-white">
                      {testimonial.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {testimonial.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          DIAN COMPLIANCE & TRUST
          ============================================ */}
      <section className="bg-neutral-50 py-24 dark:bg-neutral-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid items-center gap-12 lg:grid-cols-2"
          >
            {/* Left - Content */}
            <motion.div variants={fadeInUp}>
              <Badge variant="gradient" className="mb-4">
                Cumplimiento DIAN
              </Badge>
              <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
                Facturación electrónica con respaldo total
              </h2>
              <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
                StockFlow cumple con todos los requisitos de la DIAN para
                facturación electrónica en Colombia. Tu negocio siempre en
                regla.
              </p>

              <ul className="mt-8 space-y-4">
                {dianTrustPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/30">
                      <Check className="h-3 w-3 text-success-600 dark:text-success-400" />
                    </div>
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Right - Visual card */}
            <motion.div variants={fadeInUp}>
              <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary-500 to-accent-500">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      Factura Electrónica
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Validada por la DIAN
                    </p>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
                  {[
                    { label: "Resolución", value: "18764000001234" },
                    { label: "Prefijo", value: "SETT" },
                    { label: "Rango", value: "1 - 5000" },
                    { label: "Vigencia", value: "2025-01-01 / 2026-12-31" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {item.label}
                      </span>
                      <span className="font-mono text-sm font-medium text-neutral-900 dark:text-white">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-center">
                  <Badge variant="gradient-success" size="lg">
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Documento Validado
                  </Badge>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          PRICING - with Monthly/Annual Toggle
          ============================================ */}
      <section id="pricing" className="bg-white py-24 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-center"
          >
            <Badge variant="primary" pill className="mb-4">
              Precios
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Planes para cada etapa de tu negocio
            </h2>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
              Elige el plan perfecto para tu empresa y escala según creces
            </p>

            {/* Monthly/Annual Toggle */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  !isAnnual
                    ? "text-neutral-900 dark:text-white"
                    : "text-neutral-500 dark:text-neutral-400",
                )}
              >
                Mensual
              </span>
              <Switch
                checked={isAnnual}
                onChange={setIsAnnual}
                size="sm"
              />
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  isAnnual
                    ? "text-neutral-900 dark:text-white"
                    : "text-neutral-500 dark:text-neutral-400",
                )}
              >
                Anual
              </span>
              {isAnnual && (
                <Badge variant="gradient" size="sm">
                  -15%
                </Badge>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mx-auto mt-12 grid gap-6 lg:grid-cols-4"
          >
            {pricingPlans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
                className={cn(
                  "relative rounded-2xl border p-8 transition-all",
                  plan.highlighted
                    ? "border-primary-500 bg-linear-to-b from-primary-50 to-white shadow-xl shadow-primary-500/10 dark:border-primary-500 dark:from-primary-900/20 dark:to-neutral-900"
                    : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge variant="gradient">{plan.badge}</Badge>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-neutral-900 dark:text-white">
                      {isAnnual ? plan.annualPrice : plan.price}
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {" "}
                      {plan.period}
                    </span>
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
                    className={cn(
                      "block w-full rounded-lg py-3 text-center text-sm font-semibold transition-all",
                      plan.highlighted
                        ? "bg-linear-to-r from-primary-500 to-accent-600 text-white shadow-md shadow-primary-500/25 hover:shadow-lg hover:shadow-primary-500/30"
                        : "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700",
                    )}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          TECH STACK
          ============================================ */}
      <section
        id="tech"
        className="bg-neutral-50 py-24 dark:bg-neutral-900/50"
      >
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
                className="group flex items-center gap-3 rounded-full border border-neutral-200/60 bg-white/80 px-5 py-2.5 backdrop-blur-sm transition-all hover:border-primary-300 hover:shadow-md dark:border-neutral-700/60 dark:bg-neutral-800/80 dark:hover:border-primary-700"
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

      {/* ============================================
          FINAL CTA - Dark Premium
          ============================================ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-neutral-100 to-neutral-50 py-24 dark:from-neutral-950 dark:to-neutral-950">
        {/* Gradient mesh orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-1/4 top-0 h-[300px] w-[300px] rounded-full bg-primary-500/8 blur-[80px] animate-gradient-mesh-1 dark:bg-primary-500/15" />
          <div className="absolute -right-1/4 bottom-0 h-[250px] w-[250px] rounded-full bg-accent-500/5 blur-[60px] animate-gradient-mesh-2 dark:bg-accent-500/10" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={isMounted ? "hidden" : false}
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              ¿Listo para transformar tu negocio?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
              Únete a cientos de empresas que ya confían en StockFlow para
              gestionar su inventario y facturación de forma eficiente.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-primary-500 to-accent-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:shadow-xl hover:shadow-primary-500/40"
                >
                  Comenzar Ahora
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <a
                  href="#pricing"
                  onClick={(e) => scrollToSection(e, "#pricing")}
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-neutral-100/50 px-8 py-4 text-base font-semibold text-neutral-700 backdrop-blur-sm transition-all hover:border-neutral-400 hover:bg-neutral-200/50 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/50"
                >
                  Ver Planes
                </a>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          FOOTER
          ============================================ */}
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
                    href="#how-it-works"
                    className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  >
                    Cómo Funciona
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
