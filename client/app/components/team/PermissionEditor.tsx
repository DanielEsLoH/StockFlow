import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  Permission,
  PERMISSION_CATEGORIES,
  PERMISSION_LABELS,
  DEFAULT_ROLE_PERMISSIONS,
  type UserRole,
} from "~/types/permissions";
import {
  useUserPermissions,
  useGrantPermission,
  useRevokePermission,
  useRemoveOverride,
  useRemoveAllOverrides,
} from "~/hooks/useUserPermissions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/Modal";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";

// ============================================================================
// Types
// ============================================================================

interface PermissionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userRole: string;
}

// Role badge colors (mirroring team page config)
const roleBadgeVariants: Record<
  string,
  "primary" | "secondary" | "warning" | "success"
> = {
  SUPER_ADMIN: "warning",
  ADMIN: "primary",
  MANAGER: "secondary",
  EMPLOYEE: "secondary",
  CONTADOR: "success",
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Empleado",
  CONTADOR: "Contador",
};

// ============================================================================
// PermissionToggle - Single permission row
// ============================================================================

interface PermissionToggleProps {
  permission: Permission;
  isActive: boolean;
  isOverridden: boolean;
  isRoleDefault: boolean;
  isLoading: boolean;
  onToggle: (permission: Permission, newState: boolean) => void;
  onReset: (permission: Permission) => void;
}

