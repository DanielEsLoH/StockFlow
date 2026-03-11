import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { NavLink, Link, useLocation } from "react-router";
import { ChevronRight, LayoutDashboard, ShoppingCart } from "lucide-react";
import { cn } from "~/lib/utils";
import { usePermissions } from "~/hooks/usePermissions";
import {
  dashboardItem,
  navSections,
  findActiveSectionId,
  type NavSection,
} from "./sidebar-nav-data";
import { UserSection } from "./UserSection";

interface CollapsedSidebarProps {
  onToggleCollapse: () => void;
}

export function CollapsedSidebar({ onToggleCollapse }: CollapsedSidebarProps) {
  const location = useLocation();
  const { hasPermission, canSell } = usePermissions();
  const [openFlyoutId, setOpenFlyoutId] = useState<string | null>(null);

  const activeSectionId = useMemo(
    () => findActiveSectionId(location.pathname),
    [location.pathname],
  );

  const showDashboard =
    !dashboardItem.permission || hasPermission(dashboardItem.permission);
  const isDashboardActive =
    location.pathname === dashboardItem.href ||
    location.pathname.startsWith(`${dashboardItem.href}/`);

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

  // Close flyout on route change
  useEffect(() => {
    setOpenFlyoutId(null);
  }, [location.pathname]);

  // Close flyout on Escape
  useEffect(() => {
    if (!openFlyoutId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFlyoutId(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openFlyoutId]);

  return (
    <div
      className={cn(
        "flex h-full w-20 flex-col overflow-hidden",
        "bg-white dark:bg-neutral-900",
        "border-r border-neutral-200/80 dark:border-neutral-800",
      )}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-3 px-4 pt-5 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        {/* Logo */}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 text-white shadow-lg shadow-primary-500/25">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4zm10 16H4V9h16v11z" />
            <path d="M13 12h-2v3H8v2h3v3h2v-3h3v-2h-3z" />
          </svg>
        </div>

        {/* Expand button */}
        <button
          onClick={onToggleCollapse}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
          title="Expandir"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Caja Quick Access — collapsed icon */}
      {canSell && (
        <Link
          to="/pos"
          className={cn(
            "mx-3 my-3 flex items-center justify-center rounded-xl p-3",
            "bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600",
            "shadow-lg shadow-primary-500/30",
            "hover:shadow-xl hover:shadow-primary-500/40",
            "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
          )}
          title="Abrir Caja"
        >
          <ShoppingCart className="h-5 w-5 text-white" />
        </Link>
      )}

      {/* Navigation icons */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-3 sidebar-scrollbar">
        {/* Dashboard */}
        {showDashboard && (
          <div className="py-1">
            <NavLink
              to={dashboardItem.href}
              prefetch="intent"
              className={cn(
                "flex items-center justify-center w-full h-10 rounded-xl transition-all duration-200",
                isDashboardActive
                  ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
                  : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300",
              )}
              title="Dashboard"
            >
              <LayoutDashboard className="h-5 w-5" />
            </NavLink>
          </div>
        )}

        {/* Divider */}
        {showDashboard && (
          <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-1 my-2" />
        )}

        {/* Section icons with flyouts */}
        {filteredSections.map((section) => (
          <SectionIcon
            key={section.id}
            section={section}
            isActive={activeSectionId === section.id}
            isOpen={openFlyoutId === section.id}
            onToggle={() =>
              setOpenFlyoutId((prev) =>
                prev === section.id ? null : section.id,
              )
            }
            onClose={() => setOpenFlyoutId(null)}
          />
        ))}
      </nav>

      {/* User Section */}
      <UserSection isCollapsed />
    </div>
  );
}

/* --- Section Icon with Flyout --- */

function SectionIcon({
  section,
  isActive,
  isOpen,
  onToggle,
  onClose,
}: {
  section: NavSection & { items: NavSection["items"] };
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const location = useLocation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });
  const SectionIcon = section.icon;

  const handleToggle = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setFlyoutPos({ top: rect.top, left: rect.right + 8 });
    }
    onToggle();
  }, [onToggle]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        flyoutRef.current?.contains(target)
      )
        return;
      onClose();
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside, true);
  }, [isOpen, onClose]);

  return (
    <div className="py-1">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={cn(
          "flex items-center justify-center w-full h-10 rounded-xl transition-all duration-200",
          isOpen || isActive
            ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
            : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300",
        )}
        title={section.label}
      >
        <SectionIcon className="h-5 w-5" />
      </button>

      {/* Flyout */}
      {isOpen && (
        <div
          ref={flyoutRef}
          style={{ top: flyoutPos.top, left: flyoutPos.left }}
          className={cn(
            "fixed w-[220px] z-[60]",
            "bg-white dark:bg-neutral-900",
            "border border-neutral-200/80 dark:border-neutral-700",
            "rounded-xl shadow-lg shadow-neutral-200/50 dark:shadow-neutral-950/50",
            "py-2",
            "animate-[fade-in_0.15s_ease-out]",
          )}
        >
          {/* Section header */}
          <div className="px-3 pb-2 mb-1 border-b border-neutral-100 dark:border-neutral-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {section.label}
            </span>
          </div>

          {/* Items */}
          <ul className="space-y-0.5 px-1.5">
            {section.items.map((item) => {
              const isItemActive =
                location.pathname === item.href ||
                location.pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg",
                      "transition-colors duration-150 text-sm",
                      isItemActive
                        ? "bg-primary-50 text-primary-700 font-medium dark:bg-primary-500/10 dark:text-primary-400"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        isItemActive
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-neutral-400",
                      )}
                    />
                    <span className="whitespace-nowrap">{item.name}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
