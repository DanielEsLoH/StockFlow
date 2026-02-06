import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { customersService } from "~/services/customers.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  Customer,
  CustomerFilters,
  CustomersResponse,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerStats,
} from "~/types/customer";

// Customers list hook with filters
export function useCustomers(filters: CustomerFilters = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery<CustomersResponse>({
    queryKey: queryKeys.customers.list(filters as Record<string, unknown>),
    queryFn: () => customersService.getCustomers(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

// Single customer hook
export function useCustomer(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<Customer>({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customersService.getCustomer(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: enabled && !!id,
  });
}

// Customer stats hook
export function useCustomerStats(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<CustomerStats>({
    queryKey: [...queryKeys.customers.detail(id), "stats"],
    queryFn: () => customersService.getCustomerStats(id),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: enabled && !!id,
  });
}

// Cities for filter dropdown
export function useCustomerCities() {
  const enabled = useIsQueryEnabled();
  return useQuery<string[]>({
    queryKey: [...queryKeys.customers.all, "cities"],
    queryFn: () => customersService.getCities(),
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled,
  });
}

// Create customer mutation
export function useCreateCustomer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerData) =>
      customersService.createCustomer(data),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success(`Cliente "${customer.name}" creado exitosamente`);
      navigate("/customers");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear el cliente");
    },
  });
}

// Update customer mutation
export function useUpdateCustomer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerData }) =>
      customersService.updateCustomer(id, data),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.setQueryData(
        queryKeys.customers.detail(customer.id),
        customer,
      );
      toast.success(`Cliente "${customer.name}" actualizado exitosamente`);
      navigate(`/customers/${customer.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar el cliente");
    },
  });
}

// Delete customer mutation
export function useDeleteCustomer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customersService.deleteCustomer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success("Cliente eliminado exitosamente");
      navigate("/customers");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar el cliente");
    },
  });
}
