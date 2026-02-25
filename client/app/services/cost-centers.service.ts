import { api } from "~/lib/api";
import type {
  CostCenter,
  CreateCostCenterData,
  UpdateCostCenterData,
  CostCenterOption,
} from "~/types/cost-center";

export const costCentersService = {
  getAll: (search?: string) =>
    api
      .get<CostCenter[]>("/cost-centers", { params: { search } })
      .then((r) => r.data),

  getOptions: () =>
    api
      .get<CostCenterOption[]>("/cost-centers/options")
      .then((r) => r.data),

  getOne: (id: string) =>
    api.get<CostCenter>(`/cost-centers/${id}`).then((r) => r.data),

  create: (data: CreateCostCenterData) =>
    api.post<CostCenter>("/cost-centers", data).then((r) => r.data),

  update: (id: string, data: UpdateCostCenterData) =>
    api.patch<CostCenter>(`/cost-centers/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/cost-centers/${id}`).then((r) => r.data),
};
