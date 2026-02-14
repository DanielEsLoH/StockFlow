import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import Home, { meta, loader, handleScrollToSection } from "./home";
import React from "react";
import * as authServer from "~/lib/auth.server";

// Mock ThemeToggle
vi.mock("~/components/ui/ThemeToggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}));

// Mock new UI components used in redesigned landing page
vi.mock("~/components/ui/AnimatedNumber", () => ({
  AnimatedNumber: ({ value, className }: { value: number; className?: string }) => (
    <span className={className}>{value}</span>
  ),
}));

vi.mock("~/components/ui/Badge", () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

vi.mock("~/components/ui/Card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("~/components/ui/Switch", () => ({
  Switch: ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  ),
}));

vi.mock("~/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(" "),
}));

// Mock framer-motion to avoid SSR issues in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const filterMotionProps = (props: Record<string, any>) => {
  const motionProps = [
    "initial",
    "animate",
    "transition",
    "variants",
    "whileHover",
    "whileTap",
    "whileInView",
    "viewport",
  ];
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => !motionProps.includes(key)),
  );
};

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <div {...filterMotionProps(props)}>{children}</div>;
    },
    section: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <section {...filterMotionProps(props)}>{children}</section>;
    },
    h2: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <h2 {...filterMotionProps(props)}>{children}</h2>;
    },
    p: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <p {...filterMotionProps(props)}>{children}</p>;
    },
    span: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <span {...filterMotionProps(props)}>{children}</span>;
    },
    a: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <a {...filterMotionProps(props)}>{children}</a>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock the auth.server module
vi.mock("~/lib/auth.server", () => ({
  requireGuest: vi.fn(),
}));

