import { useMemo, useCallback } from 'react';
import { useAuthStore } from '~/stores/auth.store';
import {
  Permission,
  DEFAULT_ROLE_PERMISSIONS,
  type UserRole,
} from '~/types/permissions';

/**
 * Hook for checking user permissions.
 *
 * Provides methods to check if the current user has specific permissions.
 * Uses the user's loaded permissions from the server, falling back to
 * role defaults if permissions haven't been loaded yet.
 *
 * @example
 * ```tsx
 * const { hasPermission, canRefund, canManageUsers } = usePermissions();
 *
 * // Check single permission
 * if (hasPermission(Permission.POS_SELL)) {
 *   // User can sell
 * }
 *
 * // Use convenience properties
 * if (canRefund) {
 *   // Show refund button
 * }
 * ```
 */
export function usePermissions() {
  const { user } = useAuthStore();

  // Build a Set of effective permissions for O(1) lookups
  const permissions = useMemo(() => {
    if (!user) return new Set<Permission>();

    // SUPER_ADMIN always has all permissions
    if (user.role === 'SUPER_ADMIN') {
      return new Set(Object.values(Permission));
    }

    // If permissions are loaded from server, use those
    if (user.permissions && user.permissions.length > 0) {
      return new Set(user.permissions as Permission[]);
    }

    // Otherwise, use role defaults (fallback for SSR/initial load)
    const rolePerms = DEFAULT_ROLE_PERMISSIONS[user.role as UserRole] || [];
    return new Set(rolePerms);
  }, [user]);

  /**
   * Check if user has a specific permission.
   */
  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      if (user.role === 'SUPER_ADMIN') return true;
      return permissions.has(permission);
    },
    [user, permissions]
  );

  /**
   * Check if user has ANY of the specified permissions (OR logic).
   */
  const hasAnyPermission = useCallback(
    (...perms: Permission[]): boolean => {
      if (!user) return false;
      if (user.role === 'SUPER_ADMIN') return true;
      return perms.some((p) => permissions.has(p));
    },
    [user, permissions]
  );

  /**
   * Check if user has ALL of the specified permissions (AND logic).
   */
  const hasAllPermissions = useCallback(
    (...perms: Permission[]): boolean => {
      if (!user) return false;
      if (user.role === 'SUPER_ADMIN') return true;
      return perms.every((p) => permissions.has(p));
    },
    [user, permissions]
  );

  // Pre-computed convenience checks for common permissions
  // These are evaluated once and cached based on the user/permissions
  const permissionChecks = useMemo(
    () => ({
      // POS
      canSell: hasPermission(Permission.POS_SELL),
      canRefund: hasPermission(Permission.POS_REFUND),
      canDiscount: hasPermission(Permission.POS_DISCOUNT),
      canOpenDrawer: hasPermission(Permission.POS_OPEN_DRAWER),
      canViewSessions: hasPermission(Permission.POS_VIEW_SESSIONS),
      canCloseSession: hasPermission(Permission.POS_CLOSE_SESSION),
      canCashMovement: hasPermission(Permission.POS_CASH_MOVEMENT),

      // Inventory
      canViewInventory: hasPermission(Permission.INVENTORY_VIEW),
      canAdjustInventory: hasPermission(Permission.INVENTORY_ADJUST),
      canTransferInventory: hasPermission(Permission.INVENTORY_TRANSFER),

      // Products
      canViewProducts: hasPermission(Permission.PRODUCTS_VIEW),
      canCreateProducts: hasPermission(Permission.PRODUCTS_CREATE),
      canEditProducts: hasPermission(Permission.PRODUCTS_EDIT),
      canDeleteProducts: hasPermission(Permission.PRODUCTS_DELETE),

      // Categories
      canViewCategories: hasPermission(Permission.CATEGORIES_VIEW),
      canManageCategories: hasPermission(Permission.CATEGORIES_MANAGE),

      // Warehouses
      canViewWarehouses: hasPermission(Permission.WAREHOUSES_VIEW),
      canManageWarehouses: hasPermission(Permission.WAREHOUSES_MANAGE),

      // Invoices
      canViewInvoices: hasPermission(Permission.INVOICES_VIEW),
      canCreateInvoices: hasPermission(Permission.INVOICES_CREATE),
      canEditInvoices: hasPermission(Permission.INVOICES_EDIT),
      canSendInvoices: hasPermission(Permission.INVOICES_SEND),
      canCancelInvoices: hasPermission(Permission.INVOICES_CANCEL),

      // Payments
      canViewPayments: hasPermission(Permission.PAYMENTS_VIEW),
      canCreatePayments: hasPermission(Permission.PAYMENTS_CREATE),
      canDeletePayments: hasPermission(Permission.PAYMENTS_DELETE),

      // Customers
      canViewCustomers: hasPermission(Permission.CUSTOMERS_VIEW),
      canCreateCustomers: hasPermission(Permission.CUSTOMERS_CREATE),
      canEditCustomers: hasPermission(Permission.CUSTOMERS_EDIT),
      canDeleteCustomers: hasPermission(Permission.CUSTOMERS_DELETE),

      // Reports
      canViewReports: hasPermission(Permission.REPORTS_VIEW),
      canExportReports: hasPermission(Permission.REPORTS_EXPORT),

      // DIAN
      canViewDian: hasPermission(Permission.DIAN_VIEW),
      canConfigDian: hasPermission(Permission.DIAN_CONFIG),
      canSendDian: hasPermission(Permission.DIAN_SEND),

      // Users
      canViewUsers: hasPermission(Permission.USERS_VIEW),
      canManageUsers: hasPermission(Permission.USERS_MANAGE),
      canInviteUsers: hasPermission(Permission.USERS_INVITE),

      // Settings
      canViewSettings: hasPermission(Permission.SETTINGS_VIEW),
      canManageSettings: hasPermission(Permission.SETTINGS_MANAGE),

      // Audit
      canViewAudit: hasPermission(Permission.AUDIT_VIEW),
      canExportAudit: hasPermission(Permission.AUDIT_EXPORT),

      // Cash Registers
      canViewCashRegisters: hasPermission(Permission.CASH_REGISTERS_VIEW),
      canManageCashRegisters: hasPermission(Permission.CASH_REGISTERS_MANAGE),

      // Quotations
      canViewQuotations: hasPermission(Permission.QUOTATIONS_VIEW),
      canCreateQuotations: hasPermission(Permission.QUOTATIONS_CREATE),
      canEditQuotations: hasPermission(Permission.QUOTATIONS_EDIT),
      canDeleteQuotations: hasPermission(Permission.QUOTATIONS_DELETE),
      canConvertQuotations: hasPermission(Permission.QUOTATIONS_CONVERT),

      // Dashboard
      canViewDashboard: hasPermission(Permission.DASHBOARD_VIEW),
    }),
    [hasPermission]
  );

  return {
    // Raw permission set (for advanced use cases)
    permissions,

    // Permission check functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Convenience checks
    ...permissionChecks,

    // User info
    role: user?.role,
    isAuthenticated: !!user,
  };
}

/**
 * Type for the return value of usePermissions
 */
export type UsePermissionsReturn = ReturnType<typeof usePermissions>;
