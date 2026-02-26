import { api } from "~/lib/api";
import type {
  RecurringInvoice,
  RecurringInvoicesResponse,
  CreateRecurringInvoiceData,
} from "~/types/recurring-invoice";

export const recurringInvoicesService = {
  async getAll(
    page = 1,
    limit = 20,
  ): Promise<RecurringInvoicesResponse> {
    const { data } = await api.get<RecurringInvoicesResponse>(
      `/recurring-invoices?page=${page}&limit=${limit}`,
    );
    return data;
  },

  async getById(id: string): Promise<RecurringInvoice> {
    const { data } = await api.get<RecurringInvoice>(
      `/recurring-invoices/${id}`,
    );
    return data;
  },

  async create(
    dto: CreateRecurringInvoiceData,
  ): Promise<RecurringInvoice> {
    const { data } = await api.post<RecurringInvoice>(
      "/recurring-invoices",
      dto,
    );
    return data;
  },

  async update(
    id: string,
    dto: Partial<CreateRecurringInvoiceData>,
  ): Promise<RecurringInvoice> {
    const { data } = await api.patch<RecurringInvoice>(
      `/recurring-invoices/${id}`,
      dto,
    );
    return data;
  },

  async toggle(id: string): Promise<RecurringInvoice> {
    const { data } = await api.patch<RecurringInvoice>(
      `/recurring-invoices/${id}/toggle`,
    );
    return data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(
      `/recurring-invoices/${id}`,
    );
    return data;
  },
};
