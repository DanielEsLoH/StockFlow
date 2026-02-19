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
import { AccountType } from '@prisma/client';
import { AccountsService } from './accounts.service';
import type { AccountResponse, AccountTreeResponse } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard } from '../common';
import { Permission } from '../common/permissions/permission.enum';

@ApiTags('accounts')
@ApiBearerAuth('JWT-auth')
@Controller('accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountsController {
  private readonly logger = new Logger(AccountsController.name);

  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List all accounts (flat)', description: 'Returns all accounts in flat list ordered by code' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: AccountType })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Accounts listed successfully' })
  async findAll(
    @Query('search') search?: string,
    @Query('type') type?: AccountType,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<AccountResponse[]> {
    return this.accountsService.findAll(
      search,
      type,
      activeOnly !== 'false',
    );
  }

  @Get('tree')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get accounts tree', description: 'Returns accounts in hierarchical tree structure' })
  @ApiResponse({ status: 200, description: 'Account tree returned successfully' })
  async findTree(): Promise<AccountTreeResponse> {
    return this.accountsService.findTree();
  }

  @Get(':id')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiResponse({ status: 200, description: 'Account found' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async findOne(@Param('id') id: string): Promise<AccountResponse> {
    return this.accountsService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.ACCOUNTING_CONFIG)
  @ApiOperation({ summary: 'Create a new account', description: 'Create a custom account in the chart of accounts' })
  @ApiResponse({ status: 201, description: 'Account created' })
  @ApiResponse({ status: 409, description: 'Account code already exists' })
  async create(@Body() dto: CreateAccountDto): Promise<AccountResponse> {
    return this.accountsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ACCOUNTING_CONFIG)
  @ApiOperation({ summary: 'Update an account' })
  @ApiResponse({ status: 200, description: 'Account updated' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountResponse> {
    return this.accountsService.update(id, dto);
  }
}
