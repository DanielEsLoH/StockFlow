import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import Home, { meta, loader } from "./home";
import { handleScrollToSection } from "~/components/landing/LandingHeader";
import React from "react";
import * as authServer from "~/lib/auth.server";

// Mock ThemeToggle
vi.mock("~/components/ui/ThemeToggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}));

// Mock new UI components used in redesigned landing page
vi.mock("~/components/ui/AnimatedNumber", () => ({
  AnimatedNumber: ({
    value,
    className,
  }: {
    value: number;
    className?: string;
  }) => <span className={className}>{value}</span>,
}));

vi.mock("~/components/ui/Badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
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
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  ),
}));

vi.mock("~/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined | null)[]) =>
    args.filter(Boolean).join(" "),
}));

// Mock framer-motion with a Proxy to handle ALL motion.* elements dynamically
vi.mock("framer-motion", async () => {
  const ReactMod = await import("react");

  const motionPropNames = new Set([
    "initial", "animate", "transition", "variants", "whileHover", "whileTap",
    "whileInView", "viewport", "exit", "layoutId", "layout", "onAnimationComplete",
    "drag", "dragConstraints", "dragElastic",
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterProps = (props: Record<string, any>) =>
    Object.fromEntries(
      Object.entries(props).filter(([key]) => !motionPropNames.has(key)),
    );

  const voidElements = new Set(["img", "input", "br", "hr", "area", "col", "embed", "source", "track", "wbr"]);

  const motionProxy = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (voidElements.has(tag)) {
          return (props: Record<string, unknown>) =>
            ReactMod.createElement(tag, filterProps(props));
        }
        return ({ children, ...props }: { children?: unknown } & Record<string, unknown>) =>
          ReactMod.createElement(tag, filterProps(props), children);
      },
    },
  );

  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: { children?: unknown }) => children,
    useMotionValue: () => ({ get: () => 0, set: () => {} }),
    useTransform: () => ({ get: () => 0 }),
    useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
    useInView: () => true,
  };
});

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

  describe("meta function", () => {
    it("returns correct title", () => {
      const result = meta();
      expect(result[0].title).toContain("StockFlow");
    });

    it("returns correct description", () => {
      const result = meta();
      expect(result[1].content).toContain("PYMEs colombianas");
    });

    it("returns exactly 2 meta entries", () => {
      const result = meta();
      expect(result).toHaveLength(2);
    });
  });

  describe("component rendering", () => {
    it("renders the StockFlow logo text", () => {
      renderHome();
      expect(screen.getAllByText(/Stock/i).length).toBeGreaterThan(0);
    });

    it("renders Iniciar Sesion link", () => {
      renderHome();
      const links = screen.getAllByText(/Iniciar Sesi/i);
      expect(links.length).toBeGreaterThan(0);
    });

    it("renders the ThemeToggle component", () => {
      renderHome();
      expect(screen.getAllByTestId("theme-toggle").length).toBeGreaterThan(0);
    });
  });

  describe("layout and structure", () => {
    it("renders main container", () => {
      renderHome();
      const headings = screen.getAllByRole("heading");
      expect(headings.length).toBeGreaterThan(0);
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
    it("renders Precios link", () => {
      renderHome();
      expect(screen.getAllByText(/Precios/i).length).toBeGreaterThan(0);
    });

    it("renders DIAN link", () => {
      renderHome();
      expect(screen.getAllByText(/DIAN/i).length).toBeGreaterThan(0);
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

  describe("handleScrollToSection (from LandingHeader)", () => {
    it("should not call preventDefault for non-hash href", () => {
      const preventDefaultMock = vi.fn();
      const mockEvent = {
        preventDefault: preventDefaultMock,
      } as unknown as React.MouseEvent<HTMLAnchorElement>;

      handleScrollToSection(mockEvent, "/some-page");

      expect(preventDefaultMock).not.toHaveBeenCalled();
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

    it("should call onScrollComplete callback when element found", () => {
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
});
