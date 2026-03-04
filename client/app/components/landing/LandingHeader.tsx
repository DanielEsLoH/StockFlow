import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  FileText,
  ShoppingCart,
  BookOpen,
  MonitorSmartphone,
  UserCheck,
  Settings,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { ThemeToggle } from "~/components/ui/ThemeToggle";

// ---------------------------------------------------------------------------
// Scroll helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface ProductCategory {
  icon: React.ElementType;
  name: string;
  description: string;
  href: string;
}

const productCategories: ProductCategory[] = [
  {
    icon: Package,
    name: "Inventario",
    description: "Control de stock multi-bodega en tiempo real",
    href: "#inventario",
  },
  {
    icon: FileText,
    name: "Ventas",
    description: "Facturacion electronica y cotizaciones",
    href: "#ventas",
  },
  {
    icon: ShoppingCart,
    name: "Compras",
    description: "Ordenes de compra y gestion de proveedores",
    href: "#compras",
  },
  {
    icon: BookOpen,
    name: "Contabilidad",
    description: "Libros contables y reportes financieros",
    href: "#contabilidad",
  },
  {
    icon: MonitorSmartphone,
    name: "POS",
    description: "Punto de venta rapido y sin conexion",
    href: "#pos",
  },
  {
    icon: UserCheck,
    name: "Nomina",
    description: "Liquidacion de nomina y seguridad social",
    href: "#nomina",
  },
  {
    icon: Settings,
    name: "Administracion",
    description: "Roles, permisos y configuracion global",
    href: "#administracion",
  },
];

