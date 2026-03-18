import { Module } from '@nestjs/common';
import { POSSalesController } from './pos-sales.controller';
import { POSSalesService } from './pos-sales.service';
import { AccountingModule } from '../accounting/accounting.module';
import { DianModule } from '../dian/dian.module';

/**
 * POSSalesModule provides POS sale functionality including:
 * - Creating sales with split payment support
 * - Voiding sales with inventory restoration
 * - Sale listing and details
 * - Automatic DIAN transmission for documento equivalente
 *
 * This module depends on:
 * - PrismaModule (global) - for database access
 * - CommonModule (global) - for TenantContextService
 * - AccountingModule - for journal entry generation
 * - DianModule - for electronic document transmission
 * - AuthModule - for guards and decorators (imported at app level)
 *
 * All endpoints are protected by JwtAuthGuard and RolesGuard.
 * Multi-tenant isolation is enforced through TenantContextService.
 */
@Module({
  imports: [AccountingModule, DianModule],
  controllers: [POSSalesController],
  providers: [POSSalesService],
  exports: [POSSalesService],
})
export class POSSalesModule {}
