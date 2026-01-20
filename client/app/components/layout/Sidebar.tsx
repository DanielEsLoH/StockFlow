import { NavLink, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { cn, getInitials } from '~/lib/utils';
import { useUIStore } from '~/stores/ui.store';
import { useAuthStore } from '~/stores/auth.store';
import { useAuth } from '~/hooks/useAuth';
import { Button } from '~/components/ui/Button';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Productos', href: '/products', icon: Package },
  { name: 'Categorias', href: '/categories', icon: FolderTree },
  { name: 'Bodegas', href: '/warehouses', icon: Warehouse },
  { name: 'Clientes', href: '/customers', icon: Users },
  { name: 'Equipo', href: '/team', icon: UsersRound, adminOnly: true },
  { name: 'Facturas', href: '/invoices', icon: FileText },
  { name: 'Pagos', href: '/payments', icon: CreditCard },
  { name: 'Reportes', href: '/reports', icon: BarChart3 },
  { name: 'Configuracion', href: '/settings', icon: Settings },
];

const sidebarVariants = {
  expanded: {
    width: 280,
    transition: { duration: 0.3, ease: 'easeInOut' as const },
  },
  collapsed: {
    width: 80,
    transition: { duration: 0.3, ease: 'easeInOut' as const },
  },
};

const itemVariants = {
  expanded: {
    opacity: 1,
    x: 0,
    display: 'block',
    transition: { duration: 0.2, delay: 0.1 },
  },
  collapsed: {
    opacity: 0,
    x: -10,
    transitionEnd: { display: 'none' },
    transition: { duration: 0.1 },
  },
};

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

  const userName = user ? `${user.firstName} ${user.lastName}` : 'Usuario';
  const userEmail = user?.email || 'usuario@email.com';
  const userInitials = getInitials(userName);
  const tenantName = tenant?.name || 'Mi Empresa';

  return (
    <motion.div
      variants={sidebarVariants}
      initial={false}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      className={cn(
        'flex h-full flex-col bg-white border-r border-neutral-200',
        'dark:bg-neutral-900 dark:border-neutral-800'
      )}
    >
      {/* Header - Clean, balanced design with proper breathing room */}
      <div className="px-4 pt-6 pb-5 border-b border-neutral-100 dark:border-neutral-800">
        {/* Top row: Logo/Icon + Controls */}
        <div className="flex items-start justify-between mb-4">
          {/* Logo Icon - Larger, more prominent */}
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 flex-shrink-0">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
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
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100',
                  'dark:hover:text-neutral-300 dark:hover:bg-neutral-800',
                  'transition-colors'
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
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100',
                  'dark:hover:text-neutral-300 dark:hover:bg-neutral-800',
                  'transition-colors'
                )}
                title={isCollapsed ? 'Expandir' : 'Colapsar'}
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

        {/* Brand + Tenant info - Clean hierarchy */}
        <motion.div
          variants={itemVariants}
          animate={isCollapsed ? 'collapsed' : 'expanded'}
        >
          <h1 className="text-xl font-bold font-display text-neutral-900 dark:text-white">
            StockFlow
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              Empresa
            </span>
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300 truncate">
              {tenantName}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems
            .filter((item) => {
              // Filter out admin-only items for non-admin users
              if (item.adminOnly) {
                return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
              }
              return true;
            })
            .map((item) => {
            const isActive =
              location.pathname === item.href ||
              location.pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  onClick={onClose} // Close mobile sidebar on navigation
                  className={({ isActive: navLinkActive }) =>
                    cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl',
                      'transition-all duration-200',
                      isActive || navLinkActive
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                    )
                  }
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-colors',
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'
                    )}
                  />
                  <motion.span
                    variants={itemVariants}
                    animate={isCollapsed ? 'collapsed' : 'expanded'}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {item.name}
                  </motion.span>
                  {isActive && (
                    <motion.div
                      layoutId={showCloseButton ? 'mobileActiveIndicator' : 'activeIndicator'}
                      className="absolute right-0 h-8 w-1 rounded-l-full bg-primary-600"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-neutral-100 dark:border-neutral-800 p-4">
        <div
          className={cn(
            'flex items-center gap-3',
            isCollapsed ? 'justify-center' : ''
          )}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={userName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-medium text-sm">
                {userInitials}
              </div>
            )}
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-success-500 ring-2 ring-white dark:ring-neutral-900" />
          </div>

          {/* User info */}
          <motion.div
            variants={itemVariants}
            animate={isCollapsed ? 'collapsed' : 'expanded'}
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
            animate={isCollapsed ? 'collapsed' : 'expanded'}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => logout()}
              disabled={isLoggingOut}
              title="Cerrar sesion"
              className="text-neutral-400 hover:text-error-600 dark:hover:text-error-400"
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
  const { sidebarCollapsed, toggleSidebarCollapse, mobileSidebarOpen, setMobileSidebarOpen } =
    useUIStore();

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
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
            />

            {/* Mobile sidebar drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
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