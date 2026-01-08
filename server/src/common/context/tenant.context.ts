import { AsyncLocalStorage } from 'async_hooks';

/**
 * Represents the tenant context for the current request.
 *
 * This context is stored in AsyncLocalStorage and provides access to
 * tenant-specific information throughout the request lifecycle, including
 * in places where the request object is not directly accessible (e.g.,
 * Prisma middleware, services without request injection).
 */
export interface TenantContext {
  /**
   * The unique identifier of the tenant for the current request.
   * This is extracted from the authenticated user's JWT token.
   */
  tenantId: string;

  /**
   * The unique identifier of the current user (optional).
   * Useful for audit logging and tracking user actions.
   */
  userId?: string;
}

/**
 * AsyncLocalStorage instance for storing tenant context.
 *
 * AsyncLocalStorage provides a way to store data throughout the lifetime of a request,
 * making it accessible anywhere in the call stack without explicitly passing it through
 * every function call.
 *
 * This is particularly useful for:
 * - Automatically filtering Prisma queries by tenant
 * - Audit logging with tenant/user context
 * - Accessing tenant context in services that don't have direct access to the request
 *
 * @example
 * ```typescript
 * // In middleware or guard
 * tenantStorage.run({ tenantId: 'tenant-123', userId: 'user-456' }, () => {
 *   next();
 * });
 *
 * // Anywhere in the request chain
 * const context = tenantStorage.getStore();
 * console.log(context?.tenantId); // 'tenant-123'
 * ```
 */
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Gets the current tenant ID from the AsyncLocalStorage context.
 *
 * This is a convenience function for retrieving just the tenant ID
 * without accessing the full context object.
 *
 * @returns The tenant ID string, or undefined if no context is set
 *
 * @example
 * ```typescript
 * // In a service or Prisma middleware
 * const tenantId = getTenantId();
 * if (tenantId) {
 *   // Filter queries by tenant
 *   query.where.tenantId = tenantId;
 * }
 * ```
 */
export function getTenantId(): string | undefined {
  return tenantStorage.getStore()?.tenantId;
}

/**
 * Gets the current user ID from the AsyncLocalStorage context.
 *
 * This is a convenience function for retrieving just the user ID
 * without accessing the full context object.
 *
 * @returns The user ID string, or undefined if no context is set or user is not authenticated
 *
 * @example
 * ```typescript
 * // In a service for audit logging
 * const userId = getUserId();
 * await auditLog.create({
 *   userId,
 *   action: 'PRODUCT_UPDATED',
 *   timestamp: new Date(),
 * });
 * ```
 */
export function getUserId(): string | undefined {
  return tenantStorage.getStore()?.userId;
}

/**
 * Gets the full tenant context from AsyncLocalStorage.
 *
 * Use this when you need access to all context properties.
 *
 * @returns The full TenantContext object, or undefined if no context is set
 *
 * @example
 * ```typescript
 * const context = getCurrentContext();
 * if (context) {
 *   console.log(`Tenant: ${context.tenantId}, User: ${context.userId}`);
 * }
 * ```
 */
export function getCurrentContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

/**
 * Runs a callback function within a tenant context.
 *
 * This is a convenience wrapper around tenantStorage.run() that provides
 * better type safety and cleaner API.
 *
 * @param context - The tenant context to set for the callback
 * @param callback - The callback function to execute within the context
 * @returns The return value of the callback function
 *
 * @example
 * ```typescript
 * const result = await runWithTenantContext(
 *   { tenantId: 'tenant-123', userId: 'user-456' },
 *   async () => {
 *     // All code in this callback has access to tenant context
 *     return await someService.doWork();
 *   }
 * );
 * ```
 */
export function runWithTenantContext<T>(
  context: TenantContext,
  callback: () => T,
): T {
  return tenantStorage.run(context, callback);
}
