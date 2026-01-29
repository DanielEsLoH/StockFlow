/**
 * System admin roles for authorization
 */
export enum SystemAdminRole {
  /** Full access to all system admin features */
  SUPER_ADMIN = 'SUPER_ADMIN',
  /** Access to support-related features (user management) */
  SUPPORT = 'SUPPORT',
  /** Access to billing-related features (subscription management) */
  BILLING = 'BILLING',
}

/**
 * System admin status
 */
export enum SystemAdminStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

/**
 * JWT payload structure for system admin access and refresh tokens.
 * Uses a separate structure from tenant user tokens for security isolation.
 */
export interface SystemAdminJwtPayload {
  /** System admin's unique identifier (subject claim) */
  sub: string;
  /** System admin's email address */
  email: string;
  /** System admin's role for authorization */
  role: SystemAdminRole;
  /** Token type discriminator */
  type: 'access' | 'refresh';
  /** Indicates this is a system admin token (for additional validation) */
  isSystemAdmin: true;
  /** Issued at timestamp (automatically added by JWT) */
  iat?: number;
  /** Expiration timestamp (automatically added by JWT) */
  exp?: number;
}

/**
 * Validated system admin data attached to the request after JWT validation.
 * This is the shape of request.user after successful authentication.
 */
export interface SystemAdminRequestUser {
  /** System admin's unique identifier */
  adminId: string;
  /** System admin's email address */
  email: string;
  /** System admin's role for authorization */
  role: SystemAdminRole;
}

/**
 * System admin data returned after successful authentication
 */
export interface SystemAdminAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: SystemAdminRole;
  status: SystemAdminStatus;
}

/**
 * Response structure for system admin login
 */
export interface SystemAdminAuthResponse {
  admin: SystemAdminAuthUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Response structure for system admin logout
 */
export interface SystemAdminLogoutResponse {
  message: string;
}

/**
 * User data for admin listing responses
 */
export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  tenantId: string;
  tenantName: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  approvedAt: Date | null;
}

/**
 * Tenant data for admin listing responses
 */
export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  status: string;
  plan: string | null;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * User action result response
 */
export interface UserActionResult {
  success: boolean;
  message: string;
  userId: string;
  action: 'approve' | 'suspend' | 'delete';
}

/**
 * Tenant action result response
 */
export interface TenantActionResult {
  success: boolean;
  message: string;
  tenantId: string;
  action: 'activate_plan' | 'suspend_plan' | 'reactivate_plan' | 'change_plan';
  previousPlan?: string;
  newPlan?: string;
  endDate?: Date;
}

/**
 * System admin audit log entry
 */
export interface SystemAdminAuditEntry {
  action: string;
  targetType: 'user' | 'tenant';
  targetId: string;
  adminId: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}
