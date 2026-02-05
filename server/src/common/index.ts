// Module
export { CommonModule } from './common.module';

// Context (AsyncLocalStorage for request-scoped data)
export type { TenantContext } from './context';
export {
  tenantStorage,
  getTenantId,
  getUserId,
  getCurrentContext,
  runWithTenantContext,
} from './context';

// Middleware
export { TenantMiddleware } from './middleware';
export type { AuthenticatedRequest } from './middleware';

// Decorators
export {
  Roles,
  ROLES_KEY,
  SubscriptionRequired,
  SUBSCRIPTION_KEY,
  Public,
  IS_PUBLIC_KEY,
} from './decorators';
export {
  RequirePermissions,
  RequireAllPermissions,
  RequireAnyPermission,
  PERMISSIONS_KEY,
} from './decorators/require-permissions.decorator';
export type { PermissionRequirement } from './decorators/require-permissions.decorator';

// Guards
export { SubscriptionGuard } from './guards';
export { PermissionsGuard } from './guards/permissions.guard';

// Permissions
export {
  Permission,
  PERMISSION_CATEGORIES,
  PERMISSION_LABELS,
  DEFAULT_ROLE_PERMISSIONS,
  roleHasPermission,
  getRolePermissions,
  getMissingPermissions,
  PermissionsService,
  PermissionsModule,
} from './permissions';
export type { UserPermissions, PermissionOverrideDto } from './permissions';

// Filters
export {
  AllExceptionsFilter,
  HttpExceptionFilter,
  PrismaExceptionFilter,
} from './filters';

// Interceptors
export { LoggingInterceptor, TransformInterceptor } from './interceptors';

// Pipes
export { CustomValidationPipe } from './pipes';
export type { ValidationErrorDetail, ValidationErrorResponse } from './pipes';

// DTOs
export { PaginationDto } from './dto';

// Services
export { TenantContextService } from './services';
export type { LimitType } from './services';
