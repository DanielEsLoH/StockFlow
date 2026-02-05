import type { ReactNode } from 'react';
import { Permission } from '~/types/permissions';
import { usePermissions } from '~/hooks/usePermissions';

interface PermissionGateProps {
  /**
   * Single permission to check.
   * Use this for simple single-permission checks.
   */
  permission?: Permission;

  /**
   * Multiple permissions to check.
   * Use with `mode` to specify AND/OR logic.
   */
  permissions?: Permission[];

  /**
   * How to evaluate multiple permissions.
   * - 'any': User needs at least ONE of the permissions (OR logic)
   * - 'all': User needs ALL of the permissions (AND logic)
   * Default: 'any'
   */
  mode?: 'any' | 'all';

  /**
   * Content to render if user doesn't have permission.
   * If not provided, nothing is rendered.
   */
  fallback?: ReactNode;

  /**
   * Content to render if user has permission.
   */
  children: ReactNode;
}

/**
 * Conditionally renders children based on user permissions.
 *
 * @example
 * // Single permission check
 * <PermissionGate permission={Permission.POS_REFUND}>
 *   <RefundButton />
 * </PermissionGate>
 *
 * @example
 * // Any of multiple permissions (OR)
 * <PermissionGate permissions={[Permission.POS_SELL, Permission.POS_REFUND]}>
 *   <TransactionPanel />
 * </PermissionGate>
 *
 * @example
 * // All permissions required (AND)
 * <PermissionGate
 *   permissions={[Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT]}
 *   mode="all"
 * >
 *   <ExportReportButton />
 * </PermissionGate>
 *
 * @example
 * // With fallback content
 * <PermissionGate
 *   permission={Permission.USERS_MANAGE}
 *   fallback={<span>No tienes acceso a esta funcion</span>}
 * >
 *   <UserManagementPanel />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  permissions,
  mode = 'any',
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  // Single permission check
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Multiple permissions check
  if (permissions && permissions.length > 0) {
    const hasAccess =
      mode === 'all'
        ? hasAllPermissions(...permissions)
        : hasAnyPermission(...permissions);

    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * HOC version of PermissionGate for wrapping entire components.
 *
 * @example
 * const ProtectedUserList = withPermission(UserList, Permission.USERS_VIEW);
 *
 * // Or with options
 * const ProtectedExport = withPermission(
 *   ExportButton,
 *   [Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT],
 *   { mode: 'all', fallback: <DisabledButton /> }
 * );
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission | Permission[],
  options?: { mode?: 'any' | 'all'; fallback?: ReactNode }
) {
  const { mode = 'any', fallback = null } = options || {};

  return function ProtectedComponent(props: P) {
    const permissionProps = Array.isArray(permission)
      ? { permissions: permission, mode }
      : { permission };

    return (
      <PermissionGate {...permissionProps} fallback={fallback}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}
