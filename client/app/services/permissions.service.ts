import { api } from '~/lib/api';

export interface PermissionsResponse {
  permissions: string[];
  role: string;
}

export interface PermissionOverride {
  id: string;
  userId: string;
  permission: string;
  granted: boolean;
  grantedBy: string | null;
  reason: string | null;
  createdAt: string;
}

export interface GrantPermissionData {
  permission: string;
  reason?: string;
}

export interface RevokePermissionData {
  permission: string;
  reason?: string;
}

export const permissionsService = {
  /**
   * Get current user's effective permissions
   */
  async getMyPermissions(): Promise<PermissionsResponse> {
    const response = await api.get<PermissionsResponse>(
      '/users/me/permissions'
    );
    return response.data;
  },

  /**
   * Get a specific user's permissions (admin only)
   */
  async getUserPermissions(userId: string): Promise<PermissionsResponse> {
    const response = await api.get<PermissionsResponse>(
      `/users/${userId}/permissions`
    );
    return response.data;
  },

  /**
   * Grant a permission to a user (admin only)
   */
  async grantPermission(
    userId: string,
    data: GrantPermissionData
  ): Promise<PermissionOverride> {
    const response = await api.post<PermissionOverride>(
      `/users/${userId}/permissions/grant`,
      data
    );
    return response.data;
  },

  /**
   * Revoke a permission from a user (admin only)
   */
  async revokePermission(
    userId: string,
    data: RevokePermissionData
  ): Promise<PermissionOverride> {
    const response = await api.post<PermissionOverride>(
      `/users/${userId}/permissions/revoke`,
      data
    );
    return response.data;
  },

  /**
   * Remove a permission override (reset to role default)
   */
  async removeOverride(
    userId: string,
    permission: string
  ): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/users/${userId}/permissions/${encodeURIComponent(permission)}`
    );
    return response.data;
  },

  /**
   * Remove all permission overrides for a user
   */
  async removeAllOverrides(userId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/users/${userId}/permissions`
    );
    return response.data;
  },
};
