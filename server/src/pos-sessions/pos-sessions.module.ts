import { Module } from '@nestjs/common';
import { POSSessionsController } from './pos-sessions.controller';
import { POSSessionsService } from './pos-sessions.service';

/**
 * POSSessionsModule provides POS session management functionality including:
 * - Opening/closing sessions (turnos de caja)
 * - Cash movements (ingresos/retiros)
 * - X and Z report generation
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
  controllers: [POSSessionsController],
  providers: [POSSessionsService],
  exports: [POSSessionsService],
})
export class POSSessionsModule {}
