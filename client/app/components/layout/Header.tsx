import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
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
  HelpCircle,
  Package,
  Users,
  FileText,
  LayoutDashboard,
  Command,
} from "lucide-react";
import { cn, getInitials, formatRelativeTime } from "~/lib/utils";
import { useUIStore } from "~/stores/ui.store";
import { useAuthStore } from "~/stores/auth.store";
import { useAuth } from "~/hooks/useAuth";
import {
  useRecentNotifications,
  useUnreadCount,
  useMarkAllAsRead,
  useNotificationClick,
} from "~/hooks/useNotifications";
import { getNotificationCategory } from "~/types/notification";
import type { NotificationCategory } from "~/types/notification";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { Button } from "~/components/ui/Button";

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
      ease: "easeOut" as const,
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

const spotlightVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: {
      duration: 0.15,
    },
  },
};

// Quick action items for the command palette
const quickActions = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    shortcut: "D",
  },
  { name: "Productos", href: "/products", icon: Package, shortcut: "P" },
  { name: "Clientes", href: "/customers", icon: Users, shortcut: "C" },
  { name: "Facturas", href: "/invoices", icon: FileText, shortcut: "F" },
  { name: "Configuracion", href: "/settings", icon: Settings, shortcut: "S" },
];

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const { toggleMobileSidebar, mobileSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const { logout, isLoggingOut } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Notification hooks
  const { data: notifications = [], isLoading: notificationsLoading } =
    useRecentNotifications(5);
  const { data: unreadCountData } = useUnreadCount();
  const markAllAsRead = useMarkAllAsRead();
  const handleNotificationClick = useNotificationClick();

  const userName = user ? `${user.firstName} ${user.lastName}` : "Usuario";
  const userEmail = user?.email || "usuario@email.com";
  const userInitials = getInitials(userName);
  const userRole = user?.role || "EMPLOYEE";

  const unreadCount = unreadCountData?.count ?? 0;

  // Filtered quick actions based on search
  const filteredActions = quickActions.filter((action) =>
    action.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handle keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setSelectedIndex(0);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle navigation in spotlight
  useEffect(() => {
    if (!searchOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredActions.length - 1 ? prev + 1 : prev,
        );
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }
      if (e.key === "Enter" && filteredActions[selectedIndex]) {
        e.preventDefault();
        window.location.href = filteredActions[selectedIndex].href;
        setSearchOpen(false);
        setSearchQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, selectedIndex, filteredActions]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setNotificationsOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      SUPER_ADMIN: "Super Admin",
      ADMIN: "Administrador",
      MANAGER: "Gerente",
      EMPLOYEE: "Empleado",
    };
    return labels[role] || role;
  };

  const getNotificationIconClass = (category: NotificationCategory) => {
    switch (category) {
      case "warning":
        return "bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400";
      case "success":
        return "bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400";
      case "error":
        return "bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400";
      default:
        return "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400";
    }
  };

  const getNotificationIcon = (category: NotificationCategory) => {
    switch (category) {
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      case "success":
        return <CheckCircle className="h-5 w-5" />;
      case "error":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/60 dark:border-neutral-800/60">
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          {/* Left section */}
          <div className="flex items-center gap-4">
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileSidebar}
              className="lg:hidden"
              aria-label={mobileSidebarOpen ? "Cerrar menu" : "Abrir menu"}
            >
              {mobileSidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            {/* Spotlight Search Trigger */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                setSearchOpen(true);
                setTimeout(() => searchRef.current?.focus(), 50);
              }}
              className={cn(
                "hidden sm:flex items-center gap-3 px-4 py-2.5 w-72 lg:w-80",
                "bg-neutral-100/80 dark:bg-neutral-800/80",
                "border border-neutral-200/60 dark:border-neutral-700/60",
                "rounded-xl backdrop-blur-sm",
                "hover:border-primary-300 dark:hover:border-primary-600",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                "transition-all duration-200",
                "group",
              )}
            >
              <Search className="h-4 w-4 text-neutral-400 group-hover:text-primary-500 transition-colors" />
              <span className="flex-1 text-left text-sm text-neutral-500 dark:text-neutral-400">
                Buscar...
              </span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-white dark:bg-neutral-900 text-[11px] font-medium text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700 shadow-sm">
                <Command className="h-3 w-3" />
                <span>K</span>
              </kbd>
            </motion.button>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-1 sm:gap-2">
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

            {/* Help button */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              aria-label="Ayuda"
            >
              <HelpCircle className="h-5 w-5" />
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
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-error-500 to-error-600 text-[10px] font-bold text-white shadow-lg shadow-error-500/30"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
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
                      "absolute right-0 top-full mt-2 w-80 sm:w-96",
                      "bg-white dark:bg-neutral-900",
                      "border border-neutral-200/60 dark:border-neutral-800/60",
                      "rounded-2xl shadow-xl shadow-neutral-200/50 dark:shadow-neutral-950/50",
                      "overflow-hidden",
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
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
                          const category =
                            getNotificationCategory(notification);
                          return (
                            <motion.div
                              key={notification.id}
                              whileHover={{
                                backgroundColor: "var(--hover-bg)",
                              }}
                              onClick={() => {
                                handleNotificationClick(notification);
                                setNotificationsOpen(false);
                              }}
                              className={cn(
                                "flex items-start gap-3 px-4 py-3",
                                "transition-colors cursor-pointer",
                                "[--hover-bg:theme(colors.neutral.50)]",
                                "dark:[--hover-bg:theme(colors.neutral.800)]",
                                !notification.read &&
                                  "bg-primary-50/50 dark:bg-primary-900/10",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-xl shrink-0",
                                  getNotificationIconClass(category),
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
                                <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 shrink-0 mt-2 shadow-sm shadow-primary-500/30" />
                              )}
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <div className="h-16 w-16 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
                            <Bell className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
                          </div>
                          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                            No tienes notificaciones
                          </p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                            Te notificaremos cuando haya novedades
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 bg-neutral-50/50 dark:bg-neutral-800/30">
                        <Link
                          to="/notifications"
                          className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          Ver todas las notificaciones
                        </Link>
                        {unreadCount > 0 && (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-200/50 dark:bg-neutral-700/50 px-2 py-0.5 rounded-full">
                            {unreadCount} sin leer
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-6 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

            {/* Profile dropdown */}
            <div ref={profileRef} className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2.5 p-1.5 pr-3 rounded-xl",
                  "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  "transition-colors",
                )}
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={userName}
                    className="h-9 w-9 rounded-xl object-cover ring-2 ring-white dark:ring-neutral-800 shadow-sm"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white font-semibold text-sm shadow-sm shadow-primary-500/25">
                    {userInitials}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-tight">
                    {userName}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                    {getRoleLabel(userRole)}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "hidden md:block h-4 w-4 text-neutral-400 transition-transform duration-200",
                    profileOpen && "rotate-180",
                  )}
                />
              </motion.button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className={cn(
                      "absolute right-0 top-full mt-2 w-64",
                      "bg-white dark:bg-neutral-900",
                      "border border-neutral-200/60 dark:border-neutral-800/60",
                      "rounded-2xl shadow-xl shadow-neutral-200/50 dark:shadow-neutral-950/50",
                      "overflow-hidden",
                    )}
                  >
                    {/* User info */}
                    <div className="px-4 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-gradient-to-br from-neutral-50 to-neutral-100/50 dark:from-neutral-800/50 dark:to-neutral-900">
                      <div className="flex items-center gap-3">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt={userName}
                            className="h-12 w-12 rounded-xl object-cover ring-2 ring-white dark:ring-neutral-700 shadow-md"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white font-bold text-lg shadow-md shadow-primary-500/25">
                            {userInitials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                            {userName}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {userEmail}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                          {getRoleLabel(userRole)}
                        </span>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-2">
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                          <User className="h-4 w-4" />
                        </div>
                        <span>Mi perfil</span>
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                          <Settings className="h-4 w-4" />
                        </div>
                        <span>Configuracion</span>
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
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-100 dark:bg-error-900/30 text-error-600 dark:text-error-400">
                          <LogOut className="h-4 w-4" />
                        </div>
                        <span>
                          {isLoggingOut
                            ? "Cerrando sesion..."
                            : "Cerrar sesion"}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Spotlight Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
              className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm"
            />

            {/* Spotlight Modal */}
            <motion.div
              variants={spotlightVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed z-50 left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl px-4"
            >
              <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl shadow-neutral-900/20 dark:shadow-neutral-950/50 border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-neutral-100 dark:border-neutral-800">
                  <Search className="h-5 w-5 text-neutral-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar productos, clientes, facturas..."
                    className="flex-1 bg-transparent text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-base outline-none"
                    autoFocus
                  />
                  <kbd className="px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700">
                    ESC
                  </kbd>
                </div>

                {/* Quick Actions */}
                <div className="py-2">
                  <div className="px-4 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      Acciones rapidas
                    </p>
                  </div>
                  {filteredActions.length > 0 ? (
                    filteredActions.map((action, index) => (
                      <Link
                        key={action.href}
                        to={action.href}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl transition-colors",
                          index === selectedIndex
                            ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                            : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-xl",
                            index === selectedIndex
                              ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
                          )}
                        >
                          <action.icon className="h-4 w-4" />
                        </div>
                        <span className="flex-1 text-sm font-medium">
                          {action.name}
                        </span>
                        <kbd
                          className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            index === selectedIndex
                              ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500",
                          )}
                        >
                          {action.shortcut}
                        </kbd>
                      </Link>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <div className="h-12 w-12 mx-auto rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
                        <Search className="h-6 w-6 text-neutral-400" />
                      </div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        No se encontraron resultados
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        Intenta con otra busqueda
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                  <div className="flex items-center gap-4 text-xs text-neutral-400 dark:text-neutral-500">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-mono">
                        ↑
                      </kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-mono">
                        ↓
                      </kbd>
                      <span className="ml-1">navegar</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-mono">
                        ↵
                      </kbd>
                      <span className="ml-1">seleccionar</span>
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    Powered by StockFlow
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
