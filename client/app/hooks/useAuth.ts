import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authService } from '~/services/auth.service';
import { useAuthStore } from '~/stores/auth.store';
import { queryKeys } from '~/lib/query-client';
import { getAccessToken } from '~/lib/api';
import { getErrorMessage } from '~/lib/error-messages';
import { toast } from '~/components/ui/Toast';
import type { LoginCredentials, RegisterData, AcceptInvitationData } from '~/services/auth.service';

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
      toast.error(getErrorMessage(error, 'El correo o la contrasena son incorrectos'));
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData: RegisterData) => authService.register(userData),
    onSuccess: () => {
      // Registration successful - prompt user to verify email
      toast.success(
        `Registro exitoso! Te hemos enviado un correo de verificacion. Por favor verifica tu email antes de iniciar sesion.`
      );
      navigate('/login');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'No se pudo completar el registro. Intenta de nuevo.'));
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
      toast.success('Se ha enviado un correo con instrucciones para restablecer tu contrasena');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'No se pudo enviar el correo. Intenta de nuevo.'));
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.resetPassword(token, password),
    onSuccess: () => {
      toast.success('Tu contrasena ha sido actualizada. Ya puedes iniciar sesion.');
      navigate('/login');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'No se pudo restablecer la contrasena. Intenta de nuevo.'));
    },
  });

  // Verify email mutation
  const verifyEmailMutation = useMutation({
    mutationFn: (token: string) => authService.verifyEmail(token),
    onSuccess: () => {
      toast.success('Tu correo ha sido verificado correctamente');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'No se pudo verificar tu correo. Solicita un nuevo enlace.'));
    },
  });

  // Resend verification email mutation
  const resendVerificationMutation = useMutation({
    mutationFn: (email: string) => authService.resendVerification(email),
    onSuccess: () => {
      toast.success('Te hemos enviado un nuevo correo de verificacion. Revisa tu bandeja de entrada.');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'No se pudo enviar el correo de verificacion. Intenta de nuevo.'));
    },
  });

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: (data: AcceptInvitationData) => authService.acceptInvitation(data),
    onSuccess: (data) => {
      setUser(data.user);
      setTenant(data.tenant);
      queryClient.setQueryData(queryKeys.auth.me(), data);
      toast.success(`Bienvenido a ${data.tenant.name}, ${data.user.firstName}!`);
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'No se pudo aceptar la invitacion. Intenta de nuevo.'));
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

    acceptInvitation: acceptInvitationMutation.mutate,
    isAcceptingInvitation: acceptInvitationMutation.isPending,
  };
}

/**
 * Hook to fetch invitation details by token
 */
export function useInvitation(token: string | null) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: () => authService.getInvitation(token!),
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
