import { useMemo } from "react";
import { useSuppliers } from "./useSuppliers";

/**
 * Hook to get supplier options for select dropdowns
 * Eliminates duplication across purchase orders and other pages
 */
export function useSupplierOptions() {
  const { data: suppliersData } = useSuppliers({ limit: 100 });

  const supplierOptions = useMemo(
    () => [
      { value: "", label: "Todos los proveedores" },
      ...(suppliersData?.data || []).map((s) => ({
        value: s.id,
        label: s.name,
      })),
    ],
    [suppliersData],
  );

  return supplierOptions;
}
