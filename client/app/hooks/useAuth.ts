import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authService } from '~/services/auth.service';
import { useAuthStore } from '~/stores/auth.store';
import { queryKeys } from '~/lib/query-client';
import { getAccessToken } from '~/lib/api';
import { toast } from '~/components/ui/Toast';
import type { LoginCredentials, RegisterData, RegisterResponse } from '~/services/auth.service';

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser, setTenant, logout: clearAuth } = useAuthStore();

  // Get current user - only fetch if access token exists to prevent unnecessary 401 errors
  const {
    data: authData,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: authService.getMe,
    enabled: !!getAccessToken(),
    retry: false,
    staleTime: Infinity,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      authService.login(credentials),
    onSuccess: (data) => {
      setUser(data.user);
      setTenant(data.tenant);
      queryClient.setQueryData(queryKeys.auth.me(), data);
      toast.success(`Bienvenido, ${data.user.firstName}!`);
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Credenciales invalidas');
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData: RegisterData) => authService.register(userData),
    onSuccess: (data: RegisterResponse) => {
      // Registration successful - prompt user to verify email
      toast.success(
        `Registro exitoso! Te hemos enviado un correo de verificacion. Por favor verifica tu email antes de iniciar sesion.`
      );
      navigate('/login');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al registrarse');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      navigate('/login');
      toast.success('Sesion cerrada');
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: () => {
      toast.success('Se ha enviado un correo con instrucciones');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al enviar correo');
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.resetPassword(token, password),
    onSuccess: () => {
      toast.success('Contrasena actualizada correctamente');
      navigate('/login');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al restablecer contrasena');
    },
  });

  // Verify email mutation
  const verifyEmailMutation = useMutation({
    mutationFn: (token: string) => authService.verifyEmail(token),
    onSuccess: () => {
      toast.success('Email verificado correctamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al verificar email');
    },
  });

  // Resend verification email mutation
  const resendVerificationMutation = useMutation({
    mutationFn: (email: string) => authService.resendVerification(email),
    onSuccess: () => {
      toast.success('Correo de verificacion enviado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al enviar correo de verificacion');
    },
  });

  return {
    user: authData?.user ?? null,
    tenant: authData?.tenant ?? null,
    isLoading,
    isAuthenticated: !!authData?.user,
    error,

    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,

    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,

    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,

    forgotPassword: forgotPasswordMutation.mutate,
    isSendingReset: forgotPasswordMutation.isPending,

    resetPassword: resetPasswordMutation.mutate,
    isResettingPassword: resetPasswordMutation.isPending,

    verifyEmail: verifyEmailMutation.mutate,
    isVerifyingEmail: verifyEmailMutation.isPending,

    resendVerification: resendVerificationMutation.mutate,
    isResendingVerification: resendVerificationMutation.isPending,
  };
}
