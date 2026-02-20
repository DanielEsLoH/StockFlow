import { Module } from '@nestjs/common';
import {
  StockMovementsController,
  ProductMovementsController,
  WarehouseMovementsController,
} from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import { AccountingModule } from '../accounting';

/**
 * StockMovementsModule provides stock movement tracking functionality including:
 * - Movement CRUD operations (read-only for most, create for adjustments)
 * - Product movement history
 * - Warehouse movement history
 * - Automatic stock updates on adjustments
 * - Multi-tenant isolation
 *
 * This module depends on:
 * - PrismaModule (global) - for database access
 * - CommonModule (global) - for TenantContextService
 * - AuthModule - for guards and decorators (imported at app level)
 *
 * All endpoints are protected by JwtAuthGuard and RolesGuard.
 * Multi-tenant isolation is enforced through TenantContextService.
 *
 * Business Rules:
 * - Manual movements can only be of type ADJUSTMENT
 * - Other movement types (PURCHASE, SALE, TRANSFER, RETURN, DAMAGED)
 *   are created by their respective modules
 * - Only ADMIN and MANAGER can create manual adjustments
 * - Creating an adjustment updates the product stock
 * - Positive quantity adds to stock, negative subtracts
 * - Stock cannot go negative
 *
 * Endpoints:
 * - GET /stock-movements - List all movements (all roles)
 * - GET /stock-movements/:id - View single movement (all roles)
 * - POST /stock-movements - Create adjustment (ADMIN, MANAGER)
 * - GET /products/:productId/movements - Product history (all roles)
 * - GET /warehouses/:warehouseId/movements - Warehouse history (all roles)
 */
@Module({
  imports: [AccountingModule],
  controllers: [
    StockMovementsController,
    ProductMovementsController,
    WarehouseMovementsController,
  ],
  providers: [StockMovementsService],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
