import { api } from "~/lib/api";
import type {
  Quotation,
  QuotationFilters,
  QuotationsResponse,
  CreateQuotationData,
  UpdateQuotationData,
  QuotationStats,
} from "~/types/quotation";

export const quotationsService = {
  async getQuotations(
    filters: QuotationFilters = {},
  ): Promise<QuotationsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<QuotationsResponse>(
      `/quotations?${params.toString()}`,
    );
    return data;
  },

  async getQuotation(id: string): Promise<Quotation> {
    const { data } = await api.get<Quotation>(`/quotations/${id}`);
    return data;
  },

  async createQuotation(
    quotationData: CreateQuotationData,
  ): Promise<Quotation> {
    const { data } = await api.post<Quotation>("/quotations", quotationData);
    return data;
  },

  async updateQuotation(
    id: string,
    quotationData: UpdateQuotationData,
  ): Promise<Quotation> {
    const { data } = await api.patch<Quotation>(
      `/quotations/${id}`,
      quotationData,
    );
    return data;
  },

  async deleteQuotation(id: string): Promise<void> {
    await api.delete(`/quotations/${id}`);
  },

  async sendQuotation(id: string): Promise<Quotation> {
    const { data } = await api.patch<Quotation>(`/quotations/${id}/send`);
    return data;
  },

  async acceptQuotation(id: string): Promise<Quotation> {
    const { data } = await api.patch<Quotation>(`/quotations/${id}/accept`);
    return data;
  },

  async rejectQuotation(id: string): Promise<Quotation> {
    const { data } = await api.patch<Quotation>(`/quotations/${id}/reject`);
    return data;
  },

  async convertToInvoice(id: string): Promise<Quotation> {
    const { data } = await api.post<Quotation>(`/quotations/${id}/convert`);
    return data;
  },

  async getQuotationStats(): Promise<QuotationStats> {
    const { data } = await api.get<QuotationStats>("/quotations/stats");
    return data;
  },
};
