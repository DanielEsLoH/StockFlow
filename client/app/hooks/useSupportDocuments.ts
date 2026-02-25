import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supportDocumentsService } from "~/services/support-documents.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  SupportDocument,
  CreateSupportDocumentData,
} from "~/types/support-document";

// ============================================================================
// QUERIES
// ============================================================================

export function useSupportDocuments(params: Record<string, unknown> = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery<{
    data: SupportDocument[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: queryKeys.supportDocuments.list(params),
    queryFn: () =>
      supportDocumentsService.getAll(
        params as Parameters<typeof supportDocumentsService.getAll>[0],
      ),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useSupportDocument(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<SupportDocument>({
    queryKey: queryKeys.supportDocuments.detail(id),
    queryFn: () => supportDocumentsService.getOne(id),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && !!id,
  });
}

export function useSupportDocumentStats() {
  const enabled = useIsQueryEnabled();
  return useQuery<Record<string, number>>({
    queryKey: queryKeys.supportDocuments.stats(),
    queryFn: () => supportDocumentsService.getStats(),
    staleTime: 1000 * 60 * 2,
    enabled,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCreateSupportDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupportDocumentData) =>
      supportDocumentsService.create(data),
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supportDocuments.all,
      });
      toast.success(
        `Documento soporte "${doc.documentNumber}" creado exitosamente`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear el documento soporte");
    },
  });
}

export function useUpdateSupportDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateSupportDocumentData>;
    }) => supportDocumentsService.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supportDocuments.all,
      });
      toast.success("Documento soporte actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Error al actualizar el documento soporte",
      );
    },
  });
}

export function useDeleteSupportDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supportDocumentsService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supportDocuments.all,
      });
      toast.success("Documento soporte eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Error al eliminar el documento soporte",
      );
    },
  });
}

export function useGenerateSupportDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supportDocumentsService.generate(id),
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supportDocuments.all,
      });
      toast.success(
        `Documento soporte "${doc.documentNumber}" generado exitosamente`,
      );
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Error al generar el documento soporte",
      );
    },
  });
}
