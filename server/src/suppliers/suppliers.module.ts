import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

/**
 * SuppliersModule provides supplier management functionality including:
 * - Supplier CRUD operations
 * - Supplier search by name and document number
 * - Supplier statistics (total, active, inactive)
 *
 * This module depends on:
 * - PrismaModule (global) - for database access
 * - CommonModule (global) - for TenantContextService
 * - PermissionsModule (global) - for PermissionsGuard
 * - AuthModule - for guards and decorators (imported at app level)
 *
 * All endpoints are protected by JwtAuthGuard and PermissionsGuard.
 * Multi-tenant isolation is enforced through TenantContextService.
 */
@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
