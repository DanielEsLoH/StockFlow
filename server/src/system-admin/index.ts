// Module
export { SystemAdminModule } from './system-admin.module';

// Service
export { SystemAdminService } from './system-admin.service';

// Controller
export { SystemAdminController } from './system-admin.controller';

// Guards
export {
  SystemAdminAuthGuard,
  SystemAdminRoleGuard,
  SystemAdminRoles,
  SYSTEM_ADMIN_ROLES_KEY,
} from './guards';

// Strategies
export {
  SystemAdminJwtStrategy,
  SystemAdminJwtRefreshStrategy,
} from './strategies';

// DTOs
export {
  SystemAdminLoginDto,
  ApproveUserDto,
  UserIdParamDto,
  ChangePlanDto,
  TenantIdParamDto,
  SuspendUserDto,
  DeleteUserDto,
  PaginationDto,
  UsersQueryDto,
  PendingUsersQueryDto,
  TenantsQueryDto,
} from './dto';

// Types
export { SystemAdminRole, SystemAdminStatus } from './types';

export type {
  SystemAdminJwtPayload,
  SystemAdminRequestUser,
  SystemAdminAuthUser,
  SystemAdminAuthResponse,
  SystemAdminLogoutResponse,
  UserListItem,
  TenantListItem,
  PaginatedResponse,
  UserActionResult,
  TenantActionResult,
  SystemAdminAuditEntry,
} from './types';

// Entities (for Swagger)
export {
  SystemAdminUserEntity,
  SystemAdminAuthResponseEntity,
  SystemAdminLogoutResponseEntity,
  UserListItemEntity,
  TenantListItemEntity,
  PaginationMetaEntity,
  UserListResponseEntity,
  TenantListResponseEntity,
  UserActionResultEntity,
  TenantActionResultEntity,
} from './entities';

// Decorators
export { CurrentAdmin } from './decorators';
