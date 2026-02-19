import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AccountingConfigService } from './accounting-config.service';
import type { AccountingConfigResponse } from './accounting-config.service';
import { AccountingSetupService } from './accounting-setup.service';
import { UpdateAccountingConfigDto } from './dto';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard } from '../common';
import { Permission } from '../common/permissions/permission.enum';

@ApiTags('accounting-config')
@ApiBearerAuth('JWT-auth')
@Controller('accounting')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountingConfigController {
  private readonly logger = new Logger(AccountingConfigController.name);

  constructor(
    private readonly configService: AccountingConfigService,
    private readonly setupService: AccountingSetupService,
  ) {}

  @Get('config')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get accounting configuration' })
  @ApiResponse({ status: 200, description: 'Config returned (or null if not set up)' })
  async getConfig(): Promise<AccountingConfigResponse | null> {
    return this.configService.getConfig();
  }

  @Patch('config')
  @RequirePermissions(Permission.ACCOUNTING_CONFIG)
  @ApiOperation({ summary: 'Update accounting configuration', description: 'Map PUC accounts to business operations' })
  @ApiResponse({ status: 200, description: 'Config updated' })
  async updateConfig(
    @Body() dto: UpdateAccountingConfigDto,
  ): Promise<AccountingConfigResponse> {
    return this.configService.updateConfig(dto);
  }

  @Post('setup')
  @RequirePermissions(Permission.ACCOUNTING_CONFIG)
  @ApiOperation({
    summary: 'Initial accounting setup',
    description: 'Seeds the PUC chart of accounts and creates initial config for this tenant',
  })
  @ApiResponse({ status: 201, description: 'Accounting set up successfully' })
  @ApiResponse({ status: 409, description: 'Accounting already set up for this tenant' })
  async setup(): Promise<{ message: string; accountsCreated: number }> {
    return this.setupService.setup();
  }
}
