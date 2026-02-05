import { UserRole } from '@prisma/client';
import { Permission } from './permission.enum';

/**
 * Default permissions for each role.
 * These are applied when no custom overrides exist.
 *
 * Hierarchy: SUPER_ADMIN > ADMIN > MANAGER > EMPLOYEE
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  /**
   * SUPER_ADMIN: Full access to everything
   * This is the platform owner / highest level admin
   */
  [UserRole.SUPER_ADMIN]: Object.values(Permission),

  /**
   * ADMIN: Full access within the tenant
   * Can manage users, settings, and all business operations
   */
  [UserRole.ADMIN]: [
    // Dashboard
    Permission.DASHBOARD_VIEW,

    // POS - Full access
    Permission.POS_SELL,
    Permission.POS_REFUND,
    Permission.POS_DISCOUNT,
    Permission.POS_OPEN_DRAWER,
    Permission.POS_VIEW_SESSIONS,
    Permission.POS_CLOSE_SESSION,
    Permission.POS_CASH_MOVEMENT,

    // Inventory - Full access
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_ADJUST,
    Permission.INVENTORY_TRANSFER,

    // Products - Full access
    Permission.PRODUCTS_VIEW,
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_EDIT,
    Permission.PRODUCTS_DELETE,

    // Categories - Full access
    Permission.CATEGORIES_VIEW,
    Permission.CATEGORIES_MANAGE,

    // Warehouses - Full access
    Permission.WAREHOUSES_VIEW,
    Permission.WAREHOUSES_MANAGE,

    // Invoices - Full access
    Permission.INVOICES_VIEW,
    Permission.INVOICES_CREATE,
    Permission.INVOICES_EDIT,
    Permission.INVOICES_SEND,
    Permission.INVOICES_CANCEL,

    // Payments - Full access
    Permission.PAYMENTS_VIEW,
    Permission.PAYMENTS_CREATE,
    Permission.PAYMENTS_DELETE,

    // Customers - Full access
    Permission.CUSTOMERS_VIEW,
    Permission.CUSTOMERS_CREATE,
    Permission.CUSTOMERS_EDIT,
    Permission.CUSTOMERS_DELETE,

    // Reports - Full access
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,

    // DIAN - Full access
    Permission.DIAN_VIEW,
    Permission.DIAN_CONFIG,
    Permission.DIAN_SEND,

    // Users - Full access
    Permission.USERS_VIEW,
    Permission.USERS_MANAGE,
    Permission.USERS_INVITE,

    // Settings - Full access
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_MANAGE,

    // Audit - Full access
    Permission.AUDIT_VIEW,
    Permission.AUDIT_EXPORT,

    // Cash Registers - Full access
    Permission.CASH_REGISTERS_VIEW,
    Permission.CASH_REGISTERS_MANAGE,
  ],

  /**
   * MANAGER: Operational access
   * Can manage day-to-day operations, view reports, but cannot manage users or settings
   */
  [UserRole.MANAGER]: [
    // Dashboard
    Permission.DASHBOARD_VIEW,

    // POS - Operational access (can refund, discount, manage sessions)
    Permission.POS_SELL,
    Permission.POS_REFUND,
    Permission.POS_DISCOUNT,
    Permission.POS_VIEW_SESSIONS,
    Permission.POS_CLOSE_SESSION,
    Permission.POS_CASH_MOVEMENT,
    // Note: Cannot open drawer without sale (security)

    // Inventory - Operational access
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_ADJUST,
    Permission.INVENTORY_TRANSFER,

    // Products - Create/Edit but not delete
    Permission.PRODUCTS_VIEW,
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_EDIT,
    // Note: Cannot delete products

    // Categories - Full access
    Permission.CATEGORIES_VIEW,
    Permission.CATEGORIES_MANAGE,

    // Warehouses - View only
    Permission.WAREHOUSES_VIEW,
    // Note: Cannot manage warehouses

    // Invoices - Operational access (no cancel)
    Permission.INVOICES_VIEW,
    Permission.INVOICES_CREATE,
    Permission.INVOICES_EDIT,
    Permission.INVOICES_SEND,
    // Note: Cannot cancel invoices

    // Payments - Create but not delete
    Permission.PAYMENTS_VIEW,
    Permission.PAYMENTS_CREATE,
    // Note: Cannot delete payments

    // Customers - Full access
    Permission.CUSTOMERS_VIEW,
    Permission.CUSTOMERS_CREATE,
    Permission.CUSTOMERS_EDIT,
    // Note: Cannot delete customers

    // Reports - View only (no export)
    Permission.REPORTS_VIEW,
    // Note: Cannot export reports

    // DIAN - View and send
    Permission.DIAN_VIEW,
    Permission.DIAN_SEND,
    // Note: Cannot configure DIAN

    // Users - View only
    Permission.USERS_VIEW,
    // Note: Cannot manage or invite users

    // Settings - View only
    Permission.SETTINGS_VIEW,
    // Note: Cannot manage settings

    // Audit - View only
    Permission.AUDIT_VIEW,
    // Note: Cannot export audit logs

    // Cash Registers - View only
    Permission.CASH_REGISTERS_VIEW,
    // Note: Cannot manage cash registers
  ],

  /**
   * EMPLOYEE: Basic operational access
   * Can perform sales, view products, create invoices
   * Limited to day-to-day tasks without management capabilities
   */
  [UserRole.EMPLOYEE]: [
    // Dashboard
    Permission.DASHBOARD_VIEW,

    // POS - Basic sales only
    Permission.POS_SELL,
    // Note: Cannot refund, discount, open drawer, view/close sessions

    // Inventory - View only
    Permission.INVENTORY_VIEW,
    // Note: Cannot adjust or transfer stock

    // Products - View only
    Permission.PRODUCTS_VIEW,
    // Note: Cannot create, edit, or delete products

    // Categories - View only
    Permission.CATEGORIES_VIEW,
    // Note: Cannot manage categories

    // Warehouses - View only
    Permission.WAREHOUSES_VIEW,
    // Note: Cannot manage warehouses

    // Invoices - Create only
    Permission.INVOICES_VIEW,
    Permission.INVOICES_CREATE,
    // Note: Cannot edit, send, or cancel invoices

    // Payments - View only
    Permission.PAYMENTS_VIEW,
    // Note: Cannot create or delete payments

    // Customers - View and create
    Permission.CUSTOMERS_VIEW,
    Permission.CUSTOMERS_CREATE,
    // Note: Cannot edit or delete customers

    // Reports - No access
    // Note: Cannot view or export reports

    // DIAN - View only
    Permission.DIAN_VIEW,
    // Note: Cannot configure or send to DIAN

    // Users - No access
    // Note: Cannot view, manage, or invite users

    // Settings - View only
    Permission.SETTINGS_VIEW,
    // Note: Cannot manage settings

    // Audit - No access
    // Note: Cannot view or export audit logs

    // Cash Registers - View only
    Permission.CASH_REGISTERS_VIEW,
    // Note: Cannot manage cash registers
  ],
};

/**
 * Check if a role has a permission by default
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role];
  return rolePermissions?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Get permissions that a role does NOT have by default
 * Useful for showing what can be granted as overrides
 */
export function getMissingPermissions(role: UserRole): Permission[] {
  const rolePermissions = new Set(DEFAULT_ROLE_PERMISSIONS[role] ?? []);
  return Object.values(Permission).filter((p) => !rolePermissions.has(p));
}
