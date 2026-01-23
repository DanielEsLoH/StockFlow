import { useMemo } from 'react';
import { useCustomers } from './useCustomers';

/**
 * Hook to get customer options for select dropdowns
 * Eliminates duplication across invoices, payments, and other pages
 */
export function useCustomerOptions() {
  const { data: customersData } = useCustomers({ limit: 100 });

  const customerOptions = useMemo(
    () => [
      { value: '', label: 'Todos los clientes' },
      ...(customersData?.data || []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [customersData]
  );

  return customerOptions;
}