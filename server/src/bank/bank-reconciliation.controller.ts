import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Logger,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { BankReconciliationService } from './bank-reconciliation.service';
import type { ReconciliationResult } from './bank-reconciliation.service';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard } from '../common';
import { Permission } from '../common/permissions/permission.enum';

@ApiTags('bank-reconciliation')
@ApiBearerAuth('JWT-auth')
@Controller('bank-reconciliation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BankReconciliationController {
  private readonly logger = new Logger(BankReconciliationController.name);

  constructor(private readonly reconciliationService: BankReconciliationService) {}

  @Post(':statementId/auto-match')
  @RequirePermissions(Permission.BANK_RECONCILE)
  @ApiOperation({ summary: 'Auto-match statement lines', description: 'Matches by amount, date ±3 days, reference' })
  @ApiResponse({ status: 200, description: 'Auto-match completed' })
  async autoMatch(
    @Param('statementId') statementId: string,
  ): Promise<ReconciliationResult> {
    return this.reconciliationService.autoMatch(statementId);
  }

  @Post('manual-match')
  @RequirePermissions(Permission.BANK_RECONCILE)
  @ApiOperation({ summary: 'Manually match a line to a journal entry' })
  @ApiResponse({ status: 200, description: 'Line matched' })
  async manualMatch(
    @Body('lineId') lineId: string,
    @Body('journalEntryId') journalEntryId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.reconciliationService.manualMatch(lineId, journalEntryId, req.user?.id);
    return { message: 'Linea conciliada exitosamente' };
  }

  @Post('unmatch/:lineId')
  @RequirePermissions(Permission.BANK_RECONCILE)
  @ApiOperation({ summary: 'Unmatch a reconciled line' })
  @ApiResponse({ status: 200, description: 'Line unmatched' })
  async unmatch(@Param('lineId') lineId: string): Promise<{ message: string }> {
    await this.reconciliationService.unmatch(lineId);
    return { message: 'Conciliacion deshecha exitosamente' };
  }

  @Post(':statementId/finalize')
  @RequirePermissions(Permission.BANK_RECONCILE)
  @ApiOperation({ summary: 'Finalize reconciliation', description: 'Marks statement as RECONCILED' })
  @ApiResponse({ status: 200, description: 'Reconciliation finalized' })
  async finalize(
    @Param('statementId') statementId: string,
  ): Promise<{ message: string }> {
    await this.reconciliationService.finalize(statementId);
    return { message: 'Conciliacion finalizada exitosamente' };
  }
}
