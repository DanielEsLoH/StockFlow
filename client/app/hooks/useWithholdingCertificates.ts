import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { withholdingCertificatesService } from "~/services/withholding-certificates.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";

// ============================================================================
// QUERIES
// ============================================================================

export function useWithholdingCertificates(
  params: Record<string, unknown> = {},
) {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: queryKeys.withholdingCertificates.list(params),
    queryFn: () => withholdingCertificatesService.getAll(params),
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useWithholdingCertificate(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: queryKeys.withholdingCertificates.detail(id),
    queryFn: () => withholdingCertificatesService.getOne(id),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && !!id,
  });
}

export function useCertificateStats(year?: number) {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: queryKeys.withholdingCertificates.stats(year),
    queryFn: () => withholdingCertificatesService.getStats(year!),
    staleTime: 1000 * 60 * 2,
    enabled: enabled && year != null,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useGenerateCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      withholdingCertificatesService.generate(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.withholdingCertificates.all,
      });
      toast.success("Certificado de retencion generado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Error al generar el certificado de retencion",
      );
    },
  });
}

export function useGenerateAllCertificates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Record<string, unknown>) =>
      withholdingCertificatesService.generateAll(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.withholdingCertificates.all,
      });
      toast.success("Certificados de retencion generados exitosamente");
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Error al generar los certificados de retencion",
      );
    },
  });
}

export function useDeleteCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => withholdingCertificatesService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.withholdingCertificates.all,
      });
      toast.success("Certificado de retencion eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Error al eliminar el certificado de retencion",
      );
    },
  });
}
