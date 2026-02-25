import { api } from "~/lib/api";
import type {
  SupportDocument,
  CreateSupportDocumentData,
} from "~/types/support-document";

interface SupportDocumentsParams {
  status?: string;
  supplierId?: string;
  search?: string;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}

export const supportDocumentsService = {
  getAll: (params?: SupportDocumentsParams) =>
    api
      .get<{
        data: SupportDocument[];
        total: number;
        page: number;
        limit: number;
      }>("/support-documents", { params })
      .then((r) => r.data),

  getOne: (id: string) =>
    api
      .get<SupportDocument>(`/support-documents/${id}`)
      .then((r) => r.data),

  getStats: () =>
    api
      .get<Record<string, number>>("/support-documents/stats")
      .then((r) => r.data),

  create: (data: CreateSupportDocumentData) =>
    api
      .post<SupportDocument>("/support-documents", data)
      .then((r) => r.data),

  update: (id: string, data: Partial<CreateSupportDocumentData>) =>
    api
      .patch<SupportDocument>(`/support-documents/${id}`, data)
      .then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/support-documents/${id}`).then((r) => r.data),

  generate: (id: string) =>
    api
      .patch<SupportDocument>(`/support-documents/${id}/generate`)
      .then((r) => r.data),
};
