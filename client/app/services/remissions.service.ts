import { api } from "~/lib/api";
import type { Remission, CreateRemissionData } from "~/types/remission";

interface RemissionsParams {
  status?: string;
  customerId?: string;
  warehouseId?: string;
  search?: string;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}

export const remissionsService = {
  getAll: (params?: RemissionsParams) =>
    api
      .get<{
        data: Remission[];
        total: number;
        page: number;
        limit: number;
      }>("/remissions", { params })
      .then((r) => r.data),

  getOne: (id: string) =>
    api.get<Remission>(`/remissions/${id}`).then((r) => r.data),

  getStats: () =>
    api
      .get<Record<string, number>>("/remissions/stats")
      .then((r) => r.data),

  create: (data: CreateRemissionData) =>
    api.post<Remission>("/remissions", data).then((r) => r.data),

  createFromInvoice: (invoiceId: string) =>
    api
      .post<Remission>(`/remissions/from-invoice/${invoiceId}`)
      .then((r) => r.data),

  update: (id: string, data: Partial<CreateRemissionData>) =>
    api.patch<Remission>(`/remissions/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/remissions/${id}`).then((r) => r.data),

  dispatch: (id: string) =>
    api
      .patch<Remission>(`/remissions/${id}/dispatch`)
      .then((r) => r.data),

  deliver: (id: string) =>
    api
      .patch<Remission>(`/remissions/${id}/deliver`)
      .then((r) => r.data),

  cancel: (id: string) =>
    api
      .patch<Remission>(`/remissions/${id}/cancel`)
      .then((r) => r.data),
};
