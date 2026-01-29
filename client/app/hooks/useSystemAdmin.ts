import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  systemAdminService,
  getSystemAdminAccessToken,
  type LoginCredentials,
  type UsersQueryParams,
  type TenantsQueryParams,
  type SubscriptionPlan,
  type SubscriptionPeriod,
} from '~/services/system-admin.service';
import { useSystemAdminStore } from '~/stores/system-admin.store';
import { toast } from '~/components/ui/Toast';

// Query keys for system admin
const BASE_KEY = ['system-admin'] as const;
const USERS_KEY = [...BASE_KEY, 'users'] as const;
const TENANTS_KEY = [...BASE_KEY, 'tenants'] as const;

export const systemAdminQueryKeys = {
  all: BASE_KEY,
  me: () => [...BASE_KEY, 'me'] as const,
  dashboard: () => [...BASE_KEY, 'dashboard'] as const,
  users: {
    all: USERS_KEY,
    list: (params?: UsersQueryParams) =>
      [...USERS_KEY, 'list', params] as const,
    pending: (params?: Omit<UsersQueryParams, 'status'>) =>
      [...USERS_KEY, 'pending', params] as const,
  },
  tenants: {
    all: TENANTS_KEY,
    list: (params?: TenantsQueryParams) =>
      [...TENANTS_KEY, 'list', params] as const,
  },
};

/**
 * Hook for system admin authentication
 */
export function useSystemAdminAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setAdmin, logout: clearAuth } = useSystemAdminStore();

  // Get current admin - only fetch if access token exists
  const {
    data: admin,
    isLoading,
    error,
  } = useQuery({
    queryKey: systemAdminQueryKeys.me(),
    queryFn: systemAdminService.getMe,
    enabled: !!getSystemAdminAccessToken(),
    retry: false,
    staleTime: Infinity,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      systemAdminService.login(credentials),
    onSuccess: (data) => {
      setAdmin(data.admin);
      queryClient.setQueryData(systemAdminQueryKeys.me(), data.admin);
      toast.success(`Bienvenido, ${data.admin.firstName}!`);
      navigate('/system-admin/dashboard');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Credenciales invalidas');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: systemAdminService.logout,
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      navigate('/system-admin/login');
      toast.success('Sesion cerrada');
    },
  });

  return {
    admin: admin ?? null,
    isLoading,
    isAuthenticated: !!admin,
    error,

    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,

    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}

/**
 * Hook for system admin dashboard data
 */
export function useSystemAdminDashboard() {
  return useQuery({
    queryKey: systemAdminQueryKeys.dashboard(),
    queryFn: systemAdminService.getDashboardStats,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook for user management
 */
export function useSystemAdminUsers(params: UsersQueryParams = {}) {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: systemAdminQueryKeys.users.list(params),
    queryFn: () => systemAdminService.getUsers(params),
    staleTime: 1000 * 60, // 1 minute
  });

  const approveMutation = useMutation({
    mutationFn: (userId: string) => systemAdminService.approveUser(userId),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.dashboard() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al aprobar usuario');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      systemAdminService.suspendUser(userId, reason),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.dashboard() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al suspender usuario');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      systemAdminService.deleteUser(userId, reason),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.dashboard() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar usuario');
    },
  });

  return {
    users: usersQuery.data?.data ?? [],
    meta: usersQuery.data?.meta,
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    refetch: usersQuery.refetch,

    approveUser: approveMutation.mutate,
    isApproving: approveMutation.isPending,

    suspendUser: suspendMutation.mutate,
    isSuspending: suspendMutation.isPending,

    deleteUser: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for pending users
 */
export function useSystemAdminPendingUsers(params: Omit<UsersQueryParams, 'status'> = {}) {
  const queryClient = useQueryClient();

  const pendingQuery = useQuery({
    queryKey: systemAdminQueryKeys.users.pending(params),
    queryFn: () => systemAdminService.getPendingUsers(params),
    staleTime: 1000 * 30, // 30 seconds
  });

  const approveMutation = useMutation({
    mutationFn: (userId: string) => systemAdminService.approveUser(userId),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.dashboard() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al aprobar usuario');
    },
  });

  return {
    pendingUsers: pendingQuery.data?.data ?? [],
    meta: pendingQuery.data?.meta,
    isLoading: pendingQuery.isLoading,
    error: pendingQuery.error,
    refetch: pendingQuery.refetch,

    approveUser: approveMutation.mutate,
    isApproving: approveMutation.isPending,
  };
}

/**
 * Hook for tenant management
 */
export function useSystemAdminTenants(params: TenantsQueryParams = {}) {
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({
    queryKey: systemAdminQueryKeys.tenants.list(params),
    queryFn: () => systemAdminService.getTenants(params),
    staleTime: 1000 * 60, // 1 minute
  });

  const changePlanMutation = useMutation({
    mutationFn: ({ tenantId, plan }: { tenantId: string; plan: SubscriptionPlan }) =>
      systemAdminService.changeTenantPlan(tenantId, plan),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.tenants.all });
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.dashboard() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al cambiar plan');
    },
  });

  const activatePlanMutation = useMutation({
    mutationFn: ({
      tenantId,
      plan,
      period,
    }: {
      tenantId: string;
      plan: SubscriptionPlan;
      period: SubscriptionPeriod;
    }) => systemAdminService.activateTenantPlan(tenantId, plan, period),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.tenants.all });
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.dashboard() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al activar plan');
    },
  });

  const suspendPlanMutation = useMutation({
    mutationFn: ({ tenantId, reason }: { tenantId: string; reason: string }) =>
      systemAdminService.suspendTenantPlan(tenantId, reason),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.tenants.all });
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.dashboard() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al suspender plan');
    },
  });

  const reactivatePlanMutation = useMutation({
    mutationFn: (tenantId: string) => systemAdminService.reactivateTenantPlan(tenantId),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.tenants.all });
      queryClient.invalidateQueries({ queryKey: systemAdminQueryKeys.dashboard() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al reactivar plan');
    },
  });

  return {
    tenants: tenantsQuery.data?.data ?? [],
    meta: tenantsQuery.data?.meta,
    isLoading: tenantsQuery.isLoading,
    error: tenantsQuery.error,
    refetch: tenantsQuery.refetch,

    changePlan: changePlanMutation.mutate,
    isChangingPlan: changePlanMutation.isPending,

    activatePlan: activatePlanMutation.mutate,
    isActivatingPlan: activatePlanMutation.isPending,

    suspendPlan: suspendPlanMutation.mutate,
    isSuspendingPlan: suspendPlanMutation.isPending,

    reactivatePlan: reactivatePlanMutation.mutate,
    isReactivatingPlan: reactivatePlanMutation.isPending,
  };
}

/**
 * Hook for fetching plan limits
 */
export function useSystemAdminPlanLimits() {
  return useQuery({
    queryKey: [...systemAdminQueryKeys.all, 'plans'] as const,
    queryFn: systemAdminService.getAllPlanLimits,
    staleTime: 1000 * 60 * 60, // 1 hour - plan limits rarely change
  });
}