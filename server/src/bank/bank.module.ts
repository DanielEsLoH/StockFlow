import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting';
import { BankAccountsController } from './bank-accounts.controller';
import { BankAccountsService } from './bank-accounts.service';
import { BankStatementsController } from './bank-statements.controller';
import { BankStatementsService } from './bank-statements.service';
import { BankReconciliationController } from './bank-reconciliation.controller';
import { BankReconciliationService } from './bank-reconciliation.service';

/**
 * BankModule provides bank account management, statement import, and reconciliation.
 *
 * Dependencies:
 * - AccountingModule: Uses AccountsService for creating PUC sub-accounts
 * - PrismaModule: Database access (global)
 * - CommonModule: TenantContextService, guards (global)
 * - PermissionsModule: Permission-based access (global)
 */
@Module({
  imports: [AccountingModule],
  controllers: [
    BankAccountsController,
    BankStatementsController,
    BankReconciliationController,
  ],
  providers: [
    BankAccountsService,
    BankStatementsService,
    BankReconciliationService,
  ],
  exports: [
    BankAccountsService,
    BankStatementsService,
  ],
})
export class BankModule {}
