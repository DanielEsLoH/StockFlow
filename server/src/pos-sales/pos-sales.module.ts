import { Module } from '@nestjs/common';
import { POSSalesController } from './pos-sales.controller';
import { POSSalesService } from './pos-sales.service';

/**
 * POSSalesModule provides POS sale functionality including:
 * - Creating sales with split payment support
 * - Voiding sales with inventory restoration
 * - Sale listing and details
 *
 * This module depends on:
 * - PrismaModule (global) - for database access
 * - CommonModule (global) - for TenantContextService
 * - AuthModule - for guards and decorators (imported at app level)
 *
 * All endpoints are protected by JwtAuthGuard and RolesGuard.
 * Multi-tenant isolation is enforced through TenantContextService.
 */
@Module({
  controllers: [POSSalesController],
  providers: [POSSalesService],
  exports: [POSSalesService],
})
export class POSSalesModule {}
