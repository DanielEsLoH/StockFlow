import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
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
import { BankStatementsService } from './bank-statements.service';
import type { BankStatementResponse } from './bank-statements.service';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard } from '../common';
import { Permission } from '../common/permissions/permission.enum';

/**
 * BankStatementsController handles bank statement CRUD.
 *
 * Note: The actual .xlsx import endpoint (POST /bank-statements/import)
 * will be added in Sub-fase 2D when we implement file upload with SheetJS.
 * For now, we expose list/detail/delete.
 */
@ApiTags('bank-statements')
@ApiBearerAuth('JWT-auth')
@Controller('bank-statements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BankStatementsController {
  private readonly logger = new Logger(BankStatementsController.name);

  constructor(private readonly statementsService: BankStatementsService) {}

  @Get('by-account/:bankAccountId')
  @RequirePermissions(Permission.BANK_VIEW)
  @ApiOperation({ summary: 'List statements for a bank account' })
  @ApiResponse({ status: 200, description: 'Statements listed' })
  async findByBankAccount(
    @Param('bankAccountId') bankAccountId: string,
  ): Promise<BankStatementResponse[]> {
    return this.statementsService.findByBankAccount(bankAccountId);
  }

  @Get(':id')
  @RequirePermissions(Permission.BANK_VIEW)
  @ApiOperation({ summary: 'Get statement with lines' })
  @ApiResponse({ status: 200, description: 'Statement found' })
  @ApiResponse({ status: 404, description: 'Statement not found' })
  async findOne(@Param('id') id: string): Promise<BankStatementResponse> {
    return this.statementsService.findOne(id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.BANK_IMPORT)
  @ApiOperation({ summary: 'Delete a statement', description: 'Cannot delete reconciled statements' })
  @ApiResponse({ status: 200, description: 'Statement deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete reconciled statement' })
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.statementsService.delete(id);
    return { message: 'Extracto eliminado exitosamente' };
  }
}
