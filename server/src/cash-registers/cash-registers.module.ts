import { Module } from '@nestjs/common';
import { CashRegistersController } from './cash-registers.controller';
import { CashRegistersService } from './cash-registers.service';

/**
 * CashRegistersModule provides cash register management functionality including:
 * - Cash register CRUD operations
 * - Session status tracking
 * - Warehouse association management
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
  controllers: [CashRegistersController],
  providers: [CashRegistersService],
  exports: [CashRegistersService],
})
export class CashRegistersModule {}
