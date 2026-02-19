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

/**
 * AccountingModule provides the full accounting system:
 * - Chart of Accounts (PUC) management
 * - Journal entries (manual and automatic)
 * - Accounting periods (open/close)
 * - Accounting configuration (account mappings)
 * - Initial PUC setup wizard
 *
 * Dependencies (via global modules):
 * - PrismaModule: Database access
 * - CommonModule: TenantContextService, guards, decorators
 * - PermissionsModule: Permission-based access control
 *
 * Exports:
 * - AccountsService: Used by BankModule for account creation
 * - JournalEntriesService: Used by AccountingBridgeService (Sub-fase 2B)
 * - AccountingConfigService: Used by AccountingBridgeService
 */
@Module({
  controllers: [
    AccountsController,
    JournalEntriesController,
    AccountingPeriodsController,
    AccountingConfigController,
  ],
  providers: [
    AccountsService,
    JournalEntriesService,
    AccountingPeriodsService,
    AccountingConfigService,
    AccountingSetupService,
  ],
  exports: [
    AccountsService,
    JournalEntriesService,
    AccountingConfigService,
  ],
})
export class AccountingModule {}
