import { Module } from '@nestjs/common';
import { RemissionsController } from './remissions.controller';
import { RemissionsService } from './remissions.service';

/**
 * RemissionsModule provides remission (guia de despacho) management functionality including:
 * - Remission CRUD operations
 * - Status transitions (DRAFT -> DISPATCHED -> DELIVERED)
 * - Cancellation from any non-delivered status
 * - Creation from existing invoices
 * - Remission number generation (REM-00001, REM-00002...)
 * - Statistics by status
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
 * - Remission numbers are unique per tenant and auto-generated
 * - Only DRAFT remissions can be updated or deleted
 * - Dispatching sets deliveryDate to now if not already set
 * - Only DISPATCHED remissions can be delivered
 * - Any non-DELIVERED remission can be cancelled
 */
@Module({
  controllers: [RemissionsController],
  providers: [RemissionsService],
  exports: [RemissionsService],
})
export class RemissionsModule {}
