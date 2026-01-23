import { api } from '~/lib/api';
import type {
  Invoice,
  InvoiceFilters,
  InvoicesResponse,
  CreateInvoiceData,
  UpdateInvoiceData,
  CreateInvoiceItemData,
  UpdateInvoiceItemData,
  InvoiceStats,
  InvoiceStatus,
  InvoicePayment,
} from '~/types/invoice';

// Service - Real API calls
export const invoicesService = {
  // Get paginated invoices with filters
  async getInvoices(filters: InvoiceFilters = {}): Promise<InvoicesResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<InvoicesResponse>(`/invoices?${params.toString()}`);
    return data;
  },

  // Get single invoice by ID
  async getInvoice(id: string): Promise<Invoice> {
    const { data } = await api.get<Invoice>(`/invoices/${id}`);
    return data;
  },

  // Get invoices by customer ID
  async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    const { data } = await api.get<Invoice[]>(`/invoices?customerId=${customerId}`);
    return data;
  },

  // Get recent invoices for dashboard
  async getRecentInvoices(limit: number = 5): Promise<Invoice[]> {
    const { data } = await api.get<Invoice[]>(`/invoices?limit=${limit}&sortBy=createdAt&sortOrder=desc`);
    return data;
  },

  // Create new invoice
  async createInvoice(invoiceData: CreateInvoiceData): Promise<Invoice> {
    const { data } = await api.post<Invoice>('/invoices', invoiceData);
    return data;
  },

  // Update invoice
  async updateInvoice(id: string, invoiceData: UpdateInvoiceData): Promise<Invoice> {
    const { data } = await api.patch<Invoice>(`/invoices/${id}`, invoiceData);
    return data;
  },

  // Update invoice status only
  async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const { data } = await api.patch<Invoice>(`/invoices/${id}`, { status });
    return data;
  },

  // Send invoice
  async sendInvoice(id: string): Promise<Invoice> {
    const { data } = await api.patch<Invoice>(`/invoices/${id}/send`);
    return data;
  },

  // Cancel invoice
  async cancelInvoice(id: string): Promise<Invoice> {
    const { data } = await api.patch<Invoice>(`/invoices/${id}/cancel`);
    return data;
  },

  // Delete invoice
  async deleteInvoice(id: string): Promise<void> {
    await api.delete(`/invoices/${id}`);
  },

  // Add line item to invoice
  async addInvoiceItem(invoiceId: string, item: CreateInvoiceItemData): Promise<Invoice> {
    const { data } = await api.post<Invoice>(`/invoices/${invoiceId}/items`, item);
    return data;
  },

  // Update line item
  async updateInvoiceItem(
    invoiceId: string,
    itemId: string,
    itemData: UpdateInvoiceItemData
  ): Promise<Invoice> {
    const { data } = await api.patch<Invoice>(`/invoices/${invoiceId}/items/${itemId}`, itemData);
    return data;
  },

  // Remove line item
  async removeInvoiceItem(invoiceId: string, itemId: string): Promise<Invoice> {
    const { data } = await api.delete<Invoice>(`/invoices/${invoiceId}/items/${itemId}`);
    return data;
  },

  // Get invoice statistics
  async getInvoiceStats(): Promise<InvoiceStats> {
    const { data } = await api.get<InvoiceStats>('/invoices/stats');
    return data;
  },

  // Get invoice payments
  async getInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
    const { data } = await api.get<InvoicePayment[]>(`/invoices/${invoiceId}/payments`);
    return data;
  },
};