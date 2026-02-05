import { SetMetadata } from '@nestjs/common';
import { Permission } from '../permissions/permission.enum';

export const PERMISSIONS_KEY = 'permissions';

export interface PermissionRequirement {
  permissions: Permission[];
  mode: 'ANY' | 'ALL';
}

/**
 * Decorator to require specific permissions for a route.
 *
 * @param permissions - Single permission or array of required permissions
 * @param mode - 'ANY' (default) requires at least one permission, 'ALL' requires all
 *
 * @example
 * // Require single permission
 * @RequirePermissions(Permission.POS_SELL)
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * async sellProduct() { }
 *
 * @example
 * // Require any of multiple permissions (OR logic)
 * @RequirePermissions(Permission.POS_SELL, Permission.POS_REFUND)
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * async processTransaction() { }
 *
 * @example
 * // Require all permissions (AND logic)
 * @RequirePermissions([Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT], 'ALL')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * async exportReport() { }
 */
export const RequirePermissions = (
  permissions: Permission | Permission[],
  mode: 'ANY' | 'ALL' = 'ANY',
) => {
  const permArray = Array.isArray(permissions) ? permissions : [permissions];
  return SetMetadata<string, PermissionRequirement>(PERMISSIONS_KEY, {
    permissions: permArray,
    mode,
  });
};

/**
 * Shorthand for requiring ALL permissions (AND logic).
 *
 * @example
 * @RequireAllPermissions(Permission.INVOICES_VIEW, Permission.INVOICES_EDIT)
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * async editInvoice() { }
 */
export const RequireAllPermissions = (...permissions: Permission[]) =>
  RequirePermissions(permissions, 'ALL');

/**
 * Shorthand for requiring ANY permission (OR logic).
 * This is the same as the default behavior of RequirePermissions.
 *
 * @example
 * @RequireAnyPermission(Permission.PRODUCTS_CREATE, Permission.PRODUCTS_EDIT)
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * async modifyProduct() { }
 */
export const RequireAnyPermission = (...permissions: Permission[]) =>
  RequirePermissions(permissions, 'ANY');
