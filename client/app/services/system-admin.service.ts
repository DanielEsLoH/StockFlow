import axios, { type AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Separate token storage for system admin (isolated from tenant user tokens)
const SYSTEM_ADMIN_ACCESS_TOKEN_KEY = 'system_admin_access_token';
const SYSTEM_ADMIN_REFRESH_TOKEN_KEY = 'system_admin_refresh_token';

let systemAdminAccessToken: string | null = null;

// Token management functions
export const setSystemAdminAccessToken = (token: string | null) => {
  systemAdminAccessToken = token;
  if (token) {
    localStorage.setItem(SYSTEM_ADMIN_ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(SYSTEM_ADMIN_ACCESS_TOKEN_KEY);
  }
};

export const getSystemAdminAccessToken = () => {
  if (!systemAdminAccessToken && typeof window !== 'undefined') {
    systemAdminAccessToken = localStorage.getItem(SYSTEM_ADMIN_ACCESS_TOKEN_KEY);
  }
  return systemAdminAccessToken;
};

export const setSystemAdminRefreshToken = (token: string | null) => {
  if (typeof window === 'undefined') return;

  if (token) {
    localStorage.setItem(SYSTEM_ADMIN_REFRESH_TOKEN_KEY, token);
    // Set cookie for SSR auth detection
    document.cookie = `${SYSTEM_ADMIN_REFRESH_TOKEN_KEY}=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  } else {
    localStorage.removeItem(SYSTEM_ADMIN_REFRESH_TOKEN_KEY);
    document.cookie = `${SYSTEM_ADMIN_REFRESH_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  }
};

export const getSystemAdminRefreshToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SYSTEM_ADMIN_REFRESH_TOKEN_KEY);
};

// Types
export type SystemAdminRole = 'SUPER_ADMIN' | 'SUPPORT' | 'BILLING';
export type SystemAdminStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface SystemAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: SystemAdminRole;
  status: SystemAdminStatus;
}

export interface SystemAdminAuthResponse {
  admin: SystemAdmin;
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// User types
export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  tenantId: string;
  tenantName: string;
  createdAt: string;
  lastLoginAt: string | null;
}

// Tenant types
export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type SubscriptionPlan = 'EMPRENDEDOR' | 'PYME' | 'PRO' | 'PLUS';
export type SubscriptionPeriod = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  status: TenantStatus;
  plan: SubscriptionPlan | null;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  periodType: SubscriptionPeriod;
  activatedById: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanLimits {
  plan: SubscriptionPlan;
  maxUsers: number;
  maxWarehouses: number;
  maxProducts: number;
  maxInvoices: number;
  priceMonthly: number;
  priceQuarterly: number;
  priceAnnual: number;
}

// Paginated response
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

// Action results
export interface UserActionResult {
  success: boolean;
  message: string;
  userId: string;
  action: 'approve' | 'suspend' | 'delete';
}

export interface TenantActionResult {
  success: boolean;
  message: string;
  tenantId: string;
  action: 'activate_plan' | 'suspend_plan' | 'reactivate_plan' | 'change_plan';
  previousPlan?: string;
  newPlan?: string;
  endDate?: string;
}

// Dashboard stats
export interface DashboardStats {
  totalTenants: number;
  pendingApprovals: number;
  activeUsers: number;
  recentRegistrations: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    tenantName: string;
    createdAt: string;
  }[];
}

// Query parameters
export interface UsersQueryParams {
  page?: number;
  limit?: number;
  status?: UserStatus;
  role?: UserRole;
  tenantId?: string;
  search?: string;
}

export interface TenantsQueryParams {
  page?: number;
  limit?: number;
  status?: TenantStatus;
  plan?: SubscriptionPlan;
  search?: string;
}

