import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './services';
import { WarehouseGuard } from './guards/warehouse.guard';

/**
 * CommonModule
 *
 * A global module that provides shared services used across the application.
 * Being marked as @Global(), this module only needs to be imported once in
 * AppModule and its exports will be available everywhere.
 *
 * Provides:
 * - TenantContextService: Request-scoped service for accessing tenant context
 *   and checking plan limits. Useful for enforcing multi-tenant resource limits.
 * - WarehouseGuard: Guard that enforces warehouse-scoped access control.
 *
 * Note: TenantContextService is request-scoped, meaning a new instance is created
 * for each incoming request. This allows it to safely cache tenant data per request.
 */
@Global()
@Module({
  providers: [TenantContextService, WarehouseGuard],
  exports: [TenantContextService, WarehouseGuard],
})
export class CommonModule {}
