import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
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
import { AccountingPeriodsService } from './accounting-periods.service';
import type { AccountingPeriodResponse } from './accounting-periods.service';
import { CreateAccountingPeriodDto } from './dto';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard } from '../common';
import { Permission } from '../common/permissions/permission.enum';

@ApiTags('accounting-periods')
@ApiBearerAuth('JWT-auth')
@Controller('accounting-periods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountingPeriodsController {
  private readonly logger = new Logger(AccountingPeriodsController.name);

  constructor(private readonly periodsService: AccountingPeriodsService) {}

  @Get()
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List accounting periods' })
  @ApiResponse({ status: 200, description: 'Periods listed' })
  async findAll(): Promise<AccountingPeriodResponse[]> {
    return this.periodsService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get period by ID' })
  @ApiResponse({ status: 200, description: 'Period found' })
  @ApiResponse({ status: 404, description: 'Period not found' })
  async findOne(@Param('id') id: string): Promise<AccountingPeriodResponse> {
    return this.periodsService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.ACCOUNTING_CONFIG)
  @ApiOperation({ summary: 'Create accounting period' })
  @ApiResponse({ status: 201, description: 'Period created' })
  @ApiResponse({ status: 409, description: 'Period overlaps with existing' })
  async create(@Body() dto: CreateAccountingPeriodDto): Promise<AccountingPeriodResponse> {
    return this.periodsService.create(dto);
  }

  @Patch(':id/close')
  @RequirePermissions(Permission.ACCOUNTING_CLOSE_PERIOD)
  @ApiOperation({ summary: 'Close an accounting period', description: 'Prevents new entries in this period' })
  @ApiResponse({ status: 200, description: 'Period closed' })
  @ApiResponse({ status: 400, description: 'Cannot close: draft entries exist' })
  async closePeriod(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<AccountingPeriodResponse> {
    return this.periodsService.closePeriod(id, req.user?.id);
  }
}
