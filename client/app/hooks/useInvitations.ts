import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invitationsService, type CreateInvitationData } from '~/services/invitations.service';
import { queryKeys } from '~/lib/query-client';
import { toast } from '~/components/ui/Toast';

/**
 * Hook to fetch all invitations
 */
export function useInvitations() {
  return useQuery({
    queryKey: queryKeys.invitations.all,
    queryFn: invitationsService.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a new invitation
 */
export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvitationData) => invitationsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
      toast.success('Invitacion enviada correctamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al enviar la invitacion');
    },
  });
}

/**
 * Hook to cancel an invitation
 */
export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invitationsService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
      toast.success('Invitacion cancelada');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al cancelar la invitacion');
    },
  });
}

/**
 * Hook to resend an invitation
 */
export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invitationsService.resend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
      toast.success('Invitacion reenviada correctamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al reenviar la invitacion');
    },
  });
}
