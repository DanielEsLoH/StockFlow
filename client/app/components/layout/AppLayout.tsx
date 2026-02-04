import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  FileText,
  ShoppingCart,
  Settings,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useUIStore } from "~/stores/ui.store";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

// Media query breakpoint for lg (1024px)
const DESKTOP_BREAKPOINT = 1024;

// Bottom navigation items for mobile
const bottomNavItems = [
  { name: "Inicio", href: "/dashboard", icon: LayoutDashboard },
  { name: "Productos", href: "/products", icon: Package },
  { name: "Caja", href: "/invoices/new", icon: ShoppingCart, isMain: true },
  { name: "Facturas", href: "/invoices", icon: FileText },
  { name: "Config", href: "/settings", icon: Settings },
];

export function AppLayout() {
  const { sidebarCollapsed, setMobileSidebarOpen } = useUIStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close mobile sidebar when viewport changes to desktop
  useEffect(() => {
    // SSR safety check
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(
      `(min-width: ${DESKTOP_BREAKPOINT}px)`,
    );

    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        // Switched to desktop viewport - close mobile sidebar overlay
        setMobileSidebarOpen(false);
      }
    };

    // Add listener for viewport changes
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [setMobileSidebarOpen]);

  // Calculate content margin based on desktop sidebar state
  const contentMarginLeft = sidebarCollapsed ? "lg:ml-20" : "lg:ml-[280px]";

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar - handles both desktop (CSS) and mobile (state) internally */}
      <Sidebar />

      {/* Main content area */}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden transition-all duration-300",
          contentMarginLeft,
        )}
      >
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <motion.div
            initial={isMounted ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="container mx-auto px-4 py-6 lg:px-8"
          >
            <Outlet />
          </motion.div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 inset-x-0 z-50 lg:hidden">
          {/* Blur backdrop */}
          <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-t border-neutral-200/60 dark:border-neutral-800/60" />

          {/* Navigation items */}
          <div className="relative flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;

              // Main CTA button (Caja)
              if (item.isMain) {
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className="relative -mt-6"
                  >
                    {({ isActive }) => (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "flex h-14 w-14 items-center justify-center rounded-2xl",
                          "bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600",
                          "shadow-lg shadow-primary-500/30",
                          "transition-shadow duration-200",
                          isActive && "shadow-primary-500/50 shadow-xl",
                        )}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </motion.div>
                    )}
                  </NavLink>
                );
              }

              // Regular navigation items
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === "/dashboard"}
                  className="flex-1 flex flex-col items-center py-1"
                >
                  {({ isActive }) => (
                    <motion.div
                      whileTap={{ scale: 0.95 }}
                      className="flex flex-col items-center gap-0.5"
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                          isActive
                            ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                            : "text-neutral-500 dark:text-neutral-400",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-medium transition-colors",
                          isActive
                            ? "text-primary-600 dark:text-primary-400"
                            : "text-neutral-500 dark:text-neutral-400",
                        )}
                      >
                        {item.name}
                      </span>
                      {/* Active indicator dot */}
                      {isActive && (
                        <motion.div
                          layoutId="bottomNavIndicator"
                          className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary-500"
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                        />
                      )}
                    </motion.div>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
