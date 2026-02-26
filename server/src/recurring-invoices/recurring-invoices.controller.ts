import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { CreateRecurringInvoiceDto, UpdateRecurringInvoiceDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../common/decorators';

@ApiTags('recurring-invoices')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recurring-invoices')
export class RecurringInvoicesController {
  private readonly logger = new Logger(RecurringInvoicesController.name);

  constructor(
    private readonly recurringInvoicesService: RecurringInvoicesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a recurring invoice template' })
  @ApiResponse({ status: 201, description: 'Recurring invoice created' })
  async create(@Body() dto: CreateRecurringInvoiceDto) {
    this.logger.log('Creating recurring invoice');
    return this.recurringInvoicesService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'List recurring invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of recurring invoices' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.recurringInvoicesService.findAll(page, limit);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get recurring invoice details' })
  @ApiParam({ name: 'id', description: 'Recurring invoice ID' })
  @ApiResponse({ status: 200, description: 'Recurring invoice details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id') id: string) {
    return this.recurringInvoicesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a recurring invoice template' })
  @ApiParam({ name: 'id', description: 'Recurring invoice ID' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRecurringInvoiceDto,
  ) {
    this.logger.log(`Updating recurring invoice: ${id}`);
    return this.recurringInvoicesService.update(id, dto);
  }

  @Patch(':id/toggle')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Toggle recurring invoice active/inactive' })
  @ApiParam({ name: 'id', description: 'Recurring invoice ID' })
  @ApiResponse({ status: 200, description: 'Toggled' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async toggle(@Param('id') id: string) {
    this.logger.log(`Toggling recurring invoice: ${id}`);
    return this.recurringInvoicesService.toggle(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate a recurring invoice' })
  @ApiParam({ name: 'id', description: 'Recurring invoice ID' })
  @ApiResponse({ status: 200, description: 'Deactivated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async remove(@Param('id') id: string) {
    this.logger.log(`Deactivating recurring invoice: ${id}`);
    return this.recurringInvoicesService.remove(id);
  }
}
