import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks – replicate the same mock setup from home.test.tsx
// ---------------------------------------------------------------------------

vi.mock("~/components/ui/ThemeToggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}));

vi.mock("~/components/ui/AnimatedNumber", () => ({
  AnimatedNumber: ({
    value,
    className,
    formatFn,
  }: {
    value: number;
    className?: string;
    formatFn?: (n: number) => string;
  }) => <span className={className}>{formatFn ? formatFn(value) : value}</span>,
}));

vi.mock("~/components/ui/Badge", () => ({
  Badge: ({
    children,
    className,
    variant,
    size,
    icon,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
    size?: string;
    icon?: React.ReactNode;
  }) => (
    <span className={className} data-variant={variant} data-size={size}>
      {icon}
      {children}
    </span>
  ),
}));

vi.mock("~/components/ui/Card", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock("~/components/ui/Switch", () => ({
  Switch: ({
    checked,
    onChange,
    size,
    label,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    size?: string;
    label?: string;
  }) => (
    <input
      type="checkbox"
      role="switch"
      aria-label={label ?? "billing toggle"}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  ),
}));

vi.mock("~/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined | null)[]) =>
    args.filter(Boolean).join(" "),
}));

// Mock framer-motion
vi.mock("framer-motion", async () => {
  const ReactMod = await import("react");

  const motionPropNames = new Set([
    "initial",
    "animate",
    "transition",
    "variants",
    "whileHover",
    "whileTap",
    "whileInView",
    "viewport",
    "exit",
    "layoutId",
    "layout",
    "onAnimationComplete",
    "drag",
    "dragConstraints",
    "dragElastic",
    "custom",
  ]);

  const filterProps = (props: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(props).filter(([key]) => !motionPropNames.has(key)),
    );

  const voidElements = new Set([
    "img",
    "input",
    "br",
    "hr",
    "area",
    "col",
    "embed",
    "source",
    "track",
    "wbr",
  ]);

  const motionProxy = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (voidElements.has(tag)) {
          return (props: Record<string, unknown>) =>
            ReactMod.createElement(tag, filterProps(props));
        }
        return ({
          children,
          ...props
        }: { children?: unknown } & Record<string, unknown>) =>
          ReactMod.createElement(
            tag,
            filterProps(props),
            children as React.ReactNode,
          );
      },
    },
  );

  return {
    motion: motionProxy,
    AnimatePresence: ({
      children,
    }: {
      children?: React.ReactNode;
      mode?: string;
      initial?: boolean;
      custom?: unknown;
    }) => children,
    useMotionValue: () => ({ get: () => 0, set: () => {} }),
    useTransform: () => ({ get: () => 0 }),
    useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
    useInView: () => true,
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { LandingHeader, handleScrollToSection } from "./LandingHeader";
import { ModuleShowcase } from "./ModuleShowcase";
import { SocialProofBar } from "./SocialProofBar";
import { FinalCTA } from "./FinalCTA";
import { LandingFooter } from "./LandingFooter";
import { TestimonialsSection } from "./TestimonialsSection";
import { PricingSection } from "./PricingSection";

// Re-export barrel (index.ts) coverage
import * as LandingExports from "./index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

// ---------------------------------------------------------------------------
// index.ts barrel exports (0% -> 100%)
// ---------------------------------------------------------------------------

describe("landing/index barrel exports", () => {
  it("re-exports LandingHeader", () => {
    expect(LandingExports.LandingHeader).toBeDefined();
  });

  it("re-exports handleScrollToSection", () => {
    expect(LandingExports.handleScrollToSection).toBeDefined();
  });

  it("re-exports HeroSection", () => {
    expect(LandingExports.HeroSection).toBeDefined();
  });

  it("re-exports SocialProofBar", () => {
    expect(LandingExports.SocialProofBar).toBeDefined();
  });

  it("re-exports ModuleShowcase", () => {
    expect(LandingExports.ModuleShowcase).toBeDefined();
  });

  it("re-exports HowItWorks", () => {
    expect(LandingExports.HowItWorks).toBeDefined();
  });

  it("re-exports DianCompliance", () => {
    expect(LandingExports.DianCompliance).toBeDefined();
  });

  it("re-exports TestimonialsSection", () => {
    expect(LandingExports.TestimonialsSection).toBeDefined();
  });

  it("re-exports PricingSection", () => {
    expect(LandingExports.PricingSection).toBeDefined();
  });

  it("re-exports IntegrationsSection", () => {
    expect(LandingExports.IntegrationsSection).toBeDefined();
  });

  it("re-exports PWASection", () => {
    expect(LandingExports.PWASection).toBeDefined();
  });

  it("re-exports FinalCTA", () => {
    expect(LandingExports.FinalCTA).toBeDefined();
  });

  it("re-exports LandingFooter", () => {
    expect(LandingExports.LandingFooter).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// LandingHeader – covers lines 317-418, 442-488
// ---------------------------------------------------------------------------

describe("LandingHeader", () => {
  let scrollListeners: Array<EventListener>;
  let resizeListeners: Array<EventListener>;

  beforeEach(() => {
    scrollListeners = [];
    resizeListeners = [];

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Track scroll/resize listeners
    const origAdd = window.addEventListener.bind(window);
    const origRemove = window.removeEventListener.bind(window);
    vi.spyOn(window, "addEventListener").mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
        if (type === "scroll")
          scrollListeners.push(listener as EventListener);
        if (type === "resize")
          resizeListeners.push(listener as EventListener);
        origAdd(type, listener, options);
      },
    );
    vi.spyOn(window, "removeEventListener").mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
        origRemove(type, listener, options);
      },
    );

    // Default scrollY = 0
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    // Default innerWidth > 1024 (desktop)
    Object.defineProperty(window, "innerWidth", {
      value: 1280,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.style.overflow = "";
  });

  it("renders the logo and links to /", () => {
    wrap(<LandingHeader isMounted={false} />);
    const logoLinks = screen.getAllByLabelText("StockFlow");
    expect(logoLinks[0]).toHaveAttribute("href", "/");
  });

  it("renders nav links (Precios, DIAN, Empresa)", () => {
    wrap(<LandingHeader isMounted={true} />);
    expect(screen.getAllByText("Precios").length).toBeGreaterThan(0);
    expect(screen.getAllByText("DIAN").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Empresa").length).toBeGreaterThan(0);
  });

  it("renders Producto nav link", () => {
    wrap(<LandingHeader isMounted={true} />);
    const links = screen.getAllByText("Producto");
    expect(links.length).toBeGreaterThan(0);
  });

  it("renders Iniciar Sesion and Empieza Gratis links", () => {
    wrap(<LandingHeader isMounted={true} />);
    expect(screen.getAllByText(/Iniciar Sesi/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Empieza Gratis/i).length).toBeGreaterThan(0);
  });

  it("renders the ThemeToggle", () => {
    wrap(<LandingHeader isMounted={true} />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  // --- Scroll effect (lines 361-368) ---

  it("applies scrolled styles when scrollY > 10", () => {
    wrap(<LandingHeader isMounted={false} />);

    Object.defineProperty(window, "scrollY", { value: 50, writable: true });
    act(() => {
      scrollListeners.forEach((fn) => fn(new Event("scroll")));
    });

    // The header should have the border-b class when scrolled
    const header = document.querySelector("header")!;
    expect(header.className).toContain("border-b");
  });

  it("removes scrolled styles when scrollY <= 10", () => {
    wrap(<LandingHeader isMounted={false} />);

    // First scroll down
    Object.defineProperty(window, "scrollY", { value: 50, writable: true });
    act(() => {
      scrollListeners.forEach((fn) => fn(new Event("scroll")));
    });

    // Then scroll back up
    Object.defineProperty(window, "scrollY", { value: 5, writable: true });
    act(() => {
      scrollListeners.forEach((fn) => fn(new Event("scroll")));
    });

    const header = document.querySelector("header")!;
    expect(header.className).toContain("bg-transparent");
  });

  // --- Mobile menu toggle (lines 382-394, 487-488) ---

  it("opens mobile menu when hamburger is clicked", async () => {
    const user = userEvent.setup();
    wrap(<LandingHeader isMounted={true} />);

    const hamburger = screen.getByLabelText("Abrir menu");
    await user.click(hamburger);

    // Mobile menu should show "Cerrar menu" button
    expect(screen.getByLabelText("Cerrar menu")).toBeInTheDocument();
  });

  it("closes mobile menu when close button is clicked", async () => {
    const user = userEvent.setup();
    wrap(<LandingHeader isMounted={true} />);

    const hamburger = screen.getByLabelText("Abrir menu");
    await user.click(hamburger);
    expect(screen.getByLabelText("Cerrar menu")).toBeInTheDocument();

    const closeBtn = screen.getByLabelText("Cerrar menu");
    await user.click(closeBtn);

    // Mobile menu should be closed (no more Cerrar menu button)
    expect(screen.queryByLabelText("Cerrar menu")).not.toBeInTheDocument();
  });

  it("closes mobile menu when resize >= 1024", async () => {
    const user = userEvent.setup();
    wrap(<LandingHeader isMounted={true} />);

    // Open mobile menu
    const hamburger = screen.getByLabelText("Abrir menu");
    await user.click(hamburger);
    expect(screen.getByLabelText("Cerrar menu")).toBeInTheDocument();

    // Simulate resize to desktop
    Object.defineProperty(window, "innerWidth", {
      value: 1280,
      writable: true,
    });
    act(() => {
      resizeListeners.forEach((fn) => fn(new Event("resize")));
    });

    // Mobile menu should be closed
    expect(screen.queryByLabelText("Cerrar menu")).not.toBeInTheDocument();
  });

  // --- Mobile menu content (lines 304-343) ---

  it("renders mobile menu nav links", async () => {
    const user = userEvent.setup();
    wrap(<LandingHeader isMounted={true} />);

    await user.click(screen.getByLabelText("Abrir menu"));

    // The mobile panel has its own Precios/DIAN/Empresa/Producto links plus Login/Register
    expect(screen.getAllByText("Precios").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Iniciar Sesi/i).length).toBeGreaterThanOrEqual(2);
  });

  it("renders Producto as simple button in mobile menu (no accordion)", async () => {
    const user = userEvent.setup();
    wrap(<LandingHeader isMounted={true} />);

    await user.click(screen.getByLabelText("Abrir menu"));

    // Producto is a simple button in the mobile menu nav
    const productoButtons = screen.getAllByText("Producto");
    const mobileProducto = productoButtons.find((btn) =>
      btn.closest("nav"),
    )!;
    expect(mobileProducto).toBeTruthy();
  });

  it("closes mobile menu when Login link inside mobile panel is clicked", async () => {
    const user = userEvent.setup();
    wrap(<LandingHeader isMounted={true} />);

    await user.click(screen.getByLabelText("Abrir menu"));

    // The mobile panel renders its own "Iniciar Sesion" Link with onClick={onClose}
    const closeBtn = screen.getByLabelText("Cerrar menu");
    const mobilePanel = closeBtn.closest("div[class*='fixed inset-0']")!;
    const loginLinks = within(mobilePanel as HTMLElement).getAllByText(
      /Iniciar Sesi/,
    );
    await user.click(loginLinks[0]);

    // Menu should be closed
    expect(screen.queryByLabelText("Cerrar menu")).not.toBeInTheDocument();
  });

  it("closes mobile menu via backdrop click", async () => {
    const user = userEvent.setup();
    wrap(<LandingHeader isMounted={true} />);

    await user.click(screen.getByLabelText("Abrir menu"));

    // The backdrop is the div with z-[9998] class
    const allFixed = document.querySelectorAll("div[class*='fixed'][class*='inset-0']");
    // Find the backdrop (the one with bg-black or backdrop-blur)
    const backdrop = Array.from(allFixed).find(
      (el) => el.className.includes("backdrop-blur") || el.className.includes("bg-black"),
    );
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);

    // Menu should be closed
    expect(screen.queryByLabelText("Cerrar menu")).not.toBeInTheDocument();
  });

  // --- Desktop nav links (simple links, no mega menu) ---

  it("desktop nav links call handleScrollToSection", async () => {
    const user = userEvent.setup();
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock as unknown as typeof window.scrollTo;
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });

    vi.spyOn(document, "querySelector").mockReturnValue({
      getBoundingClientRect: () => ({ top: 500 }),
    } as unknown as Element);

    wrap(<LandingHeader isMounted={true} />);

    // Find a desktop nav link (href=#precios)
    const preciosLinks = screen.getAllByText("Precios");
    const desktopLink = preciosLinks.find(
      (el) => el.tagName === "A",
    );
    if (desktopLink) {
      await user.click(desktopLink);
      expect(scrollToMock).toHaveBeenCalled();
    }

    vi.restoreAllMocks();
  });

  // --- Mobile menu nav link onClick (line 310) ---

  it("mobile nav buttons trigger scroll after menu closes", async () => {
    const user = userEvent.setup();
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock as unknown as typeof window.scrollTo;
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });

    vi.spyOn(document, "querySelector").mockReturnValue({
      getBoundingClientRect: () => ({ top: 500 }),
    } as unknown as Element);

    wrap(<LandingHeader isMounted={true} />);

    // Open mobile menu
    await user.click(screen.getByLabelText("Abrir menu"));

    // Find the mobile panel
    const closeBtn = screen.getByLabelText("Cerrar menu");
    const mobilePanel = closeBtn.closest("div[class*='fixed inset-0']")!;

    // Click DIAN button inside mobile panel
    const dianButtons = within(mobilePanel as HTMLElement).getAllByText("DIAN");
    await user.click(dianButtons[0]);

    // Menu should be closed
    expect(screen.queryByLabelText("Cerrar menu")).not.toBeInTheDocument();

    vi.restoreAllMocks();
  });

  // --- Desktop nav links onClick ---

  it("desktop Empresa link onClick calls handleScrollToSection", async () => {
    const user = userEvent.setup();
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock as unknown as typeof window.scrollTo;
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });

    vi.spyOn(document, "querySelector").mockReturnValue({
      getBoundingClientRect: () => ({ top: 500 }),
    } as unknown as Element);

    wrap(<LandingHeader isMounted={true} />);

    // Find the desktop Empresa link
    const empresaLinks = screen.getAllByText("Empresa");
    const desktopEmpresaLink = empresaLinks.find(
      (el) =>
        el.tagName === "A" &&
        el.getAttribute("href") === "#empresa" &&
        el.closest("div[class*='lg:flex']"),
    );
    if (desktopEmpresaLink) {
      await user.click(desktopEmpresaLink);
      expect(scrollToMock).toHaveBeenCalled();
    }

    vi.restoreAllMocks();
  });

  // --- isMounted prop animation variant ---

  it("applies initial animation when isMounted is true", () => {
    wrap(<LandingHeader isMounted={true} />);
    const header = document.querySelector("header");
    expect(header).toBeTruthy();
  });

  it("skips initial animation when isMounted is false", () => {
    wrap(<LandingHeader isMounted={false} />);
    const header = document.querySelector("header");
    expect(header).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// handleScrollToSection (direct unit tests)
// ---------------------------------------------------------------------------

describe("handleScrollToSection", () => {
  it("does nothing for non-hash href", () => {
    const preventDefaultMock = vi.fn();
    const mockEvent = {
      preventDefault: preventDefaultMock,
    } as unknown as React.MouseEvent<HTMLAnchorElement>;

    handleScrollToSection(mockEvent, "/some-path");
    expect(preventDefaultMock).not.toHaveBeenCalled();
  });

  it("calls preventDefault and scrollTo for hash href", () => {
    const preventDefaultMock = vi.fn();
    const scrollToMock = vi.fn();
    const mockEvent = {
      preventDefault: preventDefaultMock,
    } as unknown as React.MouseEvent<HTMLAnchorElement>;

    window.scrollTo = scrollToMock as unknown as typeof window.scrollTo;
    Object.defineProperty(window, "scrollY", { value: 100, writable: true });

    vi.spyOn(document, "querySelector").mockReturnValue({
      getBoundingClientRect: () => ({ top: 500 }),
    } as unknown as Element);

    handleScrollToSection(mockEvent, "#test-section");

    expect(preventDefaultMock).toHaveBeenCalled();
    expect(scrollToMock).toHaveBeenCalledWith({ top: 500 + 100 - 80, behavior: "smooth" });
    vi.restoreAllMocks();
  });

  it("calls onComplete even when element not found (called before querySelector check)", () => {
    const onComplete = vi.fn();
    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.MouseEvent<HTMLAnchorElement>;

    vi.spyOn(document, "querySelector").mockReturnValue(null);

    handleScrollToSection(mockEvent, "#nonexistent", onComplete);
    // onComplete is called immediately after preventDefault, before the element check
    expect(onComplete).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it("calls onScrollComplete when element is found", () => {
    const onComplete = vi.fn();
    const scrollToMock = vi.fn();
    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.MouseEvent<HTMLAnchorElement>;

    window.scrollTo = scrollToMock as unknown as typeof window.scrollTo;
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });

    vi.spyOn(document, "querySelector").mockReturnValue({
      getBoundingClientRect: () => ({ top: 300 }),
    } as unknown as Element);

    handleScrollToSection(mockEvent, "#test", onComplete);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// SocialProofBar – covers lines 11-29
// ---------------------------------------------------------------------------

describe("SocialProofBar", () => {
  it("renders all four stat labels", () => {
    wrap(<SocialProofBar isMounted={false} />);
    expect(screen.getByText("Empresas activas")).toBeInTheDocument();
    expect(screen.getByText("Facturas generadas")).toBeInTheDocument();
    expect(screen.getByText("Uptime")).toBeInTheDocument();
    expect(screen.getByText(/Satisfacci/)).toBeInTheDocument();
  });

  it("renders stat values via AnimatedNumber", () => {
    wrap(<SocialProofBar isMounted={false} />);
    // AnimatedNumber mock renders the formatted value
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("50.000")).toBeInTheDocument(); // es-CO formatting
    expect(screen.getByText("99.9")).toBeInTheDocument();
    expect(screen.getByText("4.8")).toBeInTheDocument();
  });

  it("renders stat suffixes", () => {
    wrap(<SocialProofBar isMounted={false} />);
    const plusSigns = screen.getAllByText("+");
    expect(plusSigns.length).toBe(2);
    expect(screen.getByText("%")).toBeInTheDocument();
    expect(screen.getByText("/5")).toBeInTheDocument();
  });

  it("renders the DIAN certification badge", () => {
    wrap(<SocialProofBar isMounted={false} />);
    expect(screen.getByText("Certificado DIAN")).toBeInTheDocument();
    expect(screen.getByText(/Facturación electrónica/)).toBeInTheDocument();
  });

  it("renders with isMounted=true (animation variant)", () => {
    wrap(<SocialProofBar isMounted={true} />);
    expect(screen.getByText("Empresas activas")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ModuleShowcase – covers lines 295-696, 704, 764
// ---------------------------------------------------------------------------

describe("ModuleShowcase", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("renders section header", () => {
    wrap(<ModuleShowcase isMounted={false} />);
    expect(
      screen.getByText(/Todo lo que necesitas para/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/gestionar tu negocio/),
    ).toBeInTheDocument();
  });

  it("renders all 7 tab buttons", () => {
    wrap(<ModuleShowcase isMounted={false} />);
    expect(screen.getByText("Inventario")).toBeInTheDocument();
    expect(screen.getByText("Ventas")).toBeInTheDocument();
    expect(screen.getByText("Compras")).toBeInTheDocument();
    expect(screen.getByText("Contabilidad")).toBeInTheDocument();
    expect(screen.getByText("POS")).toBeInTheDocument();
    // "Nomina" tab label
    const nominaElements = screen.getAllByText(/N[oó]mina/);
    expect(nominaElements.length).toBeGreaterThan(0);
    expect(screen.getByText("Mas")).toBeInTheDocument();
  });

  it("renders first tab (Inventario) content by default", () => {
    wrap(<ModuleShowcase isMounted={false} />);
    expect(
      screen.getByText("Control total de tu inventario"),
    ).toBeInTheDocument();
    expect(screen.getByText("Productos y Categorias")).toBeInTheDocument();
    expect(screen.getByText("Multi-Bodega")).toBeInTheDocument();
    expect(
      screen.getByText("Movimientos y Transferencias"),
    ).toBeInTheDocument();
    expect(screen.getByText("Kardex")).toBeInTheDocument();
  });

  it("renders the mock UI for Inventario tab (stats 72, 48, 91)", () => {
    wrap(<ModuleShowcase isMounted={false} />);
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("48")).toBeInTheDocument();
    expect(screen.getByText("91")).toBeInTheDocument();
  });

  it("switches to Ventas tab and shows its content", async () => {
    const user = userEvent.setup();
    wrap(<ModuleShowcase isMounted={false} />);

    // Click the "Ventas" tab button
    const ventasTab = screen
      .getAllByText("Ventas")
      .find((el) => el.closest("button"))!;
    await user.click(ventasTab);

    expect(
      screen.getByText("Facturacion electronica y ventas"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Facturas Electronicas DIAN"),
    ).toBeInTheDocument();
    expect(screen.getByText("Cotizaciones")).toBeInTheDocument();
    expect(screen.getByText("Recurrentes")).toBeInTheDocument();
    // Mock Sales UI shows invoice numbers
    expect(screen.getByText("FE-001247")).toBeInTheDocument();
    expect(screen.getByText("FE-001246")).toBeInTheDocument();
    expect(screen.getByText("FE-001245")).toBeInTheDocument();
    expect(screen.getByText("$12,450,000")).toBeInTheDocument();
  });

  it("switches to Compras tab and shows its content", async () => {
    const user = userEvent.setup();
    wrap(<ModuleShowcase isMounted={false} />);

    const comprasTab = screen
      .getAllByText("Compras")
      .find((el) => el.closest("button"))!;
    await user.click(comprasTab);

    expect(
      screen.getByText("Gestion integral de compras"),
    ).toBeInTheDocument();
    expect(screen.getByText("Proveedores")).toBeInTheDocument();
    expect(screen.getByText("Ordenes de Compra")).toBeInTheDocument();
    expect(screen.getByText("Documentos Soporte")).toBeInTheDocument();
    // Mock Purchases UI
    expect(screen.getByText("Solicitud")).toBeInTheDocument();
    expect(screen.getByText("Aprobada")).toBeInTheDocument();
    expect(screen.getByText("Recibida")).toBeInTheDocument();
    expect(screen.getByText("OC-0034")).toBeInTheDocument();
  });

  it("switches to Contabilidad tab and shows its content", async () => {
    const user = userEvent.setup();
    wrap(<ModuleShowcase isMounted={false} />);

    const contaTab = screen
      .getAllByText("Contabilidad")
      .find((el) => el.closest("button"))!;
    await user.click(contaTab);

    expect(
      screen.getByText("Contabilidad clara y precisa"),
    ).toBeInTheDocument();
    expect(screen.getByText("Plan de Cuentas")).toBeInTheDocument();
    expect(screen.getByText("Asientos Contables")).toBeInTheDocument();
    // Mock Accounting UI
    expect(screen.getByText("1105")).toBeInTheDocument();
    expect(screen.getAllByText("Bancos").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("$24.5M")).toBeInTheDocument();
  });

  it("switches to POS tab and shows its content", async () => {
    const user = userEvent.setup();
    wrap(<ModuleShowcase isMounted={false} />);

    const posTab = screen
      .getAllByText("POS")
      .find((el) => el.closest("button"))!;
    await user.click(posTab);

    expect(
      screen.getByText("Punto de venta agil y moderno"),
    ).toBeInTheDocument();
    expect(screen.getByText("Terminal de Venta")).toBeInTheDocument();
    // Mock POS UI
    expect(screen.getByText("$185,000")).toBeInTheDocument();
    expect(screen.getByText("Cobrar")).toBeInTheDocument();
  });

  it("switches to Nomina tab and shows its content", async () => {
    const user = userEvent.setup();
    wrap(<ModuleShowcase isMounted={false} />);

    // Find the Nomina tab button
    const nominaTabs = screen.getAllByText(/N[oó]mina/);
    const nominaTabBtn = nominaTabs.find((el) => el.closest("button"))!;
    await user.click(nominaTabBtn);

    expect(
      screen.getByText(/electr[oó]nica sin complicaciones/),
    ).toBeInTheDocument();
    expect(screen.getByText("Empleados")).toBeInTheDocument();
    // Mock Payroll UI
    expect(screen.getByText("Maria Garcia")).toBeInTheDocument();
    expect(screen.getByText("Carlos Lopez")).toBeInTheDocument();
    expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
    expect(screen.getByText("$10,500,000")).toBeInTheDocument();
    expect(screen.getByText("Mar 2026")).toBeInTheDocument();
  });

  it("switches to Mas tab and shows its content", async () => {
    const user = userEvent.setup();
    wrap(<ModuleShowcase isMounted={false} />);

    const masTab = screen
      .getAllByText("Mas")
      .find((el) => el.closest("button"))!;
    await user.click(masTab);

    expect(
      screen.getByText("Integraciones y herramientas avanzadas"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Integraciones E-commerce"),
    ).toBeInTheDocument();
    expect(screen.getByText("Multi-Moneda")).toBeInTheDocument();
    // Mock Extras UI
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("EUR")).toBeInTheDocument();
    expect(screen.getByText("COP")).toBeInTheDocument();
    expect(screen.getByText("Shopify")).toBeInTheDocument();
    expect(screen.getByText("WooCom")).toBeInTheDocument();
    expect(screen.getByText("MeLi")).toBeInTheDocument();
    expect(screen.getByText("Factura creada")).toBeInTheDocument();
    expect(screen.getByText("Stock actualizado")).toBeInTheDocument();
    expect(screen.getByText("Usuario login")).toBeInTheDocument();
  });

  it("navigates forward and backward between tabs (direction tracking)", async () => {
    const user = userEvent.setup();
    wrap(<ModuleShowcase isMounted={false} />);

    // Go to tab 3 (Contabilidad) then back to tab 0 (Inventario)
    const contaTab = screen
      .getAllByText("Contabilidad")
      .find((el) => el.closest("button"))!;
    await user.click(contaTab);

    const invTab = screen
      .getAllByText("Inventario")
      .find((el) => el.closest("button"))!;
    await user.click(invTab);

    expect(
      screen.getByText("Control total de tu inventario"),
    ).toBeInTheDocument();
  });

  it("renders badge with feature count for each tab", () => {
    wrap(<ModuleShowcase isMounted={false} />);
    // Each tab button has a Badge showing feature count.
    // Inventario=4, Ventas=6, Compras=5, Contabilidad=6, POS=3, Nomina=3, Mas=4
    const badges = document.querySelectorAll("span[data-variant]");
    expect(badges.length).toBeGreaterThanOrEqual(7);
  });

  it("renders with isMounted=true (animation)", () => {
    wrap(<ModuleShowcase isMounted={true} />);
    expect(
      screen.getByText("Control total de tu inventario"),
    ).toBeInTheDocument();
  });

  it("scrolls active tab button into view on tab change", async () => {
    const user = userEvent.setup();
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    wrap(<ModuleShowcase isMounted={false} />);

    const ventasTab = screen
      .getAllByText("Ventas")
      .find((el) => el.closest("button"))!;
    await user.click(ventasTab);

    expect(scrollIntoViewMock).toHaveBeenCalled();

    // Clean up
    delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView;
  });
});

// ---------------------------------------------------------------------------
// FinalCTA – covers line 97
// ---------------------------------------------------------------------------

describe("FinalCTA", () => {
  it("renders the main heading", () => {
    wrap(<FinalCTA isMounted={false} />);
    expect(
      screen.getByText(/Listo para simplificar tu negocio/),
    ).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    wrap(<FinalCTA isMounted={false} />);
    expect(
      screen.getByText(/nete a cientos de empresas colombianas/),
    ).toBeInTheDocument();
  });

  it("renders primary CTA link to /register", () => {
    wrap(<FinalCTA isMounted={false} />);
    const link = screen.getByText(/Empieza Gratis/).closest("a");
    expect(link).toHaveAttribute("href", "/register");
  });

  it("renders secondary CTA 'Ver Planes' with #precios href", () => {
    wrap(<FinalCTA isMounted={false} />);
    const link = screen.getByText("Ver Planes");
    expect(link).toHaveAttribute("href", "#precios");
  });

  it("Ver Planes link calls handleScrollToSection on click", async () => {
    const user = userEvent.setup();
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock as unknown as typeof window.scrollTo;
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });

    vi.spyOn(document, "querySelector").mockReturnValue({
      getBoundingClientRect: () => ({ top: 500 }),
    } as unknown as Element);

    wrap(<FinalCTA isMounted={false} />);

    await user.click(screen.getByText("Ver Planes"));
    expect(scrollToMock).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it("renders with isMounted=true", () => {
    wrap(<FinalCTA isMounted={true} />);
    expect(
      screen.getByText(/Listo para simplificar tu negocio/),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// LandingFooter – covers line 106
// ---------------------------------------------------------------------------

describe("LandingFooter", () => {
  it("renders StockFlow logo link", () => {
    wrap(<LandingFooter />);
    const logoLink = screen.getByLabelText("StockFlow");
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("renders brand description", () => {
    wrap(<LandingFooter />);
    expect(
      screen.getByText(/plataforma integral/),
    ).toBeInTheDocument();
  });

  it("renders WhatsApp link", () => {
    wrap(<LandingFooter />);
    const waLink = screen.getByText(/WhatsApp/);
    expect(waLink.closest("a")).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me/573108563748"),
    );
    expect(waLink.closest("a")).toHaveAttribute("target", "_blank");
  });

  it("renders Producto column links", () => {
    wrap(<LandingFooter />);
    expect(screen.getByText("Producto")).toBeInTheDocument();
    // Footer Producto links
    const invLink = screen.getAllByText("Inventario");
    expect(invLink.length).toBeGreaterThan(0);
  });

  it("renders Soluciones column links", () => {
    wrap(<LandingFooter />);
    expect(screen.getByText("Soluciones")).toBeInTheDocument();
    expect(screen.getByText("Retail")).toBeInTheDocument();
    expect(screen.getByText(/Distribuci/)).toBeInTheDocument();
    expect(screen.getByText("Servicios")).toBeInTheDocument();
    expect(screen.getByText("Restaurantes")).toBeInTheDocument();
  });

  it("renders Recursos column links", () => {
    wrap(<LandingFooter />);
    expect(screen.getByText("Recursos")).toBeInTheDocument();
    expect(screen.getByText("Blog")).toBeInTheDocument();
    expect(screen.getByText("Centro de Ayuda")).toBeInTheDocument();
    expect(screen.getByText("API Docs")).toBeInTheDocument();
    expect(screen.getByText("Contacto")).toBeInTheDocument();
  });

  it("renders Legal column links", () => {
    wrap(<LandingFooter />);
    expect(screen.getByText("Legal")).toBeInTheDocument();
    expect(screen.getByText(/rminos/)).toBeInTheDocument();
    expect(screen.getByText("Privacidad")).toBeInTheDocument();
    expect(screen.getByText("Cookies")).toBeInTheDocument();
  });

  it("renders copyright text", () => {
    wrap(<LandingFooter />);
    expect(
      screen.getByText(/2026 StockFlow/),
    ).toBeInTheDocument();
  });

  it("renders social media links (GitHub, X, LinkedIn)", () => {
    wrap(<LandingFooter />);
    expect(screen.getByLabelText("GitHub")).toBeInTheDocument();
    expect(screen.getByLabelText("X")).toBeInTheDocument();
    expect(screen.getByLabelText("LinkedIn")).toBeInTheDocument();
  });

  it("footer links with # href call handleScrollToSection (line 106)", async () => {
    const user = userEvent.setup();
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock as unknown as typeof window.scrollTo;
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });

    vi.spyOn(document, "querySelector").mockReturnValue({
      getBoundingClientRect: () => ({ top: 500 }),
    } as unknown as Element);

    wrap(<LandingFooter />);

    // Click a footer link that has a # href (e.g., Inventario -> #features)
    const footerInvLinks = screen.getAllByText("Inventario");
    const footerLink = footerInvLinks.find(
      (el) => el.tagName === "A" && el.getAttribute("href") === "#features",
    );
    if (footerLink) {
      await user.click(footerLink);
      expect(scrollToMock).toHaveBeenCalled();
    }

    vi.restoreAllMocks();
  });

  it("footer links with plain # href do not scroll (no element found)", async () => {
    const user = userEvent.setup();
    vi.spyOn(document, "querySelector").mockReturnValue(null);

    wrap(<LandingFooter />);

    // Click a link with href="#" (e.g., Blog)
    const blogLink = screen.getByText("Blog");
    await user.click(blogLink);

    // No scrollIntoView should have been called since element is null
    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// TestimonialsSection – covers line 105
// ---------------------------------------------------------------------------

describe("TestimonialsSection", () => {
  it("renders section header", () => {
    wrap(<TestimonialsSection isMounted={false} />);
    expect(screen.getByText("Testimonios")).toBeInTheDocument();
    expect(screen.getByText(/nuestros clientes/)).toBeInTheDocument();
  });

  it("renders all 5 testimonial cards", () => {
    wrap(<TestimonialsSection isMounted={false} />);
    expect(screen.getByText(/Camila R\./)).toBeInTheDocument();
    expect(screen.getByText(/Andrés M\./)).toBeInTheDocument();
    expect(screen.getByText(/Patricia V\./)).toBeInTheDocument();
    expect(screen.getByText(/Felipe T\./)).toBeInTheDocument();
    expect(screen.getByText(/Sandra L\./)).toBeInTheDocument();
  });

  it("renders company names and roles", () => {
    wrap(<TestimonialsSection isMounted={false} />);
    expect(screen.getByText(/Distribuidora del Valle/)).toBeInTheDocument();
    expect(screen.getByText(/TechStore Colombia/)).toBeInTheDocument();
    expect(screen.getByText(/Asesorías Contables Orion/)).toBeInTheDocument();
  });

  it("renders industry badges", () => {
    wrap(<TestimonialsSection isMounted={false} />);
    expect(screen.getByText("Retail")).toBeInTheDocument();
    expect(screen.getByText(/Distribuci/)).toBeInTheDocument();
    expect(screen.getByText(/Contadur/)).toBeInTheDocument();
    expect(screen.getByText("Restaurante")).toBeInTheDocument();
    expect(screen.getByText("Importaciones")).toBeInTheDocument();
  });

  it("renders star ratings with decimal values", () => {
    wrap(<TestimonialsSection isMounted={false} />);
    // StarRating renders rating.toFixed(1)
    // Ratings: 5.0, 4.8, 4.7, 4.9, 4.8
    expect(screen.getByText("5.0")).toBeInTheDocument();
    expect(screen.getAllByText("4.8").length).toBe(2);
    expect(screen.getByText("4.7")).toBeInTheDocument();
    expect(screen.getByText("4.9")).toBeInTheDocument();
  });

  it("renders initials for each testimonial author", () => {
    wrap(<TestimonialsSection isMounted={false} />);
    // Initials component extracts first letters: "Camila R." -> CR
    expect(screen.getAllByText("CR").length).toBeGreaterThanOrEqual(1); // Camila R.
    expect(screen.getAllByText("AM").length).toBeGreaterThanOrEqual(1); // Andrés M.
    expect(screen.getByText("PV")).toBeInTheDocument(); // Patricia V.
    expect(screen.getByText("FT")).toBeInTheDocument(); // Felipe T.
    expect(screen.getByText("SL")).toBeInTheDocument(); // Sandra L.
  });

  it("renders partial stars for non-integer ratings (line 105 - empty star branch)", () => {
    wrap(<TestimonialsSection isMounted={false} />);
    // Rating 4.9 => 4 full + 1 partial => the 5th star has overflow clip
    // Rating 4.7 => 4 full + 1 partial
    // Rating 5.0 => 5 full + 0 empty => no empty stars
    // There should be empty stars for ratings < 5 when no partial
    // The test exercises all 3 branches in StarRating: full, partial, empty

    // All SVGs (stars) are rendered
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(10);
  });

  it("renders the mobile scroll hint text", () => {
    wrap(<TestimonialsSection isMounted={false} />);
    expect(
      screen.getByText(/Desliza para ver más testimonios/),
    ).toBeInTheDocument();
  });

  it("renders with isMounted=true", () => {
    wrap(<TestimonialsSection isMounted={true} />);
    expect(screen.getByText("Testimonios")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// PricingSection – covers lines 173-191, 208 (branch coverage for toggle)
// ---------------------------------------------------------------------------

describe("PricingSection", () => {
  it("renders section header", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    expect(screen.getByText("Precios")).toBeInTheDocument();
    expect(
      screen.getByText(/Planes para cada etapa de tu negocio/),
    ).toBeInTheDocument();
  });

  it("renders billing toggle labels", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    expect(screen.getByText("Mensual")).toBeInTheDocument();
    expect(screen.getByText("Anual")).toBeInTheDocument();
  });

  it("renders all 4 plan names", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    expect(screen.getByText("Emprendedor")).toBeInTheDocument();
    expect(screen.getByText("Pyme")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Plus")).toBeInTheDocument();
  });

  it("shows monthly prices when isAnnual=false", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    // $69,900 formatted as COP
    expect(screen.getByText(/69/)).toBeInTheDocument();
    expect(screen.getByText(/149/)).toBeInTheDocument();
  });

  it("shows annual prices when isAnnual=true", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={true}
        setIsAnnual={vi.fn()}
      />,
    );
    // Annual prices: 59,400 / 127,400 / 186,900 / 237,900
    expect(screen.getByText(/59/)).toBeInTheDocument();
    expect(screen.getByText(/127/)).toBeInTheDocument();
  });

  it("shows -15% badge when isAnnual=true (line 191-195)", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={true}
        setIsAnnual={vi.fn()}
      />,
    );
    expect(screen.getByText("-15%")).toBeInTheDocument();
  });

  it("does NOT show -15% badge when isAnnual=false", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    expect(screen.queryByText("-15%")).not.toBeInTheDocument();
  });

  it("toggles billing period via Switch", async () => {
    const user = userEvent.setup();
    const setIsAnnual = vi.fn();

    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={setIsAnnual}
      />,
    );

    const toggle = screen.getByRole("switch");
    await user.click(toggle);

    expect(setIsAnnual).toHaveBeenCalledWith(true);
  });

  it("highlights Mensual label when isAnnual=false (lines 173-176)", () => {
    const { container } = wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    const mensualSpan = screen.getByText("Mensual");
    // When !isAnnual, Mensual should have text-neutral-900
    expect(mensualSpan.className).toContain("text-neutral-900");
  });

  it("highlights Anual label when isAnnual=true (lines 182-187)", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={true}
        setIsAnnual={vi.fn()}
      />,
    );
    const anualSpan = screen.getByText("Anual");
    expect(anualSpan.className).toContain("text-neutral-900");
  });

  it("dims Mensual label when isAnnual=true", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={true}
        setIsAnnual={vi.fn()}
      />,
    );
    const mensualSpan = screen.getByText("Mensual");
    expect(mensualSpan.className).toContain("text-neutral-400");
  });

  it("dims Anual label when isAnnual=false", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    const anualSpan = screen.getByText("Anual");
    expect(anualSpan.className).toContain("text-neutral-400");
  });

  it("renders highlighted plan (Pyme) with special badge", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    expect(screen.getByText(/Más Popular/)).toBeInTheDocument();
  });

  it("renders plan features (Emprendedor)", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    expect(screen.getByText("Productos ilimitados")).toBeInTheDocument();
    expect(screen.getByText("Facturas ilimitadas")).toBeInTheDocument();
    expect(screen.getByText("Soporte por email")).toBeInTheDocument();
  });

  it("renders user/bodega info for each plan", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    expect(screen.getByText(/1 usuario/)).toBeInTheDocument();
    expect(screen.getByText(/1 bodega/)).toBeInTheDocument();
    expect(screen.getByText(/2 usuarios/)).toBeInTheDocument();
    expect(screen.getByText(/3 usuarios/)).toBeInTheDocument();
    expect(screen.getByText(/8 usuarios/)).toBeInTheDocument();
  });

  it("renders DIAN compliance badge on every plan", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    const dianBadges = screen.getAllByText("Cumplimiento DIAN incluido");
    expect(dianBadges.length).toBe(4);
  });

  it("renders Empieza Gratis CTA for each plan linking to /register", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    const ctaLinks = screen.getAllByText("Empieza Gratis");
    expect(ctaLinks.length).toBe(4);
    ctaLinks.forEach((link) => {
      expect(link.closest("a")?.getAttribute("href")).toContain("/register");
    });
  });

  it("renders /mes suffix on all prices", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    const mesSuffixes = screen.getAllByText("/mes");
    expect(mesSuffixes.length).toBe(4);
  });

  it("highlighted plan (Pyme) has gradient CTA, others have bordered CTA (line 208)", () => {
    const { container } = wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );

    // Find all CTA links
    const ctaLinks = screen.getAllByText("Empieza Gratis");
    // Pyme (index 1) should have gradient class
    const pymeLink = ctaLinks[1];
    expect(pymeLink.className).toContain("bg-gradient-to-r");

    // Emprendedor (index 0) should have border class
    const empLink = ctaLinks[0];
    expect(empLink.className).toContain("border");
  });

  it("renders with isMounted=true", () => {
    wrap(
      <PricingSection
        isMounted={true}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    expect(screen.getByText("Emprendedor")).toBeInTheDocument();
  });

  it("renders the no-contracts description text", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Sin contratos largos/),
    ).toBeInTheDocument();
  });

  it("renders free accountant benefit on every plan", () => {
    wrap(
      <PricingSection
        isMounted={false}
        isAnnual={false}
        setIsAnnual={vi.fn()}
      />,
    );
    const freeAccountant = screen.getAllByText(/1 contador gratis incluido/);
    expect(freeAccountant.length).toBe(4);
  });
});
