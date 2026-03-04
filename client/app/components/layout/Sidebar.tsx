import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
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
  ChevronDown,
  X,
  ShoppingCart,
  Building,
  Building2,
  TrendingUp,
  Receipt,
  ArrowUpDown,
  ArrowLeftRight,
  ClipboardList,
  BookOpen,
  BookMarked,
  CalendarDays,
  PieChart,
  Landmark,
  UserCheck,
  Calculator,
  Cog,
  Truck,
  Bell,
  FileCheck,
  Award,
  Target,
  ScrollText,
  FileMinus,
  FilePlus,
  ShieldCheck,
  MonitorSmartphone,
  Plug,
  History,
  Boxes,
  RefreshCw,
} from "lucide-react";
import { cn, getInitials, formatCurrency } from "~/lib/utils";
import { useUIStore } from "~/stores/ui.store";
import { useAuthStore } from "~/stores/auth.store";
import { useAuth } from "~/hooks/useAuth";
import { usePermissions } from "~/hooks/usePermissions";
import { useDashboardStats } from "~/hooks/useDashboard";
import { Permission } from "~/types/permissions";
import { Button } from "~/components/ui/Button";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
}

interface NavSection {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string; // Tailwind color for the section dot/indicator
  items: NavItem[];
}

// Dashboard item (always visible, outside accordion)
const dashboardItem: NavItem = {
  name: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
  permission: Permission.DASHBOARD_VIEW,
};

