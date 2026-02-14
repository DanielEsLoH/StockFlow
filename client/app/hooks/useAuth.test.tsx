import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { useAuth, useInvitation } from "./useAuth";
import { authService, type InvitationDetails } from "~/services/auth.service";
import { useAuthStore } from "~/stores/auth.store";
import type { User, Tenant } from "~/stores/auth.store";

// Mock dependencies
vi.mock("~/services/auth.service", () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    acceptInvitation: vi.fn(),
    getInvitation: vi.fn(),
  },
}));

vi.mock("~/lib/api", () => ({
  getAccessToken: vi.fn(),
  clearAllAuthData: vi.fn(),
}));

vi.mock("~/services/permissions.service", () => ({
  permissionsService: {
    getMyPermissions: vi.fn(),
  },
}));

import { permissionsService } from "~/services/permissions.service";

import { getAccessToken } from "~/lib/api";

vi.mock("~/lib/theme", () => ({
  clearSessionTheme: vi.fn(),
  applyTheme: vi.fn(),
  getSystemTheme: vi.fn(() => "light"),
}));

vi.mock("~/components/ui/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser: User = {
  id: "1",
  email: "test@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "ADMIN",
  status: "ACTIVE",
  tenantId: "tenant-1",
};

const mockTenant: Tenant = {
  id: "tenant-1",
  name: "Test Company",
  slug: "test-company",
  plan: "PRO",
  status: "ACTIVE",
};

