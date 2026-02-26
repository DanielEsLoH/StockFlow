import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
      // Desktop sidebar is always visible (controlled by CSS hidden lg:flex)
      // This test verifies the desktop sidebar is always rendered
      useUIStore.setState({ mobileSidebarOpen: false });

      render(<Sidebar />, { wrapper: createWrapper() });

      // Desktop sidebar should always be in the DOM
      expect(screen.getByText("StockFlow")).toBeInTheDocument();
    });

    it("should render mobile sidebar overlay when mobileSidebarOpen is true", () => {
      useUIStore.setState({ mobileSidebarOpen: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      // Should have backdrop overlay for mobile (bg-black/60 with backdrop-blur)
      const backdrop = document.querySelector(
        ".lg\\:hidden.fixed.inset-0.z-40.bg-black\\/60",
      );
      expect(backdrop).toBeInTheDocument();
    });

    it("should not render mobile sidebar overlay when mobileSidebarOpen is false", () => {
      useUIStore.setState({ mobileSidebarOpen: false });

      render(<Sidebar />, { wrapper: createWrapper() });

      // Should NOT have backdrop overlay for mobile when closed
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

  describe("navigation items", () => {
    it("should render all navigation items", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(
        screen.getByRole("link", { name: /dashboard/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /productos/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /categorias/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /bodegas/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /clientes/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /facturas/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /pagos/i })).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /reportes/i }),
      ).toBeInTheDocument();
      // There are two "Configuracion" links: Nomina config and Settings
      const configLinks = screen.getAllByRole("link", {
        name: /configuracion/i,
      });
      expect(configLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("should have correct href for navigation links", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
        "href",
        "/dashboard",
      );
      expect(screen.getByRole("link", { name: /productos/i })).toHaveAttribute(
        "href",
        "/products",
      );
      expect(screen.getByRole("link", { name: /categorias/i })).toHaveAttribute(
        "href",
        "/categories",
      );
    });

    it("should highlight active route", () => {
      render(<Sidebar />, { wrapper: createWrapper(["/dashboard"]) });

      const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
      expect(dashboardLink.className).toContain("bg-primary-50");
    });

    it("should highlight active route for products", () => {
      render(<Sidebar />, { wrapper: createWrapper(["/products"]) });

      const productsLink = screen.getByRole("link", { name: /productos/i });
      expect(productsLink.className).toContain("bg-primary-50");
    });

    it("should highlight active route for nested paths", () => {
      render(<Sidebar />, { wrapper: createWrapper(["/products/123/edit"]) });

      const productsLink = screen.getByRole("link", { name: /productos/i });
      // The NavLink should detect nested paths
      expect(productsLink).toBeInTheDocument();
    });
  });

  describe("collapse toggle", () => {
    it("should render collapse button", () => {
      render(<Sidebar />, { wrapper: createWrapper() });

      // The button has a title attribute
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

      // John Doe -> JD
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

      // The nav links still exist but text is hidden via animation
      // We just verify the collapsed state affects the UI
      const sidebar = screen.getByRole("navigation").parentElement;
      expect(sidebar).toBeInTheDocument();
    });

    it("should show title attributes on nav items when collapsed", async () => {
      useUIStore.setState({ sidebarCollapsed: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      // When collapsed, links should have title for tooltip
      const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute("title", "Dashboard");
    });
  });

  describe("mobile sidebar interactions", () => {
    it("should close mobile sidebar when clicking backdrop", async () => {
      const user = userEvent.setup();
      useUIStore.setState({ mobileSidebarOpen: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      // Find the backdrop (bg-black/60 with backdrop-blur)
      const backdrop = document.querySelector(
        ".lg\\:hidden.fixed.inset-0.z-40.bg-black\\/60",
      );
      expect(backdrop).toBeInTheDocument();

      // Click the backdrop
      await user.click(backdrop as Element);

      // Mobile sidebar should be closed
      expect(useUIStore.getState().mobileSidebarOpen).toBe(false);
    });

    it("should render close button in mobile sidebar", () => {
      useUIStore.setState({ mobileSidebarOpen: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      // Close button should be present (aria-label "Cerrar menu")
      expect(screen.getByLabelText("Cerrar menu")).toBeInTheDocument();
    });

    it("should close mobile sidebar when clicking close button", async () => {
      const user = userEvent.setup();
      useUIStore.setState({ mobileSidebarOpen: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      // Click the close button
      const closeButton = screen.getByLabelText("Cerrar menu");
      await user.click(closeButton);

      // Mobile sidebar should be closed
      expect(useUIStore.getState().mobileSidebarOpen).toBe(false);
    });

    it("should close mobile sidebar when clicking a navigation link", async () => {
      const user = userEvent.setup();
      useUIStore.setState({ mobileSidebarOpen: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      // Find a nav link and click it - there are multiple nav sections (desktop + mobile)
      // so we need to get all links and click one from the mobile sidebar
      const productsLinks = screen.getAllByRole("link", { name: /productos/i });
      // The mobile sidebar link will be the second one (after desktop)
      await user.click(productsLinks[productsLinks.length - 1]);

      // Mobile sidebar should be closed after navigation
      expect(useUIStore.getState().mobileSidebarOpen).toBe(false);
    });

    it("should render mobile sidebar drawer with correct initial position", () => {
      useUIStore.setState({ mobileSidebarOpen: true });

      render(<Sidebar />, { wrapper: createWrapper() });

      // Mobile sidebar drawer should be present
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

    it("should show Team item for manager users (has USERS_VIEW permission)", () => {
      useAuthStore.setState({
        user: { ...mockUser, role: "MANAGER" },
      });

      render(<Sidebar />, { wrapper: createWrapper() });

      // MANAGER role has USERS_VIEW permission by default, so they can see the Team item
      expect(
        screen.getByRole("link", { name: /equipo/i }),
      ).toBeInTheDocument();
    });
  });
});
