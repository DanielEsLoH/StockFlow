import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { WAREHOUSE_SCOPED_KEY, WarehouseGuard } from '../guards/warehouse.guard';

/**
 * Decorator that marks an endpoint as warehouse-scoped.
 * When applied, the WarehouseGuard will:
 * - Allow ADMIN/SUPER_ADMIN access to any warehouse
 * - Verify non-admin users have a warehouse assigned
 * - Reject requests targeting a different warehouse than the user's
 *
 * @example
 * @WarehouseScoped()
 * @Post()
 * async createInvoice() { }
 */
export const WarehouseScoped = () =>
  applyDecorators(
    SetMetadata(WAREHOUSE_SCOPED_KEY, true),
    UseGuards(WarehouseGuard),
  );
