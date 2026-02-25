import { Module } from '@nestjs/common';
import { CollectionRemindersController } from './collection-reminders.controller';
import { CollectionRemindersService } from './collection-reminders.service';

/**
 * CollectionRemindersModule provides automated payment reminder functionality.
 *
 * Features:
 * - Manual reminder creation for specific invoices
 * - Automatic reminder generation based on invoice due dates
 * - Status management (cancel, mark sent, mark failed)
 * - Dashboard and statistics for the collections workflow
 * - Overdue invoice scanning
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
 * - Only PENDING reminders can be cancelled, marked sent, or marked failed
 * - Auto-generation deduplicates by type + scheduled date per invoice
 * - Manual reminders are always created with type MANUAL
 * - Customer is inferred from the invoice if not explicitly provided
 */
@Module({
  controllers: [CollectionRemindersController],
  providers: [CollectionRemindersService],
  exports: [CollectionRemindersService],
})
export class CollectionRemindersModule {}
