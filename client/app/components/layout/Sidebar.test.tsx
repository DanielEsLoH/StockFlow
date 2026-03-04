import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useUIStore } from "~/stores/ui.store";
import { useAuthStore } from "~/stores/auth.store";
import type { User, Tenant } from "~/stores/auth.store";

// Mock useAuth hook
const mockLogout = vi.fn();
vi.mock("~/hooks/useAuth", () => ({
  useAuth: () => ({
    logout: mockLogout,
    isLoggingOut: false,
  }),
}));

const mockUser: User = {
  id: "1",
  email: "john@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "ADMIN",
  status: "ACTIVE",
  tenantId: "tenant-1",
};

const mockTenant: Tenant = {
  id: "tenant-1",
  name: "Acme Corporation",
  slug: "acme",
  plan: "PRO",
  status: "ACTIVE",
};

function createWrapper(initialEntries: string[] = ["/dashboard"]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("Sidebar", () => {
  beforeEach(() => {
    // Reset stores before each test
    useUIStore.setState({
      sidebarOpen: true,
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      expandedSidebarSection: null,
      activeModal: null,
      modalData: null,
      globalLoading: false,
      loadingMessage: "",
    });
    useAuthStore.setState({
      user: mockUser,
      tenant: mockTenant,
      isAuthenticated: true,
      isLoading: false,
    });
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render sidebar when sidebarOpen is true", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("StockFlow")).toBeInTheDocument();
    });

    it("should render desktop sidebar regardless of mobileSidebarOpen state", () => {
      useUIStore.setState({ mobileSidebarOpen: false });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("StockFlow")).toBeInTheDocument();
    });

    it("should render mobile sidebar overlay when mobileSidebarOpen is true", () => {
      useUIStore.setState({ mobileSidebarOpen: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      const backdrop = document.querySelector(
        ".lg\\:hidden.fixed.inset-0.z-40.bg-black\\/60",
      );
      expect(backdrop).toBeInTheDocument();
    });

    it("should not render mobile sidebar overlay when mobileSidebarOpen is false", () => {
      useUIStore.setState({ mobileSidebarOpen: false });

      render(<Sidebar />, { wrapper: createWrapper() });

      const backdrop = document.querySelector(
        ".lg\\:hidden.fixed.inset-0.z-40.bg-black\\/60",
      );
      expect(backdrop).not.toBeInTheDocument();
    });

    it("should render the tenant name", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
    });

    it("should render default tenant name when no tenant", () => {
      useAuthStore.setState({ tenant: null });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("Mi Empresa")).toBeInTheDocument();
    });
  });

  describe("dashboard item", () => {
    it("should always render Dashboard link outside accordion", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(
        screen.getByRole("link", { name: /dashboard/i }),
      ).toBeInTheDocument();
    });

    it("should highlight Dashboard when on /dashboard route", () => {
      render(<Sidebar />, { wrapper: createWrapper(["/dashboard"]) });

      const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
      expect(dashboardLink.className).toContain("bg-primary-50");
    });
  });

  describe("accordion sections", () => {
    it("should render section headers for all sections", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      // All section headers should be visible as buttons
      expect(screen.getByText("Inventario")).toBeInTheDocument();
      expect(screen.getByText("Ventas")).toBeInTheDocument();
      expect(screen.getByText("Compras")).toBeInTheDocument();
      expect(screen.getByText("Contabilidad")).toBeInTheDocument();
      // "Punto de Venta" text appears in CajaQuickAccess too, so use getAllByText
      expect(screen.getAllByText("Punto de Venta").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Nomina")).toBeInTheDocument();
      expect(screen.getByText("Administracion")).toBeInTheDocument();
    });

    it(
      "should not show section items when section is collapsed",
      () => {
        // On /dashboard, no section should auto-expand
        useUIStore.setState({ expandedSidebarSection: null });
        render(<Sidebar />, { wrapper: createWrapper(["/dashboard"]) });

        // Section items should NOT be visible when collapsed
        expect(
          screen.queryByRole("link", { name: /productos/i }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("link", { name: /facturas/i }),
        ).not.toBeInTheDocument();
      },
      15000,
    );

    it("should show section items when section is expanded", async () => {
      useUIStore.setState({ expandedSidebarSection: "Inventario" });

      render(<Sidebar />, { wrapper: createWrapper(["/dashboard"]) });

      // Inventario items should be visible
      expect(
        screen.getByRole("link", { name: /productos/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /categorias/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /bodegas/i }),
      ).toBeInTheDocument();
    });

    it("should toggle section when clicking section header", async () => {
      const user = userEvent.setup();
      useUIStore.setState({ expandedSidebarSection: null });

      render(<Sidebar />, { wrapper: createWrapper(["/dashboard"]) });

      // Click the Inventario header
      const inventarioButton = screen.getByText("Inventario");
      await user.click(inventarioButton);

      expect(useUIStore.getState().expandedSidebarSection).toBe("Inventario");
    });

    it("should close current section when opening another", async () => {
      const user = userEvent.setup();
      useUIStore.setState({ expandedSidebarSection: "Inventario" });

      render(<Sidebar />, { wrapper: createWrapper(["/dashboard"]) });

      // Click the Ventas header
      const ventasButton = screen.getByText("Ventas");
      await user.click(ventasButton);

      // Should have switched to Ventas
      expect(useUIStore.getState().expandedSidebarSection).toBe("Ventas");
    });

    it("should collapse section when clicking same header again", async () => {
      const user = userEvent.setup();
      useUIStore.setState({ expandedSidebarSection: "Inventario" });

      render(<Sidebar />, { wrapper: createWrapper(["/dashboard"]) });

      // Click the Inventario header again
      const inventarioButton = screen.getByText("Inventario");
      await user.click(inventarioButton);

      expect(useUIStore.getState().expandedSidebarSection).toBeNull();
    });

    it("should auto-expand section containing active route", () => {
      // Navigate to /products (in Inventario section)
      render(<Sidebar />, { wrapper: createWrapper(["/products"]) });

      // Inventario should be auto-expanded
      expect(useUIStore.getState().expandedSidebarSection).toBe("Inventario");
    });

    it("should auto-expand Ventas section when on /invoices", () => {
      render(<Sidebar />, { wrapper: createWrapper(["/invoices"]) });

      expect(useUIStore.getState().expandedSidebarSection).toBe("Ventas");
    });

    it("should auto-expand Contabilidad section when on /bank/accounts", () => {
      render(<Sidebar />, {
        wrapper: createWrapper(["/bank/accounts"]),
      });

      // Bank accounts was merged into Contabilidad
      expect(useUIStore.getState().expandedSidebarSection).toBe("Contabilidad");
    });
  });

  describe("navigation items", () => {
    it("should have correct href for navigation links when section is expanded", () => {
      useUIStore.setState({ expandedSidebarSection: "Inventario" });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByRole("link", { name: /productos/i })).toHaveAttribute(
        "href",
        "/products",
      );
      expect(
        screen.getByRole("link", { name: /categorias/i }),
      ).toHaveAttribute("href", "/categories");
    });

    it("should highlight active route within expanded section", () => {
      render(<Sidebar />, { wrapper: createWrapper(["/products"]) });

      const productsLink = screen.getByRole("link", { name: /productos/i });
      expect(productsLink.className).toContain("bg-primary-50");
    });
  });

  describe("collapse toggle", () => {
    it("should render collapse button", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByTitle("Colapsar")).toBeInTheDocument();
    });

    it("should toggle sidebarCollapsed when collapse button is clicked", async () => {
      const user = userEvent.setup();
      render(<Sidebar />, { wrapper: createWrapper() });

      const collapseButton = screen.getByTitle("Colapsar");
      await user.click(collapseButton);

      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });

    it("should show expand title when collapsed", async () => {
      useUIStore.setState({ sidebarCollapsed: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByTitle("Expandir")).toBeInTheDocument();
    });

    it("should toggle back to expanded", async () => {
      const user = userEvent.setup();
      useUIStore.setState({ sidebarCollapsed: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      const expandButton = screen.getByTitle("Expandir");
      await user.click(expandButton);

      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });

    it("should show section icons with tooltips when collapsed", () => {
      useUIStore.setState({ sidebarCollapsed: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      // Section buttons should have title attributes
      expect(screen.getByTitle("Inventario")).toBeInTheDocument();
      expect(screen.getByTitle("Ventas")).toBeInTheDocument();
      expect(screen.getByTitle("Compras")).toBeInTheDocument();
    });
  });

  describe("user section", () => {
    it("should render user name", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should render user email", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("should render default name when no user", () => {
      useAuthStore.setState({ user: null });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("Usuario")).toBeInTheDocument();
    });

    it("should render user initials when no avatar", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should render avatar when user has avatar", () => {
      useAuthStore.setState({
        user: { ...mockUser, avatar: "https://example.com/avatar.jpg" },
      });

      render(<Sidebar />, { wrapper: createWrapper() });

      const avatar = screen.getByAltText("John Doe");
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
    });

    it("should render logout button", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByTitle("Cerrar sesion")).toBeInTheDocument();
    });

    it("should call logout when logout button is clicked", async () => {
      const user = userEvent.setup();
      render(<Sidebar />, { wrapper: createWrapper() });

      const logoutButton = screen.getByTitle("Cerrar sesion");
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe("accessibility", () => {
    it("should have navigation landmark", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("should have proper link roles", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThan(0);
    });
  });

  describe("collapsed state behavior", () => {
    it("should hide text labels when collapsed", async () => {
      useUIStore.setState({ sidebarCollapsed: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      const sidebar = screen.getByRole("navigation").parentElement;
      expect(sidebar).toBeInTheDocument();
    });

    it("should show title attributes on dashboard link when collapsed", async () => {
      useUIStore.setState({ sidebarCollapsed: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute("title", "Dashboard");
    });
  });

  describe("mobile sidebar interactions", () => {
    it("should close mobile sidebar when clicking backdrop", async () => {
      const user = userEvent.setup();
      useUIStore.setState({ mobileSidebarOpen: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      const backdrop = document.querySelector(
        ".lg\\:hidden.fixed.inset-0.z-40.bg-black\\/60",
      );
      expect(backdrop).toBeInTheDocument();

      await user.click(backdrop as Element);

      expect(useUIStore.getState().mobileSidebarOpen).toBe(false);
    });

    it("should render close button in mobile sidebar", () => {
      useUIStore.setState({ mobileSidebarOpen: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByLabelText("Cerrar menu")).toBeInTheDocument();
    });

    it("should close mobile sidebar when clicking close button", async () => {
      const user = userEvent.setup();
      useUIStore.setState({ mobileSidebarOpen: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      const closeButton = screen.getByLabelText("Cerrar menu");
      await user.click(closeButton);

      expect(useUIStore.getState().mobileSidebarOpen).toBe(false);
    });

    it("should close mobile sidebar when clicking a navigation link", async () => {
      const user = userEvent.setup();
      useUIStore.setState({
        mobileSidebarOpen: true,
        expandedSidebarSection: "Inventario",
      });

      render(<Sidebar />, { wrapper: createWrapper() });

      const productsLinks = screen.getAllByRole("link", { name: /productos/i });
      await user.click(productsLinks[productsLinks.length - 1]);

      expect(useUIStore.getState().mobileSidebarOpen).toBe(false);
    });

    it("should render mobile sidebar drawer with correct initial position", () => {
      useUIStore.setState({ mobileSidebarOpen: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      const mobileSidebar = document.querySelector(
        ".lg\\:hidden.fixed.inset-y-0.left-0.z-50",
      );
      expect(mobileSidebar).toBeInTheDocument();
    });
  });

  describe("admin-only navigation items", () => {
    it("should show Team item for admin users when section is expanded", () => {
      useAuthStore.setState({
        user: { ...mockUser, role: "ADMIN" },
      });
      useUIStore.setState({ expandedSidebarSection: "Administracion" });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByRole("link", { name: /equipo/i })).toBeInTheDocument();
    });

    it("should show Team item for super admin users when section is expanded", () => {
      useAuthStore.setState({
        user: { ...mockUser, role: "SUPER_ADMIN" },
      });
      useUIStore.setState({ expandedSidebarSection: "Administracion" });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByRole("link", { name: /equipo/i })).toBeInTheDocument();
    });

    it("should hide Team item for non-admin users", () => {
      useAuthStore.setState({
        user: { ...mockUser, role: "EMPLOYEE" },
      });
      useUIStore.setState({ expandedSidebarSection: "Administracion" });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(
        screen.queryByRole("link", { name: /equipo/i }),
      ).not.toBeInTheDocument();
    });

    it("should show Team item for manager users when section is expanded", () => {
      useAuthStore.setState({
        user: { ...mockUser, role: "MANAGER" },
      });
      useUIStore.setState({ expandedSidebarSection: "Administracion" });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(
        screen.getByRole("link", { name: /equipo/i }),
      ).toBeInTheDocument();
    });
  });

  describe("merged sections", () => {
    it("should include Cuentas Bancarias in Contabilidad section", () => {
      useUIStore.setState({ expandedSidebarSection: "Contabilidad" });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(
        screen.getByRole("link", { name: /cuentas bancarias/i }),
      ).toBeInTheDocument();
    });

    it("should not have a separate Bancos section", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.queryByText("Bancos")).not.toBeInTheDocument();
    });
  });
});
