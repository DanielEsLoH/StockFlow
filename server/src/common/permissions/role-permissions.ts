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

    // Quotations - Full access
    Permission.QUOTATIONS_VIEW,
    Permission.QUOTATIONS_CREATE,
    Permission.QUOTATIONS_EDIT,
    Permission.QUOTATIONS_DELETE,
    Permission.QUOTATIONS_CONVERT,
  ],

  /**
   * MANAGER: Operational access within their assigned warehouse
   * Can manage day-to-day operations, view reports for their warehouse,
   * but cannot transfer stock, manage users, settings, or DIAN config.
   * All inventory/invoicing operations are scoped to their assigned warehouse.
   */
  [UserRole.MANAGER]: [
    // Dashboard - scoped to their warehouse
    Permission.DASHBOARD_VIEW,

    // POS - Full operational access within their warehouse
    Permission.POS_SELL,
    Permission.POS_REFUND,
    Permission.POS_DISCOUNT,
    Permission.POS_VIEW_SESSIONS,
    Permission.POS_CLOSE_SESSION,
    Permission.POS_CASH_MOVEMENT,
    // Note: Cannot open drawer without sale (security)

    // Inventory - Adjust within their warehouse only
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_ADJUST,
    // Note: Cannot transfer between warehouses (ADMIN only)

    // Products - View all, edit within their warehouse
    Permission.PRODUCTS_VIEW,
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_EDIT,
    // Note: Cannot delete products

    // Categories - View only
    Permission.CATEGORIES_VIEW,
    // Note: Cannot manage categories (ADMIN only)

    // Warehouses - View all
    Permission.WAREHOUSES_VIEW,
    // Note: Cannot manage warehouses

    // Invoices - Create/view/edit/send within their warehouse
    Permission.INVOICES_VIEW,
    Permission.INVOICES_CREATE,
    Permission.INVOICES_EDIT,
    Permission.INVOICES_SEND,
    // Note: Cannot cancel invoices (ADMIN only)

    // Payments - View and create within their warehouse
    Permission.PAYMENTS_VIEW,
    Permission.PAYMENTS_CREATE,
    // Note: Cannot delete payments

    // Customers - Full CRUD
    Permission.CUSTOMERS_VIEW,
    Permission.CUSTOMERS_CREATE,
    Permission.CUSTOMERS_EDIT,
    // Note: Cannot delete customers

    // Reports - View their warehouse only
    Permission.REPORTS_VIEW,
    // Note: Cannot export reports

    // DIAN - View only
    Permission.DIAN_VIEW,
    // Note: Cannot configure or send to DIAN (ADMIN only)

    // Users - View team only
    Permission.USERS_VIEW,
    // Note: Cannot manage or invite users

    // Cash Registers - View only
    Permission.CASH_REGISTERS_VIEW,
    // Note: Cannot manage cash registers

    // Quotations - Full access
    Permission.QUOTATIONS_VIEW,
    Permission.QUOTATIONS_CREATE,
    Permission.QUOTATIONS_EDIT,
    Permission.QUOTATIONS_DELETE,
    Permission.QUOTATIONS_CONVERT,
  ],

  /**
   * EMPLOYEE: Sales-focused access within their assigned warehouse
   * Can sell via POS, create invoices, view products and categories.
   * All operations are strictly scoped to their assigned warehouse.
   * Cannot access inventory, reports, settings, users, or admin features.
   */
  /**
   * CONTADOR: Read-only financial access across the entire tenant
   * Can view all financial data, reports, and audit logs.
   * Cannot create, edit, delete, or perform any operational actions.
   * Not assigned to a specific warehouse (tenant-wide read access).
   */
  [UserRole.CONTADOR]: [
    Permission.DASHBOARD_VIEW,
    Permission.PRODUCTS_VIEW,
    Permission.CATEGORIES_VIEW,
    Permission.WAREHOUSES_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.INVOICES_VIEW,
    Permission.PAYMENTS_VIEW,
    Permission.CUSTOMERS_VIEW,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    Permission.DIAN_VIEW,
    Permission.AUDIT_VIEW,
    Permission.AUDIT_EXPORT,
    Permission.QUOTATIONS_VIEW,
  ],

  [UserRole.EMPLOYEE]: [
    // Dashboard - basic overview of their warehouse
    Permission.DASHBOARD_VIEW,

    // POS - primary function: sell within their warehouse
    Permission.POS_SELL,
    // Note: Cannot refund, discount, open drawer, view/close sessions

    // Products - view only (to check prices when selling)
    Permission.PRODUCTS_VIEW,
    // Note: Cannot create, edit, or delete products

    // Categories - view only (to filter products when selling)
    Permission.CATEGORIES_VIEW,
    // Note: Cannot manage categories

    // Invoices - view and create within their warehouse
    Permission.INVOICES_VIEW,
    Permission.INVOICES_CREATE,
    // Note: Cannot edit, send, or cancel invoices

    // Customers - view and create (to register new customers during sales)
    Permission.CUSTOMERS_VIEW,
    Permission.CUSTOMERS_CREATE,
    // Note: Cannot edit or delete customers

    // Quotations - view and create
    Permission.QUOTATIONS_VIEW,
    Permission.QUOTATIONS_CREATE,

    // --- RESTRICTED AREAS ---
    // Inventory: No access (cannot view or adjust stock)
    // Warehouses: No access (locked to assigned warehouse)
    // Payments: No access (handled by admin/manager)
    // Reports: No access
    // DIAN: No access
    // Users: No access
    // Settings: No access
    // Audit: No access
    // Cash Registers: No access (uses POS directly)
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
