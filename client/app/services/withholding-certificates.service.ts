import { api } from "~/lib/api";
import type {
  WithholdingCertificate,
  GenerateCertificateData,
  CertificateStats,
} from "~/types/withholding-certificate";

interface CertificateParams {
  year?: number;
  supplierId?: string;
  withholdingType?: string;
}

export const withholdingCertificatesService = {
  getAll: (params?: CertificateParams | Record<string, unknown>) =>
    api
      .get<WithholdingCertificate[]>("/withholding-certificates", { params })
      .then((r) => r.data),

  getOne: (id: string) =>
    api
      .get<WithholdingCertificate>(`/withholding-certificates/${id}`)
      .then((r) => r.data),

  getStats: (year: number) =>
    api
      .get<CertificateStats>("/withholding-certificates/stats", {
        params: { year },
      })
      .then((r) => r.data),

  generate: (data: GenerateCertificateData | Record<string, unknown>) =>
    api
      .post<WithholdingCertificate>(
        "/withholding-certificates/generate",
        data,
      )
      .then((r) => r.data),

  generateAll: (params: Record<string, unknown>) =>
    api
      .post<{ generated: number }>(
        "/withholding-certificates/generate-all",
        params,
      )
      .then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/withholding-certificates/${id}`).then((r) => r.data),
};
