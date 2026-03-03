import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  permissionsService,
  type GrantPermissionData,
  type RevokePermissionData,
} from "~/services/permissions.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch a specific user's effective permissions (admin only).
 */
export function useUserPermissions(userId: string) {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: queryKeys.userPermissions.user(userId),
    queryFn: () => permissionsService.getUserPermissions(userId),
    staleTime: 1000 * 60 * 2,
    enabled: enabled && !!userId,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Grant a permission to a user (creates an override).
 */
export function useGrantPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: GrantPermissionData;
    }) => permissionsService.grantPermission(userId, data),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.userPermissions.user(variables.userId),
      });
      toast.success("Permiso otorgado");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al otorgar el permiso");
    },
  });
}

/**
 * Revoke a permission from a user (creates an override).
 */
export function useRevokePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: RevokePermissionData;
    }) => permissionsService.revokePermission(userId, data),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.userPermissions.user(variables.userId),
      });
      toast.success("Permiso revocado");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al revocar el permiso");
    },
  });
}

/**
 * Remove a single permission override (reset to role default).
 */
export function useRemoveOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      permission,
    }: {
      userId: string;
      permission: string;
    }) => permissionsService.removeOverride(userId, permission),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.userPermissions.user(variables.userId),
      });
      toast.success("Permiso restablecido al valor por defecto del rol");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al restablecer el permiso");
    },
  });
}

/**
 * Remove all permission overrides for a user (reset everything to role defaults).
 */
export function useRemoveAllOverrides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      permissionsService.removeAllOverrides(userId),
    onSuccess: (_result, userId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.userPermissions.user(userId),
      });
      toast.success("Todos los permisos restablecidos a los valores del rol");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al restablecer los permisos");
    },
  });
}
