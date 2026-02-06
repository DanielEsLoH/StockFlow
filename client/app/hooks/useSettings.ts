import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  settingsService,
  type UserPreferences,
  type ProfileUpdateData,
  type PasswordChangeData,
} from "~/services/settings.service";
import { useAuthStore } from "~/stores/auth.store";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type { PasswordStrength } from "~/types/settings";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query for fetching user preferences
 */
export function useUserPreferences() {
  const enabled = useIsQueryEnabled();
  return useQuery<UserPreferences>({
    queryKey: queryKeys.settings.preferences(),
    queryFn: () => settingsService.getPreferences(),
    staleTime: Infinity, // Preferences rarely change
    enabled,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();

  return useMutation({
    mutationFn: (data: ProfileUpdateData) =>
      settingsService.updateProfile(user?.id || "", data),
    onSuccess: (updatedUser) => {
      // Update auth store with new user data
      setUser(updatedUser);
      // Update auth query cache
      queryClient.setQueryData(queryKeys.auth.me(), (oldData: unknown) => {
        if (oldData && typeof oldData === "object" && "user" in oldData) {
          return { ...oldData, user: updatedUser };
        }
        return oldData;
      });
      toast.success("Perfil actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar el perfil");
    },
  });
}

/**
 * Mutation to change password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: PasswordChangeData) =>
      settingsService.changePassword(
        useAuthStore.getState().user?.id || "",
        data,
      ),
    onSuccess: () => {
      toast.success("Contrasena actualizada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Contrasena actual incorrecta");
    },
  });
}

/**
 * Mutation to update preferences
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      preferences: UserPreferences,
    ): Promise<UserPreferences> => {
      // Wrap synchronous service call in Promise for mutation compatibility
      return Promise.resolve(settingsService.updatePreferences(preferences));
    },
    onMutate: async (newPreferences: UserPreferences) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.settings.preferences(),
      });

      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData<UserPreferences>(
        queryKeys.settings.preferences(),
      );

      // Optimistically update the cache
      queryClient.setQueryData<UserPreferences>(
        queryKeys.settings.preferences(),
        newPreferences,
      );

      return { previousPreferences };
    },
    onSuccess: (updatedPreferences: UserPreferences) => {
      // Update cache with server response
      queryClient.setQueryData(
        queryKeys.settings.preferences(),
        updatedPreferences,
      );
      toast.success("Preferencias guardadas exitosamente");
    },
    onError: (
      error: Error,
      _variables: UserPreferences,
      context: { previousPreferences?: UserPreferences } | undefined,
    ) => {
      // Rollback optimistic update on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          queryKeys.settings.preferences(),
          context.previousPreferences,
        );
      }
      toast.error(error.message || "Error al guardar las preferencias");
    },
  });
}

/**
 * Mutation to upload avatar
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();

  return useMutation({
    mutationFn: (file: File) => settingsService.uploadAvatar(file),
    onSuccess: (response) => {
      // Update auth store with new avatar URL
      if (user) {
        const updatedUser = { ...user, avatarUrl: response.url };
        setUser(updatedUser);
        // Update auth query cache
        queryClient.setQueryData(queryKeys.auth.me(), (oldData: unknown) => {
          if (oldData && typeof oldData === "object" && "user" in oldData) {
            return { ...oldData, user: updatedUser };
          }
          return oldData;
        });
      }
      toast.success("Foto de perfil actualizada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al subir la foto de perfil");
    },
  });
}

/**
 * Mutation to delete avatar
 */
export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();

  return useMutation({
    mutationFn: () => settingsService.deleteAvatar(user?.id || ""),
    onSuccess: () => {
      // Update auth store by removing avatar URL
      if (user) {
        const updatedUser = { ...user, avatarUrl: undefined };
        setUser(updatedUser);
        // Update auth query cache
        queryClient.setQueryData(queryKeys.auth.me(), (oldData: unknown) => {
          if (oldData && typeof oldData === "object" && "user" in oldData) {
            return { ...oldData, user: updatedUser };
          }
          return oldData;
        });
      }
      toast.success("Foto de perfil eliminada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar la foto de perfil");
    },
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to calculate password strength
 * Checks: length, uppercase, lowercase, numbers, special characters
 */
export function usePasswordStrength(password: string): PasswordStrength {
  return useMemo(() => {
    if (!password) return "weak";

    let score = 0;

    // Length checks
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character type checks
    if (/[a-z]/.test(password)) score += 1; // lowercase
    if (/[A-Z]/.test(password)) score += 1; // uppercase
    if (/[0-9]/.test(password)) score += 1; // numbers
    if (/[^a-zA-Z0-9]/.test(password)) score += 1; // special characters

    // Determine strength level based on score
    if (score <= 2) return "weak";
    if (score <= 3) return "fair";
    if (score <= 5) return "good";
    return "strong";
  }, [password]);
}
