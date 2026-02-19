import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { BankAccountsService } from './bank-accounts.service';
import type { BankAccountResponse } from './bank-accounts.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard } from '../common';
import { Permission } from '../common/permissions/permission.enum';

@ApiTags('bank-accounts')
@ApiBearerAuth('JWT-auth')
@Controller('bank-accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BankAccountsController {
  private readonly logger = new Logger(BankAccountsController.name);

  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  @RequirePermissions(Permission.BANK_VIEW)
  @ApiOperation({ summary: 'List bank accounts' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Bank accounts listed' })
  async findAll(@Query('activeOnly') activeOnly?: string): Promise<BankAccountResponse[]> {
    return this.bankAccountsService.findAll(activeOnly !== 'false');
  }

  @Get(':id')
  @RequirePermissions(Permission.BANK_VIEW)
  @ApiOperation({ summary: 'Get bank account by ID' })
  @ApiResponse({ status: 200, description: 'Bank account found' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async findOne(@Param('id') id: string): Promise<BankAccountResponse> {
    return this.bankAccountsService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.BANK_CREATE)
  @ApiOperation({ summary: 'Create bank account', description: 'Also creates a PUC sub-account under 1110' })
  @ApiResponse({ status: 201, description: 'Bank account created' })
  @ApiResponse({ status: 409, description: 'Account number already exists' })
  async create(@Body() dto: CreateBankAccountDto): Promise<BankAccountResponse> {
    return this.bankAccountsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.BANK_CREATE)
  @ApiOperation({ summary: 'Update bank account' })
  @ApiResponse({ status: 200, description: 'Bank account updated' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
  ): Promise<BankAccountResponse> {
    return this.bankAccountsService.update(id, dto);
  }
}
