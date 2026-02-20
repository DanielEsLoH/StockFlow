import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { JournalEntriesController } from './journal-entries.controller';
import { JournalEntriesService } from './journal-entries.service';
import { AccountingPeriodsController } from './accounting-periods.controller';
import { AccountingPeriodsService } from './accounting-periods.service';
import { AccountingConfigController } from './accounting-config.controller';
import { AccountingConfigService } from './accounting-config.service';
import { AccountingSetupService } from './accounting-setup.service';
import { AccountingBridgeService } from './accounting-bridge.service';
import { AccountingReportsController } from './reports/accounting-reports.controller';
import { AccountingReportsService } from './reports/accounting-reports.service';

/**
 * AccountingModule provides the full accounting system:
 * - Chart of Accounts (PUC) management
 * - Journal entries (manual and automatic)
 * - Accounting periods (open/close)
 * - Accounting configuration (account mappings)
 * - Initial PUC setup wizard
 * - Automatic journal entry generation via AccountingBridgeService
 *
 * Dependencies (via global modules):
 * - PrismaModule: Database access
 * - CommonModule: TenantContextService, guards, decorators
 * - PermissionsModule: Permission-based access control
 *
 * Exports:
 * - AccountsService: Used by BankModule for account creation
 * - AccountingBridgeService: Used by InvoicesModule, PaymentsModule,
 *   PurchaseOrdersModule, StockMovementsModule for auto journal entries
 */
@Module({
  controllers: [
    AccountsController,
    JournalEntriesController,
    AccountingPeriodsController,
    AccountingConfigController,
    AccountingReportsController,
  ],
  providers: [
    AccountsService,
    JournalEntriesService,
    AccountingPeriodsService,
    AccountingConfigService,
    AccountingSetupService,
    AccountingBridgeService,
    AccountingReportsService,
  ],
  exports: [
    AccountsService,
    AccountingBridgeService,
  ],
})
export class AccountingModule {}