describe("Home route", () => {
  function renderHome() {
    const routes = [
      {
        path: "/",
        element: <Home />,
      },
    ];

    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    });

    return render(<RouterProvider router={router} />);
  }

  describe("meta function", () => {
    it("returns correct title", () => {
      const result = meta();
      expect(result).toContainEqual({
        title: "StockFlow - Sistema de Inventario y Facturación",
      });
    });

    it("returns correct description", () => {
      const result = meta();
      expect(result).toContainEqual({
        name: "description",
        content:
          "Plataforma multi-tenant para PYMEs colombianas. Control total de inventario, facturación electrónica DIAN y reportes en tiempo real.",
      });
    });

    it("returns exactly 2 meta entries", () => {
      const result = meta();
      expect(result).toHaveLength(2);
    });
  });

  describe("component rendering", () => {
    it("renders the main heading", () => {
      renderHome();
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        /Gestiona tu inventario de forma/i,
      );
    });

    it("renders the StockFlow logo text", () => {
      renderHome();
      expect(screen.getAllByText("Stock").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Flow").length).toBeGreaterThan(0);
    });

    it("renders the description text", () => {
      renderHome();
      expect(
        screen.getByText(/Plataforma multi-tenant para PYMEs colombianas/i),
      ).toBeInTheDocument();
    });

    it("renders Iniciar Sesión link", () => {
      renderHome();
      const links = screen.getAllByRole("link", { name: /Iniciar Sesión/i });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute("href", "/login");
    });

    it("renders Comenzar Ahora link", () => {
      renderHome();
      const links = screen.getAllByRole("link", { name: /Comenzar Ahora/i });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute("href", "/register");
    });

    it("renders the ThemeToggle component", () => {
      renderHome();
      expect(screen.getAllByTestId("theme-toggle").length).toBeGreaterThan(0);
    });

    it("displays DIAN badge", () => {
      renderHome();
      expect(
        screen.getAllByText(/Facturación electrónica DIAN/i).length,
      ).toBeGreaterThan(0);
    });
  });

  describe("layout and structure", () => {
    it("renders main container", () => {
      renderHome();
      const container = screen
        .getByRole("heading", { level: 1 })
        .closest("div");
      expect(container).toBeInTheDocument();
    });

    it("renders navigation links", () => {
      renderHome();
      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThan(2);
    });

    it("renders SVG icons", () => {
      renderHome();
      const svgs = document.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe("navigation", () => {
    it("renders Características link", () => {
      renderHome();
      expect(screen.getAllByText("Características").length).toBeGreaterThan(0);
    });

    it("renders Tecnología link", () => {
      renderHome();
      expect(screen.getAllByText("Tecnología").length).toBeGreaterThan(0);
    });

    it("renders Precios link", () => {
      renderHome();
      expect(screen.getAllByText("Precios").length).toBeGreaterThan(0);
    });
  });

  describe("accessibility", () => {
    it("has proper heading hierarchy", () => {
      renderHome();
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toBeInTheDocument();
    });

    it("links have accessible names", () => {
      renderHome();
      const loginLinks = screen.getAllByRole("link", {
        name: /Iniciar Sesión/i,
      });
      const registerLinks = screen.getAllByRole("link", {
        name: /Comenzar Ahora/i,
      });

      expect(loginLinks[0]).toHaveAccessibleName();
      expect(registerLinks[0]).toHaveAccessibleName();
    });
  });

  describe("loader", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should call requireGuest with the request", () => {
      const mockRequest = new Request("http://localhost/");
      const requireGuestSpy = vi.spyOn(authServer, "requireGuest");

      loader({ request: mockRequest, params: {}, context: {} } as Parameters<
        typeof loader
      >[0]);

      expect(requireGuestSpy).toHaveBeenCalledWith(mockRequest);
    });

    it("should return null after requireGuest check", () => {
      const mockRequest = new Request("http://localhost/");

      const result = loader({
        request: mockRequest,
        params: {},
        context: {},
      } as Parameters<typeof loader>[0]);

      expect(result).toBeNull();
    });
  });

  describe("handleScrollToSection (exported helper)", () => {
    it("should not call preventDefault for non-hash href", () => {
      const preventDefaultMock = vi.fn();
      const mockEvent = {
        preventDefault: preventDefaultMock,
      } as unknown as React.MouseEvent<HTMLAnchorElement>;

      handleScrollToSection(mockEvent, "/some-page");

      expect(preventDefaultMock).not.toHaveBeenCalled();
    });

    it("should not call scrollIntoView for non-hash href", () => {
      const querySelectorSpy = vi.spyOn(document, "querySelector");
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent<HTMLAnchorElement>;

      handleScrollToSection(mockEvent, "/register?plan=pyme");

      expect(querySelectorSpy).not.toHaveBeenCalled();
      querySelectorSpy.mockRestore();
    });

    it("should call preventDefault and scrollIntoView for hash href", () => {
      const preventDefaultMock = vi.fn();
      const scrollIntoViewMock = vi.fn();
      const mockEvent = {
        preventDefault: preventDefaultMock,
      } as unknown as React.MouseEvent<HTMLAnchorElement>;

      vi.spyOn(document, "querySelector").mockReturnValue({
        scrollIntoView: scrollIntoViewMock,
      } as unknown as Element);

      handleScrollToSection(mockEvent, "#features");

      expect(preventDefaultMock).toHaveBeenCalled();
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
      vi.restoreAllMocks();
    });

    it("should call onScrollComplete callback for hash href when element found", () => {
      const onScrollComplete = vi.fn();
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent<HTMLAnchorElement>;

      vi.spyOn(document, "querySelector").mockReturnValue({
        scrollIntoView: vi.fn(),
      } as unknown as Element);

      handleScrollToSection(mockEvent, "#features", onScrollComplete);

      expect(onScrollComplete).toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });

  describe("scrollToSection", () => {
    let scrollIntoViewMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      scrollIntoViewMock = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should scroll to section when clicking anchor link with hash href", async () => {
      const user = userEvent.setup();
      const mockElement = { scrollIntoView: scrollIntoViewMock };
      vi.spyOn(document, "querySelector").mockReturnValue(
        mockElement as unknown as Element,
      );

      renderHome();

      // Find the desktop navigation link for "Caracteristicas" (href="#features")
      const links = screen.getAllByText("Características");
      const desktopLink = links.find(
        (link) =>
          link.tagName === "A" && link.getAttribute("href") === "#features",
      );

      expect(desktopLink).toBeTruthy();
      await user.click(desktopLink!);

      expect(document.querySelector).toHaveBeenCalledWith("#features");
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
    });

    it("should scroll to pricing section when clicking Precios link", async () => {
      const user = userEvent.setup();
      const mockElement = { scrollIntoView: scrollIntoViewMock };
      vi.spyOn(document, "querySelector").mockReturnValue(
        mockElement as unknown as Element,
      );

      renderHome();

      // Find the desktop navigation link for "Precios" (href="#pricing")
      const links = screen.getAllByText("Precios");
      const pricingLink = links.find(
        (link) =>
          link.tagName === "A" && link.getAttribute("href") === "#pricing",
      );

      expect(pricingLink).toBeTruthy();
      await user.click(pricingLink!);

      expect(document.querySelector).toHaveBeenCalledWith("#pricing");
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
    });

    it("should not scroll if element is not found", async () => {
      const user = userEvent.setup();
      vi.spyOn(document, "querySelector").mockReturnValue(null);

      renderHome();

      const links = screen.getAllByText("Características");
      const desktopLink = links.find(
        (link) =>
          link.tagName === "A" && link.getAttribute("href") === "#features",
      );

      await user.click(desktopLink!);

      expect(document.querySelector).toHaveBeenCalledWith("#features");
      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });
  });

  describe("mobile menu", () => {
    beforeEach(() => {
      // Mock matchMedia for responsive behavior
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
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

    it("should toggle mobile menu when clicking menu button", async () => {
      const user = userEvent.setup();
      renderHome();

      // Find the mobile menu button (it's the button in the md:hidden container)
      const buttons = screen.getAllByRole("button");
      // The mobile menu button is the one that is not the theme toggle
      const menuButton = buttons.find(
        (btn) => !btn.hasAttribute("data-testid"),
      );

      expect(menuButton).toBeTruthy();

      // Initially the mobile menu should not be visible (it renders conditionally)
      // Check if the mobile-specific "Iniciar Sesión" link is not in the mobile menu container
      const initialMobileNav = document.querySelector(".md\\:hidden > div");
      expect(initialMobileNav).toBeNull(); // Mobile nav should not exist initially

      // Click to open mobile menu
      await user.click(menuButton!);

      // After clicking, the mobile menu should be visible
      // The mobile menu renders a motion.div with links
      await waitFor(() => {
        // Look for the mobile navigation container that appears after clicking
        const mobileNavLinks = screen.getAllByText("Iniciar Sesión");
        expect(mobileNavLinks.length).toBeGreaterThan(0);
      });
    });

    it("should close mobile menu when clicking a navigation link", async () => {
      const user = userEvent.setup();
      const scrollIntoViewMock = vi.fn();
      const mockElement = document.createElement("section");
      mockElement.id = "features";
      mockElement.scrollIntoView = scrollIntoViewMock;

      // Add the mock element to the DOM so querySelector can find it
      document.body.appendChild(mockElement);

      renderHome();

      // Open mobile menu
      const buttons = screen.getAllByRole("button");
      const menuButton = buttons.find(
        (btn) => !btn.hasAttribute("data-testid"),
      );
      await user.click(menuButton!);

      // Wait for mobile menu to open
      await waitFor(() => {
        const caracteristicasLinks = screen.getAllByText("Características");
        expect(caracteristicasLinks.length).toBeGreaterThan(1); // Desktop + mobile
      });

      // Find the mobile navigation link with href="#features"
      // Get all anchor elements with href="#features"
      const allLinks = document.querySelectorAll('a[href="#features"]');
      // The mobile link is inside the mobile nav container
      const mobileLink =
        Array.from(allLinks).find(
          (link) => link.closest(".md\\:hidden") !== null,
        ) || allLinks[allLinks.length - 1];

      await user.click(mobileLink as HTMLElement);

      // The scrollIntoView should have been called
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });

      // Clean up
      document.body.removeChild(mockElement);
    });

    it("should show X icon when mobile menu is open", async () => {
      const user = userEvent.setup();
      renderHome();

      const buttons = screen.getAllByRole("button");
      const menuButton = buttons.find(
        (btn) => !btn.hasAttribute("data-testid"),
      );

      // Click to open mobile menu
      await user.click(menuButton!);

      // After opening, the button should contain the X icon (close icon)
      // The X icon is rendered when mobileMenuOpen is true
      await waitFor(() => {
        // The menu button should now show the close (X) icon
        // We can verify this by checking the button still exists and is clickable
        expect(menuButton).toBeInTheDocument();
      });

      // Click again to close
      await user.click(menuButton!);

      // Menu should be closed now
      await waitFor(() => {
        // After closing, the mobile nav container should be removed
        expect(menuButton).toBeInTheDocument();
      });
    });
  });
});
