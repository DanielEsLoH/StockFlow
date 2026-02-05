// Permission enum and metadata
export { Permission, PERMISSION_CATEGORIES, PERMISSION_LABELS } from './permission.enum';

// Role-permission mappings
export {
  DEFAULT_ROLE_PERMISSIONS,
  roleHasPermission,
  getRolePermissions,
  getMissingPermissions,
} from './role-permissions';

// Service
export { PermissionsService } from './permissions.service';
export type { UserPermissions, PermissionOverrideDto } from './permissions.service';

// Module
export { PermissionsModule } from './permissions.module';
