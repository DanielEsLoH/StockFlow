import { api } from "~/lib/api";
import type {
  Payment,
  PaymentFilters,
  PaymentsResponse,
  CreatePaymentData,
  UpdatePaymentData,
  PaymentStats,
  PaymentStatus,
} from "~/types/payment";

// Service - Real API calls
export const paymentsService = {
  // Get paginated payments with filters
  async getPayments(filters: PaymentFilters = {}): Promise<PaymentsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<PaymentsResponse>(
      `/payments?${params.toString()}`,
    );
    return data;
  },

  // Get single payment by ID
  async getPayment(id: string): Promise<Payment> {
    const { data } = await api.get<Payment>(`/payments/${id}`);
    return data;
  },

  // Get payments by invoice ID
  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    const { data } = await api.get<Payment[]>(`/payments/invoice/${invoiceId}`);
    return data;
  },

  // Get payments by customer ID
  async getPaymentsByCustomer(customerId: string): Promise<Payment[]> {
    const { data } = await api.get<Payment[]>(
      `/payments/customer/${customerId}`,
    );
    return data;
  },

  // Get recent payments for dashboard
  async getRecentPayments(limit: number = 5): Promise<Payment[]> {
    const { data } = await api.get<Payment[]>(
      `/payments/recent?limit=${limit}`,
    );
    return data;
  },

  // Create new payment
  async createPayment(paymentData: CreatePaymentData): Promise<Payment> {
    const { data } = await api.post<Payment>("/payments", paymentData);
    return data;
  },

  // Update payment (limited fields)
  async updatePayment(
    id: string,
    paymentData: UpdatePaymentData,
  ): Promise<Payment> {
    const { data } = await api.patch<Payment>(`/payments/${id}`, paymentData);
    return data;
  },

  // Update payment status only
  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
  ): Promise<Payment> {
    const { data } = await api.patch<Payment>(`/payments/${id}/status`, {
      status,
    });
    return data;
  },

  // Delete payment (only PENDING allowed)
  async deletePayment(id: string): Promise<void> {
    await api.delete(`/payments/${id}`);
  },

  // Process refund (partial or full)
  async refundPayment(id: string, amount?: number): Promise<Payment> {
    const { data } = await api.post<Payment>(`/payments/${id}/refund`, {
      amount,
    });
    return data;
  },

  // Get payment statistics
  async getPaymentStats(): Promise<PaymentStats> {
    const { data } = await api.get<PaymentStats>("/payments/stats");
    return data;
  },
};
