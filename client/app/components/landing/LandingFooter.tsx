import { Link } from "react-router";
import { Package, MessageCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import { handleScrollToSection } from "./LandingHeader";

// ---------------------------------------------------------------------------
// Social icons
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface FooterLink {
  label: string;
  href: string;
}

const productoLinks: FooterLink[] = [
  { label: "Inventario", href: "#features" },
  { label: "Ventas", href: "#features" },
  { label: "Compras", href: "#features" },
  { label: "Contabilidad", href: "#features" },
  { label: "POS", href: "#features" },
  { label: "N\u00f3mina", href: "#features" },
];

const solucionesLinks: FooterLink[] = [
  { label: "Retail", href: "#features" },
  { label: "Distribución", href: "#features" },
  { label: "Servicios", href: "#features" },
  { label: "Restaurantes", href: "#features" },
  { label: "Contaduría", href: "#features" },
];

const recursosLinks: FooterLink[] = [
  { label: "Blog", href: "#empresa" },
  { label: "Centro de Ayuda", href: "#empresa" },
  { label: "API Docs", href: "#empresa" },
  { label: "Contacto", href: "#empresa" },
];

const legalLinks: FooterLink[] = [
  { label: "Términos", href: "#empresa" },
  { label: "Privacidad", href: "#empresa" },
  { label: "Cookies", href: "#empresa" },
];

const socialLinks = [
  {
    label: "GitHub",
    href: "https://github.com/DanielEsLoH/StockFlow",
    icon: GithubIcon,
  },
  {
    label: "X",
    href: "https://x.com/stockflow_co",
    icon: XIcon,
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/stockflow-co",
    icon: LinkedInIcon,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
        {title}
      </h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              onClick={(e) => handleScrollToSection(e, link.href)}
              className="text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LandingFooter
// ---------------------------------------------------------------------------

export function LandingFooter() {
  return (
    <footer id="empresa" className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Grid */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5"
              aria-label="StockFlow"
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  "bg-gradient-to-br from-primary-500 to-accent-600",
                  "shadow-md shadow-primary-500/20",
                )}
              >
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Stock
                <span className="text-primary-400">Flow</span>
              </span>
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              La plataforma integral de inventario, facturación
              electrónica y gestión empresarial diseñada
              para Colombia.
            </p>

            {/* WhatsApp CTA */}
            <a
              href="https://wa.me/573160000000"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2.5",
                "bg-[#25D366] text-sm font-semibold text-white",
                "shadow-sm transition-all hover:bg-[#20bd5a] hover:shadow-md",
              )}
            >
              <MessageCircle className="h-4 w-4" />
              Escríbenos por WhatsApp
            </a>
          </div>

          {/* Link columns */}
          <FooterColumn title="Producto" links={productoLinks} />
          <FooterColumn title="Soluciones" links={solucionesLinks} />
          <FooterColumn title="Recursos" links={recursosLinks} />
          <FooterColumn title="Legal" links={legalLinks} />
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-8 sm:flex-row dark:border-neutral-800">
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            &copy; 2026 StockFlow. Todos los derechos reservados.
          </p>

          {/* Social links */}
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  "text-neutral-400 transition-colors",
                  "hover:bg-neutral-100 hover:text-neutral-600",
                  "dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300",
                )}
              >
                <social.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