function PermissionToggle({
  permission,
  isActive,
  isOverridden,
  isRoleDefault,
  isLoading,
  onToggle,
  onReset,
}: PermissionToggleProps) {
  const label = PERMISSION_LABELS[permission] || permission;

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-neutral-700 dark:text-neutral-300">
          {label}
        </span>
        {isOverridden && (
          <Badge variant="outline-warning" size="xs" className="ml-2">
            Personalizado
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Reset button - visible only when overridden */}
        {isOverridden && (
          <button
            type="button"
            onClick={() => onReset(permission)}
            disabled={isLoading}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            title="Restablecer al valor del rol"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label={`${label}: ${isActive ? "activado" : "desactivado"}`}
          disabled={isLoading}
          onClick={() => onToggle(permission, !isActive)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isActive
              ? isOverridden
                ? "bg-primary-500"
                : "bg-success-500"
              : isOverridden
                ? "bg-error-400"
                : "bg-neutral-300 dark:bg-neutral-600",
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out",
              isActive ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// CategorySection - Expandable category group
// ============================================================================

interface CategorySectionProps {
  categoryKey: string;
  label: string;
  permissions: readonly Permission[];
  activePermissions: Set<string>;
  roleDefaults: Set<string>;
  isLoading: boolean;
  onToggle: (permission: Permission, newState: boolean) => void;
  onReset: (permission: Permission) => void;
}

function CategorySection({
  categoryKey,
  label,
  permissions,
  activePermissions,
  roleDefaults,
  isLoading,
  onToggle,
  onReset,
}: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeCount = permissions.filter((p) =>
    activePermissions.has(p),
  ).length;
  const overriddenCount = permissions.filter((p) => {
    const isInRole = roleDefaults.has(p);
    const isActive = activePermissions.has(p);
    // It's overridden if the current state differs from the role default
    return isInRole !== isActive;
  }).length;

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-3 text-left",
          "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors",
          isExpanded && "border-b border-neutral-200 dark:border-neutral-700",
        )}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-400" />
          )}
          <span className="font-medium text-sm text-neutral-900 dark:text-white">
            {label}
          </span>
          {overriddenCount > 0 && (
            <Badge variant="warning" size="xs">
              {overriddenCount} {overriddenCount === 1 ? "cambio" : "cambios"}
            </Badge>
          )}
        </div>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
          {activeCount}/{permissions.length}
        </span>
      </button>

      {isExpanded && (
        <div className="px-1 py-1 space-y-0.5">
          {permissions.map((permission) => {
            const isActive = activePermissions.has(permission);
            const isRoleDefault = roleDefaults.has(permission);
            const isOverridden = isRoleDefault !== isActive;

            return (
              <PermissionToggle
                key={permission}
                permission={permission}
                isActive={isActive}
                isOverridden={isOverridden}
                isRoleDefault={isRoleDefault}
                isLoading={isLoading}
                onToggle={onToggle}
                onReset={onReset}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PermissionEditor - Main modal component
// ============================================================================

export function PermissionEditor({
  open,
  onOpenChange,
  userId,
  userName,
  userRole,
}: PermissionEditorProps) {
  // Queries & mutations
  const { data: permissionsData, isLoading: isLoadingPermissions } =
    useUserPermissions(userId);
  const grantPermission = useGrantPermission();
  const revokePermission = useRevokePermission();
  const removeOverride = useRemoveOverride();
  const removeAllOverrides = useRemoveAllOverrides();

  const isMutating =
    grantPermission.isPending ||
    revokePermission.isPending ||
    removeOverride.isPending ||
    removeAllOverrides.isPending;

  // Compute role defaults and active permissions
  const roleDefaults = useMemo(() => {
    const defaults =
      DEFAULT_ROLE_PERMISSIONS[userRole as UserRole] || [];
    return new Set(defaults as string[]);
  }, [userRole]);

  const activePermissions = useMemo(() => {
    if (!permissionsData) return new Set<string>();
    return new Set(permissionsData.permissions);
  }, [permissionsData]);

  // Count total overrides
  const totalOverrides = useMemo(() => {
    let count = 0;
    for (const perm of Object.values(Permission)) {
      const isInRole = roleDefaults.has(perm);
      const isActive = activePermissions.has(perm);
      if (isInRole !== isActive) count++;
    }
    return count;
  }, [roleDefaults, activePermissions]);

  // Handlers
  function handleToggle(permission: Permission, newState: boolean) {
    const isInRole = roleDefaults.has(permission);

    if (newState && !isInRole) {
      // Granting a permission that is NOT a role default -> explicit grant
      grantPermission.mutate({
        userId,
        data: { permission },
      });
    } else if (!newState && isInRole) {
      // Revoking a permission that IS a role default -> explicit revoke
      revokePermission.mutate({
        userId,
        data: { permission },
      });
    } else {
      // Toggling back to role default -> remove the override
      removeOverride.mutate({ userId, permission });
    }
  }

  function handleReset(permission: Permission) {
    removeOverride.mutate({ userId, permission: permission as string });
  }

  function handleResetAll() {
    removeAllOverrides.mutate(userId);
  }

  // Categories as entries for iteration
  const categories = Object.entries(PERMISSION_CATEGORIES) as Array<
    [string, { readonly label: string; readonly permissions: readonly Permission[] }]
  >;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Permisos de {userName}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-1">
            <span>Rol:</span>
            <Badge variant={roleBadgeVariants[userRole] || "secondary"}>
              {roleLabels[userRole] || userRole}
            </Badge>
            {totalOverrides > 0 && (
              <>
                <span className="text-neutral-300 dark:text-neutral-600">
                  |
                </span>
                <Badge variant="warning" size="sm">
                  {totalOverrides}{" "}
                  {totalOverrides === 1
                    ? "permiso personalizado"
                    : "permisos personalizados"}
                </Badge>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-6 rounded-full bg-success-500" />
            Activo (por rol)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-6 rounded-full bg-primary-500" />
            Otorgado manualmente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-6 rounded-full bg-error-400" />
            Revocado manualmente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-6 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            Inactivo (por rol)
          </span>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4 space-y-2 min-h-0">
          {isLoadingPermissions ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" variant="rounded" />
              ))}
            </div>
          ) : (
            categories.map(([key, category]) => (
              <CategorySection
                key={key}
                categoryKey={key}
                label={category.label}
                permissions={category.permissions}
                activePermissions={activePermissions}
                roleDefaults={roleDefaults}
                isLoading={isMutating}
                onToggle={handleToggle}
                onReset={handleReset}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
          <Button
            variant="outline"
            onClick={handleResetAll}
            disabled={isMutating || totalOverrides === 0}
            isLoading={removeAllOverrides.isPending}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Restablecer Todos
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