const navLinks = [
  { label: "Precios", href: "#precios" },
  { label: "DIAN", href: "#dian" },
  { label: "Empresa", href: "#empresa" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="StockFlow">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl
                    bg-gradient-to-br from-primary-500 to-accent-600
                    shadow-md shadow-primary-500/20"
      >
        <Package className="h-5 w-5 text-white" />
      </div>
      <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
        Stock<span className="text-primary-400">Flow</span>
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Mega-menu (desktop)
// ---------------------------------------------------------------------------

function MegaMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute left-1/2 top-full z-50 mt-2 w-[640px] -translate-x-1/2
                     rounded-2xl border border-neutral-200/70 bg-white/95 p-5
                     shadow-xl shadow-neutral-900/5 backdrop-blur-xl
                     dark:border-neutral-700/60 dark:bg-neutral-900/95 dark:shadow-black/20"
        >
          <div className="mb-3 px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Modulos
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {productCategories.map((cat) => (
              <a
                key={cat.name}
                href={cat.href}
                onClick={(e) =>
                  handleScrollToSection(e, cat.href, onClose)
                }
                className="group flex items-start gap-3 rounded-xl p-3
                           transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                              bg-primary-50 text-primary-600
                              transition-colors group-hover:bg-primary-100
                              dark:bg-primary-900/20 dark:text-primary-400
                              dark:group-hover:bg-primary-900/40"
                >
                  <cat.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {cat.name}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                    {cat.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Mobile menu
// ---------------------------------------------------------------------------

function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [productOpen, setProductOpen] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm
                       overflow-y-auto border-l border-neutral-200/60
                       bg-white dark:border-neutral-700/60 dark:bg-neutral-900"
          >
            {/* Panel header */}
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button
                onClick={onClose}
                aria-label="Cerrar menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl
                           text-neutral-500 transition-colors hover:bg-neutral-100
                           dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav */}
            <nav className="space-y-1 px-4 pb-6 pt-2">
              {/* Producto accordion */}
              <div>
                <button
                  onClick={() => setProductOpen(!productOpen)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5
                             text-left text-sm font-medium text-neutral-700 transition-colors
                             hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800/60"
                >
                  Producto
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-neutral-400 transition-transform duration-200",
                      productOpen && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {productOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1 pb-2 pl-3 pt-1">
                        {productCategories.map((cat) => (
                          <a
                            key={cat.name}
                            href={cat.href}
                            onClick={(e) =>
                              handleScrollToSection(e, cat.href, onClose)
                            }
                            className="flex items-center gap-3 rounded-lg px-3 py-2
                                       text-sm text-neutral-600 transition-colors
                                       hover:bg-neutral-50 hover:text-neutral-900
                                       dark:text-neutral-400 dark:hover:bg-neutral-800/60
                                       dark:hover:text-neutral-100"
                          >
                            <cat.icon className="h-4 w-4 shrink-0 text-primary-500" />
                            <span>{cat.name}</span>
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Other links */}
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) =>
                    handleScrollToSection(e, link.href, onClose)
                  }
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium
                             text-neutral-700 transition-colors hover:bg-neutral-50
                             dark:text-neutral-200 dark:hover:bg-neutral-800/60"
                >
                  {link.label}
                </a>
              ))}

              {/* Divider */}
              <div className="my-4 border-t border-neutral-200 dark:border-neutral-700/60" />

              {/* CTAs */}
              <Link
                to="/login"
                onClick={onClose}
                className="block rounded-xl px-3 py-2.5 text-center text-sm font-medium
                           text-neutral-700 transition-colors hover:bg-neutral-50
                           dark:text-neutral-200 dark:hover:bg-neutral-800/60"
              >
                Iniciar Sesion
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="block rounded-xl bg-gradient-to-r from-primary-500 to-accent-600
                           px-3 py-2.5 text-center text-sm font-semibold text-white
                           shadow-md shadow-primary-500/20 transition-shadow
                           hover:shadow-lg hover:shadow-primary-500/30"
              >
                Empieza Gratis
              </Link>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Main header
// ---------------------------------------------------------------------------

export function LandingHeader({ isMounted }: { isMounted: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Track scroll
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile on resize
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024 && mobileOpen) {
        setMobileOpen(false);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMega = useCallback(() => setMegaOpen(false), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <motion.header
      initial={isMounted ? { y: -20, opacity: 0 } : false}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-16 transition-all duration-300",
        scrolled
          ? "border-b border-neutral-200/60 bg-white/80 shadow-sm shadow-neutral-900/5 backdrop-blur-lg dark:border-neutral-700/50 dark:bg-neutral-900/80 dark:shadow-black/10"
          : "bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <Logo />

        {/* Center: Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {/* Producto dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => setMegaOpen(!megaOpen)}
              onMouseEnter={() => setMegaOpen(true)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                megaOpen
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white",
              )}
            >
              Producto
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  megaOpen && "rotate-180",
                )}
              />
            </button>
            <MegaMenu open={megaOpen} onClose={closeMega} />
          </div>

          {/* Other links */}
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleScrollToSection(e, link.href)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600
                         transition-colors hover:text-neutral-900
                         dark:text-neutral-300 dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right: CTAs */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600
                         transition-colors hover:bg-neutral-100 hover:text-neutral-900
                         dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              Iniciar Sesion
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-gradient-to-r from-primary-500 to-accent-600
                         px-4 py-2 text-sm font-semibold text-white shadow-md
                         shadow-primary-500/20 transition-all hover:shadow-lg
                         hover:shadow-primary-500/30 hover:brightness-110"
            >
              Empieza Gratis
            </Link>
          </div>

          {/* Mobile: always-visible CTA + hamburger */}
          <Link
            to="/register"
            className="rounded-lg bg-gradient-to-r from-primary-500 to-accent-600
                       px-3 py-1.5 text-sm font-semibold text-white shadow-md
                       shadow-primary-500/20 lg:hidden"
          >
            Empieza Gratis
          </Link>

          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl
                       text-neutral-600 transition-colors hover:bg-neutral-100
                       dark:text-neutral-300 dark:hover:bg-neutral-800 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <MobileMenu open={mobileOpen} onClose={closeMobile} />
    </motion.header>
  );
}
