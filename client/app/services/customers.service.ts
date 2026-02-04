import { api } from "~/lib/api";
import type {
  Customer,
  CustomerFilters,
  CustomersResponse,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerStats,
} from "~/types/customer";

// Service - Real API calls
export const customersService = {
  // Get paginated customers with filters
  async getCustomers(
    filters: CustomerFilters = {},
  ): Promise<CustomersResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<CustomersResponse>(
      `/customers?${params.toString()}`,
    );
    return data;
  },

  async getCustomer(id: string): Promise<Customer> {
    const { data } = await api.get<Customer>(`/customers/${id}`);
    return data;
  },

  async getCustomerStats(id: string): Promise<CustomerStats> {
    const { data } = await api.get<CustomerStats>(`/customers/${id}/stats`);
    return data;
  },

  // Search customers
  async searchCustomers(query: string): Promise<Customer[]> {
    const { data } = await api.get<Customer[]>(
      `/customers/search?q=${encodeURIComponent(query)}`,
    );
    return data;
  },

  async createCustomer(customerData: CreateCustomerData): Promise<Customer> {
    const { data } = await api.post<Customer>("/customers", customerData);
    return data;
  },

  async updateCustomer(
    id: string,
    customerData: UpdateCustomerData,
  ): Promise<Customer> {
    const { data } = await api.patch<Customer>(
      `/customers/${id}`,
      customerData,
    );
    return data;
  },

  async deleteCustomer(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  },

  // Get unique cities for filter dropdown
  async getCities(): Promise<string[]> {
    const { data } = await api.get<string[]>("/customers/cities");
    return data;
  },
};
