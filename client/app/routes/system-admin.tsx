import { useState, useEffect, useCallback } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Building2,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/Button";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { StockFlowLogo } from "~/components/ui/StockFlowLogo";
import { useSystemAdminAuth } from "~/hooks/useSystemAdmin";
import { useSystemAdminStore } from "~/stores/system-admin.store";
import { requireSystemAdminAuth } from "~/lib/system-admin-auth.server";
import type { Route } from "./+types/system-admin";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "System Admin - StockFlow" },
    {
      name: "description",
      content: "Panel de administracion del sistema StockFlow",
    },
  ];
};

export function loader({ request }: Route.LoaderArgs) {
  requireSystemAdminAuth(request);
  return null;
}

const navItems = [
  {
    name: "Dashboard",
    href: "/system-admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Usuarios",
    href: "/system-admin/users",
    icon: Users,
  },
  {
    name: "Tenants",
    href: "/system-admin/tenants",
    icon: Building2,
  },
  {
    name: "Notificaciones",
    href: "/system-admin/notifications",
    icon: Bell,
  },
];

const breadcrumbLabels: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Usuarios",
  tenants: "Tenants",
  notifications: "Notificaciones",
};

export default function SystemAdminLayout() {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const location = useLocation();
  const { logout, isLoggingOut } = useSystemAdminAuth();
  const { admin } = useSystemAdminStore();

  useEffect(() => {
    setIsMounted(true);
    // Restore sidebar state
    const saved = localStorage.getItem("sa-sidebar-collapsed");
    if (saved === "true") setIsCollapsed(true);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sa-sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const handleLogout = () => {
    logout();
  };

  // Get breadcrumb segment
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentPage = pathSegments[pathSegments.length - 1] || "dashboard";
  const currentPageLabel = breadcrumbLabels[currentPage] || currentPage;

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* === Sidebar === */}
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
          "lg:static",
          isMobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
          "transition-transform duration-300 lg:transition-none",
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 shrink-0 items-center border-b border-neutral-200 px-4 dark:border-neutral-800">
          <Link
            to="/system-admin/dashboard"
            className="flex items-center gap-2.5 overflow-hidden"
          >
            <StockFlowLogo
              size={isCollapsed ? "sm" : "md"}
              showText={!isCollapsed}
            />
          </Link>
          {/* Mobile close */}
          <button
            className="ml-auto lg:hidden text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/system-admin/dashboard" &&
                location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isCollapsed && "justify-center px-0",
                  isActive
                    ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                )}
                title={isCollapsed ? item.name : undefined}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="sa-active-nav"
                    className="absolute inset-0 rounded-xl bg-primary-50 dark:bg-primary-500/10"
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 30,
                    }}
                    style={{ zIndex: -1 }}
                  />
                )}
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle + User + Logout */}
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          {/* User card */}
          {admin && !isCollapsed && (
            <div className="mb-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-sm font-semibold text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                  {admin.firstName?.[0]}
                  {admin.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                    {admin.firstName} {admin.lastName}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {admin.role}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Collapse toggle — desktop only */}
          <div className="hidden lg:block mb-2">
            <button
              onClick={toggleCollapse}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              title={isCollapsed ? "Expandir" : "Colapsar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Colapsar</span>
                </>
              )}
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-500 transition-colors hover:bg-error-50 hover:text-error-600 dark:text-neutral-400 dark:hover:bg-error-500/10 dark:hover:text-error-400",
              isCollapsed && "justify-center",
            )}
            title={isCollapsed ? "Cerrar sesion" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>Cerrar sesion</span>}
          </button>
        </div>
      </motion.aside>

      {/* === Main content area === */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="lg:hidden text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-sm">
              <span className="text-neutral-400">Admin</span>
              <ChevronRight className="h-3.5 w-3.5 text-neutral-300 dark:text-neutral-600" />
              <span className="font-medium text-neutral-900 dark:text-white">
                {currentPageLabel}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Page content with transitions */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={isMounted ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-7xl px-4 py-6 lg:px-8"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="text-center px-4">
        <h1 className="font-display text-4xl font-bold text-error-500 mb-4">
          Error
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          Ha ocurrido un error inesperado.
        </p>
        {import.meta.env.DEV && error instanceof Error && (
          <pre className="mt-4 max-w-lg overflow-auto rounded-xl bg-neutral-100 dark:bg-neutral-800 p-4 text-left text-xs text-neutral-700 dark:text-neutral-300">
            {error.message}
          </pre>
        )}
        <a
          href="/system-admin/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-white transition-colors hover:bg-primary-700"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
