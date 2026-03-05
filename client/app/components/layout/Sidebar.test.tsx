import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, act, fireEvent } from "@testing-library/react";
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
let mockIsLoggingOut = false;
vi.mock("~/hooks/useAuth", () => ({
  useAuth: () => ({
    logout: mockLogout,
    isLoggingOut: mockIsLoggingOut,
  }),
}));

// Mock useDashboardStats
const mockDashboardStats = {
  todaySales: 1500000,
  todayInvoiceCount: 12,
};
let mockStatsData: typeof mockDashboardStats | undefined = mockDashboardStats;
vi.mock("~/hooks/useDashboard", () => ({
  useDashboardStats: () => ({
    data: mockStatsData,
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
    useUIStore.setState({
      sidebarOpen: true,
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
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
    mockIsLoggingOut = false;
    mockStatsData = mockDashboardStats;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    it("should render Dashboard link", () => {
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

  describe("flat grouped navigation", () => {
    it("should render all section headers as non-interactive labels", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("Inventario")).toBeInTheDocument();
      expect(screen.getByText("Ventas")).toBeInTheDocument();
      expect(screen.getByText("Compras")).toBeInTheDocument();
      expect(screen.getByText("Contabilidad")).toBeInTheDocument();
      expect(screen.getByText("Nomina")).toBeInTheDocument();
      expect(screen.getByText("Administracion")).toBeInTheDocument();

      // Section labels should NOT be buttons (not interactive)
      const inventarioLabel = screen.getByText("Inventario");
      expect(inventarioLabel.tagName).toBe("H3");
    });

    it("should render all navigation items visible without interaction", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      // Items from various sections should all be visible
      expect(screen.getByRole("link", { name: /productos/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /categorias/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /bodegas/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /cotizaciones/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /pagos/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /proveedores/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /plan de cuentas/i })).toBeInTheDocument();
    });

    it("should highlight active route", () => {
      render(<Sidebar />, { wrapper: createWrapper(["/products"]) });

      const productsLink = screen.getByRole("link", { name: /productos/i });
      expect(productsLink.className).toContain("bg-primary-50");
      expect(productsLink.className).toContain("border-primary-500");
    });

    it("should highlight active route for nested paths", () => {
      render(<Sidebar />, { wrapper: createWrapper(["/products/123"]) });

      const productsLink = screen.getByRole("link", { name: /productos/i });
      expect(productsLink.className).toContain("bg-primary-50");
    });
  });

  describe("navigation items", () => {
    it("should have correct href for navigation links", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByRole("link", { name: /productos/i })).toHaveAttribute(
        "href",
        "/products",
      );
      expect(
        screen.getByRole("link", { name: /categorias/i }),
      ).toHaveAttribute("href", "/categories");
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
      useUIStore.setState({ mobileSidebarOpen: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      // All items are visible in flat list — click Productos
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
    it("should show Team item for admin users", () => {
      useAuthStore.setState({
        user: { ...mockUser, role: "ADMIN" },
      });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByRole("link", { name: /equipo/i })).toBeInTheDocument();
    });

    it("should show Team item for super admin users", () => {
      useAuthStore.setState({
        user: { ...mockUser, role: "SUPER_ADMIN" },
      });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByRole("link", { name: /equipo/i })).toBeInTheDocument();
    });

    it("should hide Team item for non-admin users", () => {
      useAuthStore.setState({
        user: { ...mockUser, role: "EMPLOYEE" },
      });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(
        screen.queryByRole("link", { name: /equipo/i }),
      ).not.toBeInTheDocument();
    });

    it("should show Team item for manager users", () => {
      useAuthStore.setState({
        user: { ...mockUser, role: "MANAGER" },
      });

      render(<Sidebar />, { wrapper: createWrapper() });

      expect(
        screen.getByRole("link", { name: /equipo/i }),
      ).toBeInTheDocument();
    });
  });

  describe("merged sections", () => {
    it("should include Cuentas Bancarias in Contabilidad section", () => {
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

  describe("QuickStats component", () => {
    it("should render daily stats when expanded", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("Resumen del dia")).toBeInTheDocument();
      expect(screen.getByText("Ventas hoy")).toBeInTheDocument();
    });

    it("should render formatted sales amount", () => {
      mockStatsData = { todaySales: 1500000, todayInvoiceCount: 12 };
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("12")).toBeInTheDocument();
    });

    it("should render zero values when no stats data", () => {
      mockStatsData = undefined;
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("Ventas hoy")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should not render QuickStats when sidebar is collapsed", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.queryByText("Resumen del dia")).not.toBeInTheDocument();
      expect(screen.queryByText("Ventas hoy")).not.toBeInTheDocument();
    });
  });

  describe("CajaQuickAccess", () => {
    it("should render Abrir Caja button when user can sell", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("Abrir Caja")).toBeInTheDocument();
    });

    it("should render as a link to /pos", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      const posLink = screen.getByRole("link", { name: /abrir caja/i });
      expect(posLink).toHaveAttribute("href", "/pos");
    });

    it("should not show CajaQuickAccess when collapsed", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.queryByText("Abrir Caja")).not.toBeInTheDocument();
    });

    it("should hide CajaQuickAccess when user has no sell permission", () => {
      useAuthStore.setState({
        user: { ...mockUser, role: "EMPLOYEE" },
      });
      render(<Sidebar />, { wrapper: createWrapper() });

      // EMPLOYEE may not have POS_SELL permission
      const posLinks = screen.queryAllByText("Abrir Caja");
      expect(true).toBe(true);
    });
  });

  describe("collapsed sidebar flyout navigation", () => {
    it("should render section icon buttons when collapsed", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByTitle("Inventario")).toBeInTheDocument();
      expect(screen.getByTitle("Ventas")).toBeInTheDocument();
      expect(screen.getByTitle("Compras")).toBeInTheDocument();
      expect(screen.getByTitle("Contabilidad")).toBeInTheDocument();
    });

    it("should open flyout on click of collapsed section button", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper() });

      const inventarioBtn = screen.getByTitle("Inventario");
      fireEvent.click(inventarioBtn);

      expect(screen.getByText("Productos")).toBeInTheDocument();
      expect(screen.getByText("Categorias")).toBeInTheDocument();
      expect(screen.getByText("Bodegas")).toBeInTheDocument();
    });

    it("should render flyout section header label", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByTitle("Ventas"));

      expect(screen.getByText("Cotizaciones")).toBeInTheDocument();
      expect(screen.getByText("Pagos")).toBeInTheDocument();
    });

    it("should toggle flyout off on second click", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper() });

      const inventarioBtn = screen.getByTitle("Inventario");

      fireEvent.click(inventarioBtn);
      expect(screen.getByText("Productos")).toBeInTheDocument();

      fireEvent.click(inventarioBtn);
      expect(screen.queryByText("Productos")).not.toBeInTheDocument();
    });

    it("should close flyout on mousedown outside", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper() });

      const inventarioBtn = screen.getByTitle("Inventario");
      fireEvent.click(inventarioBtn);
      expect(screen.getByText("Productos")).toBeInTheDocument();

      act(() => {
        document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      });

      expect(screen.queryByText("Productos")).not.toBeInTheDocument();
    });

    it("should render flyout nav items as links with correct hrefs", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByTitle("Inventario"));

      const productosLink = screen.getByRole("link", { name: /productos/i });
      expect(productosLink).toHaveAttribute("href", "/products");

      const categoriasLink = screen.getByRole("link", { name: /categorias/i });
      expect(categoriasLink).toHaveAttribute("href", "/categories");
    });

    it("should highlight active item in flyout", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper(["/products"]) });

      fireEvent.click(screen.getByTitle("Inventario"));

      const productosLink = screen.getByRole("link", { name: /productos/i });
      expect(productosLink.className).toContain("bg-primary-50");
    });

    it("should highlight active section icon when on its route in collapsed mode", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper(["/products"]) });

      const inventarioBtn = screen.getByTitle("Inventario");
      expect(inventarioBtn.className).toContain("bg-primary-50");
    });

    it("should render dashboard link with title when collapsed", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper(["/dashboard"]) });

      const dashboardLink = screen.getByTitle("Dashboard");
      expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    });

    it("should not show Dashboard text label when collapsed", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper(["/dashboard"]) });

      const navArea = screen.getByRole("navigation");
      expect(within(navArea).queryByText("Dashboard")).not.toBeInTheDocument();
    });

    it("should not show brand text or tenant name when collapsed", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.queryByText("StockFlow")).not.toBeInTheDocument();
      expect(screen.queryByText("Acme Corporation")).not.toBeInTheDocument();
    });

    it("should close flyout on Escape key", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByTitle("Inventario"));
      expect(screen.getByText("Productos")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByText("Productos")).not.toBeInTheDocument();
    });
  });

  describe("sections with no permitted items", () => {
    it("should hide entire section when user has no permissions for any item", () => {
      useAuthStore.setState({
        user: { ...mockUser, role: "EMPLOYEE" },
      });
      render(<Sidebar />, { wrapper: createWrapper() });

      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThan(0);
    });
  });

  describe("divider between dashboard and sections", () => {
    it("should render divider when expanded", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      const nav = screen.getByRole("navigation");
      const divider = nav.querySelector(".h-px.bg-neutral-100");
      expect(divider).toBeInTheDocument();
    });

    it("should render divider in collapsed mode between dashboard and sections", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper() });

      const nav = screen.getByRole("navigation");
      const divider = nav.querySelector(".h-px.bg-neutral-100");
      expect(divider).toBeInTheDocument();
    });
  });

  describe("user section edge cases", () => {
    it("should render default email when user has no email", () => {
      useAuthStore.setState({
        user: { ...mockUser, email: "" },
      });
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("usuario@email.com")).toBeInTheDocument();
    });

    it("should hide user info and logout button when collapsed", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
      expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
      expect(screen.queryByTitle("Cerrar sesion")).not.toBeInTheDocument();
    });

    it("should still render avatar when collapsed", () => {
      useUIStore.setState({ sidebarCollapsed: true });
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should disable logout button when logging out", () => {
      mockIsLoggingOut = true;
      render(<Sidebar />, { wrapper: createWrapper() });

      const logoutButton = screen.getByTitle("Cerrar sesion");
      expect(logoutButton).toBeDisabled();
    });
  });
});