// Grouped navigation sections with accordion behavior
const navSections: NavSection[] = [
  {
    label: "Inventario",
    icon: Package,
    colorClass: "bg-teal-500",
    items: [
      {
        name: "Productos",
        href: "/products",
        icon: Package,
        permission: Permission.PRODUCTS_VIEW,
      },
      {
        name: "Categorias",
        href: "/categories",
        icon: FolderTree,
        permission: Permission.CATEGORIES_VIEW,
      },
      {
        name: "Bodegas",
        href: "/warehouses",
        icon: Warehouse,
        permission: Permission.WAREHOUSES_VIEW,
      },
      {
        name: "Movimientos",
        href: "/inventory/movements",
        icon: ArrowUpDown,
        permission: Permission.INVENTORY_VIEW,
      },
      {
        name: "Transferencias",
        href: "/inventory/transfers",
        icon: ArrowLeftRight,
        permission: Permission.INVENTORY_TRANSFER,
      },
      {
        name: "Kardex",
        href: "/inventory/kardex",
        icon: ScrollText,
        permission: Permission.INVENTORY_VIEW,
      },
    ],
  },
  {
    label: "Ventas",
    icon: FileText,
    colorClass: "bg-indigo-500",
    items: [
      {
        name: "Cotizaciones",
        href: "/quotations",
        icon: ClipboardList,
        permission: Permission.QUOTATIONS_VIEW,
      },
      {
        name: "Facturas",
        href: "/invoices",
        icon: FileText,
        permission: Permission.INVOICES_VIEW,
      },
      {
        name: "Recurrentes",
        href: "/invoices/recurring",
        icon: RefreshCw,
        permission: Permission.INVOICES_VIEW,
      },
      {
        name: "Notas Credito",
        href: "/credit-notes",
        icon: FileMinus,
        permission: Permission.INVOICES_VIEW,
      },
      {
        name: "Notas Debito",
        href: "/debit-notes",
        icon: FilePlus,
        permission: Permission.INVOICES_VIEW,
      },
      {
        name: "Pagos",
        href: "/payments",
        icon: CreditCard,
        permission: Permission.PAYMENTS_VIEW,
      },
      {
        name: "Clientes",
        href: "/customers",
        icon: Users,
        permission: Permission.CUSTOMERS_VIEW,
      },
      {
        name: "Remisiones",
        href: "/remissions",
        icon: Truck,
        permission: Permission.INVOICES_VIEW,
      },
      {
        name: "Cobranza",
        href: "/collection",
        icon: Bell,
        permission: Permission.INVOICES_VIEW,
      },
    ],
  },
  {
    label: "Compras",
    icon: ShoppingCart,
    colorClass: "bg-orange-500",
    items: [
      {
        name: "Proveedores",
        href: "/suppliers",
        icon: Building2,
        permission: Permission.SUPPLIERS_VIEW,
      },
      {
        name: "Ordenes de Compra",
        href: "/purchases",
        icon: ShoppingCart,
        permission: Permission.PURCHASE_ORDERS_VIEW,
      },
      {
        name: "Doc. Soporte",
        href: "/support-documents",
        icon: FileCheck,
        permission: Permission.PURCHASE_ORDERS_VIEW,
      },
      {
        name: "Cert. Retencion",
        href: "/withholding-certificates",
        icon: Award,
        permission: Permission.PURCHASE_ORDERS_VIEW,
      },
      {
        name: "Gastos",
        href: "/expenses",
        icon: Receipt,
        permission: Permission.EXPENSES_VIEW,
      },
    ],
  },
  {
    label: "Contabilidad",
    icon: BookOpen,
    colorClass: "bg-violet-500",
    items: [
      {
        name: "Plan de Cuentas",
        href: "/accounting/accounts",
        icon: BookOpen,
        permission: Permission.ACCOUNTING_VIEW,
      },
      {
        name: "Asientos Contables",
        href: "/accounting/journal-entries",
        icon: BookMarked,
        permission: Permission.ACCOUNTING_VIEW,
      },
      {
        name: "Periodos",
        href: "/accounting/periods",
        icon: CalendarDays,
        permission: Permission.ACCOUNTING_VIEW,
      },
      {
        name: "Estados Financieros",
        href: "/accounting/reports",
        icon: PieChart,
        permission: Permission.ACCOUNTING_VIEW,
      },
      {
        name: "Centro de Costos",
        href: "/cost-centers",
        icon: Target,
        permission: Permission.ACCOUNTING_VIEW,
      },
      {
        name: "Cuentas Bancarias",
        href: "/bank/accounts",
        icon: Landmark,
        permission: Permission.BANK_VIEW,
      },
    ],
  },
  {
    label: "Punto de Venta",
    icon: MonitorSmartphone,
    colorClass: "bg-teal-500",
    items: [
      {
        name: "Ventas POS",
        href: "/pos/sales",
        icon: MonitorSmartphone,
        permission: Permission.POS_VIEW_SESSIONS,
      },
      {
        name: "Sesiones",
        href: "/pos/sessions",
        icon: History,
        permission: Permission.POS_VIEW_SESSIONS,
      },
      {
        name: "Cajas",
        href: "/pos/cash-registers",
        icon: Boxes,
        permission: Permission.CASH_REGISTERS_VIEW,
      },
    ],
  },
  {
    label: "Nomina",
    icon: UserCheck,
    colorClass: "bg-orange-500",
    items: [
      {
        name: "Empleados",
        href: "/payroll/employees",
        icon: UserCheck,
        permission: Permission.PAYROLL_VIEW,
      },
      {
        name: "Periodos de Pago",
        href: "/payroll/periods",
        icon: Calculator,
        permission: Permission.PAYROLL_VIEW,
      },
    ],
  },
  {
    label: "Administracion",
    icon: Settings,
    colorClass: "bg-neutral-500",
    items: [
      {
        name: "Equipo",
        href: "/team",
        icon: UsersRound,
        permission: Permission.USERS_VIEW,
      },
      {
        name: "Reportes",
        href: "/reports",
        icon: BarChart3,
        permission: Permission.REPORTS_VIEW,
      },
      {
        name: "DIAN",
        href: "/dian",
        icon: Building,
        permission: Permission.DIAN_VIEW,
      },
      {
        name: "Facturacion",
        href: "/billing",
        icon: Receipt,
        permission: Permission.SETTINGS_MANAGE,
      },
      {
        name: "Auditoria",
        href: "/audit-logs",
        icon: ShieldCheck,
        permission: Permission.AUDIT_VIEW,
      },
      {
        name: "Integraciones",
        href: "/integrations",
        icon: Plug,
        permission: Permission.INTEGRATIONS_VIEW,
      },
      {
        name: "Monedas",
        href: "/settings/currencies",
        icon: ArrowLeftRight,
        permission: Permission.EXCHANGE_RATES_VIEW,
      },
      {
        name: "Configuracion",
        href: "/settings",
        icon: Cog,
        permission: Permission.SETTINGS_VIEW,
      },
    ],
  },
];

