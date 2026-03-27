import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PaymentsModule } from '../payments';
import { DianModule } from '../dian';
import { AccountingModule } from '../accounting';
import { NotificationsModule } from '../notifications';
import { ReportsModule } from '../reports';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

/**
 * InvoicesModule provides invoice management functionality including:
 * - Invoice CRUD operations
 * - Invoice status transitions (draft, send, cancel)
 * - Stock management (reduce on create, restore on cancel)
 * - Stock movement tracking for audit trail
 * - Monthly invoice limit enforcement
 * - Invoice number generation (INV-00001, INV-00002...)
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
 * - Invoice numbers are unique per tenant and auto-generated
 * - Creating an invoice reduces product stock and creates SALE movements
 * - Cancelling an invoice restores product stock and creates RETURN movements
 * - Only DRAFT invoices can be updated or deleted
 * - Monthly invoice limits are enforced per tenant plan
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    forwardRef(() => PaymentsModule),
    DianModule,
    AccountingModule,
    NotificationsModule,
    ReportsModule,
    ExchangeRatesModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
