import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getDianConfig,
  createDianConfig,
  updateDianConfig,
  setSoftwareCredentials,
  setResolution,
  uploadCertificate,
  sendInvoice,
  checkDocumentStatus,
  listDianDocuments,
  getDianDocument,
  downloadDianXml,
  getDianStats,
  createCreditNote,
  createDebitNote,
  setNoteConfig,
  type ListDocumentsParams,
} from "~/services/dian.service";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  CreateDianConfigDto,
  UpdateDianConfigDto,
  SetDianSoftwareDto,
  SetDianResolutionDto,
  SendInvoiceDto,
  CheckDocumentStatusDto,
  GenerateCreditNoteDto,
  GenerateDebitNoteDto,
  SetNoteConfigDto,
} from "~/types/dian";

// Query Keys
export const dianKeys = {
  all: ["dian"] as const,
  config: () => [...dianKeys.all, "config"] as const,
  stats: () => [...dianKeys.all, "stats"] as const,
  documents: () => [...dianKeys.all, "documents"] as const,
  documentList: (params: ListDocumentsParams) =>
    [...dianKeys.documents(), "list", params] as const,
  documentDetail: (id: string) =>
    [...dianKeys.documents(), "detail", id] as const,
};

// Configuration Hooks
export function useDianConfig() {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: dianKeys.config(),
    queryFn: getDianConfig,
    enabled,
  });
}

export function useCreateDianConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDianConfigDto) => createDianConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dianKeys.config() });
      toast.success("Configuracion DIAN creada");
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useUpdateDianConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateDianConfigDto) => updateDianConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dianKeys.config() });
      toast.success("Configuracion DIAN actualizada");
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useSetSoftwareCredentials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetDianSoftwareDto) => setSoftwareCredentials(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: dianKeys.config() });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useSetResolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetDianResolutionDto) => setResolution(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: dianKeys.config() });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useUploadCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, password }: { file: File; password: string }) =>
      uploadCertificate(file, password),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: dianKeys.config() });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

// Document Processing Hooks
export function useSendInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendInvoiceDto) => sendInvoice(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: dianKeys.documents() });
      queryClient.invalidateQueries({ queryKey: dianKeys.stats() });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
    },
    onError: (error: Error) => {
      toast.error(`Error al enviar factura: ${error.message}`);
    },
  });
}

export function useCheckDocumentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CheckDocumentStatusDto) => checkDocumentStatus(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: dianKeys.documents() });
      if (result.isValid) {
        toast.success("Documento aceptado por la DIAN");
      } else if (result.isValid === false) {
        toast.error("Documento rechazado por la DIAN");
      } else {
        toast.info(result.statusDescription || "Estado consultado");
      }
    },
    onError: (error: Error) => {
      toast.error(`Error al consultar estado: ${error.message}`);
    },
  });
}

// Credit/Debit Note Hooks
export function useCreateCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateCreditNoteDto) => createCreditNote(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: dianKeys.documents() });
      queryClient.invalidateQueries({ queryKey: dianKeys.stats() });
      if (result.success) {
        toast.success(result.message || "Nota credito creada exitosamente");
      } else {
        toast.warning(result.message);
      }
    },
    onError: (error: Error) => {
      toast.error(`Error al crear nota credito: ${error.message}`);
    },
  });
}

export function useCreateDebitNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateDebitNoteDto) => createDebitNote(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: dianKeys.documents() });
      queryClient.invalidateQueries({ queryKey: dianKeys.stats() });
      if (result.success) {
        toast.success(result.message || "Nota debito creada exitosamente");
      } else {
        toast.warning(result.message);
      }
    },
    onError: (error: Error) => {
      toast.error(`Error al crear nota debito: ${error.message}`);
    },
  });
}

export function useSetNoteConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetNoteConfigDto) => setNoteConfig(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: dianKeys.config() });
      toast.success(result.message || "Configuracion de notas actualizada");
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

// Document Listing Hooks
export function useDianDocuments(params: ListDocumentsParams = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: dianKeys.documentList(params),
    queryFn: () => listDianDocuments(params),
    enabled,
  });
}

export function useDianDocument(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: dianKeys.documentDetail(id),
    queryFn: () => getDianDocument(id),
    enabled: enabled && !!id,
  });
}

export function useDownloadDianXml() {
  return useMutation({
    mutationFn: async (id: string) => {
      const blob = await downloadDianXml(id);
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `documento_${id}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success("XML descargado");
    },
    onError: (error: Error) => {
      toast.error(`Error al descargar XML: ${error.message}`);
    },
  });
}

// Statistics Hook
export function useDianStats() {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: dianKeys.stats(),
    queryFn: getDianStats,
    enabled,
  });
}
