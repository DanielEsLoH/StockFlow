import { useMemo } from "react";
import { Link, useLocation } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  TrendingUp,
  X,
} from "lucide-react";
import { cn, formatCurrency } from "~/lib/utils";
import { StockFlowLogo } from "~/components/ui/StockFlowLogo";
import { useAuthStore } from "~/stores/auth.store";
import { usePermissions } from "~/hooks/usePermissions";
import { useDashboardStats } from "~/hooks/useDashboard";
import { dashboardItem, navSections } from "./sidebar-nav-data";
import { NavItem } from "./NavItem";
import { SectionLabel } from "./SectionLabel";
import { UserSection } from "./UserSection";
import { OfflineBadge } from "~/components/offline/OfflineBadge";

interface SidebarContentProps {
  onToggleCollapse?: () => void;
  onClose?: () => void;
  showCollapseButton?: boolean;
  showCloseButton?: boolean;
  isMobile?: boolean;
}

export function SidebarContent({
  onToggleCollapse,
  onClose,
  showCollapseButton = false,
  showCloseButton = false,
  isMobile = false,
}: SidebarContentProps) {
  const { tenant } = useAuthStore();
  const { hasPermission, canSell } = usePermissions();

  const tenantName = tenant?.name || "Mi Empresa";

  const showDashboard =
    !dashboardItem.permission || hasPermission(dashboardItem.permission);

  // Filter sections by permissions
  const filteredSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) => !item.permission || hasPermission(item.permission),
          ),
        }))
        .filter((section) => section.items.length > 0),
    [hasPermission],
  );

  return (
    <div
      className={cn(
        "flex h-full w-[280px] flex-col overflow-hidden",
        "bg-white dark:bg-neutral-900",
        "border-r border-neutral-200/80 dark:border-neutral-800",
      )}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          {/* Logo */}
          <StockFlowLogo size="lg" />

          {/* Controls */}
          <div className="flex items-center gap-1">
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Cerrar menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            {showCollapseButton && onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                title="Colapsar"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Brand */}
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
      </div>

      {/* Caja Quick Access */}
      {canSell && <CajaQuickAccess onClick={onClose} />}

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 sidebar-scrollbar">
        {/* Dashboard */}
        {showDashboard && (
          <div className="mb-1 pt-2">
            <NavItem
              name={dashboardItem.name}
              href={dashboardItem.href}
              icon={dashboardItem.icon}
              onClick={onClose}
              compact={!isMobile}
            />
          </div>
        )}

        {/* Divider */}
        {showDashboard && (
          <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-2 mb-1 mt-1" />
        )}

        {/* Grouped flat sections */}
        {filteredSections.map((section, index) => (
          <div key={section.id}>
            <SectionLabel
              label={section.label}
              isFirst={index === 0 && !showDashboard}
            />
            {section.items.map((item) => (
              <NavItem
                key={item.href}
                name={item.name}
                href={item.href}
                icon={item.icon}
                onClick={onClose}
                compact={!isMobile}
                badge={item.href === "/invoices" ? <OfflineBadge /> : undefined}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Quick Stats */}
      <QuickStats />

      {/* User Section */}
      <UserSection />
    </div>
  );
}

/* --- Inline sub-components --- */

function CajaQuickAccess({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/pos" onClick={onClick}>
      <div
        className={cn(
          "mx-3 my-4 rounded-2xl overflow-hidden p-4",
          "bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600",
          "shadow-lg shadow-primary-500/30",
          "hover:shadow-xl hover:shadow-primary-500/40",
          "transition-all duration-300",
          "hover:scale-[1.01] active:scale-[0.99]",
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-base">Abrir Caja</p>
            <p className="text-white/70 text-sm">Punto de Venta</p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/60" />
        </div>
      </div>
    </Link>
  );
}

function QuickStats() {
  const { data: stats } = useDashboardStats();
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
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Ventas hoy
          </span>
          <span className="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrency(todaySales)}
          </span>
        </div>
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