const mockAuthResponse = {
  user: mockUser,
  tenant: mockTenant,
  accessToken: "mock-token",
  refreshToken: "mock-refresh-token",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth store
    useAuthStore.setState({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initial state", () => {
    it("should return loading state initially", () => {
      vi.mocked(getAccessToken).mockReturnValue("mock-token");
      vi.mocked(authService.getMe).mockReturnValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should call getMe on mount when token exists", () => {
      vi.mocked(getAccessToken).mockReturnValue("mock-token");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));

      renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(authService.getMe).toHaveBeenCalled();
    });

    it("should not call getMe when no token exists", () => {
      vi.mocked(getAccessToken).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(authService.getMe).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("login mutation", () => {
    it("should call authService.login with credentials", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.login).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.login({
          email: "test@example.com",
          password: "password",
        });
      });

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password",
        });
      });
    });

    it("should navigate to dashboard on successful login", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.login).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.login({
          email: "test@example.com",
          password: "password",
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("should update auth store on successful login", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.login).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.login({
          email: "test@example.com",
          password: "password",
        });
      });

      await waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.user).toEqual(mockUser);
        expect(state.tenant).toEqual(mockTenant);
      });
    });

    it("should set isLoggingIn to true during login", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      let resolveLogin: (value: typeof mockAuthResponse) => void;
      const loginPromise = new Promise<typeof mockAuthResponse>((resolve) => {
        resolveLogin = resolve;
      });
      vi.mocked(authService.login).mockReturnValue(loginPromise);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.login({
          email: "test@example.com",
          password: "password",
        });
      });

      await waitFor(() => {
        expect(result.current.isLoggingIn).toBe(true);
      });

      await act(async () => {
        resolveLogin!(mockAuthResponse);
      });

      await waitFor(() => {
        expect(result.current.isLoggingIn).toBe(false);
      });
    });

    it("should load user permissions after successful login", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.login).mockResolvedValue(mockAuthResponse);
      const mockPermissions = ["products:read", "products:write"];
      vi.mocked(permissionsService.getMyPermissions).mockResolvedValue({
        permissions: mockPermissions,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.login({
          email: "test@example.com",
          password: "password",
        });
      });

      await waitFor(() => {
        expect(permissionsService.getMyPermissions).toHaveBeenCalled();
        const state = useAuthStore.getState();
        expect(state.user?.permissions).toEqual(mockPermissions);
      });
    });

    it("should handle permission loading failure gracefully", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.login).mockResolvedValue(mockAuthResponse);
      vi.mocked(permissionsService.getMyPermissions).mockRejectedValue(
        new Error("Permission fetch failed"),
      );

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.login({
          email: "test@example.com",
          password: "password",
        });
      });

      await waitFor(() => {
        expect(permissionsService.getMyPermissions).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to load permissions:",
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });

    it("should show error toast with error message on login failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.login).mockRejectedValue(
        new Error("Invalid credentials"),
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.login({ email: "test@example.com", password: "wrong" });
      });

      await waitFor(() => {
        // getErrorMessage maps "Invalid credentials" to Spanish
        expect(toast.error).toHaveBeenCalledWith(
          "El correo o la contrasena son incorrectos. Por favor verifica tus datos.",
        );
      });
    });

    it("should show default error toast when login error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.login).mockRejectedValue(new Error(""));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.login({ email: "test@example.com", password: "wrong" });
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "El correo o la contrasena son incorrectos",
        );
      });
    });
  });

  describe("register mutation", () => {
    it("should call authService.register with user data", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.register).mockResolvedValue({
        message: "Success",
        user: {
          email: "new@example.com",
          firstName: "Jane",
          lastName: "Smith",
        },
        tenant: { name: "Test Tenant" },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const userData = {
        email: "new@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Smith",
      };

      await act(async () => {
        result.current.register(userData);
      });

      await waitFor(() => {
        expect(authService.register).toHaveBeenCalledWith(userData);
      });
    });

    it("should navigate to login on successful registration", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.register).mockResolvedValue({
        message: "Success",
        user: {
          email: "new@example.com",
          firstName: "Jane",
          lastName: "Smith",
        },
        tenant: { name: "Test Tenant" },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.register({
          email: "new@example.com",
          password: "password123",
          firstName: "Jane",
          lastName: "Smith",
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });

    it("should set isRegistering during registration", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      let resolveRegister: () => void;
      const mockRegisterResponse = {
        message: "Success",
        user: {
          email: "new@example.com",
          firstName: "Jane",
          lastName: "Smith",
        },
        tenant: { name: "Test Tenant" },
      };
      const registerPromise = new Promise<typeof mockRegisterResponse>(
        (resolve) => {
          resolveRegister = () => resolve(mockRegisterResponse);
        },
      );
      vi.mocked(authService.register).mockReturnValue(registerPromise);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.register({
          email: "new@example.com",
          password: "password123",
          firstName: "Jane",
          lastName: "Smith",
        });
      });

      await waitFor(() => {
        expect(result.current.isRegistering).toBe(true);
      });

      await act(async () => {
        resolveRegister!();
      });

      await waitFor(() => {
        expect(result.current.isRegistering).toBe(false);
      });
    });

    it("should show error toast with error message on registration failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.register).mockRejectedValue(
        new Error("A user with this email already exists"),
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.register({
          email: "existing@example.com",
          password: "password123",
          firstName: "Jane",
          lastName: "Smith",
        });
      });

      await waitFor(() => {
        // getErrorMessage maps "user with this email already exists" to Spanish
        expect(toast.error).toHaveBeenCalledWith(
          "Ya existe una cuenta con este correo electronico. Intenta iniciar sesion o usa otro correo.",
        );
      });
    });

    it("should show default error toast when register error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.register).mockRejectedValue(new Error(""));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.register({
          email: "new@example.com",
          password: "password123",
          firstName: "Jane",
          lastName: "Smith",
        });
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "No se pudo completar el registro. Intenta de nuevo.",
        );
      });
    });
  });

  describe("logout mutation", () => {
    it("should call authService.logout", async () => {
      vi.mocked(getAccessToken).mockReturnValue("mock-token");
      vi.mocked(authService.getMe).mockResolvedValue(mockAuthResponse);
      vi.mocked(authService.logout).mockResolvedValue();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.logout();
      });

      await waitFor(() => {
        expect(authService.logout).toHaveBeenCalled();
      });
    });

    it("should navigate to login on logout", async () => {
      vi.mocked(getAccessToken).mockReturnValue("mock-token");
      vi.mocked(authService.getMe).mockResolvedValue(mockAuthResponse);
      vi.mocked(authService.logout).mockResolvedValue();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.logout();
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/");
      });
    });

    it("should clear auth store on logout", async () => {
      vi.mocked(getAccessToken).mockReturnValue("mock-token");
      vi.mocked(authService.getMe).mockResolvedValue(mockAuthResponse);
      vi.mocked(authService.logout).mockResolvedValue();

      // Set up authenticated state
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setTenant(mockTenant);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.logout();
      });

      await waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
      });
    });
  });

  describe("forgotPassword mutation", () => {
    it("should call authService.forgotPassword with email", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.forgotPassword).mockResolvedValue({
        message: "Email sent",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.forgotPassword("forgot@example.com");
      });

      await waitFor(() => {
        expect(authService.forgotPassword).toHaveBeenCalledWith(
          "forgot@example.com",
        );
      });
    });

    it("should show error toast with error message on failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.forgotPassword).mockRejectedValue(
        new Error("User not found"),
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.forgotPassword("notfound@example.com");
      });

      await waitFor(() => {
        // getErrorMessage maps "not found" to Spanish
        expect(toast.error).toHaveBeenCalledWith(
          "No se encontro el recurso solicitado.",
        );
      });
    });

    it("should show default error toast when error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.forgotPassword).mockRejectedValue(new Error(""));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.forgotPassword("test@example.com");
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "No se pudo enviar el correo. Intenta de nuevo.",
        );
      });
    });
  });

  describe("resetPassword mutation", () => {
    it("should call authService.resetPassword with token and password", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.resetPassword).mockResolvedValue({
        message: "Password reset",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.resetPassword({
          token: "reset-token",
          password: "newPassword",
        });
      });

      await waitFor(() => {
        expect(authService.resetPassword).toHaveBeenCalledWith(
          "reset-token",
          "newPassword",
        );
      });
    });

    it("should navigate to login on successful reset", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.resetPassword).mockResolvedValue({
        message: "Password reset",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.resetPassword({
          token: "reset-token",
          password: "newPassword",
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });

    it("should show error toast with error message on reset failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.resetPassword).mockRejectedValue(
        new Error("Verification token expired"),
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.resetPassword({
          token: "invalid-token",
          password: "newPassword",
        });
      });

      await waitFor(() => {
        // getErrorMessage maps "verification.*token.*expired" to Spanish
        expect(toast.error).toHaveBeenCalledWith(
          "El enlace de verificacion ha expirado. Solicita uno nuevo.",
        );
      });
    });

    it("should show default error toast when reset error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.resetPassword).mockRejectedValue(new Error(""));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.resetPassword({
          token: "token",
          password: "newPassword",
        });
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "No se pudo restablecer la contrasena. Intenta de nuevo.",
        );
      });
    });
  });

  describe("authenticated user query", () => {
    it("should return user data when authenticated", async () => {
      vi.mocked(getAccessToken).mockReturnValue("mock-token");
      vi.mocked(authService.getMe).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tenant).toEqual(mockTenant);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should return null user when token exists but request fails", async () => {
      vi.mocked(getAccessToken).mockReturnValue("mock-token");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should return null user when no token exists", async () => {
      vi.mocked(getAccessToken).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Query should be disabled immediately, no loading state
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("verifyEmail mutation", () => {
    it("should call authService.verifyEmail with token", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.verifyEmail).mockResolvedValue({
        message: "Email verified",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.verifyEmail("verify-token");
      });

      await waitFor(() => {
        expect(authService.verifyEmail).toHaveBeenCalledWith("verify-token");
      });
    });

    it("should show success toast on successful verification", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.verifyEmail).mockResolvedValue({
        message: "Email verified",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.verifyEmail("verify-token");
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Tu correo ha sido verificado correctamente",
        );
      });
    });

    it("should show error toast with error message on failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.verifyEmail).mockRejectedValue(
        new Error("Invalid verification token"),
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.verifyEmail("invalid-token");
      });

      await waitFor(() => {
        // getErrorMessage maps "invalid.*verification.*token" to Spanish
        expect(toast.error).toHaveBeenCalledWith(
          "El enlace de verificacion no es valido o ya fue utilizado. Solicita uno nuevo.",
        );
      });
    });

    it("should show default error toast when error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.verifyEmail).mockRejectedValue(new Error(""));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.verifyEmail("token");
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "No se pudo verificar tu correo. Solicita un nuevo enlace.",
        );
      });
    });

    it("should set isVerifyingEmail during verification", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      let resolveVerify: () => void;
      const verifyPromise = new Promise<{ message: string }>((resolve) => {
        resolveVerify = () => resolve({ message: "Email verified" });
      });
      vi.mocked(authService.verifyEmail).mockReturnValue(verifyPromise);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.verifyEmail("verify-token");
      });

      await waitFor(() => {
        expect(result.current.isVerifyingEmail).toBe(true);
      });

      await act(async () => {
        resolveVerify!();
      });

      await waitFor(() => {
        expect(result.current.isVerifyingEmail).toBe(false);
      });
    });
  });

  describe("resendVerification mutation", () => {
    it("should call authService.resendVerification with email", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.resendVerification).mockResolvedValue({
        message: "Verification email sent",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.resendVerification("resend@example.com");
      });

      await waitFor(() => {
        expect(authService.resendVerification).toHaveBeenCalledWith(
          "resend@example.com",
        );
      });
    });

    it("should show success toast on successful resend", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.resendVerification).mockResolvedValue({
        message: "Verification email sent",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.resendVerification("resend@example.com");
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Te hemos enviado un nuevo correo de verificacion. Revisa tu bandeja de entrada.",
        );
      });
    });

    it("should show error toast with error message on failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.resendVerification).mockRejectedValue(
        new Error("Too many requests"),
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.resendVerification("test@example.com");
      });

      await waitFor(() => {
        // getErrorMessage maps "too many requests" to Spanish
        expect(toast.error).toHaveBeenCalledWith(
          "Has realizado demasiados intentos. Espera unos minutos antes de intentar de nuevo.",
        );
      });
    });

    it("should show default error toast when error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.resendVerification).mockRejectedValue(
        new Error(""),
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.resendVerification("test@example.com");
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "No se pudo enviar el correo de verificacion. Intenta de nuevo.",
        );
      });
    });

    it("should set isResendingVerification during resend", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      let resolveResend: () => void;
      const resendPromise = new Promise<{ message: string }>((resolve) => {
        resolveResend = () => resolve({ message: "Sent" });
      });
      vi.mocked(authService.resendVerification).mockReturnValue(resendPromise);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.resendVerification("test@example.com");
      });

      await waitFor(() => {
        expect(result.current.isResendingVerification).toBe(true);
      });

      await act(async () => {
        resolveResend!();
      });

      await waitFor(() => {
        expect(result.current.isResendingVerification).toBe(false);
      });
    });
  });

  describe("acceptInvitation mutation", () => {
    const mockAcceptData = {
      token: "invitation-token",
      password: "newPassword123",
      firstName: "Jane",
      lastName: "Doe",
    };

    it("should call authService.acceptInvitation with data", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.acceptInvitation).mockResolvedValue(
        mockAuthResponse,
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.acceptInvitation(mockAcceptData);
      });

      await waitFor(() => {
        expect(authService.acceptInvitation).toHaveBeenCalledWith(
          mockAcceptData,
        );
      });
    });

    it("should navigate to dashboard on successful acceptance", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.acceptInvitation).mockResolvedValue(
        mockAuthResponse,
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.acceptInvitation(mockAcceptData);
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("should update auth store on successful acceptance", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.acceptInvitation).mockResolvedValue(
        mockAuthResponse,
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.acceptInvitation(mockAcceptData);
      });

      await waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.user).toEqual(mockUser);
        expect(state.tenant).toEqual(mockTenant);
      });
    });

    it("should show success toast with tenant name on acceptance", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.acceptInvitation).mockResolvedValue(
        mockAuthResponse,
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.acceptInvitation(mockAcceptData);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          `Bienvenido a ${mockTenant.name}, ${mockUser.firstName}!`,
        );
      });
    });

    it("should show error toast with error message on failure", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.acceptInvitation).mockRejectedValue(
        new Error("Invitation expired"),
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.acceptInvitation(mockAcceptData);
      });

      await waitFor(() => {
        // getErrorMessage maps "invitation.*expired" to Spanish
        expect(toast.error).toHaveBeenCalledWith(
          "Esta invitacion ha expirado. Solicita una nueva invitacion al administrador.",
        );
      });
    });

    it("should show default error toast when error has no message", async () => {
      const { toast } = await import("~/components/ui/Toast");
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      vi.mocked(authService.acceptInvitation).mockRejectedValue(new Error(""));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.acceptInvitation(mockAcceptData);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "No se pudo aceptar la invitacion. Intenta de nuevo.",
        );
      });
    });

    it("should set isAcceptingInvitation during acceptance", async () => {
      vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));
      let resolveAccept: () => void;
      const acceptPromise = new Promise<typeof mockAuthResponse>((resolve) => {
        resolveAccept = () => resolve(mockAuthResponse);
      });
      vi.mocked(authService.acceptInvitation).mockReturnValue(acceptPromise);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.acceptInvitation(mockAcceptData);
      });

      await waitFor(() => {
        expect(result.current.isAcceptingInvitation).toBe(true);
      });

      await act(async () => {
        resolveAccept!();
      });

      await waitFor(() => {
        expect(result.current.isAcceptingInvitation).toBe(false);
      });
    });
  });
});