// Animation variants
const sectionContentVariants = {
  open: {
    height: "auto" as const,
    opacity: 1,
    transition: {
      height: { duration: 0.2, ease: [0.0, 0.0, 0.58, 1.0] as const },
      opacity: { duration: 0.15, delay: 0.05 },
    },
  },
  closed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.2, ease: [0.42, 0.0, 1.0, 1.0] as const },
      opacity: { duration: 0.1 },
    },
  },
};

/**
 * Determines which section contains the current active route
 */
function findActiveSectionLabel(pathname: string): string | null {
  // Check dashboard first
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return null; // Dashboard is outside accordion
  }

  for (const section of navSections) {
    for (const item of section.items) {
      if (
        pathname === item.href ||
        pathname.startsWith(`${item.href}/`)
      ) {
        return section.label;
      }
    }
  }
  return null;
}

// Caja Quick Access Button Component
function CajaQuickAccess({
  isCollapsed,
  onClick,
}: {
  isCollapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <Link to="/pos" onClick={onClick}>
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
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-base">Abrir Caja</p>
              <p className="text-white/70 text-sm">Punto de Venta</p>
            </div>
          )}

          {/* Arrow indicator */}
          {!isCollapsed && (
            <ChevronRight className="h-5 w-5 text-white/60" />
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// Quick Stats Component — daily pulse indicator
function QuickStats({ isCollapsed }: { isCollapsed: boolean }) {
  const { data: stats } = useDashboardStats();

  if (isCollapsed) return null;

  const todaySales = stats?.todaySales ?? 0;
  const todayCount = stats?.todayInvoiceCount ?? 0;

  return (
    <div className="mx-3 mb-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <TrendingUp className="h-3.5 w-3.5 text-success-500" />
        <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
          Resumen del dia
        </span>
      </div>
      <div className="space-y-1.5">
        {/* Sales row */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Ventas hoy
          </span>
          <span className="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrency(todaySales)}
          </span>
        </div>
        {/* Invoices row */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Facturas
          </span>
          <span className="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
            {todayCount}
          </span>
        </div>
      </div>
    </div>
  );
}

// Accordion Section Component
function SidebarSection({
  section,
  filteredItems,
  isExpanded,
  isActiveSection,
  isCollapsed,
  onToggle,
  onNavClick,
  isMobile,
}: {
  section: NavSection;
  filteredItems: NavItem[];
  isExpanded: boolean;
  isActiveSection: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  onNavClick?: () => void;
  isMobile: boolean;
}) {
  const location = useLocation();
  const SectionIcon = section.icon;
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const enterTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const cooldownUntil = useRef(0);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });

  const openFlyout = useCallback(() => {
    if (Date.now() < cooldownUntil.current) return;
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    enterTimer.current = setTimeout(() => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setFlyoutPos({ top: rect.top, left: rect.right + 8 });
      }
      setFlyoutOpen(true);
    }, 150);
  }, []);

  const closeFlyout = useCallback(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    leaveTimer.current = setTimeout(() => setFlyoutOpen(false), 250);
  }, []);

  const closeFlyoutImmediate = useCallback(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setFlyoutOpen(false);
    cooldownUntil.current = Date.now() + 1500;
  }, []);

  // Close flyout on scroll
  useEffect(() => {
    if (!flyoutOpen) return;
    const nav = buttonRef.current?.closest("nav");
    if (!nav) return;
    const handleScroll = () => closeFlyoutImmediate();
    nav.addEventListener("scroll", handleScroll, { passive: true });
    return () => nav.removeEventListener("scroll", handleScroll);
  }, [flyoutOpen, closeFlyoutImmediate]);

  // Close flyout when route changes
  useEffect(() => {
    closeFlyoutImmediate();
  }, [location.pathname, closeFlyoutImmediate]);

  // Close flyout on any click outside the flyout/button area
  useEffect(() => {
    if (!flyoutOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        flyoutRef.current?.contains(target)
      )
        return;
      closeFlyoutImmediate();
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside, true);
  }, [flyoutOpen, closeFlyoutImmediate]);

  if (filteredItems.length === 0) return null;

  // Collapsed sidebar: icon + flyout popover with nav items
  if (isCollapsed) {
    return (
      <div
        className="py-1 px-3"
        onMouseEnter={openFlyout}
        onMouseLeave={closeFlyout}
      >
        <button
          ref={buttonRef}
          onClick={() => {
            if (buttonRef.current) {
              const rect = buttonRef.current.getBoundingClientRect();
              setFlyoutPos({ top: rect.top, left: rect.right + 8 });
            }
            setFlyoutOpen((v) => !v);
          }}
          className={cn(
            "flex items-center justify-center w-full h-10 rounded-xl",
            "transition-all duration-200",
            flyoutOpen || isActiveSection
              ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
              : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300",
          )}
          title={section.label}
        >
          <SectionIcon className="h-5 w-5" />
        </button>

        {/* Flyout popover — rendered via portal to escape overflow-hidden */}
        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {flyoutOpen && (
                <motion.div
                  ref={flyoutRef}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.15 }}
                  style={{ top: flyoutPos.top, left: flyoutPos.left }}
                  className={cn(
                    "fixed w-[220px] z-[60]",
                    "bg-white dark:bg-neutral-900",
                    "border border-neutral-200/80 dark:border-neutral-700",
                    "rounded-xl shadow-lg shadow-neutral-200/50 dark:shadow-neutral-950/50",
                    "py-2",
                  )}
                  onMouseEnter={() => {
                    if (leaveTimer.current) clearTimeout(leaveTimer.current);
                  }}
                  onMouseLeave={closeFlyout}
                >
                  {/* Section header */}
                  <div className="flex items-center gap-2 px-3 pb-2 mb-1 border-b border-neutral-100 dark:border-neutral-800">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full flex-shrink-0",
                        section.colorClass,
                      )}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      {section.label}
                    </span>
                  </div>

                  {/* Nav items */}
                  <ul className="space-y-0.5 px-1.5">
                    {filteredItems.map((item) => {
                      const isActive =
                        location.pathname === item.href ||
                        location.pathname.startsWith(`${item.href}/`);
                      const Icon = item.icon;

                      return (
                        <li key={item.href}>
                          <NavLink
                            to={item.href}
                            onClick={() => {
                              closeFlyoutImmediate();
                              onNavClick?.();
                            }}
                            className={cn(
                              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg",
                              "transition-colors duration-150 text-sm",
                              isActive
                                ? "bg-primary-50 text-primary-700 font-medium dark:bg-primary-500/10 dark:text-primary-400"
                                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 flex-shrink-0",
                                isActive
                                  ? "text-primary-600 dark:text-primary-400"
                                  : "text-neutral-400",
                              )}
                            />
                            <span className="whitespace-nowrap">
                              {item.name}
                            </span>
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )}
      </div>
    );
  }

  return (
    <div className="mt-1">
      {/* Section header - clickable */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl",
          "transition-all duration-200 group",
          isExpanded
            ? "bg-neutral-100/80 dark:bg-neutral-800/60"
            : "hover:bg-neutral-50 dark:hover:bg-neutral-800/30",
          isActiveSection && !isExpanded && "bg-primary-50/50 dark:bg-primary-500/5",
        )}
      >
        {/* Colored dot indicator */}
        <span
          className={cn(
            "h-2 w-2 rounded-full flex-shrink-0 transition-all duration-200",
            section.colorClass,
            isActiveSection ? "scale-125 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900" : "opacity-60",
            isActiveSection && section.colorClass.replace("bg-", "ring-"),
          )}
        />

        {/* Section label */}
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wider flex-1 text-left",
            isActiveSection
              ? "text-neutral-700 dark:text-neutral-200"
              : "text-neutral-400 dark:text-neutral-500",
          )}
        >
          {section.label}
        </span>

        {/* Item count badge */}
        <span
          className={cn(
            "text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded-md",
            isExpanded
              ? "bg-neutral-200/80 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
              : "text-neutral-400 dark:text-neutral-600",
          )}
        >
          {filteredItems.length}
        </span>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
        </motion.div>
      </button>

      {/* Expandable items */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.ul
            variants={sectionContentVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="overflow-hidden space-y-0.5 pl-1 mt-0.5"
          >
            {filteredItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                location.pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <li key={item.href} className="relative">
                  <NavLink
                    to={item.href}
                    onClick={onNavClick}
                    className={({ isActive: navLinkActive }) =>
                      cn(
                        "group flex items-center gap-3 px-3 py-2 rounded-xl",
                        "transition-all duration-200",
                        "relative",
                        isActive || navLinkActive
                          ? "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                      )
                    }
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId={
                          isMobile
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
                        "h-4.5 w-4.5 flex-shrink-0 transition-colors",
                        isActive
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300",
                      )}
                    />
                    <span className="text-sm font-medium whitespace-nowrap">
                      {item.name}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// Shared sidebar content component
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
  const { hasPermission, canSell } = usePermissions();
  const { expandedSidebarSection, toggleSidebarSection, setExpandedSidebarSection } =
    useUIStore();

  const userName = user ? `${user.firstName} ${user.lastName}` : "Usuario";
  const userEmail = user?.email || "usuario@email.com";
  const userInitials = getInitials(userName);
  const tenantName = tenant?.name || "Mi Empresa";

  // Determine which section contains the active route
  const activeSectionLabel = useMemo(
    () => findActiveSectionLabel(location.pathname),
    [location.pathname],
  );

  // Auto-expand section containing active route when navigating
  // Only auto-expand if no section is currently expanded or if the active route changed
  useMemo(() => {
    if (activeSectionLabel && expandedSidebarSection !== activeSectionLabel) {
      setExpandedSidebarSection(activeSectionLabel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSectionLabel]);

  // Dashboard has permission check
  const showDashboard = !dashboardItem.permission || hasPermission(dashboardItem.permission);
  const isDashboardActive =
    location.pathname === dashboardItem.href ||
    location.pathname.startsWith(`${dashboardItem.href}/`);

  const isMobile = showCloseButton;

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden",
        "bg-white dark:bg-neutral-900",
        "border-r border-neutral-200/80 dark:border-neutral-800",
        "transition-[width] duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-[280px]",
      )}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        {/* Top row: Logo/Icon + Controls */}
        <div className={cn("flex items-center justify-between", !isCollapsed && "mb-3")}>
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
        {!isCollapsed && (
          <div>
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
          </div>
        )}
      </div>

      {/* Caja Quick Access - only for roles with POS access */}
      {canSell && (
        <CajaQuickAccess isCollapsed={isCollapsed} onClick={onClose} />
      )}

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden pb-4", isCollapsed ? "px-0" : "px-3")}>
        {/* Dashboard - always visible, outside accordion */}
        {showDashboard && (
          <div className={isCollapsed ? "px-3 py-1" : "mb-2"}>
            <NavLink
              to={dashboardItem.href}
              onClick={onClose}
              className={({ isActive: navLinkActive }) =>
                cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl",
                  "transition-all duration-200",
                  "relative",
                  isDashboardActive || navLinkActive
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                  isCollapsed && "justify-center",
                )
              }
              title={isCollapsed ? "Dashboard" : undefined}
            >
              {/* Active indicator */}
              {isDashboardActive && (
                <motion.div
                  layoutId={
                    isMobile
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

              <LayoutDashboard
                className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isDashboardActive
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300",
                )}
              />
              {!isCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap">
                  Dashboard
                </span>
              )}
            </NavLink>
          </div>
        )}

        {/* Divider between dashboard and sections */}
        {showDashboard && !isCollapsed && (
          <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-2 mb-2" />
        )}

        {/* Accordion sections */}
        {navSections.map((section) => {
          const filteredItems = section.items.filter((item) => {
            if (!item.permission) return true;
            return hasPermission(item.permission);
          });

          if (filteredItems.length === 0) return null;

          return (
            <SidebarSection
              key={section.label}
              section={section}
              filteredItems={filteredItems}
              isExpanded={expandedSidebarSection === section.label}
              isActiveSection={activeSectionLabel === section.label}
              isCollapsed={isCollapsed}
              onToggle={() => toggleSidebarSection(section.label)}
              onNavClick={onClose}
              isMobile={isMobile}
            />
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
            {user?.avatar ? (
              <img
                src={user.avatar}
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
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {userName}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {userEmail}
              </p>
            </div>
          )}

          {/* Logout button */}
          {!isCollapsed && (
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
          )}
        </div>
      </div>
    </div>
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
