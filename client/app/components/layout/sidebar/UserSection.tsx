import { LogOut } from "lucide-react";
import { cn, getInitials } from "~/lib/utils";
import { useAuthStore } from "~/stores/auth.store";
import { useAuth } from "~/hooks/useAuth";
import { Button } from "~/components/ui/Button";

interface UserSectionProps {
  isCollapsed?: boolean;
}

export function UserSection({ isCollapsed = false }: UserSectionProps) {
  const { user } = useAuthStore();
  const { logout, isLoggingOut } = useAuth();

  const userName = user ? `${user.firstName} ${user.lastName}` : "Usuario";
  const userEmail = user?.email || "usuario@email.com";
  const userInitials = getInitials(userName);

  return (
    <div className="border-t border-neutral-100 dark:border-neutral-800 p-4">
      <div
        className={cn(
          "flex items-center gap-3",
          isCollapsed && "justify-center",
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
  );
}
