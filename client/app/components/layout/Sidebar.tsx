import { NavLink, useLocation, Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Warehouse,
  Users,
  UsersRound,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  ShoppingCart,
  Building,
  TrendingUp,
  Receipt,
  ArrowUpDown,
  ArrowLeftRight,
} from "lucide-react";
import { cn, getInitials } from "~/lib/utils";
import { useUIStore } from "~/stores/ui.store";
import { useAuthStore } from "~/stores/auth.store";
import { useAuth } from "~/hooks/useAuth";
import { Button } from "~/components/ui/Button";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavSection {
  label: string | null;
  items: NavItem[];
}

// Grouped navigation sections
const navSections: NavSection[] = [
  {
    label: null,
    items: [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Inventario",
    items: [
      { name: "Productos", href: "/products", icon: Package },
      { name: "Categorias", href: "/categories", icon: FolderTree },
      { name: "Bodegas", href: "/warehouses", icon: Warehouse },
      { name: "Movimientos", href: "/inventory/movements", icon: ArrowUpDown },
      { name: "Transferencias", href: "/inventory/transfers", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Ventas",
    items: [
      { name: "Facturas", href: "/invoices", icon: FileText },
      { name: "Pagos", href: "/payments", icon: CreditCard },
      { name: "Clientes", href: "/customers", icon: Users },
    ],
  },
  {
    label: "Administracion",
    items: [
      { name: "Equipo", href: "/team", icon: UsersRound, adminOnly: true },
      { name: "Reportes", href: "/reports", icon: BarChart3 },
      { name: "DIAN", href: "/dian", icon: Building },
      { name: "Configuracion", href: "/settings", icon: Settings },
    ],
  },
];

const sidebarVariants = {
  expanded: {
    width: 280,
    transition: { duration: 0.3, ease: "easeInOut" as const },
  },
  collapsed: {
    width: 80,
    transition: { duration: 0.3, ease: "easeInOut" as const },
  },
};

const itemVariants = {
  expanded: {
    opacity: 1,
    x: 0,
    display: "block",
    transition: { duration: 0.2, delay: 0.1 },
  },
  collapsed: {
    opacity: 0,
    x: -10,
    transitionEnd: { display: "none" },
    transition: { duration: 0.1 },
  },
};

// Caja Quick Access Button Component
function CajaQuickAccess({
  isCollapsed,
  onClick,
}: {
  isCollapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <Link to="/invoices/new" onClick={onClick}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "mx-3 my-4 rounded-2xl overflow-hidden",
          "bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600",
          "shadow-lg shadow-primary-500/30",
          "hover:shadow-xl hover:shadow-primary-500/40",
          "transition-all duration-300",
          isCollapsed ? "p-3" : "p-4",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "gap-4",
          )}
        >
          {/* Icon container */}
          <div
            className={cn(
              "flex items-center justify-center rounded-xl",
              "bg-white/20 backdrop-blur-sm",
              isCollapsed ? "h-10 w-10" : "h-12 w-12",
              "flex-shrink-0",
            )}
          >
            <ShoppingCart
              className={cn("text-white", isCollapsed ? "h-5 w-5" : "h-6 w-6")}
            />
          </div>

          {/* Text content */}
          <motion.div
            variants={itemVariants}
            animate={isCollapsed ? "collapsed" : "expanded"}
            className="flex-1 min-w-0"
          >
            <p className="font-bold text-white text-base">Abrir Caja</p>
            <p className="text-white/70 text-sm">Punto de Venta</p>
          </motion.div>

          {/* Arrow indicator */}
          <motion.div
            variants={itemVariants}
            animate={isCollapsed ? "collapsed" : "expanded"}
          >
            <ChevronRight className="h-5 w-5 text-white/60" />
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}

// Quick Stats Component
function QuickStats({ isCollapsed }: { isCollapsed: boolean }) {
  if (isCollapsed) return null;

  return (
    <motion.div
      variants={itemVariants}
      animate={isCollapsed ? "collapsed" : "expanded"}
      className="mx-3 mb-4 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50"
    >
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-4 w-4 text-success-500" />
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Resumen del dia
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center p-2 rounded-lg bg-white dark:bg-neutral-800">
          <p className="text-lg font-bold text-neutral-900 dark:text-white">
            $0
          </p>
          <p className="text-[10px] text-neutral-500">Ventas hoy</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white dark:bg-neutral-800">
          <p className="text-lg font-bold text-neutral-900 dark:text-white">
            0
          </p>
          <p className="text-[10px] text-neutral-500">Facturas</p>
        </div>
      </div>
    </motion.div>
  );
}

// Shared sidebar content component to avoid duplication
interface SidebarContentProps {
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
  showCollapseButton?: boolean;
  showCloseButton?: boolean;
}

function SidebarContent({
  isCollapsed,
  onToggleCollapse,
  onClose,
  showCollapseButton = false,
  showCloseButton = false,
}: SidebarContentProps) {
  const location = useLocation();
  const { user, tenant } = useAuthStore();
  const { logout, isLoggingOut } = useAuth();

  const userName = user ? `${user.firstName} ${user.lastName}` : "Usuario";
  const userEmail = user?.email || "usuario@email.com";
  const userInitials = getInitials(userName);
  const tenantName = tenant?.name || "Mi Empresa";

  return (
    <motion.div
      variants={sidebarVariants}
      initial={false}
      animate={isCollapsed ? "collapsed" : "expanded"}
      className={cn(
        "flex h-full flex-col",
        "bg-white dark:bg-neutral-900",
        "border-r border-neutral-200/80 dark:border-neutral-800",
      )}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        {/* Top row: Logo/Icon + Controls */}
        <div className="flex items-center justify-between mb-3">
          {/* Logo Icon */}
          <div
            className={cn(
              "flex items-center justify-center rounded-xl",
              "bg-gradient-to-br from-primary-500 to-accent-600",
              "text-white shadow-lg shadow-primary-500/25",
              "flex-shrink-0",
              isCollapsed ? "h-10 w-10" : "h-11 w-11",
            )}
          >
            <svg
              className={isCollapsed ? "h-5 w-5" : "h-6 w-6"}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4zm10 16H4V9h16v11z" />
              <path d="M13 12h-2v3H8v2h3v3h2v-3h3v-2h-3z" />
            </svg>
          </div>

          {/* Control buttons */}
          <div className="flex items-center gap-1">
            {/* Close button for mobile */}
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100",
                  "dark:hover:text-neutral-300 dark:hover:bg-neutral-800",
                  "transition-colors",
                )}
                aria-label="Cerrar menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {/* Collapse toggle for desktop */}
            {showCollapseButton && onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100",
                  "dark:hover:text-neutral-300 dark:hover:bg-neutral-800",
                  "transition-colors",
                )}
                title={isCollapsed ? "Expandir" : "Colapsar"}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Brand + Tenant info */}
        <motion.div
          variants={itemVariants}
          animate={isCollapsed ? "collapsed" : "expanded"}
        >
          <h1 className="text-xl font-bold font-display text-neutral-900 dark:text-white">
            StockFlow
          </h1>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              Empresa
            </span>
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300 truncate">
              {tenantName}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Caja Quick Access */}
      <CajaQuickAccess isCollapsed={isCollapsed} onClick={onClose} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {navSections.map((section, sectionIndex) => {
          // Filter items based on admin status
          const filteredItems = section.items.filter((item) => {
            if (item.adminOnly) {
              return user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
            }
            return true;
          });

          if (filteredItems.length === 0) return null;

          return (
            <div key={sectionIndex} className={sectionIndex > 0 ? "mt-6" : ""}>
              {/* Section label */}
              {section.label && !isCollapsed && (
                <motion.p
                  variants={itemVariants}
                  animate={isCollapsed ? "collapsed" : "expanded"}
                  className="sidebar-label"
                >
                  {section.label}
                </motion.p>
              )}

              {/* Section items */}
              <ul className="space-y-1">
                {filteredItems.map((item) => {
                  const isActive =
                    location.pathname === item.href ||
                    location.pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  return (
                    <li key={item.href} className="relative">
                      <NavLink
                        to={item.href}
                        onClick={onClose}
                        className={({ isActive: navLinkActive }) =>
                          cn(
                            "group flex items-center gap-3 px-3 py-2.5 rounded-xl",
                            "transition-all duration-200",
                            "relative",
                            isActive || navLinkActive
                              ? "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400"
                              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                          )
                        }
                        title={isCollapsed ? item.name : undefined}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            layoutId={
                              showCloseButton
                                ? "mobileActiveIndicator"
                                : "activeIndicator"
                            }
                            className="nav-indicator"
                            initial={false}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                            }}
                          />
                        )}

                        <Icon
                          className={cn(
                            "h-5 w-5 flex-shrink-0 transition-colors",
                            isActive
                              ? "text-primary-600 dark:text-primary-400"
                              : "text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300",
                          )}
                        />
                        <motion.span
                          variants={itemVariants}
                          animate={isCollapsed ? "collapsed" : "expanded"}
                          className="text-sm font-medium whitespace-nowrap"
                        >
                          {item.name}
                        </motion.span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Quick Stats */}
      <QuickStats isCollapsed={isCollapsed} />

      {/* User section */}
      <div className="border-t border-neutral-100 dark:border-neutral-800 p-4">
        <div
          className={cn(
            "flex items-center gap-3",
            isCollapsed ? "justify-center" : "",
          )}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={userName}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-neutral-800"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-accent-100 text-primary-700 dark:from-primary-900/50 dark:to-accent-900/50 dark:text-primary-400 font-medium text-sm ring-2 ring-white dark:ring-neutral-800">
                {userInitials}
              </div>
            )}
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-success-500 ring-2 ring-white dark:ring-neutral-900" />
          </div>

          {/* User info */}
          <motion.div
            variants={itemVariants}
            animate={isCollapsed ? "collapsed" : "expanded"}
            className="flex-1 min-w-0"
          >
            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
              {userName}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {userEmail}
            </p>
          </motion.div>

          {/* Logout button */}
          <motion.div
            variants={itemVariants}
            animate={isCollapsed ? "collapsed" : "expanded"}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => logout()}
              disabled={isLoggingOut}
              title="Cerrar sesion"
              className="text-neutral-400 hover:text-error-600 hover:bg-error-50 dark:hover:text-error-400 dark:hover:bg-error-900/20"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export function Sidebar() {
  const {
    sidebarCollapsed,
    toggleSidebarCollapse,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useUIStore();

  return (
    <>
      {/* Desktop Sidebar - Always visible on lg+, controlled by CSS */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40">
        <SidebarContent
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          showCollapseButton={true}
        />
      </aside>

      {/* Mobile Sidebar Overlay - Controlled by React state */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
            />

            {/* Mobile sidebar drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px]"
            >
              <SidebarContent
                isCollapsed={false}
                onClose={() => setMobileSidebarOpen(false)}
                showCloseButton={true}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
