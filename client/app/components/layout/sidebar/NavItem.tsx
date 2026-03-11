import { NavLink, useLocation } from "react-router";
import { cn } from "~/lib/utils";

interface NavItemProps {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  compact?: boolean;
}

export function NavItem({ name, href, icon: Icon, onClick, compact = true }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === href || location.pathname.startsWith(`${href}/`);

  return (
    <NavLink
      to={href}
      prefetch="intent"
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg",
        "transition-colors duration-150",
        compact ? "px-3 py-1.5" : "px-3 py-2.5",
        isActive
          ? "bg-primary-50 text-primary-700 border-l-2 border-primary-500 dark:bg-primary-500/10 dark:text-primary-400"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-white border-l-2 border-transparent",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 flex-shrink-0 transition-colors",
          isActive
            ? "text-primary-600 dark:text-primary-400"
            : "text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300",
        )}
      />
      <span
        className={cn(
          "text-sm whitespace-nowrap",
          isActive ? "font-medium" : "font-normal",
        )}
      >
        {name}
      </span>
    </NavLink>
  );
}
