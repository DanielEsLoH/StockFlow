import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { motion } from "framer-motion";
import {
  Shield,
  LayoutDashboard,
  Users,
  Building2,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/Button";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { useSystemAdminAuth } from "~/hooks/useSystemAdmin";
import { useSystemAdminStore } from "~/stores/system-admin.store";
import { requireSystemAdminAuth } from "~/lib/system-admin-auth.server";
import type { Route } from "./+types/system-admin";

// Meta function for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "System Admin - StockFlow" },
    {
      name: "description",
      content: "Panel de administracion del sistema StockFlow",
    },
  ];
};

// Loader to check authentication
export function loader({ request }: Route.LoaderArgs) {
  requireSystemAdminAuth(request);
  return null;
}

// Navigation items
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
];

export default function SystemAdminLayout() {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const location = useLocation();
  const { logout, isLoggingOut } = useSystemAdminAuth();
  const { admin } = useSystemAdminStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-neutral-900 transition-transform duration-300 lg:static lg:translate-x-0",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-neutral-800 px-4">
            <Link
              to="/system-admin/dashboard"
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                <Shield className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <span className="font-display text-lg font-bold text-white">
                  StockFlow
                </span>
                <p className="text-xs text-neutral-400">System Admin</p>
              </div>
            </Link>
            <button
              className="lg:hidden text-neutral-400 hover:text-white"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-amber-500/20 text-amber-400"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-white",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="border-t border-neutral-800 p-4">
            {admin && (
              <div className="mb-4 rounded-lg bg-neutral-800 p-3">
                <p className="font-medium text-white">
                  {admin.firstName} {admin.lastName}
                </p>
                <p className="text-xs text-neutral-400">{admin.email}</p>
                <span className="mt-2 inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                  {admin.role}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              onClick={handleLogout}
              disabled={isLoggingOut}
              isLoading={isLoggingOut}
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesion
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-neutral-600 dark:text-neutral-400"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {navItems.find((item) => item.href === location.pathname)?.name ||
                "System Admin"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            initial={isMounted ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="container mx-auto px-4 py-6 lg:px-8"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

// Error boundary
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 dark:bg-neutral-950">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold text-error-500 mb-4">Error</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          Ha ocurrido un error inesperado.
        </p>
        {import.meta.env.DEV && error instanceof Error && (
          <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-neutral-200 dark:bg-neutral-800 p-4 text-left text-xs text-neutral-800 dark:text-neutral-200">
            {error.message}
          </pre>
        )}
        <a
          href="/system-admin/dashboard"
          className="inline-block mt-6 px-6 py-3 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