describe("useInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockInvitationData: InvitationDetails = {
    email: "invitee@example.com",
    tenantName: "Test Company",
    invitedByName: "Admin User",
    role: "EMPLOYEE",
    expiresAt: new Date().toISOString(),
  };

  it("should fetch invitation when token is provided", async () => {
    vi.mocked(authService.getInvitation).mockResolvedValue(mockInvitationData);

    const { result } = renderHook(() => useInvitation("valid-token"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(authService.getInvitation).toHaveBeenCalledWith("valid-token");
    expect(result.current.data).toEqual(mockInvitationData);
  });

  it("should not fetch when token is null", () => {
    const { result } = renderHook(() => useInvitation(null), {
      wrapper: createWrapper(),
    });

    expect(authService.getInvitation).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it("should return error when invitation fetch fails", async () => {
    vi.mocked(authService.getInvitation).mockRejectedValue(
      new Error("Invitation not found"),
    );

    const { result } = renderHook(() => useInvitation("invalid-token"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it("should return loading state while fetching", async () => {
    let resolveInvitation: () => void;
    const invitationPromise = new Promise<typeof mockInvitationData>(
      (resolve) => {
        resolveInvitation = () => resolve(mockInvitationData);
      },
    );
    vi.mocked(authService.getInvitation).mockReturnValue(invitationPromise);

    const { result } = renderHook(() => useInvitation("valid-token"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveInvitation!();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
