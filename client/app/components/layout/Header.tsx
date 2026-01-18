import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  Menu,
  User,
  Settings,
  LogOut,
  ChevronDown,
  X,
  Check,
  AlertTriangle,
  CheckCircle,
  Info,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn, getInitials, formatRelativeTime } from '~/lib/utils';
import { useUIStore } from '~/stores/ui.store';
import { useAuthStore } from '~/stores/auth.store';
import { useAuth } from '~/hooks/useAuth';
import {
  useRecentNotifications,
  useUnreadCount,
  useMarkAllAsRead,
  useNotificationClick,
} from '~/hooks/useNotifications';
import { getNotificationCategory } from '~/types/notification';
import type { NotificationCategory } from '~/types/notification';
import { ThemeToggle } from '~/components/ui/ThemeToggle';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';

const dropdownVariants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.15,
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.1,
    },
  },
};

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const { toggleSidebar, sidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const { logout, isLoggingOut } = useAuth();

  // Notification hooks
  const { data: notifications = [], isLoading: notificationsLoading } = useRecentNotifications(5);
  const { data: unreadCountData } = useUnreadCount();
  const markAllAsRead = useMarkAllAsRead();
  const handleNotificationClick = useNotificationClick();

  const userName = user ? `${user.firstName} ${user.lastName}` : 'Usuario';
  const userEmail = user?.email || 'usuario@email.com';
  const userInitials = getInitials(userName);
  const userRole = user?.role || 'EMPLOYEE';

  const unreadCount = unreadCountData?.count ?? 0;

  // Handle keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN: 'Administrador',
      MANAGER: 'Gerente',
      EMPLOYEE: 'Empleado',
    };
    return labels[role] || role;
  };

  const getNotificationIconClass = (category: NotificationCategory) => {
    switch (category) {
      case 'warning':
        return 'bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400';
      case 'success':
        return 'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400';
      case 'error':
        return 'bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400';
      default:
        return 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400';
    }
  };

  const getNotificationIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-neutral-200 dark:bg-neutral-900/80 dark:border-neutral-800">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden"
            aria-label={sidebarOpen ? 'Cerrar menu' : 'Abrir menu'}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          {/* Search */}
          <div className="relative hidden sm:block">
            <AnimatePresence mode="wait">
              {searchOpen ? (
                <motion.div
                  initial={{ width: 200 }}
                  animate={{ width: 400 }}
                  exit={{ width: 200 }}
                  className="relative"
                >
                  <Input
                    ref={searchRef}
                    type="search"
                    placeholder="Buscar productos, clientes, facturas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery) setSearchOpen(false);
                    }}
                    leftElement={
                      <Search className="h-4 w-4 text-neutral-400" />
                    }
                    rightElement={
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSearchOpen(false);
                        }}
                        className="text-neutral-400 hover:text-neutral-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    }
                    className="pr-8"
                  />
                </motion.div>
              ) : (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => {
                    setSearchOpen(true);
                    setTimeout(() => searchRef.current?.focus(), 100);
                  }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl',
                    'bg-neutral-100 text-neutral-500',
                    'hover:bg-neutral-200 hover:text-neutral-700',
                    'dark:bg-neutral-800 dark:hover:bg-neutral-700',
                    'transition-colors'
                  )}
                >
                  <Search className="h-4 w-4" />
                  <span className="text-sm">Buscar...</span>
                  <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-neutral-900 text-xs text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    <span className="text-xs">&#8984;</span>K
                  </kbd>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <div ref={notificationsRef} className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              className="relative"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-[10px] font-medium text-white">
                  {unreadCount}
                </span>
              )}
            </Button>

            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={cn(
                    'absolute right-0 top-full mt-2 w-80 sm:w-96',
                    'bg-white dark:bg-neutral-900',
                    'border border-neutral-200 dark:border-neutral-800',
                    'rounded-2xl shadow-xl',
                    'overflow-hidden'
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      Notificaciones
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead.mutate()}
                        disabled={markAllAsRead.isPending}
                        className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline disabled:opacity-50"
                      >
                        {markAllAsRead.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Marcar todas como leidas
                      </button>
                    )}
                  </div>

                  {/* Notifications list */}
                  <div className="max-h-96 overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="px-4 py-8 text-center">
                        <Loader2 className="h-8 w-8 mx-auto text-neutral-400 animate-spin mb-3" />
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Cargando notificaciones...
                        </p>
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.map((notification) => {
                        const category = getNotificationCategory(notification);
                        return (
                          <div
                            key={notification.id}
                            onClick={() => {
                              handleNotificationClick(notification);
                              setNotificationsOpen(false);
                            }}
                            className={cn(
                              'flex items-start gap-3 px-4 py-3',
                              'hover:bg-neutral-50 dark:hover:bg-neutral-800',
                              'transition-colors cursor-pointer',
                              !notification.read &&
                                'bg-primary-50/50 dark:bg-primary-900/10'
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-full shrink-0',
                                getNotificationIconClass(category)
                              )}
                            >
                              {getNotificationIcon(category)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                {notification.title}
                              </p>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                {notification.message}
                              </p>
                              <p className="text-xs text-neutral-400 mt-1">
                                {formatRelativeTime(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-primary-500 shrink-0 mt-2" />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <Bell className="h-12 w-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          No tienes notificaciones
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 px-4 py-3">
                      <Link
                        to="/notifications"
                        className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
                        onClick={() => setNotificationsOpen(false)}
                      >
                        Ver todas las notificaciones
                      </Link>
                      {unreadCount > 0 && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {unreadCount} sin leer
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 p-1.5 pr-3 rounded-xl',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'transition-colors'
              )}
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={userName}
                  className="h-8 w-8 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-medium text-sm">
                  {userInitials}
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {userName}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'hidden md:block h-4 w-4 text-neutral-400 transition-transform',
                  profileOpen && 'rotate-180'
                )}
              />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={cn(
                    'absolute right-0 top-full mt-2 w-64',
                    'bg-white dark:bg-neutral-900',
                    'border border-neutral-200 dark:border-neutral-800',
                    'rounded-2xl shadow-xl',
                    'overflow-hidden'
                  )}
                >
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {userName}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {userEmail}
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                      {getRoleLabel(userRole)}
                    </span>
                  </div>

                  {/* Menu items */}
                  <div className="py-2">
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <User className="h-4 w-4" />
                      Mi perfil
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <Settings className="h-4 w-4" />
                      Configuracion
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-neutral-100 dark:border-neutral-800 py-2">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      disabled={isLoggingOut}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      {isLoggingOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 sm:hidden"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: -100 }}
              className="bg-white dark:bg-neutral-900 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                ref={searchRef}
                type="search"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftElement={<Search className="h-4 w-4 text-neutral-400" />}
                rightElement={
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchOpen(false);
                    }}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                }
                autoFocus
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}