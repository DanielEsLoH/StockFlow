import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useUserPreferences,
  useUpdateProfile,
  useChangePassword,
  useUpdatePreferences,
  useUploadAvatar,
  useDeleteAvatar,
  usePasswordStrength,
} from "./useSettings";
import {
  settingsService,
  type UserPreferences,
  type ProfileUpdateData,
  type PasswordChangeData,
} from "~/services/settings.service";
import { useAuthStore, type User } from "~/stores/auth.store";
import { toast } from "~/components/ui/Toast";
import { queryKeys } from "~/lib/query-client";

// Mock dependencies
vi.mock("~/services/settings.service");
vi.mock("~/components/ui/Toast");
vi.mock("~/stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

// Mock data
const mockUser: User = {
  id: "user-1",
  email: "test@example.com",
  firstName: "Juan",
  lastName: "Perez",
  role: "ADMIN",
  status: "ACTIVE",
  tenantId: "tenant-1",
  avatarUrl: "https://example.com/avatar.jpg",
};

const mockPreferences: UserPreferences = {
  theme: "system",
  language: "es",
  currency: "COP",
  dateFormat: "DD/MM/YYYY",
  notifications: {
    email: true,
    push: true,
    lowStock: true,
    invoices: true,
    reports: false,
  },
  dashboard: {
    showSalesChart: true,
    showCategoryDistribution: true,
    showTopProducts: true,
    showLowStockAlerts: true,
  },
};

const defaultPreferences: UserPreferences = {
  theme: "system",
  language: "es",
  currency: "COP",
  dateFormat: "DD/MM/YYYY",
  notifications: {
    email: true,
    push: true,
    lowStock: true,
    invoices: true,
    reports: false,
  },
  dashboard: {
    showSalesChart: true,
    showCategoryDistribution: true,
    showTopProducts: true,
    showLowStockAlerts: true,
  },
};

// Mock auth store functions
const mockSetUser = vi.fn();
const mockGetState = vi.fn();

// Helper to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

// Helper to create a wrapper with access to the queryClient
function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 1000 * 60, // 1 minute - longer to avoid GC during test
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const wrapper = function Wrapper({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };

  return { wrapper, queryClient };
}

describe("useSettings hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetUser.mockClear();
    mockGetState.mockClear();

    // Setup default auth store mock
    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
      tenant: null,
      isAuthenticated: true,
      isLoading: false,
      setTenant: vi.fn(),
      setLoading: vi.fn(),
      logout: vi.fn(),
    });

    // Mock getState for useChangePassword
    mockGetState.mockReturnValue({ user: mockUser });
    (useAuthStore as unknown as { getState: typeof mockGetState }).getState =
      mockGetState;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // QUERY HOOKS
  // ============================================================================

  describe("useUserPreferences", () => {
    it("should fetch preferences on mount", async () => {
      vi.mocked(settingsService.getPreferences).mockReturnValue(
        mockPreferences,
      );

      const { result } = renderHook(() => useUserPreferences(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPreferences);
      expect(settingsService.getPreferences).toHaveBeenCalled();
    });

    it("should return default preferences when none stored", async () => {
      vi.mocked(settingsService.getPreferences).mockReturnValue(
        defaultPreferences,
      );

      const { result } = renderHook(() => useUserPreferences(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(defaultPreferences);
    });

    it("should return loading state initially", () => {
      vi.mocked(settingsService.getPreferences).mockImplementation(() => {
        // Simulate a synchronous call that takes time by returning value
        return mockPreferences;
      });

      const { result } = renderHook(() => useUserPreferences(), {
        wrapper: createWrapper(),
      });

      // Initially loading before the query resolves
      expect(result.current.isLoading).toBe(true);
    });

    it("should handle error state on failure", async () => {
      vi.mocked(settingsService.getPreferences).mockImplementation(() => {
        throw new Error("Failed to fetch preferences");
      });

      const { result } = renderHook(() => useUserPreferences(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it("should have staleTime set to Infinity", async () => {
      vi.mocked(settingsService.getPreferences).mockReturnValue(
        mockPreferences,
      );

      const { result } = renderHook(() => useUserPreferences(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The query should have been called only once due to Infinity staleTime
      expect(settingsService.getPreferences).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // MUTATION HOOKS
  // ============================================================================

  describe("useUpdateProfile", () => {
    it("should update profile successfully", async () => {
      const profileData: ProfileUpdateData = {
        firstName: "Carlos",
        lastName: "Martinez",
        email: "carlos@example.com",
      };

      const updatedUser: User = {
        ...mockUser,
        ...profileData,
      };

      vi.mocked(settingsService.updateProfile).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settingsService.updateProfile).toHaveBeenCalledWith(
        mockUser.id,
        profileData,
      );
    });

    it("should update auth store on success", async () => {
      const profileData: ProfileUpdateData = {
        firstName: "Carlos",
      };

      const updatedUser: User = {
        ...mockUser,
        firstName: "Carlos",
      };

      vi.mocked(settingsService.updateProfile).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSetUser).toHaveBeenCalledWith(updatedUser);
    });

    it('should show success toast "Perfil actualizado exitosamente"', async () => {
      const profileData: ProfileUpdateData = {
        firstName: "Carlos",
      };

      const updatedUser: User = {
        ...mockUser,
        firstName: "Carlos",
      };

      vi.mocked(settingsService.updateProfile).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Perfil actualizado exitosamente",
      );
    });

    it("should show error toast on failure", async () => {
      const error = new Error("Error al actualizar el perfil");
      vi.mocked(settingsService.updateProfile).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ firstName: "Carlos" });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Error al actualizar el perfil");
    });

    it("should show default error message when error has no message", async () => {
      vi.mocked(settingsService.updateProfile).mockRejectedValue(new Error());

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ firstName: "Carlos" });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Error al actualizar el perfil");
    });

    it("should update auth query cache on success", async () => {
      const profileData: ProfileUpdateData = {
        firstName: "Carlos",
      };

      const updatedUser: User = {
        ...mockUser,
        firstName: "Carlos",
      };

      vi.mocked(settingsService.updateProfile).mockResolvedValue(updatedUser);

      const { wrapper, queryClient } = createWrapperWithClient();

      // Pre-populate auth cache
      queryClient.setQueryData(queryKeys.auth.me(), { user: mockUser });

      const { result } = renderHook(() => useUpdateProfile(), { wrapper });

      await act(async () => {
        result.current.mutate(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify auth cache was updated
      const authData = queryClient.getQueryData(queryKeys.auth.me()) as {
        user: User;
      };
      expect(authData.user.firstName).toBe("Carlos");
    });

    it("should handle user with empty id", async () => {
      // Mock user with no id
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        setUser: mockSetUser,
        tenant: null,
        isAuthenticated: false,
        isLoading: false,
        setTenant: vi.fn(),
        setLoading: vi.fn(),
        logout: vi.fn(),
      });

      const updatedUser: User = {
        ...mockUser,
        id: "",
        firstName: "Carlos",
      };

      vi.mocked(settingsService.updateProfile).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ firstName: "Carlos" });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should call with empty string as fallback
      expect(settingsService.updateProfile).toHaveBeenCalledWith("", {
        firstName: "Carlos",
      });
    });
  });

  describe("useChangePassword", () => {
    it("should change password successfully", async () => {
      const passwordData: PasswordChangeData = {
        currentPassword: "currentPassword123",
        newPassword: "newSecurePassword123!",
        confirmPassword: "newSecurePassword123!",
      };

      vi.mocked(settingsService.changePassword).mockResolvedValue({
        message: "Contrasena actualizada exitosamente",
      });

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settingsService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        passwordData,
      );
    });

    it('should show success toast "Contrasena actualizada exitosamente"', async () => {
      const passwordData: PasswordChangeData = {
        currentPassword: "currentPassword123",
        newPassword: "newSecurePassword123!",
        confirmPassword: "newSecurePassword123!",
      };

      vi.mocked(settingsService.changePassword).mockResolvedValue({
        message: "Contrasena actualizada exitosamente",
      });

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Contrasena actualizada exitosamente",
      );
    });

    it('should show error toast "Contrasena actual incorrecta" on wrong password', async () => {
      const error = new Error("La contrasena actual es incorrecta");
      vi.mocked(settingsService.changePassword).mockRejectedValue(error);

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          currentPassword: "wrongPassword",
          newPassword: "newPassword123!",
          confirmPassword: "newPassword123!",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "La contrasena actual es incorrecta",
      );
    });

    it("should show default error message on other errors", async () => {
      vi.mocked(settingsService.changePassword).mockRejectedValue(new Error());

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          currentPassword: "currentPassword123",
          newPassword: "newPassword123!",
          confirmPassword: "newPassword123!",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Contrasena actual incorrecta");
    });

    it("should get user from auth store getState", async () => {
      vi.mocked(settingsService.changePassword).mockResolvedValue({
        message: "Contrasena actualizada exitosamente",
      });

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          currentPassword: "currentPassword123",
          newPassword: "newPassword123!",
          confirmPassword: "newPassword123!",
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify getState was called
      expect(mockGetState).toHaveBeenCalled();
    });

    it("should handle user with no id", async () => {
      mockGetState.mockReturnValue({ user: null });

      vi.mocked(settingsService.changePassword).mockResolvedValue({
        message: "Contrasena actualizada exitosamente",
      });

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          currentPassword: "currentPassword123",
          newPassword: "newPassword123!",
          confirmPassword: "newPassword123!",
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should call with empty string as fallback
      expect(settingsService.changePassword).toHaveBeenCalledWith(
        "",
        expect.any(Object),
      );
    });
  });

  describe("useUpdatePreferences", () => {
    it("should update preferences successfully", async () => {
      const newPreferences: UserPreferences = {
        ...mockPreferences,
        theme: "dark",
      };

      vi.mocked(settingsService.updatePreferences).mockReturnValue(
        newPreferences,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.settings.preferences(),
        mockPreferences,
      );

      const { result } = renderHook(() => useUpdatePreferences(), { wrapper });

      await act(async () => {
        result.current.mutate(newPreferences);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settingsService.updatePreferences).toHaveBeenCalledWith(
        newPreferences,
      );
    });

    it('should show success toast "Preferencias guardadas exitosamente"', async () => {
      const newPreferences: UserPreferences = {
        ...mockPreferences,
        theme: "dark",
      };

      vi.mocked(settingsService.updatePreferences).mockReturnValue(
        newPreferences,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.settings.preferences(),
        mockPreferences,
      );

      const { result } = renderHook(() => useUpdatePreferences(), { wrapper });

      await act(async () => {
        result.current.mutate(newPreferences);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Preferencias guardadas exitosamente",
      );
    });

    it("should perform optimistic update", async () => {
      const newPreferences: UserPreferences = {
        ...mockPreferences,
        theme: "dark",
        language: "en",
      };

      // Delay the response to test optimistic update
      vi.mocked(settingsService.updatePreferences).mockImplementation(() => {
        return newPreferences;
      });

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.settings.preferences(),
        mockPreferences,
      );

      const { result } = renderHook(() => useUpdatePreferences(), { wrapper });

      await act(async () => {
        result.current.mutate(newPreferences);
      });

      // Check optimistic update was applied immediately
      const optimisticData = queryClient.getQueryData<UserPreferences>(
        queryKeys.settings.preferences(),
      );
      expect(optimisticData?.theme).toBe("dark");
      expect(optimisticData?.language).toBe("en");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should rollback on error", async () => {
      const newPreferences: UserPreferences = {
        ...mockPreferences,
        theme: "dark",
      };

      const error = new Error("Failed to save preferences");
      vi.mocked(settingsService.updatePreferences).mockImplementation(() => {
        throw error;
      });

      // Create query client with longer gcTime to preserve cache during test
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 1000 * 60, // 1 minute
            staleTime: 0,
          },
          mutations: {
            retry: false,
          },
        },
      });

      const wrapper = function Wrapper({
        children,
      }: {
        children: React.ReactNode;
      }) {
        return React.createElement(
          QueryClientProvider,
          { client: queryClient },
          children,
        );
      };

      // Set initial preferences
      queryClient.setQueryData(
        queryKeys.settings.preferences(),
        mockPreferences,
      );

      const { result } = renderHook(() => useUpdatePreferences(), { wrapper });

      await act(async () => {
        result.current.mutate(newPreferences);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Check rollback occurred - the onError handler should have restored the previous value
      const rolledBackData = queryClient.getQueryData<UserPreferences>(
        queryKeys.settings.preferences(),
      );
      expect(rolledBackData?.theme).toBe("system");
    });

    it("should show error toast on failure", async () => {
      const newPreferences: UserPreferences = {
        ...mockPreferences,
        theme: "dark",
      };

      const error = new Error("Error al guardar las preferencias");
      vi.mocked(settingsService.updatePreferences).mockImplementation(() => {
        throw error;
      });

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.settings.preferences(),
        mockPreferences,
      );

      const { result } = renderHook(() => useUpdatePreferences(), { wrapper });

      await act(async () => {
        result.current.mutate(newPreferences);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al guardar las preferencias",
      );
    });

    it("should show default error message when error has no message", async () => {
      const newPreferences: UserPreferences = {
        ...mockPreferences,
        theme: "dark",
      };

      vi.mocked(settingsService.updatePreferences).mockImplementation(() => {
        throw new Error();
      });

      const { wrapper, queryClient } = createWrapperWithClient();
      queryClient.setQueryData(
        queryKeys.settings.preferences(),
        mockPreferences,
      );

      const { result } = renderHook(() => useUpdatePreferences(), { wrapper });

      await act(async () => {
        result.current.mutate(newPreferences);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al guardar las preferencias",
      );
    });

    it("should cancel outgoing refetches on mutate", async () => {
      const newPreferences: UserPreferences = {
        ...mockPreferences,
        theme: "dark",
      };

      vi.mocked(settingsService.updatePreferences).mockReturnValue(
        newPreferences,
      );

      const { wrapper, queryClient } = createWrapperWithClient();
      const cancelQueriesSpy = vi.spyOn(queryClient, "cancelQueries");
      queryClient.setQueryData(
        queryKeys.settings.preferences(),
        mockPreferences,
      );

      const { result } = renderHook(() => useUpdatePreferences(), { wrapper });

      await act(async () => {
        result.current.mutate(newPreferences);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(cancelQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.settings.preferences(),
      });
    });

    it("should handle rollback when previousPreferences is undefined", async () => {
      const newPreferences: UserPreferences = {
        ...mockPreferences,
        theme: "dark",
      };

      const error = new Error("Failed to save");
      vi.mocked(settingsService.updatePreferences).mockImplementation(() => {
        throw error;
      });

      const { wrapper } = createWrapperWithClient();
      // DO NOT set initial preferences - context.previousPreferences will be undefined

      const { result } = renderHook(() => useUpdatePreferences(), { wrapper });

      await act(async () => {
        result.current.mutate(newPreferences);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should still show error toast even without rollback data
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe("useUploadAvatar", () => {
    it("should upload avatar successfully", async () => {
      const file = new File(["test"], "avatar.jpg", { type: "image/jpeg" });
      const response = {
        url: "https://example.com/new-avatar.jpg",
        filename: "avatar.jpg",
      };

      vi.mocked(settingsService.uploadAvatar).mockResolvedValue(response);

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settingsService.uploadAvatar).toHaveBeenCalledWith(file);
    });

    it("should update auth store on success", async () => {
      const file = new File(["test"], "avatar.jpg", { type: "image/jpeg" });
      const response = {
        url: "https://example.com/new-avatar.jpg",
        filename: "avatar.jpg",
      };

      vi.mocked(settingsService.uploadAvatar).mockResolvedValue(response);

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSetUser).toHaveBeenCalledWith({
        ...mockUser,
        avatarUrl: response.url,
      });
    });

    it('should show success toast "Foto de perfil actualizada"', async () => {
      const file = new File(["test"], "avatar.jpg", { type: "image/jpeg" });
      const response = {
        url: "https://example.com/new-avatar.jpg",
        filename: "avatar.jpg",
      };

      vi.mocked(settingsService.uploadAvatar).mockResolvedValue(response);

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith("Foto de perfil actualizada");
    });

    it("should show error toast on failure", async () => {
      const file = new File(["test"], "avatar.jpg", { type: "image/jpeg" });
      const error = new Error("Error al subir la foto de perfil");
      vi.mocked(settingsService.uploadAvatar).mockRejectedValue(error);

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al subir la foto de perfil",
      );
    });

    it("should show default error message when error has no message", async () => {
      const file = new File(["test"], "avatar.jpg", { type: "image/jpeg" });
      vi.mocked(settingsService.uploadAvatar).mockRejectedValue(new Error());

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al subir la foto de perfil",
      );
    });

    it("should update auth query cache on success", async () => {
      const file = new File(["test"], "avatar.jpg", { type: "image/jpeg" });
      const response = {
        url: "https://example.com/new-avatar.jpg",
        filename: "avatar.jpg",
      };

      vi.mocked(settingsService.uploadAvatar).mockResolvedValue(response);

      const { wrapper, queryClient } = createWrapperWithClient();

      // Pre-populate auth cache
      queryClient.setQueryData(queryKeys.auth.me(), { user: mockUser });

      const { result } = renderHook(() => useUploadAvatar(), { wrapper });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify auth cache was updated
      const authData = queryClient.getQueryData(queryKeys.auth.me()) as {
        user: User;
      };
      expect(authData.user.avatarUrl).toBe(response.url);
    });

    it("should not update auth store when user is null", async () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        setUser: mockSetUser,
        tenant: null,
        isAuthenticated: false,
        isLoading: false,
        setTenant: vi.fn(),
        setLoading: vi.fn(),
        logout: vi.fn(),
      });

      const file = new File(["test"], "avatar.jpg", { type: "image/jpeg" });
      const response = {
        url: "https://example.com/new-avatar.jpg",
        filename: "avatar.jpg",
      };

      vi.mocked(settingsService.uploadAvatar).mockResolvedValue(response);

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // setUser should NOT be called when user is null
      expect(mockSetUser).not.toHaveBeenCalled();
      // But success toast should still be shown
      expect(toast.success).toHaveBeenCalledWith("Foto de perfil actualizada");
    });

    it("should return loading state while uploading", async () => {
      const file = new File(["test"], "avatar.jpg", { type: "image/jpeg" });
      let resolvePromise: (value: { url: string; filename: string }) => void;
      const promise = new Promise<{ url: string; filename: string }>(
        (resolve) => {
          resolvePromise = resolve;
        },
      );

      vi.mocked(settingsService.uploadAvatar).mockReturnValue(promise);

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(file);
      });

      // Check pending state immediately after calling mutate
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Resolve the promise to clean up
      resolvePromise!({
        url: "https://example.com/new-avatar.jpg",
        filename: "avatar.jpg",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe("useDeleteAvatar", () => {
    it("should delete avatar successfully", async () => {
      vi.mocked(settingsService.deleteAvatar).mockResolvedValue({
        message: "Avatar eliminado exitosamente",
      });

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settingsService.deleteAvatar).toHaveBeenCalledWith(mockUser.id);
    });

    it("should update auth store on success", async () => {
      vi.mocked(settingsService.deleteAvatar).mockResolvedValue({
        message: "Avatar eliminado exitosamente",
      });

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSetUser).toHaveBeenCalledWith({
        ...mockUser,
        avatarUrl: undefined,
      });
    });

    it('should show success toast "Foto de perfil eliminada"', async () => {
      vi.mocked(settingsService.deleteAvatar).mockResolvedValue({
        message: "Avatar eliminado exitosamente",
      });

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith("Foto de perfil eliminada");
    });

    it("should show error toast on failure", async () => {
      const error = new Error("Error al eliminar la foto de perfil");
      vi.mocked(settingsService.deleteAvatar).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al eliminar la foto de perfil",
      );
    });

    it("should show default error message when error has no message", async () => {
      vi.mocked(settingsService.deleteAvatar).mockRejectedValue(new Error());

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Error al eliminar la foto de perfil",
      );
    });

    it("should update auth query cache on success", async () => {
      vi.mocked(settingsService.deleteAvatar).mockResolvedValue({
        message: "Avatar eliminado exitosamente",
      });

      const { wrapper, queryClient } = createWrapperWithClient();

      // Pre-populate auth cache
      queryClient.setQueryData(queryKeys.auth.me(), { user: mockUser });

      const { result } = renderHook(() => useDeleteAvatar(), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify auth cache was updated with avatarUrl removed
      const authData = queryClient.getQueryData(queryKeys.auth.me()) as {
        user: User;
      };
      expect(authData.user.avatarUrl).toBeUndefined();
    });

    it("should not update auth store when user is null", async () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        setUser: mockSetUser,
        tenant: null,
        isAuthenticated: false,
        isLoading: false,
        setTenant: vi.fn(),
        setLoading: vi.fn(),
        logout: vi.fn(),
      });

      vi.mocked(settingsService.deleteAvatar).mockResolvedValue({
        message: "Avatar eliminado exitosamente",
      });

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // setUser should NOT be called when user is null
      expect(mockSetUser).not.toHaveBeenCalled();
      // But success toast should still be shown
      expect(toast.success).toHaveBeenCalledWith("Foto de perfil eliminada");
    });

    it("should handle user with empty id", async () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: { ...mockUser, id: "" },
        setUser: mockSetUser,
        tenant: null,
        isAuthenticated: true,
        isLoading: false,
        setTenant: vi.fn(),
        setLoading: vi.fn(),
        logout: vi.fn(),
      });

      vi.mocked(settingsService.deleteAvatar).mockResolvedValue({
        message: "Avatar eliminado exitosamente",
      });

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should call with empty string
      expect(settingsService.deleteAvatar).toHaveBeenCalledWith("");
    });
  });

  // ============================================================================
  // UTILITY HOOKS
  // ============================================================================

  describe("usePasswordStrength", () => {
    it('should return "weak" for short passwords', () => {
      const { result } = renderHook(() => usePasswordStrength("abc"));

      expect(result.current).toBe("weak");
    });

    it('should return "weak" for empty password', () => {
      const { result } = renderHook(() => usePasswordStrength(""));

      expect(result.current).toBe("weak");
    });

    it('should return "fair" for passwords with some criteria', () => {
      // Password with 8+ chars, lowercase, and uppercase (3 criteria = fair)
      const { result: result1 } = renderHook(() =>
        usePasswordStrength("Abcdefgh"),
      );
      expect(result1.current).toBe("fair");

      // Password with 12+ chars and lowercase (3 criteria = fair)
      const { result: result2 } = renderHook(() =>
        usePasswordStrength("abcdefghijkl"),
      );
      expect(result2.current).toBe("fair");
    });

    it('should return "good" for passwords with most criteria', () => {
      // Password with 8+ chars, lowercase, uppercase, and numbers (4 criteria = good)
      const { result: result1 } = renderHook(() =>
        usePasswordStrength("Abcdefg1"),
      );
      expect(result1.current).toBe("good");

      // Password with 8+ chars, lowercase, uppercase, numbers, and special chars (5 criteria = good)
      const { result: result2 } = renderHook(() =>
        usePasswordStrength("Abcdef1!"),
      );
      expect(result2.current).toBe("good");
    });

    it('should return "strong" for passwords with all criteria', () => {
      // Password with 12+ chars, lowercase, uppercase, numbers, and special chars (6 criteria = strong)
      const { result } = renderHook(() => usePasswordStrength("Abcdefg12345!"));

      expect(result.current).toBe("strong");
    });

    it("should update when password changes", () => {
      const { result, rerender } = renderHook(
        ({ password }) => usePasswordStrength(password),
        { initialProps: { password: "" } },
      );

      expect(result.current).toBe("weak");

      // 8+ chars + lowercase = 2 criteria = weak
      rerender({ password: "abcdefgh" });
      expect(result.current).toBe("weak");

      // 8+ chars + lowercase + uppercase = 3 criteria = fair
      rerender({ password: "Abcdefgh" });
      expect(result.current).toBe("fair");

      // 8+ chars + lowercase + uppercase + numbers = 4 criteria = good
      rerender({ password: "Abcdefg1" });
      expect(result.current).toBe("good");

      // 12+ chars + 8+ chars + lowercase + uppercase + numbers + special = 6 criteria = strong
      rerender({ password: "Abcdefg12345!" });
      expect(result.current).toBe("strong");
    });

    it('should return "weak" for passwords with only numbers', () => {
      const { result } = renderHook(() => usePasswordStrength("12345678"));

      // 8+ chars (1) + numbers (1) = 2 criteria = weak
      expect(result.current).toBe("weak");
    });

    it('should return "weak" for passwords with only special characters', () => {
      const { result } = renderHook(() => usePasswordStrength("!@#$%^&*"));

      // 8+ chars (1) + special (1) = 2 criteria = weak
      expect(result.current).toBe("weak");
    });

    it('should return "fair" for 12+ char password with only lowercase', () => {
      const { result } = renderHook(() => usePasswordStrength("abcdefghijkl"));

      // 8+ chars (1) + 12+ chars (1) + lowercase (1) = 3 criteria = fair
      expect(result.current).toBe("fair");
    });

    it("should handle password with all character types but short length", () => {
      const { result } = renderHook(() => usePasswordStrength("Aa1!"));

      // No 8+ chars, but has lowercase (1), uppercase (1), numbers (1), special (1) = 4 criteria = good
      expect(result.current).toBe("good");
    });

    it("should be memoized based on password", () => {
      const { result, rerender } = renderHook(
        ({ password }) => usePasswordStrength(password),
        { initialProps: { password: "testPassword123!" } },
      );

      const firstResult = result.current;

      // Rerender with same password
      rerender({ password: "testPassword123!" });

      // Result should be the same object (memoized)
      expect(result.current).toBe(firstResult);
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe("Edge cases", () => {
    it("should handle network errors gracefully for updateProfile", async () => {
      const networkError = new Error("Network error");
      vi.mocked(settingsService.updateProfile).mockRejectedValue(networkError);

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ firstName: "Carlos" });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Network error");
    });

    it("should handle network errors gracefully for changePassword", async () => {
      const networkError = new Error("Network error");
      vi.mocked(settingsService.changePassword).mockRejectedValue(networkError);

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          currentPassword: "currentPassword123",
          newPassword: "newPassword123!",
          confirmPassword: "newPassword123!",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Network error");
    });

    it("should handle concurrent mutations", async () => {
      const profileData: ProfileUpdateData = { firstName: "Carlos" };
      const updatedUser: User = { ...mockUser, firstName: "Carlos" };

      vi.mocked(settingsService.updateProfile).mockResolvedValue(updatedUser);
      vi.mocked(settingsService.deleteAvatar).mockResolvedValue({
        message: "Avatar eliminado exitosamente",
      });

      const { result: profileResult } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      const { result: avatarResult } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        profileResult.current.mutate(profileData);
        avatarResult.current.mutate();
      });

      await waitFor(() => {
        expect(profileResult.current.isSuccess).toBe(true);
        expect(avatarResult.current.isSuccess).toBe(true);
      });

      expect(settingsService.updateProfile).toHaveBeenCalled();
      expect(settingsService.deleteAvatar).toHaveBeenCalled();
    });

    it("should handle auth cache update when oldData is not an object", async () => {
      const profileData: ProfileUpdateData = { firstName: "Carlos" };
      const updatedUser: User = { ...mockUser, firstName: "Carlos" };

      vi.mocked(settingsService.updateProfile).mockResolvedValue(updatedUser);

      const { wrapper, queryClient } = createWrapperWithClient();

      // Set auth cache to a non-object value
      queryClient.setQueryData(queryKeys.auth.me(), null);

      const { result } = renderHook(() => useUpdateProfile(), { wrapper });

      await act(async () => {
        result.current.mutate(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The cache should remain null since the update function returns oldData when it's not an object
      const authData = queryClient.getQueryData(queryKeys.auth.me());
      expect(authData).toBeNull();
    });

    it("should handle auth cache update when oldData has no user property", async () => {
      const profileData: ProfileUpdateData = { firstName: "Carlos" };
      const updatedUser: User = { ...mockUser, firstName: "Carlos" };

      vi.mocked(settingsService.updateProfile).mockResolvedValue(updatedUser);

      const { wrapper, queryClient } = createWrapperWithClient();

      // Set auth cache to an object without user property
      queryClient.setQueryData(queryKeys.auth.me(), { someOtherProp: "value" });

      const { result } = renderHook(() => useUpdateProfile(), { wrapper });

      await act(async () => {
        result.current.mutate(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The cache should remain unchanged since the update function returns oldData when 'user' property is not present
      const authData = queryClient.getQueryData(queryKeys.auth.me()) as {
        someOtherProp: string;
      };
      expect(authData.someOtherProp).toBe("value");
    });
  });
});
