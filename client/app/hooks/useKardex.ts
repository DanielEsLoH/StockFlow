import { useQuery } from "@tanstack/react-query";
import { kardexService } from "~/services/kardex.service";
import { queryKeys } from "~/lib/query-client";
import { useIsQueryEnabled } from "./useIsQueryEnabled";

// ============================================================================
// QUERIES
// ============================================================================

export function useKardex(
  productId: string,
  warehouseId?: string,
  fromDate?: string,
  toDate?: string,
) {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: queryKeys.kardex.byProduct(productId, {
      warehouseId,
      fromDate,
      toDate,
    } as Record<string, unknown>),
    queryFn: () =>
      kardexService.getKardex(productId, warehouseId, fromDate, toDate),
    staleTime: 1000 * 60 * 2,
    enabled: enabled && !!productId,
  });
}