// Create axios instance for system admin API
const systemAdminApi: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add auth header
systemAdminApi.interceptors.request.use(
  (config) => {
    const token = getSystemAdminAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
systemAdminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getSystemAdminRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Try to refresh token
        const response = await axios.post(
          `${API_URL}/system-admin/refresh`,
          { refreshToken },
          { withCredentials: true }
        );

        const { accessToken: newToken, refreshToken: newRefreshToken } = response.data;
        setSystemAdminAccessToken(newToken);
        if (newRefreshToken) {
          setSystemAdminRefreshToken(newRefreshToken);
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return systemAdminApi(originalRequest);
      } catch {
        // Refresh failed - clear auth and redirect to login
        setSystemAdminAccessToken(null);
        setSystemAdminRefreshToken(null);
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/system-admin') && currentPath !== '/system-admin/login') {
          window.location.href = '/system-admin/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Build query string from params
function buildQueryString(params: UsersQueryParams | TenantsQueryParams | Omit<UsersQueryParams, 'status'>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

// Service
export const systemAdminService = {
  // Authentication
  async login(credentials: LoginCredentials): Promise<SystemAdminAuthResponse> {
    const { data } = await systemAdminApi.post<SystemAdminAuthResponse>(
      '/system-admin/login',
      credentials
    );
    setSystemAdminAccessToken(data.accessToken);
    setSystemAdminRefreshToken(data.refreshToken);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await systemAdminApi.post('/system-admin/logout');
    } finally {
      setSystemAdminAccessToken(null);
      setSystemAdminRefreshToken(null);
    }
  },

  async getMe(): Promise<SystemAdmin> {
    const { data } = await systemAdminApi.get<SystemAdmin>('/system-admin/me');
    return data;
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    const refreshToken = getSystemAdminRefreshToken();
    const { data } = await systemAdminApi.post('/system-admin/refresh', { refreshToken });
    setSystemAdminAccessToken(data.accessToken);
    if (data.refreshToken) {
      setSystemAdminRefreshToken(data.refreshToken);
    }
    return data;
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    // Since the backend doesn't have a dashboard endpoint yet,
    // we'll aggregate data from existing endpoints
    const [, tenantsResponse, pendingResponse] = await Promise.all([
      systemAdminApi.get<PaginatedResponse<UserListItem>>('/system-admin/users?limit=1'),
      systemAdminApi.get<PaginatedResponse<TenantListItem>>('/system-admin/tenants?limit=1'),
      systemAdminApi.get<PaginatedResponse<UserListItem>>('/system-admin/users/pending?limit=5'),
    ]);

    // Get active users count
    const activeUsersResponse = await systemAdminApi.get<PaginatedResponse<UserListItem>>(
      '/system-admin/users?status=ACTIVE&limit=1'
    );

    return {
      totalTenants: tenantsResponse.data.meta.total,
      pendingApprovals: pendingResponse.data.meta.total,
      activeUsers: activeUsersResponse.data.meta.total,
      recentRegistrations: pendingResponse.data.data.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantName: user.tenantName,
        createdAt: user.createdAt,
      })),
    };
  },

  // User Management
  async getUsers(params: UsersQueryParams = {}): Promise<PaginatedResponse<UserListItem>> {
    const queryString = buildQueryString(params);
    const { data } = await systemAdminApi.get<PaginatedResponse<UserListItem>>(
      `/system-admin/users${queryString ? `?${queryString}` : ''}`
    );
    return data;
  },

  async getPendingUsers(params: Omit<UsersQueryParams, 'status'> = {}): Promise<PaginatedResponse<UserListItem>> {
    const queryString = buildQueryString(params);
    const { data } = await systemAdminApi.get<PaginatedResponse<UserListItem>>(
      `/system-admin/users/pending${queryString ? `?${queryString}` : ''}`
    );
    return data;
  },

  async approveUser(userId: string): Promise<UserActionResult> {
    const { data } = await systemAdminApi.post<UserActionResult>(
      `/system-admin/users/${userId}/approve`
    );
    return data;
  },

  async suspendUser(userId: string, reason?: string): Promise<UserActionResult> {
    const { data } = await systemAdminApi.post<UserActionResult>(
      `/system-admin/users/${userId}/suspend`,
      { reason }
    );
    return data;
  },

  async deleteUser(userId: string, reason?: string): Promise<UserActionResult> {
    const { data } = await systemAdminApi.delete<UserActionResult>(
      `/system-admin/users/${userId}`,
      { data: { reason } }
    );
    return data;
  },

  // Tenant Management
  async getTenants(params: TenantsQueryParams = {}): Promise<PaginatedResponse<TenantListItem>> {
    const queryString = buildQueryString(params);
    const { data } = await systemAdminApi.get<PaginatedResponse<TenantListItem>>(
      `/system-admin/tenants${queryString ? `?${queryString}` : ''}`
    );
    return data;
  },

  async changeTenantPlan(tenantId: string, plan: SubscriptionPlan): Promise<TenantActionResult> {
    const { data } = await systemAdminApi.patch<TenantActionResult>(
      `/system-admin/tenants/${tenantId}/plan`,
      { plan }
    );
    return data;
  },

  // New subscription management endpoints
  async activateTenantPlan(
    tenantId: string,
    plan: SubscriptionPlan,
    period: SubscriptionPeriod
  ): Promise<TenantActionResult> {
    const { data } = await systemAdminApi.post<TenantActionResult>(
      `/system-admin/tenants/${tenantId}/activate-plan`,
      { plan, period }
    );
    return data;
  },

  async suspendTenantPlan(tenantId: string, reason: string): Promise<TenantActionResult> {
    const { data } = await systemAdminApi.post<TenantActionResult>(
      `/system-admin/tenants/${tenantId}/suspend-plan`,
      { reason }
    );
    return data;
  },

  async reactivateTenantPlan(tenantId: string): Promise<TenantActionResult> {
    const { data } = await systemAdminApi.post<TenantActionResult>(
      `/system-admin/tenants/${tenantId}/reactivate-plan`
    );
    return data;
  },

  async getTenantSubscription(tenantId: string): Promise<TenantSubscription | null> {
    try {
      const { data } = await systemAdminApi.get<TenantSubscription>(
        `/system-admin/tenants/${tenantId}/subscription`
      );
      return data;
    } catch {
      return null;
    }
  },

  async getAllPlanLimits(): Promise<PlanLimits[]> {
    const { data } = await systemAdminApi.get<PlanLimits[]>('/system-admin/plans');
    return data;
  },
};