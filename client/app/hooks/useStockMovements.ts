import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { stockMovementsService } from "~/services/stock-movements.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import type {
  StockMovement,
  StockMovementFilters,
  StockMovementsResponse,
  CreateStockAdjustmentData,
  CreateTransferData,
  TransferResponse,
} from "~/types/stock-movement";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Paginated stock movements list with filters
 */
export function useStockMovements(filters: StockMovementFilters = {}) {
  return useQuery<StockMovementsResponse>({
    queryKey: queryKeys.stockMovements.list(filters as Record<string, unknown>),
    queryFn: () => stockMovementsService.getMovements(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Single stock movement detail by ID
 */
export function useStockMovement(id: string) {
  return useQuery<StockMovement>({
    queryKey: queryKeys.stockMovements.detail(id),
    queryFn: () => stockMovementsService.getMovement(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!id,
  });
}

/**
 * Stock movements for a specific product
 */
export function useStockMovementsByProduct(
  productId: string,
  filters: StockMovementFilters = {},
) {
  return useQuery<StockMovementsResponse>({
    queryKey: queryKeys.stockMovements.byProduct(productId),
    queryFn: () => stockMovementsService.getMovementsByProduct(productId, filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!productId,
  });
}

/**
 * Stock movements for a specific warehouse
 */
export function useStockMovementsByWarehouse(
  warehouseId: string,
  filters: StockMovementFilters = {},
) {
  return useQuery<StockMovementsResponse>({
    queryKey: queryKeys.stockMovements.byWarehouse(warehouseId),
    queryFn: () =>
      stockMovementsService.getMovementsByWarehouse(warehouseId, filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!warehouseId,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a stock adjustment (manual inventory correction)
 */
export function useCreateStockAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStockAdjustmentData) =>
      stockMovementsService.createAdjustment(data),
    onSuccess: (movement) => {
      // Invalidate all stock movement queries
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stockMovements.all,
      });
      // Invalidate product movements
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stockMovements.byProduct(movement.productId),
      });
      // Invalidate warehouse movements if applicable
      if (movement.warehouseId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.stockMovements.byWarehouse(movement.warehouseId),
        });
      }
      // Invalidate product detail (stock changed)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(movement.productId),
      });
      // Invalidate products list
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      // Invalidate low stock products
      void queryClient.invalidateQueries({
        queryKey: queryKeys.products.lowStock(),
      });
      // Invalidate dashboard data
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      const quantitySign = movement.quantity > 0 ? "+" : "";
      toast.success(
        `Ajuste de inventario registrado: ${quantitySign}${movement.quantity} unidades`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al registrar el ajuste de inventario");
    },
  });
}

/**
 * Create a stock transfer between warehouses
 */
export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation<TransferResponse, Error, CreateTransferData>({
    mutationFn: (data: CreateTransferData) =>
      stockMovementsService.createTransfer(data),
    onSuccess: (result) => {
      // Invalidate all stock movement queries
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stockMovements.all,
      });
      // Invalidate product movements
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stockMovements.byProduct(result.outMovement.productId),
      });
      // Invalidate source warehouse movements
      if (result.outMovement.warehouseId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.stockMovements.byWarehouse(result.outMovement.warehouseId),
        });
      }
      // Invalidate destination warehouse movements
      if (result.inMovement.warehouseId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.stockMovements.byWarehouse(result.inMovement.warehouseId),
        });
      }
      // Invalidate warehouses list (stock changed)
      void queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all });
      // Invalidate product detail
      void queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(result.outMovement.productId),
      });

      const qty = Math.abs(result.outMovement.quantity);
      toast.success(`Transferencia completada: ${qty} unidades transferidas`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al realizar la transferencia");
    },
  });
}
