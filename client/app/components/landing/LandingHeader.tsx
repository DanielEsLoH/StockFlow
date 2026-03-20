import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { StockFlowLogo } from "~/components/ui/StockFlowLogo";

// ---------------------------------------------------------------------------
// Scroll helper — exported for use by other landing components
// ---------------------------------------------------------------------------

export function handleScrollToSection(
  e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
  href: string,
  onComplete?: () => void,
): void {
  if (href.startsWith("#")) {
    e.preventDefault();
    onComplete?.();
    const el = document.querySelector(href);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const navLinks = [
  { label: "Producto", href: "#features" },
  { label: "Precios", href: "#precios" },
  { label: "DIAN", href: "#dian" },
  { label: "Empresa", href: "#empresa" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Logo() {
  return (
    <Link to="/" aria-label="StockFlow">
      <StockFlowLogo size="md" showText />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Mobile menu — fullscreen overlay with portal
// ---------------------------------------------------------------------------

function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: (scrollTarget?: string) => void;
}) {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  if (!open || !portalContainer) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
        onClick={() => onClose()}
      />

      {/* Panel */}
      <div
        className="fixed inset-0 z-[9999] overflow-y-auto
                   bg-white dark:bg-neutral-900"
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <button
            onClick={() => onClose()}
            aria-label="Cerrar menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl
                       text-neutral-500 transition-colors hover:bg-neutral-100
                       dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="space-y-1 px-4 pb-6 pt-2">
          {navLinks.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => onClose(link.href)}
              className="block w-full rounded-xl px-3 py-3 text-left text-base
                         font-medium text-neutral-700 transition-colors
                         hover:bg-neutral-50
                         dark:text-neutral-200 dark:hover:bg-neutral-800/60"
            >
              {link.label}
            </button>
          ))}

          {/* Divider */}
          <div className="my-4 border-t border-neutral-200 dark:border-neutral-700/60" />

          {/* CTAs */}
          <Link
            to="/login"
            onClick={() => onClose()}
            className="block rounded-xl px-3 py-3 text-center text-base font-medium
                       text-neutral-700 transition-colors hover:bg-neutral-50
                       dark:text-neutral-200 dark:hover:bg-neutral-800/60"
          >
            Iniciar Sesion
          </Link>
          <Link
            to="/register"
            onClick={() => onClose()}
            className="block rounded-xl bg-gradient-to-r from-primary-500 to-accent-600
                       px-3 py-3 text-center text-base font-semibold text-white
                       shadow-md shadow-primary-500/20 transition-shadow
                       hover:shadow-lg hover:shadow-primary-500/30"
          >
            Empieza Gratis
          </Link>
        </nav>
      </div>
    </>,
    portalContainer,
  );
}

// ---------------------------------------------------------------------------
// Main header
// ---------------------------------------------------------------------------

export function LandingHeader({ isMounted }: { isMounted: boolean }) {
  const [scrolled, setScrolled] = useState(false);
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

  // Close mobile on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024 && mobileOpen) {
        setMobileOpen(false);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileOpen]);

  const pendingScrollRef = useRef<string | null>(null);

  const closeMobile = useCallback((scrollTarget?: string) => {
    if (scrollTarget) {
      pendingScrollRef.current = scrollTarget;
    }
    setMobileOpen(false);
  }, []);

  // Handle pending scroll after menu closes
  useEffect(() => {
    if (!mobileOpen && pendingScrollRef.current) {
      const target = pendingScrollRef.current;
      pendingScrollRef.current = null;
      // Small delay to let the fullscreen menu unmount before scrolling
      setTimeout(() => {
        const el = document.querySelector(target);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 100);
    }
  }, [mobileOpen]);

  return (
    <motion.header
      initial={isMounted ? { y: -20, opacity: 0 } : false}
      animate={{ y: 0, opacity: mobileOpen ? 0 : 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-16 transition-all duration-300",
        mobileOpen && "pointer-events-none",
        scrolled
          ? "border-b border-neutral-200/60 bg-white/80 shadow-sm shadow-neutral-900/5 backdrop-blur-lg dark:border-neutral-700/50 dark:bg-neutral-900/80 dark:shadow-black/10"
          : "bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <Logo />

        {/* Center: Desktop nav — simple links, no dropdown */}
        <div className="hidden items-center gap-1 lg:flex">
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

          {/* Mobile CTA — subtle outline to not compete with hero */}
          <Link
            to="/register"
            className="rounded-lg border border-primary-300 px-3 py-1.5 text-sm
                       font-medium text-primary-600 transition-colors
                       hover:bg-primary-50
                       dark:border-primary-700 dark:text-primary-400
                       dark:hover:bg-primary-950/40 lg:hidden"
          >
            Registrarse
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
